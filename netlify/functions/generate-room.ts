import type { Handler } from '@netlify/functions';
import PocketBase from 'pocketbase';
import { hasProEntitlement } from '../../src/lib/entitlements';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, parseJsonBody, requiredEnv } from './_utils';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Expert', 'Enthusiast-Only'] as const;
const PLAYER_COUNTS = ['2-4', '4-6', '6-8', '8+'] as const;
const ROOM_FORMATS = ['Single Room', 'Multi-Room', 'Linear', 'Non-Linear'] as const;
const DURATIONS = ['45 mins', '60 mins', '90 mins'] as const;
const PROVIDERS = ['anthropic', 'openai', 'gemini', 'mock'] as const;
const DEFAULT_GENERATION_COOLDOWN_SECONDS = 10;

const SYSTEM_PROMPT = `You are an ImmersiveKit AI room designer, a professional escape-room designer and operations consultant. Design practical, buildable physical escape rooms for real operators.

Requirements:
- Return ONLY one strict JSON object. Do not include markdown, commentary, prose wrappers, or code fences.
- Avoid copyrighted IP, trademarked worlds, celebrity likenesses, or protected franchise references unless the user explicitly supplies licensed original material.
- Avoid unsafe, illegal, explosive, weaponized, hazardous, or self-harm instructions. Replace unsafe concepts with theatrical, non-functional props and clear safety notes.
- Make the room practical for operators: include physical props, reset notes, staffing notes, accessibility considerations, and shopping list items.
- Make puzzles chain logically. Each puzzle's output must feed the next puzzle's input, location, lock, code, prop, or narrative beat.
- Use 5 puzzles for 45 mins, 6 puzzles for 60 mins, and 7-8 puzzles for 90 mins or multi-room/non-linear formats.
- Keep puzzle solutions fair and testable. Include a three-step hint ladder for every puzzle.

The JSON object must use exactly these top-level fields:
{
  "title": string,
  "tagline": string,
  "theme": string,
  "difficulty": "Beginner" | "Intermediate" | "Expert" | "Enthusiast-Only",
  "players": "2-4" | "4-6" | "6-8" | "8+",
  "duration": "45 mins" | "60 mins" | "90 mins",
  "format": "Single Room" | "Multi-Room" | "Linear" | "Non-Linear",
  "operator_summary": string,
  "story": {
    "introduction": string,
    "midpoint": string,
    "climax": string,
    "resolution": string
  },
  "puzzle_flow": [
    {
      "title": string,
      "role_in_flow": string,
      "estimated_time": string,
      "required_props": string[],
      "setup": string,
      "player_facing_clue": string,
      "hint_ladder": string[],
      "solution": string,
      "output": string,
      "reset_notes": string,
      "safety_or_ops_notes": string
    }
  ],
  "red_herrings": string[],
  "production_notes": string[],
  "shopping_list": string[],
  "staffing_notes": string,
  "reset_checklist": string[],
  "accessibility_notes": string[]
}`;

type Difficulty = typeof DIFFICULTIES[number];
type PlayerCount = typeof PLAYER_COUNTS[number];
type RoomFormat = typeof ROOM_FORMATS[number];
type Duration = typeof DURATIONS[number];
type AiProvider = typeof PROVIDERS[number];

type GenerateRoomBody = {
  theme?: unknown;
  difficulty?: unknown;
  players?: unknown;
  format?: unknown;
  duration?: unknown;
};

type ValidatedGenerateRoomBody = {
  theme: string;
  difficulty: Difficulty;
  players: PlayerCount;
  format: RoomFormat;
  duration: Duration;
};

type EntitledUserRecord = {
  id: string;
  email?: string;
  tier?: 'free' | 'pro';
  role?: string;
  is_pro?: boolean;
};

type GenerationCooldownRecord = {
  id: string;
  user_id: string;
  last_generated_at: string;
};

