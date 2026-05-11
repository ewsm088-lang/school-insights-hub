import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calcVDI, calcIEDE, calcDesvioPadrao, calcPearson, classificar,
  VDI_MAX, type VDIResult, type StudentData, type SurveyRow,
  SOCIAL_KEYS, SOCIO_KEYS,
} from "@/lib/descartes";
import { Activity, TrendingUp, BarChart3, Target } from "lucide-react";

const Plot = lazy(() => import("react-plotly.js"));

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DESCARTES" },
      { name: "description", content: "Dashboards e gráficos de dispersão do projeto DESCARTES" },
    ],
  }),
  component: DashboardPage,
});

type VDIExtra = VDIResult & { serie?: string; turma?: string };
type Centroid = { A: number; S: number; E: number };

function centroid(items: { A: number; S: number; E: number }[]): Centroid {
  const n = items.length || 1;
  return {
    A: items.reduce((s, v) => s + v.A, 0) / n,
    S: items.reduce((s, v) => s + v.S, 0) / n,
    E: items.reduce((s, v) => s + v.E, 0) / n,
  };
}

function dist(a: { A: number; S: number; E: number }, b: Centroid): number {
  return Math.sqrt((a.A - b.A) ** 2 + (a.S - b.S) ** 2 + (a.E - b.E) ** 2);
}

// Paleta sóbria
const COLORS = {
  primary: "oklch(0.45 0.15 250)",      // azul navy
  accent: "oklch(0.65 0.18 30)",        // laranja acadêmico
  muted: "oklch(0.7 0.02 250)",         // cinza
  centroidTurma: "oklch(0.55 0.22 30)", // laranja
  centroidEscola: "oklch(0.3 0.05 250)",// navy escuro
  ok: "oklch(0.6 0.15 145)",
  warn: "oklch(0.7 0.18 60)",
  bad: "oklch(0.55 0.22 25)",
};

const baseLayout = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "DM Sans, sans-serif", size: 12, color: "oklch(0.3 0.02 250)" },
  margin: { l: 60, r: 30, t: 30, b: 60 },
};

function DashboardPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<{ id: string; nome: string } | null>(null);
  const [classes, setClasses] = useState<{ id: string; nome_turma: string; serie: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [vdis, setVdis] = useState<VDIExtra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login" }); return; }

    const { data: schoolData } = await supabase.from("schools").select("id, nome").eq("responsavel_id", user.id).single();
    if (!schoolData) { setLoading(false); return; }
    setSchool(schoolData);

    const { data: classesData } = await supabase.from("classes").select("id, nome_turma, serie").eq("school_id", schoolData.id).order("serie");
    if (classesData) setClasses(classesData);

    const { data: studentsRaw } = await supabase
      .from("students")
      .select(`
        id, codigo_aluno, nome, class_id,
        academic_data(nota, nota_min, nota_max),
        survey_responses(s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,e11,e12,e13,e14,e15,e16,e17,e18,e19,e20),
        classes!inner(school_id, nome_turma, serie)
      `)
      .eq("classes.school_id", schoolData.id);

    if (studentsRaw) {
      const results: VDIExtra[] = [];
      for (const raw of studentsRaw as any[]) {
        const sr = Array.isArray(raw.survey_responses) ? raw.survey_responses[0] : raw.survey_responses;
        if (!sr) continue;

        const survey: SurveyRow = {} as SurveyRow;
        for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) survey[k] = sr[k] ?? 3;

        const ad = Array.isArray(raw.academic_data) ? raw.academic_data[0] : raw.academic_data;
        const student: StudentData = {
          id: raw.id,
          nome: raw.nome || raw.codigo_aluno,
          codigo_aluno: raw.codigo_aluno,
          class_id: raw.class_id,
          survey,
          nota: ad?.nota,
          nota_min: ad?.nota_min,
          nota_max: ad?.nota_max,
        };

        const vdi = calcVDI(student);
        if (vdi) {
          const cl = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
          results.push({ ...vdi, serie: cl?.serie, turma: cl?.nome_turma });
        }
      }
      setVdis(results);
    }
    setLoading(false);
  }

  const filteredVdis = useMemo(
    () => selectedClass === "all" ? vdis : vdis.filter(v => v.classId === selectedClass),
    [vdis, selectedClass]
  );

  const iede = useMemo(() => calcIEDE(filteredVdis), [filteredVdis]);
  const desvio = useMemo(() => calcDesvioPadrao(filteredVdis), [filteredVdis]);
  const pearsonSA = useMemo(
    () => calcPearson(filteredVdis.map(v => v.S), filteredVdis.map(v => v.A)),
    [filteredVdis]
  );

  // ===== Centroides =====
  const centroidEscola = useMemo(() => centroid(vdis), [vdis]);
  const centroidesTurmas = useMemo(() => {
    const map = new Map<string, VDIExtra[]>();
    for (const v of vdis) {
      if (!map.has(v.classId)) map.set(v.classId, []);
      map.get(v.classId)!.push(v);
    }
    return Array.from(map.entries()).map(([cid, arr]) => {
      const c = centroid(arr);
      const first = arr[0];
      const nome = `${first.serie ?? ""} ${first.turma ?? ""}`.trim();
      const iedeT = calcIEDE(arr);
      const sigma = calcDesvioPadrao(arr);
      const distEscola = dist(c, centroidEscola);
      return { classId: cid, nome, centroide: c, iede: iedeT, sigma, n: arr.length, distEscola };
    });
  }, [vdis, centroidEscola]);

  const centroidTurmaSel = useMemo(() => {
    if (selectedClass === "all") return null;
    return centroidesTurmas.find(t => t.classId === selectedClass)?.centroide ?? null;
  }, [centroidesTurmas, selectedClass]);

  // ===== 1. Gráfico 3D =====
  const plot3d = useMemo(() => {
    if (vdis.length === 0) return null;
    const isSel = (v: VDIExtra) => selectedClass === "all" || v.classId === selectedClass;
    const sel = vdis.filter(isSel);
    const others = vdis.filter(v => !isSel(v));

    const traces: any[] = [];

    if (others.length) {
      traces.push({
        type: "scatter3d", mode: "markers",
        name: "Outros alunos",
        x: others.map(v => v.A), y: others.map(v => v.S), z: others.map(v => v.E),
        text: others.map(v => `${v.nome}<br>${v.serie ?? ""} ${v.turma ?? ""}`),
        hovertemplate: "%{text}<br>A=%{x:.2f}<br>S=%{y:.2f}<br>E=%{z:.2f}<extra></extra>",
        marker: { size: 4, color: COLORS.muted, opacity: 0.35 },
      });
    }

    traces.push({
      type: "scatter3d", mode: "markers",
      name: selectedClass === "all" ? "Alunos" : "Turma selecionada",
      x: sel.map(v => v.A), y: sel.map(v => v.S), z: sel.map(v => v.E),
      text: sel.map(v => `${v.nome}<br>|VDI|=${v.modulo.toFixed(3)}`),
      hovertemplate: "%{text}<br>A=%{x:.2f}<br>S=%{y:.2f}<br>E=%{z:.2f}<extra></extra>",
      marker: { size: 5, color: COLORS.primary, opacity: 0.85 },
    });

    // Centroide da escola
    traces.push({
      type: "scatter3d", mode: "markers+text",
      name: "Centroide escola",
      x: [centroidEscola.A], y: [centroidEscola.S], z: [centroidEscola.E],
      text: ["◆ Escola"], textposition: "top center",
      hovertemplate: `Centroide escola<br>A=${centroidEscola.A.toFixed(3)}<br>S=${centroidEscola.S.toFixed(3)}<br>E=${centroidEscola.E.toFixed(3)}<extra></extra>`,
      marker: { size: 10, color: COLORS.centroidEscola, symbol: "diamond", line: { color: "white", width: 2 } },
    });

    // Centroide da turma selecionada
    if (centroidTurmaSel) {
      traces.push({
        type: "scatter3d", mode: "markers+text",
        name: "Centroide turma",
        x: [centroidTurmaSel.A], y: [centroidTurmaSel.S], z: [centroidTurmaSel.E],
        text: ["◆ Turma"], textposition: "top center",
        hovertemplate: `Centroide turma<br>A=${centroidTurmaSel.A.toFixed(3)}<br>S=${centroidTurmaSel.S.toFixed(3)}<br>E=${centroidTurmaSel.E.toFixed(3)}<extra></extra>`,
        marker: { size: 10, color: COLORS.centroidTurma, symbol: "diamond", line: { color: "white", width: 2 } },
      });
    }

    return {
      data: traces,
      layout: {
        ...baseLayout,
        autosize: true, height: 560, margin: { l: 0, r: 0, t: 30, b: 0 },
        scene: {
          xaxis: { title: { text: "Acadêmico (A)" }, range: [0, 1] },
          yaxis: { title: { text: "Social (S)" }, range: [0, 1] },
          zaxis: { title: { text: "Socioemocional (E)" }, range: [0, 1] },
          bgcolor: "transparent",
        },
        legend: { orientation: "h", y: -0.05 },
      } as any,
    };
  }, [vdis, selectedClass, centroidEscola, centroidTurmaSel]);

  // ===== 2. Aluno × Turma — X = dist ao centroide da turma, Y = |VDI| =====
  const alunoTurmaPlot = useMemo(() => {
    if (selectedClass === "all" || filteredVdis.length === 0 || !centroidTurmaSel) return null;
    const dists = filteredVdis.map(v => dist(v, centroidTurmaSel));
    const distMedia = dists.reduce((s, d) => s + d, 0) / dists.length;
    const distStd = Math.sqrt(dists.reduce((s, d) => s + (d - distMedia) ** 2, 0) / dists.length);
    const limiar = distMedia + distStd;
    const iedeMedio = filteredVdis.reduce((s, v) => s + v.modulo, 0) / filteredVdis.length;
    const xMax = Math.max(...dists, 0.5) * 1.15;

    const cores = dists.map(d => d > limiar ? COLORS.bad : COLORS.primary);

    return {
      data: [{
        type: "scatter", mode: "markers+text",
        x: dists, y: filteredVdis.map(v => v.modulo),
        text: filteredVdis.map((v, i) => dists[i] > limiar ? v.nome : ""),
        textposition: "top center", textfont: { size: 10 },
        hovertemplate: filteredVdis.map((v, i) =>
          `<b>${v.nome}</b><br>Distância à turma: ${dists[i].toFixed(3)}<br>|VDI|: ${v.modulo.toFixed(3)}<extra></extra>`
        ),
        marker: { size: 10, color: cores, opacity: 0.8, line: { color: "white", width: 1 } },
        name: "Alunos",
      }],
      layout: {
        ...baseLayout,
        autosize: true, height: 480,
        xaxis: { title: { text: "Distância ao centroide da turma" }, range: [0, xMax], zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        yaxis: { title: { text: "|VDI| do aluno" }, range: [0, VDI_MAX], zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        shapes: [
          { type: "line", x0: distMedia, x1: distMedia, y0: 0, y1: VDI_MAX, line: { color: COLORS.muted, dash: "dash", width: 1 } },
          { type: "line", x0: 0, x1: xMax, y0: iedeMedio, y1: iedeMedio, line: { color: COLORS.muted, dash: "dot", width: 1 } },
          { type: "line", x0: limiar, x1: limiar, y0: 0, y1: VDI_MAX, line: { color: COLORS.bad, dash: "dot", width: 1 } },
        ],
        annotations: [
          { x: distMedia, y: VDI_MAX, text: `dist. média = ${distMedia.toFixed(3)}`, showarrow: false, font: { size: 9 }, yanchor: "bottom" },
          { x: xMax, y: iedeMedio, text: `IEDE turma = ${iedeMedio.toFixed(3)}`, showarrow: false, font: { size: 9 }, xanchor: "right", yanchor: "bottom" },
          { x: limiar, y: 0, text: "outliers →", showarrow: false, font: { size: 9, color: COLORS.bad }, xanchor: "left", yanchor: "bottom" },
        ],
        showlegend: false,
      } as any,
    };
  }, [filteredVdis, selectedClass, centroidTurmaSel]);

  // ===== 3. Aluno × Escola — X = dist turma, Y = dist escola (quadrantes) =====
  const alunoEscolaPlot = useMemo(() => {
    if (selectedClass === "all" || filteredVdis.length === 0 || !centroidTurmaSel) return null;
    const dx = filteredVdis.map(v => dist(v, centroidTurmaSel));
    const dy = filteredVdis.map(v => dist(v, centroidEscola));
    const xMed = dx.reduce((s, d) => s + d, 0) / dx.length;
    const yMed = dy.reduce((s, d) => s + d, 0) / dy.length;
    const xMax = Math.max(...dx, 0.5) * 1.2;
    const yMax = Math.max(...dy, 0.5) * 1.2;

    return {
      data: [{
        type: "scatter", mode: "markers",
        x: dx, y: dy,
        text: filteredVdis.map(v => v.nome),
        hovertemplate: filteredVdis.map((v, i) =>
          `<b>${v.nome}</b><br>Dist. turma: ${dx[i].toFixed(3)}<br>Dist. escola: ${dy[i].toFixed(3)}<extra></extra>`
        ),
        marker: { size: 10, color: COLORS.primary, opacity: 0.75, line: { color: "white", width: 1 } },
      }],
      layout: {
        ...baseLayout,
        autosize: true, height: 480,
        xaxis: { title: { text: "Distância à turma →" }, range: [0, xMax], zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        yaxis: { title: { text: "Distância à escola →" }, range: [0, yMax], zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        shapes: [
          { type: "line", x0: xMed, x1: xMed, y0: 0, y1: yMax, line: { color: COLORS.muted, dash: "dash", width: 1 } },
          { type: "line", x0: 0, x1: xMax, y0: yMed, y1: yMed, line: { color: COLORS.muted, dash: "dash", width: 1 } },
        ],
        annotations: [
          { x: xMax * 0.97, y: yMax * 0.97, text: "Desalinhado<br>com turma e escola", showarrow: false, font: { size: 10, color: COLORS.bad }, xanchor: "right", yanchor: "top" },
          { x: 0.03, y: yMax * 0.97, text: "Pertence à turma<br>distante da escola", showarrow: false, font: { size: 10, color: COLORS.warn }, xanchor: "left", yanchor: "top" },
          { x: xMax * 0.97, y: 0.03, text: "Próximo da escola<br>distante da turma", showarrow: false, font: { size: 10, color: COLORS.warn }, xanchor: "right", yanchor: "bottom" },
          { x: 0.03, y: 0.03, text: "Pertencimento pleno<br>(turma + escola)", showarrow: false, font: { size: 10, color: COLORS.ok }, xanchor: "left", yanchor: "bottom" },
        ],
        showlegend: false,
      } as any,
    };
  }, [filteredVdis, selectedClass, centroidTurmaSel, centroidEscola]);

  // ===== 4. Comparação entre turmas =====
  const turmasComparePlot = useMemo(() => {
    if (centroidesTurmas.length === 0) return null;
    const sigmas = centroidesTurmas.map(t => t.sigma);
    const sigmaMax = Math.max(...sigmas, 0.0001);
    return {
      data: [{
        type: "scatter", mode: "markers+text",
        x: centroidesTurmas.map(t => t.distEscola),
        y: centroidesTurmas.map(t => t.iede),
        text: centroidesTurmas.map(t => t.nome),
        textposition: "top center", textfont: { size: 10 },
        hovertemplate: centroidesTurmas.map(t =>
          `<b>${t.nome}</b><br>IEDE: ${t.iede.toFixed(3)}<br>σ: ${t.sigma.toFixed(3)}<br>Dist. à escola: ${t.distEscola.toFixed(3)}<br>n: ${t.n}<extra></extra>`
        ),
        marker: {
          size: centroidesTurmas.map(t => 14 + (t.sigma / sigmaMax) * 30),
          color: centroidesTurmas.map(t => t.iede),
          colorscale: [[0, COLORS.bad], [0.5, COLORS.warn], [1, COLORS.ok]],
          cmin: 0, cmax: VDI_MAX,
          line: { color: "white", width: 1.5 },
          colorbar: { title: { text: "IEDE", side: "right" }, thickness: 10, len: 0.7 },
        },
      }],
      layout: {
        ...baseLayout,
        autosize: true, height: 480,
        xaxis: { title: { text: "Distância do centroide da turma à escola" }, zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        yaxis: { title: { text: "IEDE da turma" }, range: [0, VDI_MAX], zeroline: false, gridcolor: "oklch(0.92 0.01 250)" },
        showlegend: false,
      } as any,
    };
  }, [centroidesTurmas]);

  // ===== 5. Heatmap (turmas × A,S,E,IEDE,σ,dist) =====
  const heatmapPlot = useMemo(() => {
    if (centroidesTurmas.length === 0) return null;
    const cols = ["A", "S", "E", "IEDE", "σ", "Dist. escola"];
    const z = centroidesTurmas.map(t => [
      t.centroide.A, t.centroide.S, t.centroide.E, t.iede, t.sigma, t.distEscola
    ]);
    return {
      data: [{
        type: "heatmap",
        z, x: cols, y: centroidesTurmas.map(t => t.nome),
        colorscale: [
          [0, "oklch(0.95 0.02 250)"],
          [0.5, "oklch(0.65 0.12 250)"],
          [1, "oklch(0.35 0.18 250)"],
        ],
        hovertemplate: "Turma: %{y}<br>%{x}: %{z:.3f}<extra></extra>",
        colorbar: { thickness: 10, len: 0.8 },
      }],
      layout: {
        ...baseLayout,
        autosize: true, height: Math.max(280, 60 + centroidesTurmas.length * 38),
        xaxis: { side: "top" },
        yaxis: { automargin: true },
        margin: { l: 100, r: 20, t: 50, b: 30 },
      } as any,
    };
  }, [centroidesTurmas]);

  // ===== 6. Boxplot — |VDI| por turma =====
  const boxplotPlot = useMemo(() => {
    if (centroidesTurmas.length === 0) return null;
    const traces = centroidesTurmas.map(t => {
      const alunos = vdis.filter(v => v.classId === t.classId);
      return {
        type: "box",
        name: t.nome,
        y: alunos.map(v => v.modulo),
        boxpoints: "outliers" as const,
        marker: { color: COLORS.primary, size: 4 },
        line: { color: COLORS.primary },
        fillcolor: "oklch(0.45 0.15 250 / 0.15)",
      };
    });
    return {
      data: traces,
      layout: {
        ...baseLayout,
        autosize: true, height: 460,
        yaxis: { title: { text: "|VDI|" }, range: [0, VDI_MAX], gridcolor: "oklch(0.92 0.01 250)" },
        xaxis: { title: { text: "Turma" } },
        showlegend: false,
      } as any,
    };
  }, [centroidesTurmas, vdis]);

  if (loading) {
    return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando dados...</div></div>;
  }

  const filtroAtivo = selectedClass !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">{school?.nome || "Dashboard"}</h1>
            <p className="text-muted-foreground mt-1">{filteredVdis.length} aluno(s) {filtroAtivo ? "na turma" : "na escola"} · IEDE: {classificar(iede)}</p>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar turma..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda a escola</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.serie} — {c.nome_turma}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard icon={<Target className="h-5 w-5" />} label="IEDE" value={iede.toFixed(3)} desc={`Classificação: ${classificar(iede)}`} />
          <KPICard icon={<Activity className="h-5 w-5" />} label="Desvio Padrão (σ)" value={desvio.toFixed(3)} desc="Desigualdade interna" />
          <KPICard icon={<TrendingUp className="h-5 w-5" />} label="Pearson (r)" value={pearsonSA.toFixed(3)} desc="Social × Acadêmico" />
          <KPICard icon={<BarChart3 className="h-5 w-5" />} label="Total Alunos" value={filteredVdis.length.toString()} desc={filtroAtivo ? "Na turma" : "Na escola"} />
        </div>

        <Tabs defaultValue="3d" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="3d">3D (A,S,E)</TabsTrigger>
            <TabsTrigger value="aluno-turma">Aluno × Turma</TabsTrigger>
            <TabsTrigger value="aluno-escola">Aluno × Escola</TabsTrigger>
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="boxplot">Boxplot</TabsTrigger>
          </TabsList>

          <TabsContent value="3d">
            <ChartCard
              title="Dispersão 3D — Espaço (A, S, E)"
              desc="Cada ponto = aluno. Losangos = centroides da turma e da escola. Selecione uma turma para destacá-la."
            >
              {plot3d ? <Plot data={plot3d.data} layout={plot3d.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%", height: "560px" }} /> : <NoData />}
            </ChartCard>
          </TabsContent>

          <TabsContent value="aluno-turma">
            <ChartCard
              title="Aluno × Turma"
              desc="X = distância ao centroide da turma. Y = |VDI| do aluno. Linhas pontilhadas = média da turma. Pontos vermelhos = outliers (acima de média + σ)."
            >
              {!filtroAtivo ? <SelectClassMsg /> : alunoTurmaPlot ? (
                <Plot data={alunoTurmaPlot.data as any} layout={alunoTurmaPlot.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%", height: "480px" }} />
              ) : <NoData />}
            </ChartCard>
          </TabsContent>

          <TabsContent value="aluno-escola">
            <ChartCard
              title="Aluno × Escola — Pertencimento"
              desc="X = dist. à turma · Y = dist. à escola. Quadrantes: pertencimento pleno (canto inferior-esquerdo) vs. desalinhamento (canto superior-direito)."
            >
              {!filtroAtivo ? <SelectClassMsg /> : alunoEscolaPlot ? (
                <Plot data={alunoEscolaPlot.data as any} layout={alunoEscolaPlot.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%", height: "480px" }} />
              ) : <NoData />}
            </ChartCard>
          </TabsContent>

          <TabsContent value="turmas">
            <ChartCard
              title="Comparação entre turmas"
              desc="X = distância do centroide da turma à escola. Y = IEDE. Tamanho = σ (dispersão interna). Cor = IEDE."
            >
              {turmasComparePlot ? (
                <Plot data={turmasComparePlot.data as any} layout={turmasComparePlot.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%", height: "480px" }} />
              ) : <NoData />}
            </ChartCard>
          </TabsContent>

          <TabsContent value="heatmap">
            <ChartCard
              title="Heatmap — Turmas × Indicadores"
              desc="Padrões coletivos em cada eixo. Tons mais escuros = valores mais altos."
            >
              {heatmapPlot ? (
                <Plot data={heatmapPlot.data as any} layout={heatmapPlot.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%" }} />
              ) : <NoData />}
            </ChartCard>
          </TabsContent>

          <TabsContent value="boxplot">
            <ChartCard
              title="Boxplot — |VDI| por turma"
              desc="Mediana, quartis e outliers do |VDI| em cada turma."
            >
              {boxplotPlot ? (
                <Plot data={boxplotPlot.data as any} layout={boxplotPlot.layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%", height: "460px" }} />
              ) : <NoData />}
            </ChartCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </CardContent>
    </Card>
  );
}

function KPICard({ icon, label, value, desc }: { icon: React.ReactNode; label: string; value: string; desc: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-heading font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}

function NoData() {
  return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes.</div>;
}

function SelectClassMsg() {
  return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center px-6">Selecione uma turma no filtro acima.</div>;
}

function Loading() {
  return <div className="h-[400px] flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>;
}
