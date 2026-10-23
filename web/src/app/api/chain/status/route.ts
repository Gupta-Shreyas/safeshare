import { NextResponse } from "next/server";
import type { ethers } from "ethers";
import { db } from "@/lib/db";
import { guard } from "@/lib/guard";
import { provider, readContract, CONTRACT_ADDRESS } from "@/lib/chain";
import { ensureSchema } from "@/lib/resources";

type Val = string | number | boolean;
type Raw = { from: string; fn: string; args: Record<string, Val>; events: { name: string; a: Record<string, Val> }[] };
type Kind = "permission" | "request" | "exchange" | "listing" | "dispute" | "system";

// Transactions never change once mined, so each one is decoded only once.
const gl = globalThis as unknown as { __sstx?: Map<string, Raw> };
const cache = (gl.__sstx ??= new Map<string, Raw>());

const plain = (v: unknown): Val => (typeof v === "bigint" ? Number(v) : typeof v === "boolean" || typeof v === "number" ? v : String(v));

async function readTx(hash: string, iface: ethers.Interface): Promise<Raw> {
  const hit = cache.get(hash);
  if (hit) return hit;
  const [tx, rc] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
  const raw: Raw = { from: tx?.from ?? "", fn: "unknown", args: {}, events: [] };

  if (tx) {
    if (!tx.to) raw.fn = "deploy";
    else {
      const p = iface.parseTransaction({ data: tx.data, value: tx.value });
      if (p) {
        raw.fn = p.name;
        p.fragment.inputs.forEach((inp, i) => {
          raw.args[inp.name] = plain(p.args[i]);
        });
      }
    }
  }
  for (const log of rc?.logs ?? []) {
    try {
      const e = iface.parseLog(log);
      if (!e) continue;
      const a: Record<string, Val> = {};
      e.fragment.inputs.forEach((inp, i) => {
        a[inp.name] = plain(e.args[i]);
      });
      raw.events.push({ name: e.name, a });
    } catch {}
  }
  if (rc) {
    if (cache.size > 2000) cache.clear();
    cache.set(hash, raw);
  }
  return raw;
}

