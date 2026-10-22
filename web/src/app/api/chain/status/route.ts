import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { provider, readContract, CONTRACT_ADDRESS } from "@/lib/chain";

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  try {
    const c = readContract();
    const [net, latest, paused, count] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      c.paused(),
      c.resourceCount(),
    ]);
    const blocks = [];
    for (let n = latest; n >= Math.max(0, latest - 7); n--) {
      const b = await provider.getBlock(n);
      if (b)
        blocks.push({
          number: b.number,
          hash: b.hash,
          timestamp: b.timestamp,
          gasUsed: b.gasUsed.toString(),
          txCount: b.transactions.length,
          txs: b.transactions,
        });
    }
    return NextResponse.json({
      chainId: Number(net.chainId),
      latest,
      contract: CONTRACT_ADDRESS,
      paused,
      resourceCount: Number(count),
      blocks,
    });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}