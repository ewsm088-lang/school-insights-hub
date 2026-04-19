import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classificar, VDI_MAX } from "@/lib/descartes";
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

// Interface para os dados vindos da View vdi_analytics no Supabase
interface VDIAnalytics {
  id: string;
  nome: string;
  codigo_aluno: string;
  class_id: string;
  school_id: string;
  nome_turma: string;
  serie: string;
  A: number;
  S: number;
  E: number;
  modulo: number;
  iede_turma: number;
  iede_escola: number;
  sigma_turma: number;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<{ id: string; nome: string } | null>(null);
  const [classes, setClasses] = useState<{ id: string; nome_turma: string; serie: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [vdis, setVdis] = useState<VDIAnalytics[]>([]);
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

    // BUSCA NA VIEW OTIMIZADA (vdi_analytics)
    // Nota: Esta view deve ser criada no painel do Supabase com o script SQL fornecido.
    const { data: analyticsData, error } = await supabase
      .from("vdi_analytics" as any)
      .select("*")
      .eq("school_id", schoolData.id);

    if (error) {
      console.error("Erro ao buscar dados da view: ", error);
    }

    if (analyticsData) setVdis(analyticsData as VDIAnalytics[]);
    setLoading(false);
  }

  // ============= Filtros e Agregações Otimizados =============
  const filteredVdis = useMemo(
    () => selectedClass === "all" ? vdis : vdis.filter(v => v.class_id === selectedClass),
    [vdis, selectedClass]
  );

  // Valores extraídos diretamente da View do banco de dados
  const iede = useMemo(() => filteredVdis.length > 0 ? filteredVdis[0].iede_turma : 0, [filteredVdis]);
  const iedeEscola = useMemo(() => vdis.length > 0 ? vdis[0].iede_escola : 0, [vdis]);
  const desvio = useMemo(() => filteredVdis.length > 0 ? filteredVdis[0].sigma_turma : 0, [filteredVdis]);
  
  // Pearson: Mantido local pois depende da seleção atual, mas otimizado
  const pearsonSA = useMemo(() => {
    if (filteredVdis.length <= 1) return 0;
    const x = filteredVdis.map(v => v.S);
    const y = filteredVdis.map(v => v.A);
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX; const dy = y[i] - meanY;
      num += dx * dy; denX += dx * dx; denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }, [filteredVdis]);

  // Agrupamento por turmas (usando os dados já processados da View)
  const turmasStats = useMemo(() => {
    const map = new Map<string, VDIAnalytics[]>();
    for (const v of vdis) {
      if (!map.has(v.class_id)) map.set(v.class_id, []);
      map.get(v.class_id)!.push(v);
    }
    return Array.from(map.entries()).map(([cid, arr]) => {
      const first = arr[0];
      return {
        classId: cid,
        nome: `${first.serie} ${first.nome_turma}`,
        iede: first.iede_turma,
        vdiMedio: first.iede_turma,
        sigma: first.sigma_turma,
        n: arr.length
      };
    });
  }, [vdis]);

  const vdiMedioEscola = useMemo(() => {
    if (turmasStats.length === 0) return 0;
    return turmasStats.reduce((s, t) => s + t.vdiMedio, 0) / turmasStats.length;
  }, [turmasStats]);

  // ============= Gráficos Otimizados (scattergl para performance) =============

  const turmasPlot = useMemo(() => {
    if (turmasStats.length === 0) return null;
    const sigmas = turmasStats.map(t => t.sigma);
    const sigmaMax = Math.max(...sigmas, 0.0001);
    return {
      data: [{
        type: "scattergl" as any, mode: "markers+text",
        x: turmasStats.map(t => t.vdiMedio),
        y: turmasStats.map(t => t.iede),
        text: turmasStats.map(t => t.nome),
        textposition: "top center",
        marker: {
          size: turmasStats.map(t => 12 + (t.sigma / sigmaMax) * 28),
          color: turmasStats.map(t => t.iede - iedeEscola),
          colorscale: "RdYlGn",
          cmid: 0,
          line: { color: "rgba(0,0,0,0.4)", width: 1 },
          colorbar: { title: { text: "IEDE − média" }, thickness: 12 },
        },
      }],
      layout: {
        autosize: true, height: 520,
        xaxis: { title: { text: "|VDI| médio da turma" }, range: [0, VDI_MAX] },
        yaxis: { title: { text: "IEDE da turma" }, range: [0, VDI_MAX] },
        shapes: [
          { type: "line", x0: vdiMedioEscola, x1: vdiMedioEscola, y0: 0, y1: VDI_MAX, line: { color: "gray", dash: "dash" } },
          { type: "line", x0: 0, x1: VDI_MAX, y0: iedeEscola, y1: iedeEscola, line: { color: "gray", dash: "dash" } },
        ],
        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
        margin: { l: 60, r: 30, t: 30, b: 60 },
      }
    };
  }, [turmasStats, iedeEscola, vdiMedioEscola]);

