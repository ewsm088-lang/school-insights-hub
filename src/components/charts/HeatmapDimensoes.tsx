import { vdiColor } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

export function HeatmapDimensoes({ vdis }: { vdis: VDIExtra[] }) {
  const byClass = new Map<string, VDIExtra[]>();
  for (const v of vdis) {
    const key = `${v.serie ?? ""} ${v.turma ?? ""}`.trim() || v.classId;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(v);
  }
  const rows = Array.from(byClass.entries()).map(([nome, list]) => {
    const n = list.length || 1;
    const A = list.reduce((s, v) => s + v.A, 0) / n;
    const S = list.reduce((s, v) => s + v.S, 0) / n;
    const E = list.reduce((s, v) => s + v.E, 0) / n;
    return { nome, A, S, E, n };
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  const cell = (v: number) => {
    // 0=red, 0.5=amber, 1=green; using oklch approx by mixing hue
    if (v < 0.4) return "#EF4444";
    if (v < 0.7) return "#F59E0B";
    return "#22C55E";
  };

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="text-left p-2">Turma</th>
            <th className="p-2">A (acad.)</th>
            <th className="p-2">S (social)</th>
            <th className="p-2">E (socioem.)</th>
            <th className="p-2">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.nome} className="border-t">
              <td className="p-2 font-medium">{r.nome}</td>
              {(["A","S","E"] as const).map((k) => (
                <td key={k} className="p-1">
                  <div className="rounded px-3 py-2 text-center text-xs font-semibold text-white" style={{ background: cell(r[k]) }}>
                    {r[k].toFixed(2)}
                  </div>
                </td>
              ))}
              <td className="p-2 text-center text-muted-foreground">{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Vermelho &lt; 0.40 · Âmbar 0.40–0.69 · Verde ≥ 0.70</p>
    </div>
  );
}

// Discreto helper
export { vdiColor as _ };
