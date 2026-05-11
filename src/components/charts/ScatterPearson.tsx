import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { calcPearson, vdiColor } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

export function ScatterPearson({ vdis }: { vdis: VDIExtra[] }) {
  const withAcad = vdis.filter((v) => v.A > 0);
  const data = withAcad.map((v) => ({ x: v.A, y: v.S, nome: v.nome, color: vdiColor(v.modulo), modulo: v.modulo }));
  const r = calcPearson(withAcad.map((v) => v.S), withAcad.map((v) => v.A));

  // Linear regression: y = m*x + b
  const n = data.length || 1;
  const meanX = data.reduce((s, p) => s + p.x, 0) / n;
  const meanY = data.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of data) { num += (p.x - meanX) * (p.y - meanY); den += (p.x - meanX) ** 2; }
  const m = den === 0 ? 0 : num / den;
  const b = meanY - m * meanX;
  const lineData = [{ x: 0, y: Math.max(0, Math.min(1, b)) }, { x: 1, y: Math.max(0, Math.min(1, m + b)) }];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Acadêmico" domain={[0, 1]} tick={{ fontSize: 12 }}
            label={{ value: "Acadêmico (A)", position: "insideBottom", offset: -10, fontSize: 12 }} />
          <YAxis type="number" dataKey="y" name="Social" domain={[0, 1]} tick={{ fontSize: 12 }}
            label={{ value: "Social (S)", angle: -90, position: "insideLeft", fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p: any = payload[0].payload;
              return (
                <div className="rounded-md border bg-card p-2 text-xs">
                  <div className="font-semibold">{p.nome}</div>
                  <div>A: {p.x.toFixed(3)} · S: {p.y.toFixed(3)}</div>
                  <div>|VDI|: {p.modulo.toFixed(3)}</div>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Scatter>
          <ReferenceLine
            segment={[{ x: lineData[0].x, y: lineData[0].y }, { x: lineData[1].x, y: lineData[1].y }]}
            stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4" ifOverflow="extendDomain"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="absolute right-4 top-2 rounded-md border bg-card/90 px-2 py-1 text-xs">
        r = <span className="font-semibold">{isNaN(r) ? "—" : r.toFixed(3)}</span>
      </div>
    </div>
  );
}
