import { Redis } from "@upstash/redis";

/** Public health stats cache keys (invalidate on admin CRUD). */
export const CACHE_KEYS = {
  allReferenceStats: "sihatq:health_reference_stats:all",
  dosm2024: "sihatq:health_reference_stats:dosm:2024",
} as const;

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

let redis: Redis | null | undefined;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (!isRedisConfigured()) {
    redis = null;
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const value = await client.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error("Redis GET failed", key, error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis SET failed", key, error);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch (error) {
    console.error("Redis DEL failed", keys, error);
  }
}

/** Call after admin creates/updates/deletes reference stats. */
export async function invalidateHealthStatsCache(): Promise<void> {
  await cacheDel(CACHE_KEYS.allReferenceStats, CACHE_KEYS.dosm2024);
}
