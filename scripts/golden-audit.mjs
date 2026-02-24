import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const DEFAULT_FILES = [
  "c:/Users/Soyab Mohammed/Downloads/ADCB (1).xlsx",
  "c:/Users/Soyab Mohammed/Downloads/ADCB.xlsx",
  "c:/Users/Soyab Mohammed/Downloads/Emirates NBD Bank PJSC, Baniyas Road, Deira,P.O (1).xlsx",
  "c:/Users/Soyab Mohammed/Downloads/Emirates NBD Bank PJSC, Baniyas Road, Deira,P.O.xlsx",
];

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_FILES;

const CANDIDATE_KEYS = ["date", "description", "narration", "debit", "credit", "balance"];

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const toNumber = (value) => {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw || raw === "-") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findHeaderIndex = (rows) => {
  const scanLimit = Math.min(rows.length, 80);
  for (let i = 0; i < scanLimit; i += 1) {
    const row = rows[i].map(normalize);
    const score = CANDIDATE_KEYS.reduce(
      (acc, key) => acc + (row.some((cell) => cell.includes(key)) ? 1 : 0),
      0,
    );
    if (score >= 4) return i;
  }
  return -1;
};

const mapColumns = (headerRow) => {
  const map = {
    date: -1,
    desc: -1,
    debit: -1,
    credit: -1,
    balance: -1,
  };

  headerRow.forEach((cell, idx) => {
    const value = normalize(cell);
    if (map.date === -1 && value.includes("date")) map.date = idx;
    if (map.desc === -1 && (value.includes("description") || value.includes("narration"))) map.desc = idx;
    if (map.debit === -1 && value.includes("debit")) map.debit = idx;
    if (map.credit === -1 && value.includes("credit")) map.credit = idx;
    if (map.balance === -1 && value.includes("balance")) map.balance = idx;
  });

  return map;
};

const isLikelyTransaction = (row, columns) => {
  const dateValue = String(row[columns.date] ?? "").trim();
  if (!dateValue) return false;
  const hasAmount =
    toNumber(row[columns.debit]) > 0 ||
    toNumber(row[columns.credit]) > 0 ||
    Number.isFinite(toNumber(row[columns.balance])) && toNumber(row[columns.balance]) > 0;
  return hasAmount;
};

const loadRows = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
};

const summarizeFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return { filePath, error: "missing_file" };
  }

  const rows = loadRows(filePath);
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    return { filePath, error: "header_not_found" };
  }

  const headerRow = rows[headerIndex];
  const columns = mapColumns(headerRow);
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell).trim() !== ""));
  const txRows = dataRows.filter((row) => isLikelyTransaction(row, columns));

  const countMismatches = (rows, mode) => {
    let mismatches = 0;
    for (let i = 1; i < rows.length; i += 1) {
      const prevBalance = toNumber(rows[i - 1][columns.balance]);
      const debit = toNumber(rows[i][columns.debit]);
      const credit = toNumber(rows[i][columns.credit]);
      const currentBalance = toNumber(rows[i][columns.balance]);
      const expected =
        mode === "forward"
          ? Number((prevBalance + credit - debit).toFixed(2))
          : Number((prevBalance - credit + debit).toFixed(2));
      if (Math.abs(expected - currentBalance) > 0.05) mismatches += 1;
    }
    return mismatches;
  };

  const forwardMismatch = countMismatches(txRows, "forward");
  const reverseMismatch = countMismatches(txRows, "reverse");
  const orderingHint = reverseMismatch < forwardMismatch ? "descending" : "ascending";
  const balanceMismatches = Math.min(forwardMismatch, reverseMismatch);

  const totalDebit = Number(
    txRows.reduce((sum, row) => sum + toNumber(row[columns.debit]), 0).toFixed(2),
  );
  const totalCredit = Number(
    txRows.reduce((sum, row) => sum + toNumber(row[columns.credit]), 0).toFixed(2),
  );

  return {
    filePath,
    fileName: path.basename(filePath),
    headerRow: headerIndex + 1,
    columns,
    txRowCount: txRows.length,
    totalDebit,
    totalCredit,
    balanceMismatches,
    orderingHint,
    forwardMismatch,
    reverseMismatch,
  };
};

const results = files.map(summarizeFile);
for (const item of results) {
  console.log(JSON.stringify(item));
}
