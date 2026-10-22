export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}