function describe(
  raw: Raw,
  who: (a?: string) => string,
  item: (id: number) => string
): { kind: Kind; label: string; text: string } {
  const by = who(raw.from);
  const a = raw.args;
  const ev = (n: string): Record<string, Val> => raw.events.find((e) => e.name === n)?.a ?? {};
  const id = Number(a.id ?? 0);
  const t = `"${item(id)}"`;

  switch (raw.fn) {
    case "deploy":
      return { kind: "system", label: "Contract deployed", text: `The SafeShare smart contract was deployed by ${by}. This is where the shared rules live.` };
    case "verifyUser":
      return {
        kind: "permission", label: "Permission granted",
        text: `${by} verified ${who(String(a.user))} as a trusted member. They can now borrow and lend, and received ${ev("UserVerified").credits ?? 100} starting credits.`,
      };
    case "revokeUser":
      return { kind: "permission", label: "Permission removed", text: `${by} removed the verified status of ${who(String(a.user))}.` };
    case "setBlacklist":
      return a.status
        ? { kind: "permission", label: "Permission removed", text: `${by} blacklisted ${who(String(a.user))} and blocked them from the network.` }
        : { kind: "permission", label: "Permission granted", text: `${by} lifted the blacklist on ${who(String(a.user))}.` };
    case "pause":
      return { kind: "system", label: "System paused", text: `${by} paused the whole system. Nobody can register, request or check out until it resumes.` };
    case "unpause":
      return { kind: "system", label: "System resumed", text: `${by} resumed the system. Everything works normally again.` };
    case "registerResource": {
      const e = ev("ResourceRegistered");
      return {
        kind: "listing", label: "Item listed",
        text: `${by} listed "${item(Number(e.id ?? 0))}" for lending. Deposit ${a.deposit} credits, condition ${a.condition}/5.`,
      };
    }
    case "retireResource":
      return { kind: "listing", label: "Item retired", text: `${by} retired ${t} from the network.` };
    case "requestResource":
      return { kind: "request", label: "Borrow request", text: `${by} asked to borrow ${t} for ${a.durationHours} hour${Number(a.durationHours) === 1 ? "" : "s"}.` };
    case "cancelRequest":
      return { kind: "request", label: "Request cancelled", text: `${by} cancelled the request for ${t}.` };
    case "approveRequest":
      return { kind: "request", label: "Request approved", text: `${by} approved ${who(String(ev("RequestApproved").borrower ?? ""))}'s request to borrow ${t}.` };
    case "rejectRequest":
      return { kind: "request", label: "Request rejected", text: `${by} rejected ${who(String(ev("RequestRejected").borrower ?? ""))}'s request to borrow ${t}.` };
    case "confirmCheckout": {
      const e = ev("CheckedOut");
      return {
        kind: "exchange", label: "Handover",
        text: `${by} handed ${t} to ${who(String(e.borrower ?? ""))} after a QR check. Condition at handover: ${a.conditionBefore}/5.`,
      };
    }
    case "returnResource":
      return { kind: "exchange", label: "Return started", text: `${by} started returning ${t}.` };
    case "confirmReturn": {
      const e = ev("ReturnConfirmed");
      const slashed = Number(e.slashed ?? 0);
      return {
        kind: "exchange", label: "Return confirmed",
        text:
          `${by} confirmed the return of ${t} from ${who(String(e.borrower ?? ""))}: ` +
          `${e.late ? "late" : "on time"}, ${e.damaged ? "damaged" : "no damage"}, care rating ${a.careRating}/5. ` +
          `${e.refunded ?? 0} credits refunded${slashed > 0 ? `, ${slashed} kept as a penalty` : ""}.`,
      };
    }
    case "raiseDispute":
      return { kind: "dispute", label: "Dispute raised", text: `${by} raised a dispute about ${t}.` };
    case "resolveDispute":
      return { kind: "dispute", label: "Dispute resolved", text: `${by} resolved the dispute about ${t}. ${Number(a.borrowerRefundBps) / 100}% of the deposit went back to the borrower.` };
    default:
      return { kind: "system", label: raw.fn, text: `${by} called ${raw.fn}.` };
  }
}

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  ensureSchema();
  try {
    const c = readContract();
    const [net, latest, paused, count] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      c.paused(),
      c.resourceCount(),
    ]);

    // Names come from the database: wallet address to username, resource id to item title.
    const names = new Map<string, string>();
    for (const u of db.prepare("SELECT username, address FROM users").all()) names.set(String(u.address).toLowerCase(), String(u.username));
    const who = (a?: string) => (a ? names.get(a.toLowerCase()) ?? `${a.slice(0, 6)}...${a.slice(-4)}` : "someone");
    const item = (id: number) => {
      const r = db.prepare("SELECT title FROM resources WHERE chain_id = ?").get(id);
      return r ? String(r.title) : `item #${id}`;
    };

    const nums: number[] = [];
    for (let n = latest; n >= Math.max(0, latest - 11); n--) nums.push(n);

    const blocks = await Promise.all(
      nums.map(async (n) => {
        const b = await provider.getBlock(n);
        if (!b) return null;
        const txs = await Promise.all(
          b.transactions.map(async (h) => ({ hash: h, ...describe(await readTx(h, c.interface), who, item) }))
        );
        return {
          number: b.number,
          hash: b.hash,
          timestamp: b.timestamp,
          gasUsed: b.gasUsed.toString(),
          txCount: b.transactions.length,
          txs,
        };
      })
    );

    return NextResponse.json({
      chainId: Number(net.chainId),
      latest,
      contract: CONTRACT_ADDRESS,
      paused,
      resourceCount: Number(count),
      blocks: blocks.filter(Boolean),
    });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}