type RoomPuzzle = {
  title: string;
  role_in_flow: string;
  estimated_time: string;
  required_props: string[];
  setup: string;
  player_facing_clue: string;
  hint_ladder: string[];
  solution: string;
  output: string;
  reset_notes: string;
  safety_or_ops_notes: string;
};

type GeneratedRoom = {
  title: string;
  tagline: string;
  theme: string;
  difficulty: Difficulty;
  players: PlayerCount;
  duration: Duration;
  format: RoomFormat;
  operator_summary: string;
  story: {
    introduction: string;
    midpoint: string;
    climax: string;
    resolution: string;
  };
  puzzle_flow: RoomPuzzle[];
  red_herrings: string[];
  production_notes: string[];
  shopping_list: string[];
  staffing_notes: string;
  reset_checklist: string[];
  accessibility_notes: string[];
};

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function getBearerToken(headers: Record<string, string | undefined>): string {
  const authorization = headers.authorization || headers.Authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    throw namedError('UnauthorizedError', 'Authentication required. Please sign in before generating rooms.');
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
      throw namedError('UnauthorizedError', 'Authentication required. Please sign in again before generating rooms.');
    }

    if (!hasProEntitlement(user)) {
      throw namedError('ForbiddenError', 'Pro subscription required to generate rooms.');
    }

    return user;
  } catch (err) {
    if (err instanceof Error && (err.name === 'ForbiddenError' || err.name === 'UnauthorizedError')) {
      throw err;
    }

    throw namedError('UnauthorizedError', 'Authentication required. Your sign-in session could not be verified. Please sign out, sign back in, and try again.');
  }
}

function getGenerationCooldownSeconds(): number {
  const configured = Number(process.env.GENERATION_COOLDOWN_SECONDS || DEFAULT_GENERATION_COOLDOWN_SECONDS);
  if (!Number.isFinite(configured) || configured < 1) return DEFAULT_GENERATION_COOLDOWN_SECONDS;
  return Math.min(Math.floor(configured), 300);
}

