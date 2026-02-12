// ============= MISTRAL CATEGORIZATION PROCESSOR =============
// Using Mistral for categorization & text cleaning (best for structured output)

export interface MistralCategorizationResult {
  success: boolean;
  transactions?: ProcessedTransaction[];
  error?: string;
  processingTime?: number;
}

export interface ProcessedTransaction {
  date: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  refNumber?: string;
  originalDescription?: string;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  amount?: number;
  type?: string;
}

interface RawTransaction {
  date?: string;
  description?: string;
  narration?: string;
  category?: string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
  refNumber?: string;
}

const CATEGORY_LIST = [
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

const MISTRAL_CATEGORIZATION_PROMPT = `You are a financial transaction categorizer. Your ONLY job is to:
1. Assign a category to each transaction
2. Clean the description text
3. PRESERVE ALL NUMERICAL VALUES EXACTLY AS PROVIDED (debit, credit, balance)

CRITICAL: Do NOT change debit, credit, or balance values. Copy them exactly from input.

Categories: ${CATEGORY_LIST.join(', ')}

CATEGORIZATION RULES:
- Salary/Income: salary, wages, income, bonus
- Transfer In: money received, P2P receipts, incoming transfers
- Transfer Out: money sent, P2P payments, outgoing transfers
- Bills & Utilities: electricity, water, gas, internet, phone, rent
- Shopping: retail, Amazon, Flipkart, stores
- Food & Dining: restaurants, Swiggy, Zomato, groceries
- Transportation: Uber, Ola, fuel, parking
- Entertainment: Netflix, Spotify, movies
- Healthcare: hospitals, pharmacies, medical
- Education: school, courses, books
- Insurance: premiums, policies
- Investments: mutual funds, stocks, SIP
- Loan/EMI: loan payments, EMIs
- Cash: ATM withdrawals, cash deposits
- Bank Fees: charges, fees
- Other: anything else

Return JSON with: date, description (cleaned), category, debit (SAME as input), credit (SAME as input), balance (SAME as input)`;

export async function callMistralCategorizer(
  transactions: RawTransaction[]
): Promise<MistralCategorizationResult> {
  const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
  
  if (!MISTRAL_API_KEY) {
    console.log('❌ MISTRAL_API_KEY not configured');
    return { success: false, error: 'Mistral API key not configured' };
  }
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Calling Mistral for categorization...');
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: MISTRAL_CATEGORIZATION_PROMPT,
          },
          {
            role: 'user',
            content: `Categorize and clean these transactions. Return only JSON array:\n\n${JSON.stringify(transactions, null, 2)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    });
    
    const processingTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mistral API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Mistral API error: ${response.status}`,
        processingTime 
      };
    }
    
    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;
    
    if (!textContent) {
      return { 
        success: false, 
        error: 'No content in Mistral response',
        processingTime 
      };
    }
    
    // Parse JSON from response
    let parsedTransactions: RawTransaction[];
    
    try {
      // Try to parse as JSON object first (for response_format: json_object)
      const parsed = JSON.parse(textContent);
      
      // Handle both array and object with transactions key
      if (Array.isArray(parsed)) {
        parsedTransactions = parsed as RawTransaction[];
      } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
        parsedTransactions = parsed.transactions as RawTransaction[];
      } else {
        // Try to find array in the response
        const jsonMatch = textContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedTransactions = JSON.parse(jsonMatch[0]) as RawTransaction[];
        } else {
          throw new Error('No valid array found');
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Mistral JSON:', parseError);
      return { 
        success: false, 
        error: 'Failed to parse Mistral response',
        processingTime 
      };
    }
    
    // Normalize transactions - PRESERVE original numerical values
    const normalizedTransactions: ProcessedTransaction[] = parsedTransactions.map((t, index) => {
      // Get original transaction to preserve amounts if Mistral changed them
      const original = transactions[index];

      // Parse amounts from either source, preferring original if Mistral returned 0
      const parseAmount = (val: unknown, signed = false): number => {
        if (typeof val === 'number' && !Number.isNaN(val)) {
          return signed ? val : Math.abs(val);
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!trimmed) return 0;
          const isNegative = /^\(.*\)$/.test(trimmed);
          const cleaned = trimmed.replace(/[(),\s]/g, '');
          const num = parseFloat(cleaned);
          if (Number.isNaN(num)) return 0;
          const withSign = isNegative ? -num : num;
          return signed ? withSign : Math.abs(withSign);
        }
        return 0;
      };

      // Use original values if Mistral returned 0 but original had a value
      const debit = parseAmount(t.debit) || parseAmount(original?.debit);
      const credit = parseAmount(t.credit) || parseAmount(original?.credit);
      const balance = parseAmount(t.balance, true) || parseAmount(original?.balance, true);

      const rawDate = original?.date || t.date || '';
      const rawDescription = original?.description || original?.narration || t.description || t.narration || '';

      return {
        date: normalizeDate(rawDate),
        description: cleanDescription(t.description || t.narration || rawDescription || ''),
        category: validateCategory(t.category ?? ''),
        debit,
        credit,
        balance,
        refNumber: t.refNumber || original?.refNumber,
        originalDescription: rawDescription,
      };
    });
    
    console.log(`✅ Mistral categorized ${normalizedTransactions.length} transactions in ${processingTime}ms`);
    
    return { 
      success: true, 
      transactions: normalizedTransactions,
      processingTime 
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Mistral categorization error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime 
    };
  }
}

// ============= HELPER FUNCTIONS =============

function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try various formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[2]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  
  return dateStr;
}

function cleanDescription(desc: string): string {
  if (!desc) return 'Unknown Transaction';
  
  return desc
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@./-]/g, '')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateCategory(category: string): string {
  if (!category) return 'Other';
  
  const normalized = category.trim();
  
  // Exact match
  if (CATEGORY_LIST.includes(normalized)) {
    return normalized;
  }
  
  // Case-insensitive match
  const lowerCategory = normalized.toLowerCase();
  for (const cat of CATEGORY_LIST) {
    if (cat.toLowerCase() === lowerCategory) {
      return cat;
    }
  }
  
  // Partial match
  for (const cat of CATEGORY_LIST) {
    if (lowerCategory.includes(cat.toLowerCase().split('/')[0])) {
      return cat;
    }
  }
  
  return 'Other';
}
