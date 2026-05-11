import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { VDI_COLORS, type VDIResult } from "@/lib/descartes";

export function HistogramaVDI({ vdis }: { vdis: VDIResult[] }) {
  const buckets = [
    { range: "0 – 0.58", label: "Vulnerável", color: VDI_COLORS.vulneravel, count: 0 },
    { range: "0.58 – 1.15", label: "Parcial", color: VDI_COLORS.parcial, count: 0 },
    { range: "1.15 – 1.73", label: "Integrado", color: VDI_COLORS.integrado, count: 0 },
  ];
  for (const v of vdis) {
    if (v.modulo < 0.58) buckets[0].count++;
    else if (v.modulo < 1.15) buckets[1].count++;
    else buckets[2].count++;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={buckets} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(value: number, _n: string, item: any) => [`${value} alunos`, item?.payload?.range]}
          labelFormatter={(l) => l}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Bar dataKey="count" radius={[6,6,0,0]}>
          {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