async function enforceGenerationCooldown(pbUrl: string, userId: string): Promise<void> {
  const pb = new PocketBase(pbUrl);
  pb.authStore.save(requiredEnv('PB_SUPERUSER_TOKEN'));

  const cooldownSeconds = getGenerationCooldownSeconds();
  const now = new Date();
  const lastRecord = await pb.collection('generation_cooldowns')
    .getFirstListItem<GenerationCooldownRecord>(pb.filter('user_id = {:userId}', { userId }), { requestKey: null })
    .catch((err: unknown) => {
      if (typeof err === 'object' && err && 'status' in err && (err as { status?: number }).status === 404) {
        return null;
      }
      throw err;
    });

  if (lastRecord?.last_generated_at) {
    const lastGeneratedAt = Date.parse(lastRecord.last_generated_at);
    if (Number.isFinite(lastGeneratedAt)) {
      const elapsedSeconds = Math.floor((now.getTime() - lastGeneratedAt) / 1000);
      if (elapsedSeconds < cooldownSeconds) {
        const retryAfterSeconds = cooldownSeconds - elapsedSeconds;
        const error = namedError('RateLimitError', `Please wait ${retryAfterSeconds} more seconds before generating another room.`);
        (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds = retryAfterSeconds;
        throw error;
      }
    }

    await pb.collection('generation_cooldowns').update(lastRecord.id, {
      last_generated_at: now.toISOString(),
    }, { requestKey: null });
    return;
  }

  await pb.collection('generation_cooldowns').create({
    user_id: userId,
    last_generated_at: now.toISOString(),
  }, { requestKey: null });
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function validateBody(body: GenerateRoomBody): ValidatedGenerateRoomBody {
  const errors: Record<string, string> = {};
  const theme = typeof body.theme === 'string' ? body.theme.trim() : '';

  if (!theme) {
    errors.theme = 'Theme is required.';
  } else if (theme.length < 8) {
    errors.theme = 'Theme must include at least 8 characters so the generator has enough context.';
  } else if (theme.length > 1200) {
    errors.theme = 'Theme must be 1,200 characters or fewer.';
  }

  if (!isOneOf(body.difficulty, DIFFICULTIES)) {
    errors.difficulty = `Difficulty must be one of: ${DIFFICULTIES.join(', ')}.`;
  }

  if (!isOneOf(body.players, PLAYER_COUNTS)) {
    errors.players = `Players must be one of: ${PLAYER_COUNTS.join(', ')}.`;
  }

  if (!isOneOf(body.format, ROOM_FORMATS)) {
    errors.format = `Format must be one of: ${ROOM_FORMATS.join(', ')}.`;
  }

  if (!isOneOf(body.duration, DURATIONS)) {
    errors.duration = `Duration must be one of: ${DURATIONS.join(', ')}.`;
  }

  if (Object.keys(errors).length > 0) {
    const error = namedError('BadRequestError', 'Invalid generation request. Please correct the highlighted fields.');
    (error as Error & { details?: Record<string, string> }).details = errors;
    throw error;
  }

  return {
    theme,
    difficulty: body.difficulty as Difficulty,
    players: body.players as PlayerCount,
    format: body.format as RoomFormat,
    duration: body.duration as Duration,
  };
}

function getProvider(): AiProvider {
  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (!configuredProvider) {
    throw namedError('MissingEnvironmentVariableError', 'AI provider is not configured. Set AI_PROVIDER to anthropic, openai, gemini, or mock.');
  }

  if (!PROVIDERS.includes(configuredProvider as AiProvider)) {
    throw namedError('MissingEnvironmentVariableError', 'AI provider is not configured. AI_PROVIDER must be anthropic, openai, gemini, or mock.');
  }

  return configuredProvider as AiProvider;
}

function getModel(provider: AiProvider): string {
  const configuredModel = process.env.AI_MODEL?.trim();
  if (configuredModel) return configuredModel;

  if (provider === 'anthropic') return 'claude-opus-4-8';
  if (provider === 'openai') return 'gpt-4.1-mini';
  if (provider === 'gemini') return 'gemini-2.5-flash';
  return 'mock-room-designer-v1';
}

function buildUserPrompt(input: ValidatedGenerateRoomBody): string {
  return `Design a complete physical escape room using these exact request parameters:\n- Theme / Story Seed: ${input.theme}\n- Difficulty: ${input.difficulty}\n- Players: ${input.players}\n- Format: ${input.format}\n- Duration: ${input.duration}\n\nReturn the required strict JSON object only. Make every puzzle practical to build, with physical props and reset considerations. Ensure every puzzle output clearly unlocks or informs the next puzzle.`;
}

function extractTextFromOpenAi(data: unknown): string {
  const response = data as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = response.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

function extractTextFromAnthropic(data: unknown): string {
  const response = data as { content?: Array<{ type?: string; text?: unknown }> };
  return (response.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('')
    .trim();
}

function extractTextFromGemini(data: unknown): string {
  const response = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> };
  return response.candidates?.[0]?.content?.parts?.map((part) => typeof part.text === 'string' ? part.text : '').join('').trim() || '';
}

function extractJsonCandidate(rawText: string): string {
  const text = rawText.trim();
  if (!text) {
    throw namedError('ProviderResponseError', 'AI provider returned an empty response. Please try again.');
  }

  const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fencedJson) return fencedJson;

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw namedError('ProviderResponseError', 'AI provider returned a response without a valid JSON object. Please try again.');
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function parseRoomJson(rawText: string): unknown {
  const candidate = extractJsonCandidate(rawText);

  try {
    return JSON.parse(candidate);
  } catch {
    const repaired = candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

    try {
      return JSON.parse(repaired);
    } catch {
      throw namedError('ProviderResponseError', 'AI provider returned malformed JSON. Please retry generation.');
    }
  }
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function normalizeRoom(value: unknown, request: ValidatedGenerateRoomBody): GeneratedRoom {
  const room = value as Partial<GeneratedRoom> & Record<string, unknown>;
  const story = room.story as Partial<GeneratedRoom['story']> | undefined;
  const puzzleFlow = Array.isArray(room.puzzle_flow) ? room.puzzle_flow : [];

  const normalized: GeneratedRoom = {
    title: stringValue(room.title, `${request.theme.slice(0, 48)} Room`),
    tagline: stringValue(room.tagline, 'A practical escape-room concept generated for operators.'),
    theme: stringValue(room.theme, request.theme),
    difficulty: isOneOf(room.difficulty, DIFFICULTIES) ? room.difficulty : request.difficulty,
    players: isOneOf(room.players, PLAYER_COUNTS) ? room.players : request.players,
    duration: isOneOf(room.duration, DURATIONS) ? room.duration : request.duration,
    format: isOneOf(room.format, ROOM_FORMATS) ? room.format : request.format,
    operator_summary: stringValue(room.operator_summary, 'Review the full puzzle flow, reset checklist, staffing notes, and shopping list before production.'),
    story: {
      introduction: stringValue(story?.introduction, 'Players enter the experience and discover the central mission.'),
      midpoint: stringValue(story?.midpoint, 'The investigation reveals a complication that reframes the objective.'),
      climax: stringValue(story?.climax, 'The final puzzle resolves the main threat or mystery.'),
      resolution: stringValue(story?.resolution, 'Players complete the mission and receive narrative closure.'),
    },
    puzzle_flow: puzzleFlow.map((rawPuzzle, index) => {
      const puzzle = rawPuzzle as Partial<RoomPuzzle> & Record<string, unknown>;
      return {
        title: stringValue(puzzle.title, `Puzzle ${index + 1}`),
        role_in_flow: stringValue(puzzle.role_in_flow, index === 0 ? 'Opening puzzle that establishes the first actionable lead.' : 'Linked puzzle that uses the previous output.'),
        estimated_time: stringValue(puzzle.estimated_time, '8-12 minutes'),
        required_props: stringArray(puzzle.required_props),
        setup: stringValue(puzzle.setup, 'Operator sets the puzzle before players enter.'),
        player_facing_clue: stringValue(puzzle.player_facing_clue, 'Players discover the next clue through observation and teamwork.'),
        hint_ladder: stringArray(puzzle.hint_ladder).slice(0, 4),
        solution: stringValue(puzzle.solution, 'Players combine the available evidence to produce the output.'),
        output: stringValue(puzzle.output, `Output ${index + 1}`),
        reset_notes: stringValue(puzzle.reset_notes, 'Return all props to their starting positions and relock any containers.'),
        safety_or_ops_notes: stringValue(puzzle.safety_or_ops_notes, 'Use theatrical, non-hazardous props only.'),
      };
    }),
    red_herrings: stringArray(room.red_herrings),
    production_notes: stringArray(room.production_notes),
    shopping_list: stringArray(room.shopping_list),
    staffing_notes: stringValue(room.staffing_notes, 'One game master can operate the room, with a second staff member recommended for resets or large groups.'),
    reset_checklist: stringArray(room.reset_checklist),
    accessibility_notes: stringArray(room.accessibility_notes),
  };

  const requestedMinimumPuzzles = request.duration === '45 mins' ? 5 : request.duration === '60 mins' ? 6 : 7;
  if (normalized.puzzle_flow.length < 5 || normalized.puzzle_flow.length > 8 || normalized.puzzle_flow.length < requestedMinimumPuzzles) {
    throw namedError('ProviderResponseError', 'AI provider returned an incomplete puzzle flow. Please retry generation.');
  }

  for (const [index, puzzle] of normalized.puzzle_flow.entries()) {
    if (!puzzle.required_props.length) {
      throw namedError('ProviderResponseError', `AI provider returned puzzle ${index + 1} without required props. Please retry generation.`);
    }

    if (puzzle.hint_ladder.length < 2) {
      throw namedError('ProviderResponseError', `AI provider returned puzzle ${index + 1} without enough hints. Please retry generation.`);
    }
  }

  return normalized;
}

function mockRoom(input: ValidatedGenerateRoomBody): GeneratedRoom {
  const puzzleCount = input.duration === '45 mins' ? 5 : input.duration === '60 mins' ? 6 : input.format === 'Multi-Room' || input.format === 'Non-Linear' ? 8 : 7;
  const puzzles: RoomPuzzle[] = Array.from({ length: puzzleCount }, (_, index) => {
    const nextOutput = index === puzzleCount - 1 ? 'Final override phrase: THE ROOM IS SAFE' : `Code fragment ${index + 1} for puzzle ${index + 2}`;
    return {
      title: `Mock Puzzle ${index + 1}: ${index === 0 ? 'The Operator Log' : `Linked Station ${index + 1}`}`,
      role_in_flow: index === 0
        ? 'Introduces the mission and produces the first code fragment.'
        : `Uses the previous puzzle output to open or interpret station ${index + 1}.`,
      estimated_time: index === puzzleCount - 1 ? '10-12 minutes' : '7-10 minutes',
      required_props: ['laminated clue card', 'three-digit resettable lock', 'themed container', 'dry-erase operator reset card'],
      setup: `Place station ${index + 1} in the room with its lock set to the previous output or the opening code. Keep the theatrical ${input.theme} dressing non-hazardous and clearly resettable.`,
      player_facing_clue: index === 0
        ? `A field log hints that every ${input.theme} artifact produces one ordered fragment.`
        : `A marked symbol from the previous output points players to this station's prop set.`,
      hint_ladder: [
        'Look for matching symbols between the last output and the next object.',
        'The order is physical: left to right, top to bottom, or numbered by the prop labels.',
        'Combine the highlighted marks to form the lock code or phrase exactly as written.',
      ],
      solution: `Players apply the previous output, inspect the station props, and extract the next ordered code fragment through observation rather than force.`,
      output: nextOutput,
      reset_notes: `Return station ${index + 1} props to their start positions, erase any writing, reset the lock, and confirm the output card is hidden until solved.`,
      safety_or_ops_notes: 'Use lightweight theatrical props, no real hazards, no sharp edges, and no locked egress doors.',
    };
  });

  return {
    title: `Mock ${input.theme} Escape Room`,
    tagline: 'A provider-neutral local-development sample for PuzzleFlow AI.',
    theme: input.theme,
    difficulty: input.difficulty,
    players: input.players,
    duration: input.duration,
    format: input.format,
    operator_summary: `This mock ${input.duration} ${input.format.toLowerCase()} room demonstrates the complete response contract without calling an external AI provider.`,
    story: {
      introduction: `Players enter a staged ${input.theme} scenario and discover that the room can only be resolved by rebuilding a chain of evidence.`,
      midpoint: 'The early solution reveals that the obvious story is incomplete, forcing players to revisit props with new context.',
      climax: 'The final station combines all prior fragments into a single override phrase or code.',
      resolution: 'Players trigger the safe ending, receive narrative closure, and operators can reset the room with the checklist below.',
    },
    puzzle_flow: puzzles,
    red_herrings: [
      'A decorative ledger with dates that do not correspond to any lock.',
      'A color-coded shelf label that looks important but only identifies reset bins.',
      'A theatrical warning placard that reinforces theme without containing a code.',
    ],
    production_notes: [
      'Keep every lock accessible to staff from a master reset kit.',
      'Prototype the chain with paper props before fabricating permanent scenic elements.',
      'Playtest with one novice and one enthusiast group before opening to guests.',
    ],
    shopping_list: [
      'Resettable combination locks',
      'Laminated clue cards',
      'Themed containers or boxes',
      'Dry-erase reset checklist',
      'Non-hazardous scenic dressing',
    ],
    staffing_notes: 'One trained game master can run this mock room; add a reset assistant during high-throughput operations.',
    reset_checklist: [
      'Collect all loose clue cards.',
      'Reset every lock to its starting combination.',
      'Return each station output to its hidden location.',
      'Verify no player writing remains on reusable props.',
      'Run the first and final puzzle checks before the next group enters.',
    ],
    accessibility_notes: [
      'Avoid relying only on color; pair colors with symbols or text labels.',
      'Keep at least one clue path readable from a seated position.',
      'Provide staff-approved hint delivery for auditory or low-vision accommodations.',
    ],
  };
}

async function callAnthropic(model: string, input: ValidatedGenerateRoomBody): Promise<string> {
  const apiKey = requiredEnv('ANTHROPIC_API_KEY');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt(input) },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
      ? (data as { error: { message: string } }).error.message
      : 'Anthropic generation failed.';
    throw namedError('ProviderRequestError', providerMessage);
  }

  return extractTextFromAnthropic(data);
}

async function callOpenAi(model: string, input: ValidatedGenerateRoomBody): Promise<string> {
  const apiKey = requiredEnv('OPENAI_API_KEY');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
      ? (data as { error: { message: string } }).error.message
      : 'OpenAI generation failed.';
    throw namedError('ProviderRequestError', providerMessage);
  }

  return extractTextFromOpenAi(data);
}

async function callGemini(model: string, input: ValidatedGenerateRoomBody): Promise<string> {
  const apiKey = requiredEnv('GEMINI_API_KEY');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
      ? (data as { error: { message: string } }).error.message
      : 'Gemini generation failed.';
    throw namedError('ProviderRequestError', providerMessage);
  }

  return extractTextFromGemini(data);
}

