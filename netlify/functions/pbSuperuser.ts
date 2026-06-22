import PocketBase from 'pocketbase';

/**
 * Returns a PocketBase client authenticated as a superuser.
 *
 * Prefers a static `PB_SUPERUSER_TOKEN` (back-compat), otherwise authenticates per-request with
 * `PB_SUPERUSER_EMAIL` + `PB_SUPERUSER_PASSWORD`. Per-request auth is the hardened path: PocketBase
 * superuser tokens are short-lived, so a static token silently breaks entitlement grants (webhook)
 * and the generation cooldown once it expires. Matches the funnel tools' superuser-auth pattern.
 */
export async function getSuperuserPb(pbUrl: string): Promise<PocketBase> {
  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);

  const token = process.env.PB_SUPERUSER_TOKEN?.trim();
  if (token) {
    pb.authStore.save(token);
    return pb;
  }

  const email = process.env.PB_SUPERUSER_EMAIL?.trim();
  const password = process.env.PB_SUPERUSER_PASSWORD?.trim();
  if (!email || !password) {
    const error = new Error('PocketBase superuser auth is not configured (set PB_SUPERUSER_TOKEN, or PB_SUPERUSER_EMAIL + PB_SUPERUSER_PASSWORD).');
    error.name = 'MissingEnvironmentVariableError';
    throw error;
  }

  await pb.collection('_superusers').authWithPassword(email, password);
  return pb;
}
