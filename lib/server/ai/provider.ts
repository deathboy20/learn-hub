import 'server-only'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface AIProvider {
  chat(messages: ChatMessage[], options: { model: string; temperature: number; maxTokens: number }): Promise<string>
}

class GeminiProvider implements AIProvider {
  async chat(messages: ChatMessage[], options: { model: string; temperature: number; maxTokens: number }) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('Gemini API key is not configured.')
    const model = options.model || process.env.AI_MODEL || 'gemini-2.0-flash'
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: options.temperature, maxOutputTokens: options.maxTokens },
      }),
    })
    if (!response.ok) throw new Error('Gemini request failed.')
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response.'
  }
}

class OpenRouterProvider implements AIProvider {
  async chat(messages: ChatMessage[], options: { model: string; temperature: number; maxTokens: number }) {
    const key = process.env.OPENROUTER_API_KEY
    if (!key) throw new Error('OpenRouter API key is not configured.')
    const model = options.model || process.env.AI_MODEL || 'openrouter/auto'
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: options.temperature, max_tokens: options.maxTokens }),
    })
    if (!response.ok) throw new Error('OpenRouter request failed.')
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content ?? 'No response.'
  }
}

export function getAIProvider(name: string): AIProvider {
  if (name === 'gemini') return new GeminiProvider()
  return new OpenRouterProvider()
}
