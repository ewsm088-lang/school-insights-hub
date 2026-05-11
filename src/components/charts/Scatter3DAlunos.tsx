import { lazy, Suspense, useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vdiColor } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

const Plot = lazy(() => import("react-plotly.js"));

export function Scatter3DAlunos({ vdis }: { vdis: VDIExtra[] }) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [plane, setPlane] = useState<"AS" | "AE" | "SE">("AS");

  const points3d = useMemo(() => ({
    x: vdis.map((v) => v.A),
    y: vdis.map((v) => v.S),
    z: vdis.map((v) => v.E),
    text: vdis.map((v) => `${v.nome}<br>A=${v.A.toFixed(2)} S=${v.S.toFixed(2)} E=${v.E.toFixed(2)}<br>|VDI|=${v.modulo.toFixed(3)}`),
    colors: vdis.map((v) => vdiColor(v.modulo)),
  }), [vdis]);

  const data2d = useMemo(() => {
    const [kx, ky] = plane === "AS" ? ["A", "S"] : plane === "AE" ? ["A", "E"] : ["S", "E"];
    return {
      points: vdis.map((v) => ({ x: (v as any)[kx], y: (v as any)[ky], nome: v.nome, modulo: v.modulo, color: vdiColor(v.modulo) })),
      kx, ky,
    };
  }, [vdis, plane]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="3d">3D</TabsTrigger>
            <TabsTrigger value="2d">2D</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "2d" && (
          <Select value={plane} onValueChange={(v) => setPlane(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AS">A × S</SelectItem>
              <SelectItem value="AE">A × E</SelectItem>
              <SelectItem value="SE">S × E</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {mode === "3d" ? (
        <Suspense fallback={<div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">Carregando 3D…</div>}>
          <Plot
            data={[{
              type: "scatter3d",
              mode: "markers",
              x: points3d.x, y: points3d.y, z: points3d.z,
              text: points3d.text,
              hovertemplate: "%{text}<extra></extra>",
              marker: { size: 6, color: points3d.colors, opacity: 0.85, line: { width: 0.5, color: "#222" } },
            }] as any}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              margin: { l: 0, r: 0, b: 0, t: 0 },
              scene: {
                xaxis: { title: { text: "Acadêmico (A)" }, range: [0, 1] },
                yaxis: { title: { text: "Social (S)" }, range: [0, 1] },
                zaxis: { title: { text: "Socioemocional (E)" }, range: [0, 1] },
              },
              font: { family: "DM Sans, sans-serif" },
            }}
            config={{ responsive: true, displaylogo: false }}
            style={{ width: "100%", height: "520px" }}
          />
        </Suspense>
      ) : (
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fontSize: 12 }}
              label={{ value: data2d.kx, position: "insideBottom", offset: -10 }} />
            <YAxis type="number" dataKey="y" domain={[0, 1]} tick={{ fontSize: 12 }}
              label={{ value: data2d.ky, angle: -90, position: "insideLeft" }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p: any = payload[0].payload;
                return (
                  <div className="rounded-md border bg-card p-2 text-xs">
                    <div className="font-semibold">{p.nome}</div>
                    <div>{data2d.kx}: {p.x.toFixed(3)} · {data2d.ky}: {p.y.toFixed(3)}</div>
                    <div>|VDI|: {p.modulo.toFixed(3)}</div>
                  </div>
                );
              }}
            />
            <Scatter data={data2d.points}>
              {data2d.points.map((p, i) => <Cell key={i} fill={p.color} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
