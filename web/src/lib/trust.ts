export type Stats = {
  completed: number; onTime: number; damaged: number; disputesLost: number;
  lent: number; careCount: number; careSum: number;
};

// Pure function of the on-chain counters, so anyone can recompute it.
// With little history the score stays near 50 (neutral); it moves as completed borrows accumulate.
export function trustScore(s: Stats): { score: number; label: string } {
  const n = s.completed;
  const onTimeRate = n ? s.onTime / n : 0;
  const cleanRate = n ? 1 - s.damaged / n : 0;
  const care = s.careCount ? s.careSum / s.careCount / 5 : 0;
  const raw = 100 * (0.4 * onTimeRate + 0.3 * cleanRate + 0.3 * care);
  const w = n / (n + 3);
  let score = 50 * (1 - w) + raw * w;
  score = score - 15 * s.disputesLost + Math.min(s.lent, 5) * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label =
    n === 0 && s.lent === 0 ? "New member" : score >= 80 ? "Trusted" : score >= 60 ? "Reliable" : score >= 40 ? "Building" : "Risky";
  return { score, label };
}