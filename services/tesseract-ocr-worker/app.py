import base64
import os
import re
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from statistics import median
from typing import Any

import pytesseract
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


OCR_API_KEY = os.getenv("OCR_API_KEY", "").strip()
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", "4500000"))
OCR_PSM_MODES = [int(v.strip()) for v in os.getenv("OCR_PSM_MODES", "6,4").split(",") if v.strip().isdigit()] or [6]

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

app = FastAPI(title="Banklefy OCR Worker", version="1.1.0")

MONEY_CAPTURE = r"(?:\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})"
DATE_PATTERN = re.compile(r"(\d{1,2}[-/](?:[A-Za-z]{3}|\d{1,2})[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})")
MONEY_PATTERN = re.compile(rf"^-?{MONEY_CAPTURE}$")
REF_PATTERN = re.compile(r"\b(?:PHUB|MOB|AE\d{5,}|S\d{5,}|FCF[A-Z0-9]{6,})[A-Z0-9/.-]*\b", re.I)
TRAILING_CREDIT_PATTERN = re.compile(rf"-\s*({MONEY_CAPTURE})\s*({MONEY_CAPTURE})\s*$")
TRAILING_DEBIT_PATTERN = re.compile(rf"({MONEY_CAPTURE})\s*-\s*({MONEY_CAPTURE})\s*$")

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


def normalize_dash_variants(value: str) -> str:
    if not value:
        return ""
    return (
        value.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2212", "-")
    )


def normalize_text_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_money_text(value: str) -> str:
    text = normalize_dash_variants(value).strip()
    text = re.sub(r"[^0-9,.\-]", "", text)
    if not text:
        return ""

    negative = text.startswith("-")
    text = text.replace("-", "")
    if not text:
        return ""

    sep_positions = [idx for idx, ch in enumerate(text) if ch in {",", "."}]
    if len(sep_positions) > 1:
        last_sep = sep_positions[-1]
        decimals = len(text) - last_sep - 1
        if decimals in {1, 2}:
            int_part = re.sub(r"[,.]", "", text[:last_sep])
            frac_part = re.sub(r"[,.]", "", text[last_sep + 1 :])
            text = f"{int_part}.{frac_part}"
        else:
            text = re.sub(r"[,.]", "", text)
    elif len(sep_positions) == 1:
        sep = sep_positions[0]
        decimals = len(text) - sep - 1
        if decimals in {1, 2}:
            int_part = re.sub(r"[,.]", "", text[:sep])
            frac_part = re.sub(r"[,.]", "", text[sep + 1 :])
            text = f"{int_part}.{frac_part}"
        else:
            text = re.sub(r"[,.]", "", text)

    if negative:
        text = f"-{text}"

    return text


def parse_money(value: str) -> float:
    normalized = normalize_money_text(value)
    if not normalized:
        return 0.0
    try:
        return float(normalized)
    except ValueError:
        return 0.0


def is_money_token(value: str) -> bool:
    normalized = normalize_money_text(value)
    if not normalized:
        return False
    if not re.fullmatch(r"-?\d+(?:\.\d{1,2})?", normalized):
        return False
    raw_digits = re.sub(r"\D", "", value or "")
    if "." not in normalized and len(raw_digits) > 7:
        return False
    return True


def parse_date_to_iso(value: str) -> str | None:
    clean = value.strip().replace(" ", "")
    for fmt in (
        "%d-%b-%Y",
        "%d-%b-%y",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%d-%m-%Y",
        "%d-%m-%y",
        "%Y-%m-%d",
        "%Y/%m/%d",
    ):
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def preprocess_image_variants(img: Image.Image) -> list[tuple[str, Image.Image]]:
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray, cutoff=2)
    denoised = gray.filter(ImageFilter.MedianFilter(size=3))

    sharp = ImageEnhance.Sharpness(denoised).enhance(1.8)
    contrast = ImageEnhance.Contrast(sharp).enhance(1.35)
    binary = contrast.point(lambda px: 255 if px > 172 else 0, mode="1").convert("L")
    upscaled = contrast.resize((int(contrast.width * 1.35), int(contrast.height * 1.35)), Image.Resampling.LANCZOS)

    return [
        ("denoised", denoised),
        ("contrast", contrast),
        ("binary", binary),
        ("upscaled", upscaled),
    ]


