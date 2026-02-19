import base64
import os
import re
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from typing import Any

import pytesseract
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageFilter, ImageOps


OCR_API_KEY = os.getenv("OCR_API_KEY", "").strip()
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", "4500000"))

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

app = FastAPI(title="Banklefy OCR Worker", version="1.0.0")

DATE_PATTERN = re.compile(r"(\d{1,2}[-/](?:[A-Za-z]{3}|\d{1,2})[-/]\d{2,4})")
MONEY_PATTERN = re.compile(r"\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}")
REF_PATTERN = re.compile(r"\b(?:PHUB|MOB|AE\d{5,}|S\d{5,}|FCF[A-Z0-9]{6,})[A-Z0-9/.-]*\b", re.I)

HEADER_STOPWORDS = {
    "date",
    "value",
    "bank",
    "customer",
    "description",
    "debit",
    "credit",
    "running",
    "balance",
    "amount",
    "reference",
    "no",
}


class OcrPageRequest(BaseModel):
    imageBase64: str = Field(min_length=40)
    mimeType: str = "image/png"
    fileName: str | None = None
    debug: bool = False


class OcrTransaction(BaseModel):
    date: str
    refNumber: str = ""
    description: str
    debit: float = 0
    credit: float = 0
    balance: float = 0


class OcrPageResponse(BaseModel):
    success: bool
    text: str | None = None
    transactions: list[OcrTransaction] = Field(default_factory=list)
    bankMetadata: dict[str, Any] | None = None
    error: str | None = None
    debug: dict[str, Any] | None = None


def require_api_key(header_key: str | None) -> None:
    if not OCR_API_KEY:
        return
    if not header_key or header_key != OCR_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid OCR API key")


def parse_date_to_iso(value: str) -> str | None:
    clean = value.strip().replace(" ", "")
    for fmt in ("%d-%b-%Y", "%d-%b-%y", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y"):
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def parse_money(value: str) -> float:
    try:
        return float(value.replace(",", "").strip())
    except ValueError:
        return 0.0


def normalize_text_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def preprocess_image(img: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray, cutoff=2)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    return gray


def decode_image(base64_data: str) -> Image.Image:
    raw = base64.b64decode(base64_data, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"Image exceeds {MAX_IMAGE_BYTES} bytes")
    return Image.open(BytesIO(raw)).convert("RGB")


def extract_tokens(img: Image.Image) -> list[dict[str, Any]]:
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config="--oem 1 --psm 6")
    tokens: list[dict[str, Any]] = []
    total = len(data.get("text", []))

    for i in range(total):
        text = str(data["text"][i] or "").strip()
        conf = float(data["conf"][i] or -1)
        if not text or conf < 25:
            continue
        tokens.append(
            {
                "text": text,
                "conf": conf,
                "left": int(data["left"][i]),
                "top": int(data["top"][i]),
                "width": int(data["width"][i]),
                "height": int(data["height"][i]),
            }
        )
    return tokens


def group_rows(tokens: list[dict[str, Any]], bucket_size: int = 9) -> list[dict[str, Any]]:
    buckets: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for token in tokens:
        key = int(round(token["top"] / bucket_size))
        buckets[key].append(token)

    rows: list[dict[str, Any]] = []
    for key, row_tokens in buckets.items():
        ordered = sorted(row_tokens, key=lambda t: t["left"])
        text = normalize_text_spaces(" ".join(t["text"] for t in ordered))
        top = min(t["top"] for t in ordered)
        rows.append({"key": key, "top": top, "text": text, "tokens": ordered})
    rows.sort(key=lambda r: r["top"])
    return rows


def detect_amount_anchors(tokens: list[dict[str, Any]]) -> tuple[int, int, int] | None:
    header_tokens = [t for t in tokens if t["top"] < 420]
    debit_x = None
    credit_x = None
    balance_x = None

    for t in header_tokens:
        low = re.sub(r"[^a-z]", "", t["text"].lower())
        if low.startswith("debit"):
            debit_x = t["left"]
        elif low.startswith("credit"):
            credit_x = t["left"]
        elif low.startswith("running") or low.startswith("balance"):
            if balance_x is None or t["left"] > balance_x:
                balance_x = t["left"]

    if debit_x is not None and credit_x is not None and balance_x is not None:
        xs = sorted([debit_x, credit_x, balance_x])
        return xs[0], xs[1], xs[2]

    amount_tokens = [t for t in tokens if MONEY_PATTERN.fullmatch(t["text"] or "")]
    if len(amount_tokens) < 12:
        return None

    histogram: dict[int, int] = defaultdict(int)
    for t in amount_tokens:
        bin_x = int(round(t["left"] / 20) * 20)
        histogram[bin_x] += 1

    top_bins = sorted(histogram.items(), key=lambda x: x[1], reverse=True)[:6]
    if len(top_bins) < 3:
        return None

    xs = sorted([x for x, _ in top_bins])[-3:]
    return xs[0], xs[1], xs[2]