async function generateRoom(input: ValidatedGenerateRoomBody): Promise<{ provider: AiProvider; model: string; room: GeneratedRoom }> {
  const provider = getProvider();
  const model = getModel(provider);

  if (provider === 'mock') {
    return { provider, model, room: mockRoom(input) };
  }

  const rawText = provider === 'anthropic'
    ? await callAnthropic(model, input)
    : provider === 'openai'
      ? await callOpenAi(model, input)
      : await callGemini(model, input);

  const parsed = parseRoomJson(rawText);
  return { provider, model, room: normalizeRoom(parsed, input) };
}

export const handler: Handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') {
    return emptyOptionsResponse(requestOrigin);
  }

  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS'], requestOrigin);
  }

  try {
    const pocketBaseUrl = requiredEnv('PB_URL');
    const token = getBearerToken(event.headers);
    const user = await getAuthenticatedProUser(pocketBaseUrl, token);
    const body = parseJsonBody<GenerateRoomBody>(event.body);
    const input = validateBody(body);
    await enforceGenerationCooldown(pocketBaseUrl, user.id);
    const { provider, model, room } = await generateRoom(input);

    console.info('Generated PuzzleFlow room for Pro user', { userId: user.id, provider, model });
    return jsonResponse(200, room, {}, requestOrigin);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsonResponse(401, { error: err.message }, {}, requestOrigin);
    }

    if (err instanceof Error && err.name === 'ForbiddenError') {
      return jsonResponse(403, { error: err.message }, {}, requestOrigin);
    }

    if (err instanceof Error && err.name === 'BadRequestError') {
      return jsonResponse(400, {
        error: err.message,
        details: (err as Error & { details?: Record<string, string> }).details,
      }, {}, requestOrigin);
    }

    if (err instanceof Error && err.name === 'MissingEnvironmentVariableError') {
      return jsonResponse(500, { error: err.message || 'AI provider is not configured.' }, {}, requestOrigin);
    }

    if (err instanceof Error && (err.name === 'ProviderResponseError' || err.name === 'ProviderRequestError')) {
      return jsonResponse(502, { error: err.message }, {}, requestOrigin);
    }

    if (err instanceof Error && err.name === 'RateLimitError') {
      const retryAfterSeconds = (err as Error & { retryAfterSeconds?: number }).retryAfterSeconds || getGenerationCooldownSeconds();
      return jsonResponse(429, {
        error: err.message,
        retryAfterSeconds,
      }, {
        'Retry-After': String(retryAfterSeconds),
      }, requestOrigin);
    }

    return errorResponse(err, 'Generation failed. Please try again.', 500, requestOrigin);
  }
};
