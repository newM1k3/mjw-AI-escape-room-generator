import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert escape room designer. Your job is to generate a cohesive, logical, and highly creative puzzle flow for a physical escape room based on the user's parameters. Ensure puzzles are physical, mechanical, or logic-based (not just math equations). Ensure the flow makes sense (Puzzle A leads to Puzzle B). Return a structured JSON object containing: title, narrative (intro, climax, outro), puzzles (array of objects: name, props, setup, solution, output), and redHerrings (array of strings). Return ONLY valid JSON, no markdown, no explanation.`;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { theme?: string; difficulty?: string; players?: string; format?: string; duration?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { theme, difficulty, players, format, duration } = body;
  if (!theme) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Theme is required' }) };
  }

  const userMessage = `Generate an escape room puzzle flow with the following parameters:
- Theme/Story: ${theme}
- Difficulty: ${difficulty || 'Intermediate'}
- Number of Players: ${players || '4-6'}
- Room Format: ${format || 'Single Room'}
- Target Duration: ${duration || '60 mins'}

Generate 5-7 interconnected puzzles where each puzzle's output leads to the next. Include 2-3 red herrings. Return valid JSON only.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(parsed),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: msg }),
    };
  }
};