def decode_image(base64_data: str) -> Image.Image:
    raw = base64.b64decode(base64_data, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"Image exceeds {MAX_IMAGE_BYTES} bytes")
    return Image.open(BytesIO(raw)).convert("RGB")


def extract_tokens(img: Image.Image, psm: int = 6) -> list[dict[str, Any]]:
    data = pytesseract.image_to_data(
        img,
        output_type=pytesseract.Output.DICT,
        config=f"--oem 1 --psm {psm} -c preserve_interword_spaces=1",
    )
    tokens: list[dict[str, Any]] = []
    total = len(data.get("text", []))

    for i in range(total):
        text = str(data["text"][i] or "").strip()
        try:
            conf = float(data["conf"][i] or -1)
        except (TypeError, ValueError):
            conf = -1
        if not text or conf < 20:
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


def infer_row_bucket_size(tokens: list[dict[str, Any]]) -> int:
    heights = [int(t["height"]) for t in tokens if int(t.get("height", 0)) > 0]
    if not heights:
        return 9
    med = int(round(float(median(heights))))
    return max(7, min(14, med))


def group_rows(tokens: list[dict[str, Any]], bucket_size: int | None = None) -> list[dict[str, Any]]:
    bucket = bucket_size if bucket_size is not None else infer_row_bucket_size(tokens)
    buckets: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for token in tokens:
        key = int(round(token["top"] / bucket))
        buckets[key].append(token)

    rows: list[dict[str, Any]] = []
    for key, row_tokens in buckets.items():
        ordered = sorted(row_tokens, key=lambda t: t["left"])
        text = normalize_text_spaces(" ".join(t["text"] for t in ordered))
        top = min(t["top"] for t in ordered)
        rows.append({"key": key, "top": top, "text": text, "tokens": ordered})
    rows.sort(key=lambda r: r["top"])
    return rows


def detect_amount_anchors(tokens: list[dict[str, Any]], image_height: int | None = None) -> tuple[int, int, int] | None:
    header_limit = 420 if not image_height else max(180, int(image_height * 0.35))
    header_tokens = [t for t in tokens if t["top"] < header_limit]
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

    amount_tokens = [t for t in tokens if is_money_token(t["text"] or "")]
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


def running_balance_mismatch_ratio(transactions: list[OcrTransaction]) -> float:
    if len(transactions) <= 1:
        return 0.0
    checks = 0
    mismatches = 0
    for i in range(1, len(transactions)):
        prev = transactions[i - 1]
        curr = transactions[i]
        expected = round(prev.balance + curr.credit - curr.debit, 2)
        checks += 1
        if abs(curr.balance - expected) > 0.01:
            mismatches += 1
    return (mismatches / checks) if checks else 0.0


def fix_direction_by_running_balance(transactions: list[OcrTransaction]) -> list[OcrTransaction]:
    if len(transactions) <= 1:
        return transactions

    fixed: list[OcrTransaction] = [
        OcrTransaction(
            date=t.date,
            refNumber=t.refNumber,
            description=t.description,
            debit=round(float(t.debit or 0), 2),
            credit=round(float(t.credit or 0), 2),
            balance=round(float(t.balance or 0), 2),
        )
        for t in transactions
    ]

    for i in range(1, len(fixed)):
        prev = fixed[i - 1]
        curr = fixed[i]
        debit = float(curr.debit or 0)
        credit = float(curr.credit or 0)
        balance = float(curr.balance or 0)
        if balance <= 0:
            continue

        if debit <= 0 and credit <= 0:
            delta = round(balance - prev.balance, 2)
            if abs(delta) > 0:
                if delta > 0:
                    curr.credit = abs(delta)
                    curr.debit = 0.0
                else:
                    curr.debit = abs(delta)
                    curr.credit = 0.0
            continue

        as_is = abs(round(prev.balance + credit - debit, 2) - balance)
        as_swap = abs(round(prev.balance + debit - credit, 2) - balance)

        if debit > 0 and credit > 0:
            if as_swap + 0.02 < as_is:
                curr.debit, curr.credit = round(credit, 2), round(debit, 2)
            elif as_is > 0.01:
                if debit >= credit:
                    curr.debit, curr.credit = round(debit, 2), 0.0
                else:
                    curr.debit, curr.credit = 0.0, round(credit, 2)
            continue

        if as_swap + 0.02 < as_is:
            curr.debit, curr.credit = round(credit, 2), round(debit, 2)

    return fixed


