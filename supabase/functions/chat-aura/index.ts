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
You help users understand their bank statements and financial documents.
Be concise, helpful, and professional. Use simple language.
If asked about features, explain Akromeda converts bank statement PDFs to Excel with AI-powered categorization.`;

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

    // Use Gemini via Lovable AI (no API key needed)
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      // Fallback response if no API key
      return new Response(
        JSON.stringify({ 
          response: "I'm Chat Aura, your financial assistant! I can help you understand bank statements and answer questions about your documents. How can I assist you today?" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + messages.map(m => `${m.role}: ${m.content}`).join('\n') }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Failed to get AI response');
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't process your request. Please try again.";

    return new Response(
      JSON.stringify({ response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat Aura error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        response: "I apologize, but I encountered an error. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
