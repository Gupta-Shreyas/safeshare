export function toast(text: string, type: "ok" | "error" = "ok") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ss-toast", { detail: { text, type } }));
}

const OK_ACTION: Record<string, string> = {
  request: "Request sent to the owner",
  approve: "Request approved",
  reject: "Request rejected",
  cancel: "Request cancelled",
  checkout: "Handover confirmed on the blockchain",
  return: "Return started",
  confirmReturn: "Return confirmed on the blockchain",
  dispute: "Dispute raised",
  resolve: "Dispute resolved",
  retire: "Item retired",
};

function notify(path: string, method: string, ok: boolean, body: any, data: any) {
  if (method === "GET") return;
  let okText: string | null = null;
  if (path.startsWith("/api/resources/action")) okText = OK_ACTION[body?.action] ?? "Done";
  else if (path === "/api/alerts") okText = "Alert sent to the community";
  else if (path === "/api/admin/verify") okText = "User verified on-chain";
  else if (path === "/api/admin/blacklist") okText = "Blacklist updated on-chain";
  else if (path === "/api/admin/pause") okText = "Contract state updated";
  if (okText === null) return;
  toast(ok ? okText : data?.error ?? "Something went wrong", ok ? "ok" : "error");
}

export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    notify(path, method, res.ok, body, data);
    return { ok: res.ok, status: res.status, data };
  } catch {
    const error = "Can't reach the server. Check your connection and try again.";
    if (method !== "GET") toast(error, "error");
    return { ok: false, status: 0, data: { error } as unknown as T };
  }
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;