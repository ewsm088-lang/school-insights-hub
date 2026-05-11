import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { calcIEDE, calcDesvioPadrao, vdiColor } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

export function BubbleEquidade({ vdis }: { vdis: VDIExtra[] }) {
  const byClass = new Map<string, VDIExtra[]>();
  for (const v of vdis) {
    const key = `${v.serie ?? ""} ${v.turma ?? ""}`.trim() || v.classId;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(v);
  }
  const data = Array.from(byClass.entries()).map(([nome, list]) => {
    const iede = calcIEDE(list);
    return { nome, iede, sigma: calcDesvioPadrao(list), n: list.length, color: vdiColor(iede) };
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="iede" name="IEDE" domain={[0, 1.732]} tick={{ fontSize: 12 }}
          label={{ value: "IEDE da turma", position: "insideBottom", offset: -10, fontSize: 12 }} />
        <YAxis type="number" dataKey="sigma" name="σ" tick={{ fontSize: 12 }}
          label={{ value: "Desvio σ (desigualdade)", angle: -90, position: "insideLeft", fontSize: 12 }} />
        <ZAxis type="number" dataKey="n" range={[80, 600]} name="alunos" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          formatter={(v: number, n: string) => [typeof v === "number" ? v.toFixed(3) : v, n]}
          labelFormatter={() => ""}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p: any = payload[0].payload;
            return (
              <div className="rounded-md border bg-card p-2 text-xs">
                <div className="font-semibold">{p.nome}</div>
                <div>IEDE: {p.iede.toFixed(3)}</div>
                <div>σ: {p.sigma.toFixed(3)}</div>
                <div>Alunos: {p.n}</div>
              </div>
            );
          }}
        />
        <Scatter data={data}>
          {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