def score_transaction_quality(transactions: list[OcrTransaction]) -> float:
    if not transactions:
        return -1e9
    mismatch = running_balance_mismatch_ratio(transactions)
    descriptions = sum(1 for t in transactions if len((t.description or "").strip()) >= 6)
    desc_ratio = descriptions / max(1, len(transactions))
    non_zero_balances = sum(1 for t in transactions if t.balance > 0)
    dual_side_rows = sum(1 for t in transactions if t.debit > 0 and t.credit > 0)
    return (
        (len(transactions) * 10.0)
        - (mismatch * 120.0)
        + (desc_ratio * 8.0)
        + (non_zero_balances * 0.5)
        - (dual_side_rows * 7.5)
    )


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

        money_tokens = [t for t in span_tokens if is_money_token(t["text"] or "")]
        if len(money_tokens) < 2:
            continue

        debit = 0.0
        credit = 0.0
        balance = 0.0

        if anchors:
            debit_x, credit_x, balance_x = anchors
            split_debit_credit = (debit_x + credit_x) / 2
            split_credit_balance = (credit_x + balance_x) / 2
            by_column: dict[str, list[dict[str, Any]]] = {"debit": [], "credit": [], "balance": []}

            for mt in money_tokens:
                center_x = mt["left"] + (mt["width"] / 2)
                if center_x <= split_debit_credit:
                    by_column["debit"].append(mt)
                elif center_x <= split_credit_balance:
                    by_column["credit"].append(mt)
                else:
                    by_column["balance"].append(mt)

            def pick_column_value(column: str, anchor_x: int) -> float:
                options = by_column.get(column) or []
                if not options:
                    return 0.0
                best = min(
                    options,
                    key=lambda token: (
                        abs((token["left"] + (token["width"] / 2)) - anchor_x),
                        -token["conf"],
                        token["top"],
                    ),
                )
                return parse_money(best["text"])

            debit = pick_column_value("debit", debit_x)
            credit = pick_column_value("credit", credit_x)
            balance = pick_column_value("balance", balance_x)

        normalized_span = normalize_dash_variants(span_text)
        trailing_credit_match = TRAILING_CREDIT_PATTERN.search(normalized_span)
        trailing_debit_match = TRAILING_DEBIT_PATTERN.search(normalized_span)
        if trailing_credit_match:
            trailing_credit = parse_money(trailing_credit_match.group(1))
            trailing_balance = parse_money(trailing_credit_match.group(2))
            if trailing_credit > 0 and trailing_balance > 0:
                credit = trailing_credit
                debit = 0.0
                if balance <= 0 or abs(balance - trailing_balance) > max(1.0, trailing_balance * 0.01):
                    balance = trailing_balance
        elif trailing_debit_match:
            trailing_debit = parse_money(trailing_debit_match.group(1))
            trailing_balance = parse_money(trailing_debit_match.group(2))
            if trailing_debit > 0 and trailing_balance > 0:
                debit = trailing_debit
                credit = 0.0
                if balance <= 0 or abs(balance - trailing_balance) > max(1.0, trailing_balance * 0.01):
                    balance = trailing_balance

        if balance <= 0:
            amounts = [parse_money(t["text"]) for t in sorted(money_tokens, key=lambda m: (m["left"], m["top"]))]
            amounts = [v for v in amounts if v > 0]
            if len(amounts) >= 2:
                balance = amounts[-1]
                if len(amounts) >= 3 and debit == 0 and credit == 0:
                    debit, credit = amounts[-3], amounts[-2]
                elif len(amounts) == 2 and debit == 0 and credit == 0:
                    debit, credit = amounts[0], 0.0

        if balance <= 0:
            continue

        debit = abs(debit) if debit < 0 else debit
        credit = abs(credit) if credit < 0 else credit

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
            if is_money_token(text):
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

    return fix_direction_by_running_balance(transactions)


