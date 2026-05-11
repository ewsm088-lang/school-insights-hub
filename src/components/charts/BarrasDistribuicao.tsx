import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { classifyVDI, VDI_COLORS } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

export function BarrasDistribuicao({ vdis }: { vdis: VDIExtra[] }) {
  const byClass = new Map<string, { integrado: number; parcial: number; vulneravel: number }>();
  for (const v of vdis) {
    const key = `${v.serie ?? ""} ${v.turma ?? ""}`.trim() || v.classId;
    if (!byClass.has(key)) byClass.set(key, { integrado: 0, parcial: 0, vulneravel: 0 });
    byClass.get(key)![classifyVDI(v.modulo)]++;
  }
  const data = Array.from(byClass.entries()).map(([nome, c]) => {
    const total = c.integrado + c.parcial + c.vulneravel || 1;
    return {
      nome,
      Integrado: +(100 * c.integrado / total).toFixed(1),
      Parcial: +(100 * c.parcial / total).toFixed(1),
      Vulnerável: +(100 * c.vulneravel / total).toFixed(1),
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
        <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(v: number) => `${v}%`} />
        <Legend />
        <Bar dataKey="Vulnerável" stackId="a" fill={VDI_COLORS.vulneravel} />
        <Bar dataKey="Parcial" stackId="a" fill={VDI_COLORS.parcial} />
        <Bar dataKey="Integrado" stackId="a" fill={VDI_COLORS.integrado} />
      </BarChart>
    </ResponsiveContainer>
  );
}
