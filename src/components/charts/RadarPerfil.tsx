import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { SUBDIMENSOES, calcSubdimensoes } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

interface Props {
  vdis: VDIExtra[];
  individual?: VDIExtra | null;
}

export function RadarPerfil({ vdis, individual }: Props) {
  const turmaAvg: Record<string, number> = {};
  for (const sd of SUBDIMENSOES) turmaAvg[sd.key] = 0;
  for (const v of vdis) {
    const sub = calcSubdimensoes(v.survey);
    for (const sd of SUBDIMENSOES) turmaAvg[sd.key] += sub[sd.key];
  }
  const n = vdis.length || 1;
  for (const sd of SUBDIMENSOES) turmaAvg[sd.key] /= n;

  const indivSub = individual ? calcSubdimensoes(individual.survey) : null;

  const data = SUBDIMENSOES.map((sd) => ({
    dim: sd.label,
    Turma: +turmaAvg[sd.key].toFixed(3),
    ...(indivSub ? { Aluno: +indivSub[sd.key].toFixed(3) } : {}),
    Ideal: 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 10 }} angle={90} />
        {individual && <Radar name="Aluno" dataKey="Aluno" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />}
        <Radar name="Turma" dataKey="Turma" stroke="var(--accent)" fill="var(--accent)" fillOpacity={individual ? 0.15 : 0.4} />
        <Radar name="Ideal" dataKey="Ideal" stroke="var(--muted-foreground)" fill="transparent" strokeDasharray="4 4" />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
