import { generateProfessionalExcel, type BankInfo } from '../_shared/excel-generator.ts';
import type { Transaction } from '../_shared/financial-engine.ts';

type GenerateXlsxRequest = {
  transactions?: Transaction[];
  bankInfo?: Partial<BankInfo> | null;
};

type GenerateXlsxResponse =
  | {
      excelData: string;
      mimeType: string;
      sheetNames: string[];
    }
  | {
      error: string;
      message?: string;
    };

const getAllowedOrigin = (requestOrigin: string | null): string => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');

  const allowedOrigins = [
    envOrigin,
    'https://www.banklefy.site',
    'https://banklefy.site',
    'https://banklefy.lovable.app',
    'https://www.banklefy.site',
    'https://banklefy.site',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (requestOrigin && (lovableAppPattern.test(requestOrigin) || lovableProjectPattern.test(requestOrigin))) {
    return requestOrigin;
  }

  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
  if (requestOrigin && vercelPattern.test(requestOrigin)) {
    return requestOrigin;
  }

  if (envOrigin === '*' && requestOrigin) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://www.banklefy.site';
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req.headers.get('origin')),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const encodeBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const normalizeBankInfo = (bankInfo?: Partial<BankInfo> | null): BankInfo | undefined => {
  if (!bankInfo) return undefined;
  return {
    bankName: bankInfo.bankName ?? '',
    accountNumber: bankInfo.accountNumber ?? '',
    accountHolder: bankInfo.accountHolder ?? '',
    currency: bankInfo.currency ?? '',
    iban: bankInfo.iban,
    ifsc: bankInfo.ifsc,
    swift: bankInfo.swift,
    routingNumber: bankInfo.routingNumber,
    sortCode: bankInfo.sortCode,
    bsb: bankInfo.bsb,
    micr: bankInfo.micr,
    statementPeriod: bankInfo.statementPeriod,
    openingBalance: bankInfo.openingBalance,
    closingBalance: bankInfo.closingBalance,
  };
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = (await req.json()) as GenerateXlsxRequest;
    const transactions = Array.isArray(body.transactions) ? body.transactions : [];

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transactions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const workbook = await generateProfessionalExcel({
      transactions,
      analytics: {
        totalCredits: 0,
        totalDebits: 0,
        netFlow: 0,
        duplicateCount: 0,
        categoryBreakdown: {},
      },
      bankInfo: normalizeBankInfo(body.bankInfo),
    });

    const excelData = encodeBase64(workbook.buffer);
    const response: GenerateXlsxResponse = {
      excelData,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sheetNames: workbook.sheets,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate Excel workbook';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
