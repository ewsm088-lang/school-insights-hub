import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calcVDI, calcIEDE, calcDesvioPadrao, calcPearson, classificar, calcTurmaStats,
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

  // ============= Memoized aggregations =============
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

  // School-wide IEDE (sempre da escola toda, não filtrado)
  const iedeEscola = useMemo(() => calcIEDE(vdis), [vdis]);

  // Stats por turma (escola inteira)
  const turmasStats = useMemo(() => {
    const map = new Map<string, VDIExtra[]>();
    for (const v of vdis) {
      if (!map.has(v.classId)) map.set(v.classId, []);
      map.get(v.classId)!.push(v);
    }
    return Array.from(map.entries()).map(([cid, arr]) => {
      const first = arr[0];
      const nome = `${first.serie ?? ""} ${first.turma ?? ""}`.trim();
      return calcTurmaStats(cid, nome, arr);
    });
  }, [vdis]);

  // VDI médio das turmas (linha de referência vertical)
  const vdiMedioEscola = useMemo(() => {
    if (turmasStats.length === 0) return 0;
    return turmasStats.reduce((s, t) => s + t.vdiMedio, 0) / turmasStats.length;
  }, [turmasStats]);

  // ============= Plot data (memoized) =============

  // 1. Scatter de turmas (VDI × IEDE)
  const turmasPlot = useMemo(() => {
    if (turmasStats.length === 0) return null;
    const sigmas = turmasStats.map(t => t.sigma);
    const sigmaMax = Math.max(...sigmas, 0.0001);
    return {
      data: [
        {
          type: "scatter" as any, mode: "markers+text",
          x: turmasStats.map(t => t.vdiMedio),
          y: turmasStats.map(t => t.iede),
          text: turmasStats.map(t => t.nome),
          textposition: "top center", textfont: { size: 10 },
          hovertemplate: turmasStats.map(t =>
            `<b>${t.nome}</b><br>|VDI| médio: ${t.vdiMedio.toFixed(3)}<br>IEDE: ${t.iede.toFixed(3)}<br>σ: ${t.sigma.toFixed(3)}<br>n alunos: ${t.n}<extra></extra>`
          ),
          marker: {
            size: turmasStats.map(t => 12 + (t.sigma / sigmaMax) * 28), // 12-40px
            color: turmasStats.map(t => t.iede - iedeEscola), // diff vs média
            colorscale: "RdYlGn",
            cmin: -Math.max(0.1, Math.abs(iedeEscola)),
            cmax: Math.max(0.1, Math.abs(iedeEscola)),
            cmid: 0,
            line: { color: "rgba(0,0,0,0.4)", width: 1 },
            colorbar: { title: { text: "IEDE − média" }, thickness: 12 },
          },
          name: "Turmas",
        },
      ],
      layout: ({
        autosize: true, height: 520,
        xaxis: { title: { text: "|VDI| médio da turma" }, range: [0, VDI_MAX], zeroline: false },
        yaxis: { title: { text: "IEDE da turma" }, range: [0, Math.sqrt(3)], zeroline: false },
        shapes: [
          { type: "line", x0: vdiMedioEscola, x1: vdiMedioEscola, y0: 0, y1: VDI_MAX, line: { color: "rgba(100,100,100,0.5)", dash: "dash", width: 1 } },
          { type: "line", x0: 0, x1: VDI_MAX, y0: iedeEscola, y1: iedeEscola, line: { color: "rgba(100,100,100,0.5)", dash: "dash", width: 1 } },
        ],
        annotations: [
          { x: VDI_MAX * 0.97, y: VDI_MAX * 0.97, text: "↗ Alta convivência<br>+ alta democracia", showarrow: false, font: { size: 10, color: "rgba(34,139,34,0.8)" }, xanchor: "right", yanchor: "top" },
          { x: 0.03, y: VDI_MAX * 0.97, text: "↖ Alta democracia<br>+ baixa convivência", showarrow: false, font: { size: 10, color: "rgba(180,140,0,0.8)" }, xanchor: "left", yanchor: "top" },
          { x: VDI_MAX * 0.97, y: 0.03, text: "↘ Boa convivência<br>+ baixa democracia", showarrow: false, font: { size: 10, color: "rgba(180,140,0,0.8)" }, xanchor: "right", yanchor: "bottom" },
          { x: 0.03, y: 0.03, text: "↙ Baixa convivência<br>+ baixa democracia", showarrow: false, font: { size: 10, color: "rgba(180,30,30,0.8)" }, xanchor: "left", yanchor: "bottom" },
          { x: vdiMedioEscola, y: VDI_MAX, text: `|VDI| médio = ${vdiMedioEscola.toFixed(3)}`, showarrow: false, font: { size: 9, color: "rgba(80,80,80,0.9)" }, yanchor: "bottom" },
          { x: VDI_MAX, y: iedeEscola, text: `IEDE médio = ${iedeEscola.toFixed(3)}`, showarrow: false, font: { size: 9, color: "rgba(80,80,80,0.9)" }, xanchor: "right", yanchor: "bottom" },
        ],
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        margin: { l: 60, r: 30, t: 30, b: 60 },
        showlegend: false,
      } as any),
    };
  }, [turmasStats, iedeEscola, vdiMedioEscola]);

  // 2. 3D
  const plot3d = useMemo(() => {
    if (filteredVdis.length === 0) return null;
    return {
      data: [{
        type: "scatter3d" as any, mode: "markers",
        x: filteredVdis.map(v => v.A), y: filteredVdis.map(v => v.S), z: filteredVdis.map(v => v.E),
        text: filteredVdis.map(v => `${v.nome}<br>|VDI|=${v.modulo.toFixed(3)}`),
        marker: { size: 6, color: filteredVdis.map(v => v.modulo), colorscale: "Viridis", colorbar: { title: { text: "|VDI|" } } },
      }],
      layout: {
        autosize: true, height: 500, margin: { l: 0, r: 0, t: 30, b: 0 },
        scene: {
          xaxis: { title: { text: "Acadêmico (A)" }, range: [0, 1] },
          yaxis: { title: { text: "Social (S)" }, range: [0, 1] },
          zaxis: { title: { text: "Socioemocional (E)" }, range: [0, 1] },
        },
        paper_bgcolor: "transparent",
      },
    };
  }, [filteredVdis]);

  // 3. Aluno × Turma — |VDI| × IEDE (modelo adaptado de Turmas)
  const turmaPlot = useMemo(() => {
    if (selectedClass === "all" || filteredVdis.length === 0) return null;
    const iede = calcIEDE(filteredVdis);
    return {
      data: [{
        type: "scatter" as any, mode: "markers+text",
        x: filteredVdis.map(d => d.modulo),
        y: Array(filteredVdis.length).fill(iede),
        text: filteredVdis.map(d => d.nome), textposition: "top center", textfont: { size: 9 },
        marker: {
          size: 12,
          color: filteredVdis.map(d => d.modulo),
          colorscale: "Viridis",
          line: { color: "rgba(0,0,0,0.4)", width: 1 },
          colorbar: { title: { text: "|VDI|" }, thickness: 12 },
        },
        hovertemplate: filteredVdis.map(d => `<b>${d.nome}</b><br>|VDI|: ${d.modulo.toFixed(3)}<br>A: ${d.A.toFixed(3)}<br>S: ${d.S.toFixed(3)}<br>E: ${d.E.toFixed(3)}<br>IEDE turma: ${iede.toFixed(3)}<extra></extra>`),
      }],
      layout: {
        autosize: true, height: 450,
        xaxis: { title: { text: "|VDI| do aluno" }, range: [0, Math.sqrt(3)] },
        yaxis: { title: { text: "IEDE da turma" }, range: [0, Math.sqrt(3)] },
        shapes: [
          {
            type: "line" as const,
            x0: 0, x1: Math.sqrt(3),
            y0: iede, y1: iede,
            line: { color: "rgba(0,0,0,0.2)", width: 2, dash: "dash" as const },
          },
        ],
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        margin: { l: 60, r: 80, t: 30, b: 60 },
      },
    };
  }, [filteredVdis, selectedClass]);

  // 4. Aluno × Escola — |VDI| × IEDE com layers (modelo adaptado de Turmas)
  const escolaPlot = useMemo(() => {
    if (vdis.length === 0) return null;
    const isHighlighted = (v: VDIExtra) => selectedClass !== "all" && v.classId === selectedClass;
    const others = vdis.filter(v => !isHighlighted(v));
    const highlighted = vdis.filter(isHighlighted);
    const iedeEscolaRef = calcIEDE(vdis);
    const traces: any[] = [{
      type: "scatter", mode: "markers", name: "Outros alunos",
      x: others.map(v => v.modulo), y: Array(others.length).fill(iedeEscolaRef),
      text: others.map(v => `${v.nome} (${v.serie} ${v.turma})`),
      marker: {
        size: 7,
        color: others.map(v => v.modulo),
        colorscale: "Viridis",
        opacity: 0.5,
      },
    }];
    if (highlighted.length) {
      traces.push({
        type: "scatter", mode: "markers+text", name: "Turma selecionada",
        x: highlighted.map(v => v.modulo), y: Array(highlighted.length).fill(iedeEscolaRef),
        text: highlighted.map(v => v.nome), textposition: "top center", textfont: { size: 9 },
        marker: {
          size: 11,
          color: highlighted.map(v => v.modulo),
          colorscale: "Viridis",
          line: { color: "white", width: 1 },
        },
      });
    }
    return {
      data: traces,
      layout: {
        autosize: true, height: 450,
        xaxis: { title: { text: "|VDI| do aluno" }, range: [0, Math.sqrt(3)] },
        yaxis: { title: { text: "IEDE da escola" }, range: [0, Math.sqrt(3)] },
        shapes: [
          {
            type: "line" as const,
            x0: 0, x1: Math.sqrt(3),
            y0: iedeEscolaRef, y1: iedeEscolaRef,
            line: { color: "rgba(0,0,0,0.2)", width: 2, dash: "dash" as const },
          },
        ],
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        margin: { l: 60, r: 80, t: 30, b: 60 },
        showlegend: highlighted.length > 0,
      },
    };
  }, [vdis, selectedClass]);

  // 5. Pearson (regressão linear)
  const pearsonPlot = useMemo(() => {
    if (filteredVdis.length === 0) return null;
    const xVals = filteredVdis.map(v => v.S);
    const yVals = filteredVdis.map(v => v.A);
    const n = xVals.length;
    const meanX = xVals.reduce((a, b) => a + b, 0) / n;
    const meanY = yVals.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xVals[i] - meanX) * (yVals[i] - meanY); den += (xVals[i] - meanX) ** 2; }
    const slope = den ? num / den : 0;
    const intercept = meanY - slope * meanX;
    const xLine = [Math.min(...xVals), Math.max(...xVals)];
    const yLine = xLine.map(x => slope * x + intercept);
    return {
      data: [
        { type: "scatter" as any, mode: "markers", x: xVals, y: yVals, text: filteredVdis.map(v => v.nome), marker: { size: 8, color: "oklch(0.35 0.12 250)" }, name: "Alunos" },
        { type: "scatter" as any, mode: "lines", x: xLine, y: yLine, line: { color: "oklch(0.65 0.2 30)", width: 2 }, name: `Tendência (r=${pearsonSA.toFixed(3)})` },
      ],
      layout: {
        autosize: true, height: 400,
        xaxis: { title: { text: "Social (S)" }, range: [0, 1] },
        yaxis: { title: { text: "Acadêmico (A)" }, range: [0, 1] },
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        margin: { l: 50, r: 20, t: 30, b: 50 },
      },
    };
  }, [filteredVdis, pearsonSA]);

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
          <KPICard icon={<TrendingUp className="h-5 w-5" />} label="Pearson (r)" value={pearsonSA.toFixed(3)} desc="Correlação Social × Acadêmico" />
          <KPICard icon={<BarChart3 className="h-5 w-5" />} label="Total Alunos" value={filteredVdis.length.toString()} desc={filtroAtivo ? "Na turma" : "Na escola"} />
        </div>

        <Tabs defaultValue="turmas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="turmas">Turmas (VDI × IEDE)</TabsTrigger>
            <TabsTrigger value="3d">3D (A,S,E)</TabsTrigger>
            <TabsTrigger value="turma">Aluno × Turma</TabsTrigger>
            <TabsTrigger value="escola">Aluno × Escola</TabsTrigger>
            <TabsTrigger value="pearson">Pearson</TabsTrigger>
          </TabsList>

          <TabsContent value="turmas">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão de Turmas — |VDI| médio × IEDE</CardTitle>
                <CardDescription>
                  Cada ponto = 1 turma. Tamanho = σ (desigualdade interna). Cor = posição vs IEDE médio da escola (verde acima, vermelho abaixo). Linhas tracejadas = médias da escola. Ignora o filtro de turma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {turmasPlot ? (
                    <Plot data={turmasPlot.data} layout={turmasPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "520px" }} />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="3d">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão 3D — Vetor Democrático Individual</CardTitle>
                <CardDescription>Cada ponto = aluno {filtroAtivo ? "da turma selecionada" : "da escola"} no espaço (A, S, E)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {plot3d ? (
                    <Plot data={plot3d.data} layout={plot3d.layout} config={{ responsive: true }} style={{ width: "100%", height: "500px" }} />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turma">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão — Aluno × Turma</CardTitle>
                <CardDescription>Posição dos alunos da turma selecionada (Social × Socioemocional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {!filtroAtivo ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center px-6">
                      Selecione uma turma no filtro acima para ver a dispersão dos seus alunos.
                    </div>
                  ) : turmaPlot ? (
                    <Plot data={turmaPlot.data} layout={turmaPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "450px" }} />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escola">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão — Aluno × Escola</CardTitle>
                <CardDescription>
                  Todos os alunos da escola. {filtroAtivo ? "Alunos da turma selecionada destacados em laranja." : "Selecione uma turma para destacá-la no contexto da escola."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {escolaPlot ? (
                    <Plot data={escolaPlot.data} layout={escolaPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "450px" }} />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pearson">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Correlação de Pearson — Social × Acadêmico</CardTitle>
                <CardDescription>r = {pearsonSA.toFixed(4)} — {pearsonSA > 0.5 ? "Correlação positiva forte" : pearsonSA > 0.3 ? "Correlação positiva moderada" : pearsonSA > 0 ? "Correlação positiva fraca" : pearsonSA > -0.3 ? "Correlação negativa fraca" : "Correlação negativa"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {pearsonPlot ? (
                    <Plot data={pearsonPlot.data} layout={pearsonPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "400px" }} />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
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
  return <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes. Cadastre turmas e colete respostas do formulário.</div>;
}

function Loading() {
  return <div className="h-[400px] flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>;
}
