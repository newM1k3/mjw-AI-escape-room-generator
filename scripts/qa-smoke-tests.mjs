#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.env.QA_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:8888');
const timeoutMs = Number.parseInt(process.env.QA_TIMEOUT_MS || '10000', 10);

const checks = [
  {
    name: 'Landing page loads for logged-out visitors',
    run: () => expectHtml('/', { expectedStatus: 200, mustContain: ['PuzzleFlow'] }),
  },
  {
    name: 'Demo room route loads for logged-out visitors',
    run: () => expectHtml('/demo', { expectedStatus: 200, mustContain: ['PuzzleFlow'] }),
  },
  {
    name: 'Protected app route is served by the SPA shell',
    run: () => expectHtml('/app', { expectedStatus: 200, mustContain: ['PuzzleFlow'] }),
  },
  {
    name: 'Unknown SPA route falls back to the React shell',
    run: () => expectHtml('/definitely-not-a-real-route', { expectedStatus: 200, mustContain: ['PuzzleFlow'] }),
  },
  {
    name: 'generate-room rejects unsupported GET method with 405',
    run: () => expectJson('/.netlify/functions/generate-room', {
      method: 'GET',
      expectedStatus: 405,
      mustContainHeader: ['allow', 'POST'],
    }),
  },
  {
    name: 'create-checkout-session rejects unsupported GET method with 405',
    run: () => expectJson('/.netlify/functions/create-checkout-session', {
      method: 'GET',
      expectedStatus: 405,
      mustContainHeader: ['allow', 'POST'],
    }),
  },
  {
    name: 'generate-room rejects unauthenticated direct POST calls',
    run: () => expectJson('/.netlify/functions/generate-room', {
      method: 'POST',
      expectedStatus: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'A lighthouse mystery with a storm-damaged radio room',
        difficulty: 'Intermediate',
        players: '4-6',
        format: 'Single Room',
        duration: '60 mins',
      }),
    }),
  },
  {
    name: 'create-checkout-session rejects unauthenticated direct POST calls',
    run: () => expectJson('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      expectedStatus: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  },
];

const optionalToken = process.env.QA_POCKETBASE_AUTH_TOKEN?.trim();
if (optionalToken) {
  checks.push({
    name: 'Authenticated generate-room smoke call returns an expected protected outcome',
    run: () => expectJson('/.netlify/functions/generate-room', {
      method: 'POST',
      expectedStatuses: [200, 403, 429, 500],
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${optionalToken}`,
      },
      body: JSON.stringify({
        theme: 'A botanical conservatory where rare orchids hide a coded inheritance dispute',
        difficulty: 'Intermediate',
        players: '4-6',
        format: 'Single Room',
        duration: '60 mins',
      }),
    }),
  });
}

let failures = 0;
console.log(`Running PuzzleFlow AI smoke tests against ${baseUrl}`);

for (const check of checks) {
  try {
    await check.run();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  console.error(`Smoke test run completed with ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log('Smoke test run completed successfully.');

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function buildUrl(path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(buildUrl(path), {
      redirect: 'manual',
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectHtml(path, { expectedStatus, mustContain = [] }) {
  const response = await fetchWithTimeout(path, { method: 'GET' });
  assertStatus(response, [expectedStatus]);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Expected HTML response for ${path}, received content-type '${contentType || 'none'}'.`);
  }

  const html = await response.text();
  for (const snippet of mustContain) {
    if (!html.includes(snippet)) {
      throw new Error(`Expected ${path} HTML to contain '${snippet}'.`);
    }
  }
}

async function expectJson(path, { method, expectedStatus, expectedStatuses, headers, body, mustContainHeader }) {
  const response = await fetchWithTimeout(path, { method, headers, body });
  assertStatus(response, expectedStatuses || [expectedStatus]);

  if (mustContainHeader) {
    const [headerName, expectedValue] = mustContainHeader;
    const actualValue = response.headers.get(headerName) || '';
    if (!actualValue.toUpperCase().includes(expectedValue.toUpperCase())) {
      throw new Error(`Expected ${headerName} header to include '${expectedValue}', received '${actualValue || 'none'}'.`);
    }
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    await response.json();
  }
}

function assertStatus(response, expectedStatuses) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`Expected HTTP ${expectedStatuses.join(' or ')}, received HTTP ${response.status} for ${response.url}.`);
  }
}
