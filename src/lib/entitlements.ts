import type { UserRecord } from '../types';

export type EntitlementStatus = 'unknown' | 'free' | 'pro';

export function hasProEntitlement(user: Partial<Pick<UserRecord, 'tier' | 'role' | 'is_pro'>> | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'pro' || user.is_pro === true || user.tier === 'pro';
}

export function getEntitlementStatus(user: Partial<Pick<UserRecord, 'tier' | 'role' | 'is_pro'>> | null | undefined, isLoading: boolean): EntitlementStatus {
  if (isLoading) return 'unknown';
  return hasProEntitlement(user) ? 'pro' : 'free';
}

export function describeEntitlementDelay(): string {
  return 'Stripe confirmed the payment, but PocketBase has not reflected Pro access yet. This usually means the Stripe webhook is still processing or needs configuration review.';
}
