import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, parseJsonBody, requiredEnv } from './_utils';

const SYSTEM_PROMPT = `You are an expert escape room designer. Your job is to generate a cohesive, logical, and highly creative puzzle flow for a physical escape room based on the user's parameters. Ensure puzzles are physical, mechanical, or logic-based (not just math equations). Ensure the flow makes sense (Puzzle A leads to Puzzle B). Return a structured JSON object containing: title, narrative (intro, climax, outro), puzzles (array of objects: name, props, setup, solution, output), and redHerrings (array of strings). Return ONLY valid JSON, no markdown, no explanation.`;

type GenerateRoomBody = {
  theme?: string;
  difficulty?: string;
  players?: string;
  format?: string;
  duration?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return emptyOptionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS']);
  }

  try {
    const apiKey = requiredEnv('ANTHROPIC_API_KEY');
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-5';
    const client = new Anthropic({ apiKey });
    const body = parseJsonBody<GenerateRoomBody>(event.body);
    const { theme, difficulty, players, format, duration } = body;

    if (!theme?.trim()) {
      return jsonResponse(400, { error: 'Theme is required.' });
    }

    const userMessage = `Generate an escape room puzzle flow with the following parameters:\n- Theme/Story: ${theme.trim()}\n- Difficulty: ${difficulty || 'Intermediate'}\n- Number of Players: ${players || '4-6'}\n- Room Format: ${format || 'Single Room'}\n- Target Duration: ${duration || '60 mins'}\n\nGenerate 5-7 interconnected puzzles where each puzzle's output leads to the next. Include 2-3 red herrings. Return valid JSON only.`;

    const message = await client.messages.create({
      model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content.find((block) => block.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return jsonResponse(502, { error: 'AI provider returned a response without a valid JSON object.' });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return jsonResponse(200, parsed);
    } catch {
      return jsonResponse(502, { error: 'AI provider returned malformed JSON. Please try again.' });
    }
  } catch (err: unknown) {
    return errorResponse(err, 'Generation failed. Please try again.');
  }
};
