// ============= GROQ LLAMA-3 FAST CATEGORIZER =============
// Lightning-fast transaction categorization and description cleaning

export interface ProcessedTransaction {
  date: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  originalDescription?: string;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  amount?: number;
  type?: string;
}

export interface CategorizationResult {
  success: boolean;
  transactions?: ProcessedTransaction[];
  error?: string;
  processingTimeMs?: number;
}

// Category list for external use
export const CATEGORY_LIST = [
  'Salary/Income',
  'Transfer In',
  'Transfer Out',
  'Bills & Utilities',
  'Shopping',
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Education',
  'Insurance',
  'Investments',
  'Loan/EMI',
  'Cash',
  'Bank Fees',
  'Other',
];

const GROQ_SYSTEM_PROMPT = `You are a lightning-fast transaction categorizer for bank statements. For each transaction:

1. CLEAN the description:
   - Remove excessive whitespace and special characters
   - Normalize case (Title Case for names, UPPERCASE for codes)
   - Keep important identifiers (UPI IDs, reference numbers)
   - Remove duplicate words

2. CATEGORIZE into exactly one of these categories:
   - "Salary/Income" - salary, wages, business income, commission
   - "Transfer In" - incoming transfers, deposits, received money
   - "Transfer Out" - outgoing transfers, sent money, peer payments
   - "Bills & Utilities" - electricity, water, gas, internet, phone, rent
   - "Shopping" - retail, e-commerce, Amazon, Flipkart, fashion
   - "Food & Dining" - restaurants, Swiggy, Zomato, groceries, cafes
   - "Transportation" - Uber, Ola, fuel, parking, tolls, metro
   - "Entertainment" - movies, Netflix, Spotify, gaming, subscriptions
   - "Healthcare" - hospitals, pharmacies, medical, doctors
   - "Education" - school fees, courses, books, tutoring
   - "Insurance" - premiums, policies, life/health/vehicle insurance
   - "Investments" - mutual funds, stocks, FD, RD, trading
   - "Loan/EMI" - loan payments, EMI deductions, credit card payments
   - "Cash" - ATM withdrawals, cash deposits
   - "Bank Fees" - charges, penalties, service fees
   - "Other" - uncategorized

Return a JSON array with cleaned descriptions and assigned categories. Keep all other fields unchanged.`;

export async function callGroqCategorizer(
  transactions: any[]
): Promise<CategorizationResult> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

  if (!GROQ_API_KEY) {
    console.log('GROQ_API_KEY not configured, using fallback categorization');
    return { success: false, error: 'Groq API key not configured' };
  }

  const startTime = Date.now();

  try {
    console.log(`Calling Groq Llama-3 for ${transactions.length} transactions...`);

    // Prepare simplified transaction data for faster processing
    const simplifiedData = transactions.map((t, i) => ({
      i, // index
      d: t.date,
      desc: t.description,
      dr: t.debit || 0,
      cr: t.credit || 0,
      bal: t.balance || 0,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Categorize and clean these transactions. Return JSON array with index (i), cleaned description (desc), and category (cat).\n\n${JSON.stringify(simplifiedData)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      })
    });

    const processingTimeMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Groq API error: ${response.status}`,
        processingTimeMs 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No content in Groq response', processingTimeMs };
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in Groq response');
      return { success: false, error: 'Invalid response format', processingTimeMs };
    }

    try {
      const categorized = JSON.parse(jsonMatch[0]);

      // Map back to original transactions
      const processedTransactions: ProcessedTransaction[] = transactions.map((t, index) => {
        const categorizedItem = categorized.find((c: any) => c.i === index);
        return {
          date: t.date,
          description: categorizedItem?.desc || t.description,
          category: categorizedItem?.cat || t.category || 'Other',
          debit: t.debit || 0,
          credit: t.credit || 0,
          balance: t.balance || 0,
          originalDescription: t.description,
        };
      });

      console.log(`Groq categorization complete in ${processingTimeMs}ms`);
      return { 
        success: true, 
        transactions: processedTransactions, 
        processingTimeMs 
      };
    } catch (parseError) {
      console.error('Failed to parse Groq JSON:', parseError);
      return { success: false, error: 'Failed to parse response', processingTimeMs };
    }
  } catch (error) {
    console.error('Groq categorizer error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime 
    };
  }
}

// ============= FALLBACK CATEGORIZATION (Pure TypeScript) =============
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  'Salary/Income': [
    /salary|sal cr|payroll|wages|stipend|pension|honorarium|commission|bonus/i,
  ],
  'Transfer In': [
    /credit|transfer.*in|received|deposit|neft cr|rtgs cr|imps cr|upi cr/i,
  ],
  'Transfer Out': [
    /transfer.*out|sent|paid to|neft dr|rtgs dr|imps dr|upi/i,
  ],
  'Bills & Utilities': [
    /electricity|electric|power|water|gas|internet|broadband|wifi|phone|mobile|rent|utility/i,
  ],
  'Shopping': [
    /amazon|flipkart|myntra|ajio|shopee|retail|fashion|clothes|electronics|store/i,
  ],
  'Food & Dining': [
    /swiggy|zomato|uber eats|restaurant|cafe|coffee|food|dining|grocery|supermarket|bigbasket/i,
  ],
  'Transportation': [
    /uber|ola|rapido|fuel|petrol|diesel|parking|toll|metro|bus|train|cab|taxi/i,
  ],
  'Entertainment': [
    /netflix|spotify|prime|hotstar|movies|cinema|gaming|subscription|youtube/i,
  ],
  'Healthcare': [
    /hospital|clinic|pharmacy|medical|doctor|health|apollo|medplus|1mg/i,
  ],
  'Education': [
    /school|college|university|course|tuition|books|education|udemy|coursera/i,
  ],
  'Insurance': [
    /insurance|premium|policy|lic|icici prudential|hdfc life|bajaj allianz/i,
  ],
  'Investments': [
    /mutual fund|mf|sip|stock|share|trading|zerodha|groww|upstox|fd|rd|fixed deposit/i,
  ],
  'Loan/EMI': [
    /emi|loan|instalment|installment|repayment|nach|auto debit|mandate|finance/i,
  ],
  'Cash': [
    /atm|cash withdrawal|cash deposit|cdm|self withdrawal/i,
  ],
  'Bank Fees': [
    /charge|fee|penalty|service charge|maintenance|gst|tax deducted/i,
  ],
};

export function fallbackCategorize(transactions: any[]): ProcessedTransaction[] {
  return transactions.map(t => {
    const desc = (t.description || '').toLowerCase();
    let category = 'Other';

    for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.some(p => p.test(desc))) {
        category = cat;
        break;
      }
    }

    // Clean description
    const cleanedDesc = cleanDescription(t.description || 'Unknown Transaction');

    return {
      date: t.date || 'Unknown',
      description: cleanedDesc,
      category: t.category || category,
      debit: typeof t.debit === 'number' ? Math.abs(t.debit) : 0,
      credit: typeof t.credit === 'number' ? Math.abs(t.credit) : 0,
      balance: typeof t.balance === 'number' ? t.balance : 0,
      originalDescription: t.description,
      isDuplicate: false,
      duplicateGroup: null,
      balanceMismatch: false,
      expectedBalance: null,
      riskFlag: null,
    };
  });
}

// Alias for backward compatibility
export const applyPatternCategorization = fallbackCategorize;

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@.\/\-]/g, '')
    .trim()
    .split(' ')
    .map(word => {
      // Keep UPI IDs and codes as-is
      if (word.includes('@') || /^[A-Z0-9]+$/.test(word)) {
        return word;
      }
      // Title case for regular words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