def merge_metadata(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    keys = ("bankName", "accountNumber", "accountHolder", "currency", "iban", "statementPeriod")
    merged: dict[str, Any] = {k: "" for k in keys}
    sorted_candidates = sorted(
        candidates,
        key=lambda c: (c.get("score", -1e9), len(c.get("transactions", [])), c.get("tokenCount", 0)),
        reverse=True,
    )

    for key in keys:
        for candidate in sorted_candidates:
            metadata = candidate.get("metadata") or {}
            value = str(metadata.get(key) or "").strip()
            if value:
                merged[key] = value
                break
    return merged


def build_candidate(variant_name: str, psm: int, processed: Image.Image) -> dict[str, Any]:
    raw_text = pytesseract.image_to_string(processed, config=f"--oem 1 --psm {psm}")
    tokens = extract_tokens(processed, psm=psm)
    rows = group_rows(tokens)
    anchors = detect_amount_anchors(tokens, processed.height)
    transactions = parse_transactions(rows, anchors)
    mismatch_ratio = running_balance_mismatch_ratio(transactions)
    score = score_transaction_quality(transactions)
    metadata = parse_metadata(raw_text)
    return {
        "variant": variant_name,
        "psm": psm,
        "rawText": raw_text,
        "transactions": transactions,
        "metadata": metadata,
        "score": score,
        "mismatchRatio": mismatch_ratio,
        "tokenCount": len(tokens),
        "rowCount": len(rows),
        "anchors": anchors,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "tesseract-ocr-worker"}


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return health()


@app.post("/ocr/page", response_model=OcrPageResponse)
def ocr_page(payload: OcrPageRequest, x_api_key: str | None = Header(default=None)) -> OcrPageResponse:
    require_api_key(x_api_key)
    try:
        original = decode_image(payload.imageBase64)
        variants = preprocess_image_variants(original)
        candidates: list[dict[str, Any]] = []

        for variant_name, processed in variants:
            for psm in OCR_PSM_MODES:
                candidates.append(build_candidate(variant_name, psm, processed))

        if not candidates:
            return OcrPageResponse(success=False, error="No OCR candidates generated")

        best = max(
            candidates,
            key=lambda candidate: (
                candidate["score"],
                len(candidate["transactions"]),
                -candidate["mismatchRatio"],
                candidate["tokenCount"],
            ),
        )
        metadata = merge_metadata(candidates)

        debug_payload = None
        if payload.debug:
            sorted_candidates = sorted(candidates, key=lambda c: c["score"], reverse=True)
            debug_payload = {
                "ocrPsmModes": OCR_PSM_MODES,
                "selected": {
                    "variant": best["variant"],
                    "psm": best["psm"],
                    "score": round(float(best["score"]), 3),
                    "mismatchRatio": round(float(best["mismatchRatio"]), 4),
                    "transactionCount": len(best["transactions"]),
                    "tokenCount": best["tokenCount"],
                    "rowCount": best["rowCount"],
                    "anchors": best["anchors"],
                },
                "attempts": [
                    {
                        "variant": candidate["variant"],
                        "psm": candidate["psm"],
                        "score": round(float(candidate["score"]), 3),
                        "mismatchRatio": round(float(candidate["mismatchRatio"]), 4),
                        "transactionCount": len(candidate["transactions"]),
                        "tokenCount": candidate["tokenCount"],
                        "rowCount": candidate["rowCount"],
                        "anchors": candidate["anchors"],
                    }
                    for candidate in sorted_candidates
                ],
            }

        return OcrPageResponse(
            success=True,
            text=best["rawText"],
            transactions=best["transactions"],
            bankMetadata=metadata,
            debug=debug_payload,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        return OcrPageResponse(success=False, error=str(exc))
