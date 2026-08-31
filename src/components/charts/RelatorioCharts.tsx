import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Scatter3DAlunos } from "@/components/charts/Scatter3DAlunos";
import { calcIEDE } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";

const CLASS_COLORS = ["#2F6FED", "#14B8A6", "#F59E0B", "#8B5CF6"];
const POSITIVE_COLOR = "#14B8A6";
const NEGATIVE_COLOR = "#F97366";
const GRID_COLOR = "var(--border)";
const TEXT_COLOR = "var(--muted-foreground)";

interface ClassGroup {
  id: string;
  label: string;
  items: VDIExtra[];
}

interface ReportChartsProps {
  vdis: VDIExtra[];
  schoolVdis: VDIExtra[];
}

export function RelatorioCharts({ vdis, schoolVdis }: ReportChartsProps) {
  const schoolIede = calcIEDE(schoolVdis);
  const groups = useMemo(() => getClassGroups(vdis), [vdis]);

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="report-panorama-title">
        <div>
          <h2 id="report-panorama-title" className="font-heading text-xl font-semibold tracking-tight">Panorama cartesiano</h2>
          <p className="text-sm text-muted-foreground">Comece pela visão espacial e depois compare as médias entre turma e escola.</p>
        </div>
        <ReportChartCard
          number="G1"
          title="Dispersão tridimensional A × S × E"
          description="Cada ponto representa um estudante. A posição mostra o equilíbrio entre as dimensões; a cor identifica a turma."
        >
          <Scatter3DAlunos vdis={vdis} />
        </ReportChartCard>
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportChartCard
            number="G4"
            title="IEDE das turmas e da escola"
            description="As barras mostram a média do VDI por turma; a linha pontilhada representa o IEDE geral da escola."
          >
            <ChartIEDETurmas groups={groups} schoolIede={schoolIede} />
          </ReportChartCard>
          <ReportChartCard
            number="G6"
            title="Médias agrupadas por dimensão"
            description="Compare A, S, E e VDI entre as turmas visíveis e a referência institucional."
          >
            <ChartMedias groups={groups} schoolVdis={schoolVdis} />
          </ReportChartCard>
        </div>
        <ReportChartCard
          number="G7"
          title="Radar do perfil médio A–S–E"
          description="Quanto mais regular o triângulo, mais equilibrado é o perfil médio entre as três dimensões."
        >
          <ChartRadar groups={groups} schoolVdis={schoolVdis} />
        </ReportChartCard>
      </section>

      <section className="space-y-4" aria-labelledby="report-individual-title">
        <div>
          <h2 id="report-individual-title" className="font-heading text-xl font-semibold tracking-tight">Distância individual do padrão</h2>
          <p className="text-sm text-muted-foreground">Use os gráficos abaixo para localizar dispersões sem transformar diferença estatística em julgamento sobre o aluno.</p>
        </div>
        <ReportChartCard
          number="G2"
          title="VDI individual no contexto da turma e da escola"
          description="Estudantes em ordem crescente de VDI, com linhas de referência do IEDE de cada turma e da escola."
        >
          <ChartVDIContext vdis={vdis} schoolIede={schoolIede} groups={groups} />
        </ReportChartCard>
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportChartCard
            number="G3"
            title="Desvio do VDI em relação à média da turma"
            description="Valores positivos estão acima da média do grupo; valores negativos estão abaixo."
          >
            <ChartDeviation vdis={vdis} groups={groups} reference="class" />
          </ReportChartCard>
          <ReportChartCard
            number="G8"
            title="Desvio do VDI em relação à média da escola"
            description="A mesma leitura individual, agora comparada ao IEDE institucional."
          >
            <ChartDeviation vdis={vdis} groups={groups} reference="school" schoolIede={schoolIede} />
          </ReportChartCard>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="report-distribution-title">
        <div>
          <h2 id="report-distribution-title" className="font-heading text-xl font-semibold tracking-tight">Distribuição e dispersão</h2>
          <p className="text-sm text-muted-foreground">A mediana e a amplitude ajudam a enxergar diferenças que as médias isoladas podem esconder.</p>
        </div>
        <ReportChartCard
          number="G5"
          title="Boxplot de A, S, E e VDI por turma"
          description="Cada caixa resume mínimo, primeiro quartil, mediana, terceiro quartil e máximo de cada métrica."
        >
          <ChartBoxplot groups={groups} />
        </ReportChartCard>
      </section>
    </div>
  );
}