  const plot3d = useMemo(() => {
    if (filteredVdis.length === 0) return null;
    return {
      data: [{
        type: "scatter3d" as any, mode: "markers",
        x: filteredVdis.map(v => v.A), y: filteredVdis.map(v => v.S), z: filteredVdis.map(v => v.E),
        text: filteredVdis.map(v => `${v.nome}<br>|VDI|=${v.modulo.toFixed(3)}`),
        marker: { size: 6, color: filteredVdis.map(v => v.modulo), colorscale: "Viridis", colorbar: { title: { text: "|VDI|" } } },
      }],
      layout: { autosize: true, height: 500, paper_bgcolor: "transparent", scene: { xaxis: { range: [0, 1] }, yaxis: { range: [0, 1] }, zaxis: { range: [0, 1] } } }
    };
  }, [filteredVdis]);

  const turmaPlot = useMemo(() => {
    if (selectedClass === "all" || filteredVdis.length === 0) return null;
    return {
      data: [{
        type: "scattergl" as any, mode: "markers+text",
        x: filteredVdis.map(v => v.modulo),
        y: filteredVdis.map(v => v.iede_turma),
        text: filteredVdis.map(v => v.nome),
        marker: { size: 10, color: filteredVdis.map(v => v.modulo), colorscale: "Viridis" },
      }],
      layout: { autosize: true, height: 450, xaxis: { range: [0, VDI_MAX] }, yaxis: { range: [0, VDI_MAX] }, paper_bgcolor: "transparent" }
    };
  }, [filteredVdis, selectedClass]);

  const escolaPlot = useMemo(() => {
    if (vdis.length === 0) return null;
    const isHigh = (v: VDIAnalytics) => selectedClass !== "all" && v.class_id === selectedClass;
    return {
      data: [{
        type: "scattergl" as any, mode: "markers",
        x: vdis.map(v => v.modulo),
        y: vdis.map(v => v.iede_escola),
        marker: { 
          size: vdis.map(v => isHigh(v) ? 10 : 6), 
          color: vdis.map(v => v.modulo), 
          colorscale: "Viridis", 
          opacity: vdis.map(v => isHigh(v) ? 1 : 0.4) 
        },
      }],
      layout: { autosize: true, height: 450, xaxis: { range: [0, VDI_MAX] }, yaxis: { range: [0, VDI_MAX] }, paper_bgcolor: "transparent" }
    };
  }, [vdis, selectedClass]);

  const pearsonPlot = useMemo(() => {
    if (filteredVdis.length === 0) return null;
    return {
      data: [
        { type: "scattergl" as any, mode: "markers", x: filteredVdis.map(v => v.S), y: filteredVdis.map(v => v.A), text: filteredVdis.map(v => v.nome), marker: { color: "blue" } }
      ],
      layout: { autosize: true, height: 400, xaxis: { range: [0, 1], title: "Social" }, yaxis: { range: [0, 1], title: "Acadêmico" }, paper_bgcolor: "transparent" }
    };
  }, [filteredVdis]);

  if (loading) return <div className="min-h-screen"><Header /><div className="p-20 text-center text-muted-foreground font-heading">Carregando dados otimizados...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">{school?.nome || "Dashboard"}</h1>
            <p className="text-muted-foreground mt-1">{filteredVdis.length} aluno(s) processados · IEDE: {classificar(iede)}</p>
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
          <KPICard icon={<BarChart3 className="h-5 w-5" />} label="Total Alunos" value={filteredVdis.length.toString()} desc="No filtro atual" />
        </div>

        <Tabs defaultValue="turmas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="3d">3D</TabsTrigger>
            <TabsTrigger value="turma">Aluno × Turma</TabsTrigger>
            <TabsTrigger value="escola">Aluno × Escola</TabsTrigger>
            <TabsTrigger value="pearson">Pearson</TabsTrigger>
          </TabsList>

          <TabsContent value="turmas">
            <Card><CardHeader><CardTitle>Visão das Turmas (Aceleração WebGL)</CardTitle></CardHeader>
            <CardContent><Suspense fallback={<div className="h-[400px] flex items-center justify-center">Carregando Plotly...</div>}>
              {turmasPlot && <Plot data={turmasPlot.data} layout={turmasPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "520px" }} />}
            </Suspense></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="3d">
            <Card><CardContent><Suspense fallback={<div>Carregando...</div>}>
              {plot3d && <Plot data={plot3d.data} layout={plot3d.layout} config={{ responsive: true }} style={{ width: "100%", height: "500px" }} />}
            </Suspense></CardContent></Card>
          </TabsContent>

          <TabsContent value="turma">
            <Card><CardContent><Suspense fallback={<div>Carregando...</div>}>
              {turmaPlot && <Plot data={turmaPlot.data} layout={turmaPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "450px" }} />}
            </Suspense></CardContent></Card>
          </TabsContent>

          <TabsContent value="escola">
            <Card><CardContent><Suspense fallback={<div>Carregando...</div>}>
              {escolaPlot && <Plot data={escolaPlot.data} layout={escolaPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "450px" }} />}
            </Suspense></CardContent></Card>
          </TabsContent>

          <TabsContent value="pearson">
            <Card><CardContent><Suspense fallback={<div>Carregando...</div>}>
              {pearsonPlot && <Plot data={pearsonPlot.data} layout={pearsonPlot.layout} config={{ responsive: true }} style={{ width: "100%", height: "400px" }} />}
            </Suspense></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, desc }: { icon: React.ReactNode; label: string; value: string; desc: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold font-heading">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </CardContent></Card>
  );
}
