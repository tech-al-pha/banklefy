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
  originalDescription?: string;
  isDuplicate?: boolean;
  duplicateGroup?: number | null;
  balanceMismatch?: boolean;
  expectedBalance?: number | null;
  riskFlag?: string | null;
  amount?: number;
  type?: string;
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

const MISTRAL_CATEGORIZATION_PROMPT = `You are a financial transaction categorization expert. Your task is to:
1. Clean and normalize transaction descriptions
2. Categorize each transaction into the most appropriate category
3. Ensure all amounts are positive numbers
4. Validate and normalize dates to YYYY-MM-DD format

Categories available: ${CATEGORY_LIST.join(', ')}

CATEGORIZATION RULES:
- Salary/Income: Regular salary, wages, freelance income, bonuses
- Transfer In: Money received from other accounts, P2P receipts
- Transfer Out: Money sent to other accounts, P2P payments
- Bills & Utilities: Electricity, water, gas, internet, phone bills
- Shopping: Retail purchases, online shopping, Amazon, Flipkart
- Food & Dining: Restaurants, Swiggy, Zomato, groceries
- Transportation: Uber, Ola, fuel, parking, metro
- Entertainment: Netflix, Spotify, movies, gaming
- Healthcare: Hospitals, pharmacies, medical expenses
- Education: School fees, courses, books
- Insurance: Life, health, vehicle insurance premiums
- Investments: Mutual funds, stocks, SIP
- Loan/EMI: Home loan, car loan, personal loan EMIs
- Cash: ATM withdrawals, cash deposits
- Bank Fees: Service charges, transaction fees
- Other: Anything that doesn't fit above

DESCRIPTION CLEANING:
- Remove excessive spaces and special characters
- Preserve key identifiers (UPI IDs, reference numbers)
- Title case for readability
- Keep merchant names intact

Return ONLY a valid JSON array with cleaned and categorized transactions.`;

export async function callMistralCategorizer(
  transactions: any[]
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
    let parsedTransactions: ProcessedTransaction[];
    
    try {
      // Try to parse as JSON object first (for response_format: json_object)
      const parsed = JSON.parse(textContent);
      
      // Handle both array and object with transactions key
      if (Array.isArray(parsed)) {
        parsedTransactions = parsed;
      } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
        parsedTransactions = parsed.transactions;
      } else {
        // Try to find array in the response
        const jsonMatch = textContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedTransactions = JSON.parse(jsonMatch[0]);
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
    
    // Normalize transactions
    const normalizedTransactions: ProcessedTransaction[] = parsedTransactions.map((t: any) => ({
      date: normalizeDate(t.date),
      description: cleanDescription(t.description || t.narration || ''),
      category: validateCategory(t.category),
      debit: Math.abs(parseFloat(t.debit) || 0),
      credit: Math.abs(parseFloat(t.credit) || 0),
      balance: parseFloat(t.balance) || 0,
    }));
    
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