function ReportChartCard({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">{number}</span>
          <div>
            <h3 className="font-heading text-base font-semibold leading-tight">{title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </article>
  );
}

function getClassGroups(vdis: VDIExtra[]): ClassGroup[] {
  const map = new Map<string, ClassGroup>();
  for (const item of vdis) {
    const id = item.classId || "sem-turma";
    const label = `${item.serie ?? ""} ${item.turma ?? ""}`.trim() || "Sem turma";
    const current = map.get(id);
    if (current) current.items.push(item);
    else map.set(id, { id, label, items: [item] });
  }
  return Array.from(map.values());
}

function classColor(index: number) {
  return CLASS_COLORS[index % CLASS_COLORS.length];
}

function formatValue(value: number, digits = 3) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

type ReportTooltipProps = TooltipProps<number, string>;

function ReportTooltip({ active, label, payload }: ReportTooltipProps) {
  if (!active || !payload?.length) return null;
  return tooltipContent(label, payload);
}

function tooltipContent(label: unknown, payload: ReportTooltipProps["payload"]) {
  if (!payload?.length) return null;
  const row = (payload[0]?.payload ?? {}) as Record<string, unknown>;
  const student = typeof row.aluno === "string" ? row.aluno : String(label ?? "");
  return (
    <div className="min-w-44 rounded-xl border bg-card p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{String(student ?? "")}</p>
      {typeof row.turma === "string" && <p className="mt-0.5 text-muted-foreground">{row.turma}</p>}
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <div key={`${String(entry.name)}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? "var(--primary)" }} />
              {entry.name ?? "Valor"}
            </span>
            <strong className="font-mono text-foreground">{typeof entry.value === "number" ? formatValue(entry.value) : String(entry.value ?? "—")}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartVDIContext({ vdis, schoolIede, groups }: { vdis: VDIExtra[]; schoolIede: number; groups: ClassGroup[] }) {
  const data = useMemo(() => {
    const order = new Map(groups.map((group, index) => [group.id, index]));
    return [...vdis]
      .sort((a, b) => (order.get(a.classId) ?? 0) - (order.get(b.classId) ?? 0) || a.modulo - b.modulo)
      .map((item, index) => ({
        index: index + 1,
        aluno: item.nome,
        turma: classLabel(item),
        modulo: item.modulo,
        classId: item.classId,
      }));
  }, [groups, vdis]);

  return (
    <div className="h-[350px] min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 18 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="index" tick={{ fontSize: 11, fill: TEXT_COLOR }} tickLine={false} axisLine={false} label={{ value: "Estudantes em ordem crescente de VDI", position: "insideBottom", offset: -10, fill: TEXT_COLOR, fontSize: 11 }} />
          <YAxis domain={[0, "auto"]} tick={{ fontSize: 11, fill: TEXT_COLOR }} tickLine={false} axisLine={false} width={42} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ReportTooltip />} />
          <ReferenceLine y={schoolIede} stroke="var(--primary)" strokeDasharray="6 4" label={{ value: `Escola ${formatValue(schoolIede)}`, position: "insideTopRight", fill: "var(--primary)", fontSize: 11 }} />
          {groups.map((group, index) => (
            <ReferenceLine key={group.id} y={calcIEDE(group.items)} stroke={classColor(index)} strokeDasharray="2 3" label={{ value: group.label, position: "insideBottomRight", fill: classColor(index), fontSize: 10 }} />
          ))}
          <Bar dataKey="modulo" name="|VDI|" radius={[4, 4, 0, 0]} maxBarSize={16}>
            {data.map((item, index) => <Cell key={`${item.aluno}-${index}`} fill={classColor(groups.findIndex((group) => group.id === item.classId))} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartDeviation({
  vdis,
  groups,
  reference,
  schoolIede = 0,
}: {
  vdis: VDIExtra[];
  groups: ClassGroup[];
  reference: "class" | "school";
  schoolIede?: number;
}) {
  const data = useMemo(() => {
    const order = new Map(groups.map((group, index) => [group.id, index]));
    const classMeans = new Map(groups.map((group) => [group.id, calcIEDE(group.items)]));
    return [...vdis]
      .map((item) => ({
        aluno: item.nome,
        turma: classLabel(item),
        classId: item.classId,
        desvio: item.modulo - (reference === "school" ? schoolIede : classMeans.get(item.classId) ?? 0),
      }))
      .sort((a, b) => (order.get(a.classId) ?? 0) - (order.get(b.classId) ?? 0) || a.desvio - b.desvio);
  }, [groups, reference, schoolIede, vdis]);

  return (
    <div className="h-[330px] min-h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 14 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="aluno" hide />
          <YAxis tick={{ fontSize: 11, fill: TEXT_COLOR }} tickLine={false} axisLine={false} width={46} tickFormatter={(value) => formatValue(Number(value), 2)} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ReportTooltip />} />
          <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} />
          <Bar dataKey="desvio" name="Desvio |VDI|" radius={[3, 3, 0, 0]}>
            {data.map((item, index) => <Cell key={`${item.aluno}-${index}`} fill={item.desvio >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartIEDETurmas({ groups, schoolIede }: { groups: ClassGroup[]; schoolIede: number }) {
  const data = groups.map((group) => ({ turma: group.label, iede: calcIEDE(group.items) }));
  return (
    <div className="h-[320px] min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="turma" tick={{ fontSize: 12, fill: TEXT_COLOR }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, "auto"]} tick={{ fontSize: 11, fill: TEXT_COLOR }} tickLine={false} axisLine={false} width={42} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ReportTooltip />} />
          <ReferenceLine y={schoolIede} stroke="var(--primary)" strokeDasharray="6 4" label={{ value: `Escola ${formatValue(schoolIede)}`, position: "insideTopRight", fill: "var(--primary)", fontSize: 11 }} />
          <Bar dataKey="iede" name="IEDE da turma" radius={[8, 8, 0, 0]} maxBarSize={72}>
            {data.map((_, index) => <Cell key={index} fill={classColor(index)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartMedias({ groups, schoolVdis }: { groups: ClassGroup[]; schoolVdis: VDIExtra[] }) {
  const metrics = [
    { key: "A", label: "A · Acadêmica" },
    { key: "S", label: "S · Social" },
    { key: "E", label: "E · Socioemocional" },
    { key: "modulo", label: "VDI" },
  ] as const;
  const series = groups.map((group) => ({ id: group.id, label: group.label }));
  const data = metrics.map((metric) => {
    const row: Record<string, string | number> = { metric: metric.label };
    for (const group of groups) row[group.id] = average(group.items, metric.key);
    row.escola = average(schoolVdis, metric.key);
    return row;
  });

  return (
    <div className="h-[320px] min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 12 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="metric" tick={{ fontSize: 10, fill: TEXT_COLOR }} tickLine={false} axisLine={false} interval={0} />
          <YAxis domain={[0, 1.8]} tick={{ fontSize: 11, fill: TEXT_COLOR }} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ReportTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {series.map((item, index) => <Bar key={item.id} dataKey={item.id} name={item.label} fill={classColor(index)} radius={[4, 4, 0, 0]} maxBarSize={22} />)}
          <Bar dataKey="escola" name="Escola" fill="var(--foreground)" fillOpacity={0.72} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartRadar({ groups, schoolVdis }: { groups: ClassGroup[]; schoolVdis: VDIExtra[] }) {
  const data = [
    { dim: "A", ...Object.fromEntries(groups.map((group) => [group.id, average(group.items, "A")])), escola: average(schoolVdis, "A") },
    { dim: "S", ...Object.fromEntries(groups.map((group) => [group.id, average(group.items, "S")])), escola: average(schoolVdis, "S") },
    { dim: "E", ...Object.fromEntries(groups.map((group) => [group.id, average(group.items, "E")])), escola: average(schoolVdis, "E") },
  ];

  return (
    <div className="h-[380px] min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="dim" tick={{ fontSize: 13, fill: TEXT_COLOR }} />
          <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 10, fill: TEXT_COLOR }} />
          {groups.map((group, index) => <Radar key={group.id} name={group.label} dataKey={group.id} stroke={classColor(index)} fill={classColor(index)} fillOpacity={0.16} strokeWidth={2} />)}
          <Radar name="Escola" dataKey="escola" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.08} strokeDasharray="5 4" strokeWidth={2} />
          <Tooltip content={<ReportTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartBoxplot({ groups }: { groups: ClassGroup[] }) {
  const metrics = [
    { key: "A", label: "A · Acadêmica" },
    { key: "S", label: "S · Social" },
    { key: "E", label: "E · Socioemocional" },
    { key: "modulo", label: "VDI" },
  ] as const;
  const width = 820;
  const height = 380;
  const padding = { top: 20, right: 24, bottom: 62, left: 54 };
  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const yMax = Math.max(1.8, ...groups.flatMap((group) => metrics.map((metric) => stats(group.items, metric.key).max))) * 1.04;
  const y = (value: number) => padding.top + plotHeight - (value / yMax) * plotHeight;
  const band = plotWidth / metrics.length;
  const boxWidth = Math.min(34, band / Math.max(groups.length * 2.2, 2));
  const ticks = [0, 0.5, 1, 1.5, Math.min(2, yMax)].filter((tick, index, arr) => index === arr.findIndex((value) => Math.abs(value - tick) < 0.01));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda das turmas">
        {groups.map((group, index) => (
          <span key={group.id} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: classColor(index) }} />{group.label}</span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-labelledby="boxplot-title boxplot-description">
          <title id="boxplot-title">Boxplot de A, S, E e VDI por turma</title>
          <desc id="boxplot-description">Comparação de mínimo, quartis, mediana e máximo para cada métrica.</desc>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke={GRID_COLOR} strokeDasharray="3 3" />
              <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={TEXT_COLOR}>{tick.toFixed(1)}</text>
            </g>
          ))}
          {metrics.map((metric, metricIndex) => {
            const center = padding.left + band * metricIndex + band / 2;
            const groupSpace = band / Math.max(groups.length, 1);
            return (
              <g key={metric.key}>
                <text x={center} y={height - 22} textAnchor="middle" fontSize="11" fill={TEXT_COLOR}>{metric.label}</text>
                {groups.map((group, groupIndex) => {
                  const summary = stats(group.items, metric.key);
                  const boxCenter = center + (groupIndex - (groups.length - 1) / 2) * groupSpace * 0.62;
                  const x = boxCenter - boxWidth / 2;
                  const boxTop = y(summary.q3);
                  const boxBottom = y(summary.q1);
                  const color = classColor(groupIndex);
                  return (
                    <g key={group.id}>
                      <title>{`${group.label} · ${metric.label}: mediana ${formatValue(summary.median)}`}</title>
                      <line x1={boxCenter} x2={boxCenter} y1={y(summary.max)} y2={y(summary.min)} stroke={color} strokeWidth="2" />
                      <line x1={boxCenter - boxWidth * 0.35} x2={boxCenter + boxWidth * 0.35} y1={y(summary.max)} y2={y(summary.max)} stroke={color} strokeWidth="2" />
                      <line x1={boxCenter - boxWidth * 0.35} x2={boxCenter + boxWidth * 0.35} y1={y(summary.min)} y2={y(summary.min)} stroke={color} strokeWidth="2" />
                      <rect x={x} y={boxTop} width={boxWidth} height={Math.max(2, boxBottom - boxTop)} rx="4" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2" />
                      <line x1={x} x2={x + boxWidth} y1={y(summary.median)} y2={y(summary.median)} stroke={color} strokeWidth="3" />
                    </g>
                  );
                })}
              </g>
            );
          })}
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke={GRID_COLOR} />
        </svg>
      </div>
    </div>
  );
}

function classLabel(item: VDIExtra) {
  return `${item.serie ?? ""} ${item.turma ?? ""}`.trim() || "Sem turma";
}

type MetricKey = "A" | "S" | "E" | "modulo";

function average(items: VDIExtra[], key: MetricKey) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item[key], 0) / items.length;
}

function stats(items: VDIExtra[], key: MetricKey) {
  const values = items.map((item) => item[key]).sort((a, b) => a - b);
  if (!values.length) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  return {
    min: values[0],
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: values[values.length - 1],
  };
}

function quantile(values: number[], p: number) {
  if (values.length === 1) return values[0];
  const index = (values.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

