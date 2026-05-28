import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import PocketBase from 'pocketbase';
import { hasProEntitlement } from '../../src/lib/entitlements';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, parseJsonBody, requiredEnv } from './_utils';

const SYSTEM_PROMPT = `You are an expert escape room designer. Your job is to generate a cohesive, logical, and highly creative puzzle flow for a physical escape room based on the user's parameters. Ensure puzzles are physical, mechanical, or logic-based (not just math equations). Ensure the flow makes sense (Puzzle A leads to Puzzle B). Return a structured JSON object containing: title, narrative (intro, climax, outro), puzzles (array of objects: name, props, setup, solution, output), and redHerrings (array of strings). Return ONLY valid JSON, no markdown, no explanation.`;

type GenerateRoomBody = {
  theme?: string;
  difficulty?: string;
  players?: string;
  format?: string;
  duration?: string;
};

type EntitledUserRecord = {
  id: string;
  email?: string;
  tier?: 'free' | 'pro';
  role?: string;
  is_pro?: boolean;
};

function getBearerToken(headers: Record<string, string | undefined>): string {
  const authorization = headers.authorization || headers.Authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    const error = new Error('Authentication required. Please sign in before generating rooms.');
    error.name = 'UnauthorizedError';
    throw error;
  }

  return match[1].trim();
}

async function getAuthenticatedProUser(pbUrl: string, token: string): Promise<EntitledUserRecord> {
  const pb = new PocketBase(pbUrl);
  pb.authStore.save(token);

  try {
    const authData = await pb.collection('users').authRefresh<EntitledUserRecord>();
    const user = authData.record;

    if (!user?.id) {
      const error = new Error('Authentication required. Please sign in again before generating rooms.');
      error.name = 'UnauthorizedError';
      throw error;
    }

    if (!hasProEntitlement(user)) {
      const error = new Error('Pro subscription required to generate rooms.');
      error.name = 'ForbiddenError';
      throw error;
    }

    return user;
  } catch (err) {
    if (err instanceof Error && err.name === 'ForbiddenError') {
      throw err;
    }

    const error = new Error('Authentication required. Your sign-in session could not be verified. Please sign out, sign back in, and try again.');
    error.name = 'UnauthorizedError';
    throw error;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return emptyOptionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS']);
  }

  try {
    const apiKey = requiredEnv('ANTHROPIC_API_KEY');
    const pocketBaseUrl = requiredEnv('PB_URL');
    const token = getBearerToken(event.headers);
    const user = await getAuthenticatedProUser(pocketBaseUrl, token);
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
      console.info('Generated PuzzleFlow room for Pro user', { userId: user.id, model });
      return jsonResponse(200, parsed);
    } catch {
      return jsonResponse(502, { error: 'AI provider returned malformed JSON. Please try again.' });
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsonResponse(401, { error: err.message });
    }

    if (err instanceof Error && err.name === 'ForbiddenError') {
      return jsonResponse(403, { error: err.message });
    }

    return errorResponse(err, 'Generation failed. Please try again.');
  }
};
