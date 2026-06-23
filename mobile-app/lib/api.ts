const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success)
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  return json.data as T;
}
