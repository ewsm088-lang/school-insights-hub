import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calcVDI, calcIEDE, calcDesvioPadrao, calcPearson, classificar, type VDIResult, type StudentData, type SurveyRow, SOCIAL_KEYS, SOCIO_KEYS } from "@/lib/descartes";
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

    // Load students with survey responses and optional academic data
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
        for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) {
          survey[k] = sr[k] ?? 3;
        }

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

  const filteredVdis = selectedClass === "all" ? vdis : vdis.filter(v => v.classId === selectedClass);
  const iede = calcIEDE(filteredVdis);
  const desvio = calcDesvioPadrao(filteredVdis);
  const pearsonSA = calcPearson(filteredVdis.map(v => v.S), filteredVdis.map(v => v.A));

  // Group by class
  const classeMap = new Map<string, { serie: string; turma: string; vdis: VDIResult[] }>();
  for (const v of vdis) {
    const key = v.classId;
    if (!classeMap.has(key)) classeMap.set(key, { serie: (v as VDIExtra).serie || "", turma: (v as VDIExtra).turma || "", vdis: [] });
    classeMap.get(key)!.vdis.push(v);
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando dados...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">{school?.nome || "Dashboard"}</h1>
            <p className="text-muted-foreground mt-1">{filteredVdis.length} aluno(s) · IEDE: {classificar(iede)}</p>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar turma..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.serie} — {c.nome_turma}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard icon={<Target className="h-5 w-5" />} label="IEDE" value={iede.toFixed(3)} desc={`Classificação: ${classificar(iede)}`} />
          <KPICard icon={<Activity className="h-5 w-5" />} label="Desvio Padrão (σ)" value={desvio.toFixed(3)} desc="Desigualdade interna" />
          <KPICard icon={<TrendingUp className="h-5 w-5" />} label="Pearson (r)" value={pearsonSA.toFixed(3)} desc="Correlação Social × Acadêmico" />
          <KPICard icon={<BarChart3 className="h-5 w-5" />} label="Total Alunos" value={filteredVdis.length.toString()} desc="Com respostas" />
        </div>

        {/* Charts */}
        <Tabs defaultValue="3d" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="3d">3D (A,S,E)</TabsTrigger>
            <TabsTrigger value="turma">Aluno × Turma</TabsTrigger>
            <TabsTrigger value="escola">Aluno × Escola</TabsTrigger>
            <TabsTrigger value="serie">Série × Escola</TabsTrigger>
            <TabsTrigger value="pearson">Pearson</TabsTrigger>
          </TabsList>

          <TabsContent value="3d">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão 3D — Vetor Democrático Individual</CardTitle>
                <CardDescription>Cada ponto = aluno no espaço (Acadêmico, Social, Socioemocional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {filteredVdis.length > 0 ? (
                    <Plot
                      data={[{
                        type: "scatter3d" as any, mode: "markers",
                        x: filteredVdis.map(v => v.A), y: filteredVdis.map(v => v.S), z: filteredVdis.map(v => v.E),
                        text: filteredVdis.map(v => `${v.nome}<br>|VDI|=${v.modulo.toFixed(3)}`),
                        marker: { size: 6, color: filteredVdis.map(v => v.modulo), colorscale: "Viridis", colorbar: { title: { text: "|VDI|" } } },
                      }]}
                      layout={{ autosize: true, height: 500, margin: { l: 0, r: 0, t: 30, b: 0 }, scene: { xaxis: { title: { text: "Acadêmico (A)" } }, yaxis: { title: { text: "Social (S)" } }, zaxis: { title: { text: "Socioemocional (E)" } } }, paper_bgcolor: "transparent" }}
                      config={{ responsive: true }} style={{ width: "100%", height: "500px" }}
                    />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turma">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão — Aluno × Turma</CardTitle>
                <CardDescription>Posição do aluno dentro da sua turma (Social × Socioemocional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {filteredVdis.length > 0 ? (
                    <Plot
                      data={Array.from(classeMap.entries()).filter(([k]) => selectedClass === "all" || k === selectedClass).map(([, v]) => ({
                        type: "scatter" as any, mode: "markers+text", name: `${v.serie} ${v.turma}`,
                        x: v.vdis.map(d => d.S), y: v.vdis.map(d => d.E),
                        text: v.vdis.map(d => d.nome), textposition: "top center", textfont: { size: 9 },
                        marker: { size: 10 },
                      }))}
                      layout={{ autosize: true, height: 450, xaxis: { title: { text: "Social (S)" }, range: [0, 1] }, yaxis: { title: { text: "Socioemocional (E)" }, range: [0, 1] }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", margin: { l: 50, r: 20, t: 30, b: 50 } }}
                      config={{ responsive: true }} style={{ width: "100%", height: "450px" }}
                    />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escola">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Dispersão — Aluno × Escola</CardTitle>
                <CardDescription>Posição individual no contexto geral da escola</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {vdis.length > 0 ? (
                    <Plot
                      data={[{
                        type: "scatter" as any, mode: "markers",
                        x: vdis.map(v => v.S), y: vdis.map(v => v.E),
                        text: vdis.map(v => `${v.nome} (${(v as VDIExtra).serie} ${(v as VDIExtra).turma})`),
                        marker: { size: 8, color: vdis.map(v => v.modulo), colorscale: "Viridis", colorbar: { title: { text: "|VDI|" } } },
                      }]}
                      layout={{ autosize: true, height: 450, xaxis: { title: { text: "Social (S)" }, range: [0, 1] }, yaxis: { title: { text: "Socioemocional (E)" }, range: [0, 1] }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", margin: { l: 50, r: 20, t: 30, b: 50 } }}
                      config={{ responsive: true }} style={{ width: "100%", height: "450px" }}
                    />
                  ) : <NoData />}
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="serie">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Série × Escola</CardTitle>
                <CardDescription>IEDE médio por turma/série comparado à escola</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Loading />}>
                  {classeMap.size > 0 ? (
                    <Plot
                      data={[
                        { type: "bar" as any, x: Array.from(classeMap.values()).map(v => `${v.serie} ${v.turma}`), y: Array.from(classeMap.values()).map(v => calcIEDE(v.vdis)), name: "IEDE por Turma", marker: { color: "oklch(0.35 0.12 250)" } },
                        { type: "scatter" as any, mode: "lines", x: Array.from(classeMap.values()).map(v => `${v.serie} ${v.turma}`), y: Array.from(classeMap.values()).map(() => iede), name: `IEDE Escola (${iede.toFixed(3)})`, line: { dash: "dash", color: "oklch(0.65 0.2 30)" } },
                      ]}
                      layout={{ autosize: true, height: 400, yaxis: { title: { text: "IEDE" } }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", margin: { l: 50, r: 20, t: 30, b: 80 }, barmode: "group" }}
                      config={{ responsive: true }} style={{ width: "100%", height: "400px" }}
                    />
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
                  {filteredVdis.length > 0 ? (() => {
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
                    return (
                      <Plot
                        data={[
                          { type: "scatter" as any, mode: "markers", x: xVals, y: yVals, text: filteredVdis.map(v => v.nome), marker: { size: 8, color: "oklch(0.35 0.12 250)" }, name: "Alunos" },
                          { type: "scatter" as any, mode: "lines", x: xLine, y: yLine, line: { color: "oklch(0.65 0.2 30)", width: 2 }, name: `Tendência (r=${pearsonSA.toFixed(3)})` },
                        ]}
                        layout={{ autosize: true, height: 400, xaxis: { title: { text: "Social (S)" }, range: [0, 1] }, yaxis: { title: { text: "Acadêmico (A)" }, range: [0, 1] }, paper_bgcolor: "transparent", plot_bgcolor: "transparent", margin: { l: 50, r: 20, t: 30, b: 50 } }}
                        config={{ responsive: true }} style={{ width: "100%", height: "400px" }}
                      />
                    );
                  })() : <NoData />}
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
