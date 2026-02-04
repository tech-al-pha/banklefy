// Chat Aura Edge Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatRequest {
  message: string;
  pdfContext?: string | null;
  conversationHistory?: Array<{ role: string; content: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, pdfContext, conversationHistory = [] } = await req.json() as ChatRequest;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    let systemPrompt = `You are Chat Aura, an intelligent financial assistant for Akromeda.
You help users understand bank statements and financial documents.
Be concise, helpful, and professional. Use simple language.
If asked about features, explain Akromeda converts bank statement PDFs to Excel with AI-powered categorization.

When answering questions about an uploaded document, ALWAYS include precise location hints (page numbers, table names, row/column or cell references, or section/heading names) where the information can be found. When possible, quote a short excerpt (1-2 lines) and then provide the location hint, e.g. "(Page 3, Table: Transactions)". Keep the answer actionable and point the user to where to look in the converted Excel or original PDF.`;

    if (pdfContext) {
      systemPrompt += `\n\nThe user has uploaded a document. Here is the extracted content:\n\n${pdfContext}\n\nUse this context to answer questions about the document.`;
    }

    // Build messages array
    const messages = [
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    // Prefer Groq/OpenAI-compatible API if configured, otherwise fall back to Gemini
    const GROQ_OPENAI_API_KEY = Deno.env.get('GROQ_OPENAI_API_KEY');
    const GROQ_OPENAI_URL = Deno.env.get('GROQ_OPENAI_URL') || 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_OPENAI_MODEL = Deno.env.get('GROQ_OPENAI_MODEL') || 'mixtral-8x7b-32768';
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    // Create messages for OpenAI-style chat endpoints (system first)
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ];

    if (GROQ_OPENAI_API_KEY) {
      // Call Groq / OpenAI-compatible chat completions endpoint
      console.log('🔹 Calling Groq API with model:', GROQ_OPENAI_MODEL);
      
      try {
        const openaiResp = await fetch(GROQ_OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: GROQ_OPENAI_MODEL,
            messages: openaiMessages,
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.95
          })
        });

        if (!openaiResp.ok) {
          const errorText = await openaiResp.text();
          console.error('❌ Groq API error:', openaiResp.status, errorText);
          throw new Error(`Groq API ${openaiResp.status}: ${errorText}`);
        }

        const openaiData = await openaiResp.json();
        // Support Chat Completions response format
        const responseText = openaiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

        console.log('✅ Groq response received');
        return new Response(
          JSON.stringify({ response: responseText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (groqError) {
        console.error('❌ Groq error caught:', groqError);
        throw groqError;
      }
    }

    // If we reach here, Groq API key was not configured
    console.error('❌ GROQ_OPENAI_API_KEY not configured in environment');
    throw new Error('Chat Aura requires GROQ_OPENAI_API_KEY to be configured. Please set the environment variable in Supabase project settings.');

  } catch (error) {
    console.error('❌ Chat Aura error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: `Error: ${errorMessage}`
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