def parse_metadata(raw_text: str) -> dict[str, Any]:
    lower = raw_text.lower()
    bank_name = ""
    if "adcb" in lower:
        bank_name = "ADCB"
    elif "emirates nbd" in lower:
        bank_name = "Emirates NBD"

    currency_match = re.search(r"\b(AED|USD|INR|EUR|GBP)\b", raw_text)
    account_match = re.search(r"Account\s+No\.?\s*:\s*([A-Z0-9-]+)", raw_text, re.I)
    holder_match = re.search(r"Account\s+Name\s*:\s*([^\n]+)", raw_text, re.I)
    iban_match = re.search(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b", raw_text)
    period_match = re.search(r"Start\s+Date\s*:\s*([^\n]+?)\s+End\s+Date\s*:\s*([^\n]+)", raw_text, re.I)

    return {
        "bankName": bank_name,
        "accountNumber": account_match.group(1).strip() if account_match else "",
        "accountHolder": holder_match.group(1).strip() if holder_match else "",
        "currency": currency_match.group(1).strip() if currency_match else "",
        "iban": iban_match.group(0).strip() if iban_match else "",
        "statementPeriod": (
            f"{period_match.group(1).strip()} - {period_match.group(2).strip()}" if period_match else ""
        ),
    }


def parse_transactions(rows: list[dict[str, Any]], anchors: tuple[int, int, int] | None) -> list[OcrTransaction]:
    starts: list[int] = []
    for idx, row in enumerate(rows):
        if DATE_PATTERN.search(row["text"]):
            starts.append(idx)

    if not starts:
        return []

    transactions: list[OcrTransaction] = []

    for i, start_idx in enumerate(starts):
        end_idx = starts[i + 1] if i + 1 < len(starts) else len(rows)
        span_rows = rows[start_idx:end_idx]
        span_tokens = [t for r in span_rows for t in r["tokens"]]
        span_text = normalize_text_spaces(" ".join(r["text"] for r in span_rows))

        date_match = DATE_PATTERN.search(span_text)
        if not date_match:
            continue
        date_iso = parse_date_to_iso(date_match.group(1))
        if not date_iso:
            continue

        money_tokens = [t for t in span_tokens if MONEY_PATTERN.fullmatch(t["text"] or "")]
        if len(money_tokens) < 2:
            continue

        debit = 0.0
        credit = 0.0
        balance = 0.0

        if anchors:
            debit_x, credit_x, balance_x = anchors
            by_column = {"debit": None, "credit": None, "balance": None}

            for mt in money_tokens:
                x = mt["left"]
                distances = {
                    "debit": abs(x - debit_x),
                    "credit": abs(x - credit_x),
                    "balance": abs(x - balance_x),
                }
                col = min(distances, key=distances.get)
                if distances[col] > 180:
                    continue
                current = by_column[col]
                if current is None or distances[col] < current["distance"]:
                    by_column[col] = {"value": parse_money(mt["text"]), "distance": distances[col]}

            debit = by_column["debit"]["value"] if by_column["debit"] else 0.0
            credit = by_column["credit"]["value"] if by_column["credit"] else 0.0
            balance = by_column["balance"]["value"] if by_column["balance"] else 0.0

        if balance <= 0:
            amounts = [parse_money(t["text"]) for t in sorted(money_tokens, key=lambda m: m["left"])]
            if len(amounts) >= 2:
                balance = amounts[-1]
                if len(amounts) >= 3 and debit == 0 and credit == 0:
                    debit, credit = amounts[-3], amounts[-2]
                elif len(amounts) == 2 and debit == 0 and credit == 0:
                    debit, credit = amounts[0], 0.0

        if balance <= 0:
            continue

        if debit < 0:
            debit = abs(debit)
        if credit < 0:
            credit = abs(credit)

        reference = ""
        ref_match = REF_PATTERN.search(span_text)
        if ref_match:
            reference = ref_match.group(0).strip()

        description_tokens: list[str] = []
        for token in span_tokens:
            text = token["text"]
            low = re.sub(r"[^a-z]", "", text.lower())
            if DATE_PATTERN.fullmatch(text):
                continue
            if MONEY_PATTERN.fullmatch(text):
                continue
            if low in HEADER_STOPWORDS:
                continue
            description_tokens.append(text)

        description = normalize_text_spaces(" ".join(description_tokens))
        if not description:
            description = "Transaction"

        transactions.append(
            OcrTransaction(
                date=date_iso,
                refNumber=reference,
                description=description,
                debit=round(debit, 2),
                credit=round(credit, 2),
                balance=round(balance, 2),
            )
        )

    return transactions


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "tesseract-ocr-worker"}


@app.post("/ocr/page", response_model=OcrPageResponse)
def ocr_page(payload: OcrPageRequest, x_api_key: str | None = Header(default=None)) -> OcrPageResponse:
    require_api_key(x_api_key)
    try:
        original = decode_image(payload.imageBase64)
        processed = preprocess_image(original)

        raw_text = pytesseract.image_to_string(processed, config="--oem 1 --psm 6")
        tokens = extract_tokens(processed)
        rows = group_rows(tokens)
        anchors = detect_amount_anchors(tokens)
        transactions = parse_transactions(rows, anchors)
        metadata = parse_metadata(raw_text)

        debug_payload = None
        if payload.debug:
            debug_payload = {
                "tokenCount": len(tokens),
                "rowCount": len(rows),
                "anchors": anchors,
            }

        return OcrPageResponse(
            success=True,
            text=raw_text,
            transactions=transactions,
            bankMetadata=metadata,
            debug=debug_payload,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        return OcrPageResponse(success=False, error=str(exc))
