import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calcDesvioPadrao, calcIEDE, classificar, classifyVDI, VDI_COLORS } from "@/lib/descartes";
import type { VDIExtra } from "@/lib/load-data";
import { Activity, ArrowRight, BarChart3, ShieldAlert, Target, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DESCARTES" },
      { name: "description", content: "Visão geral e acompanhamento por turma do DESCARTES" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { next: `${location.pathname}${location.search}` },
      });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<{ id: string; nome: string } | null>(null);
  const [classes, setClasses] = useState<{ id: string; nome_turma: string; serie: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [vdis, setVdis] = useState<VDIExtra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const { data: schoolData } = await supabase.from("schools").select("id, nome").eq("responsavel_id", user.id).maybeSingle();
    if (!schoolData) {
      setLoading(false);
      return;
    }

    setSchool(schoolData);
    const { data: classData } = await supabase.from("classes").select("id, nome_turma, serie").eq("school_id", schoolData.id).order("serie");
    if (classData) setClasses(classData);

    const { data: studentsRaw } = await supabase
      .from("students")
      .select(`id, codigo_aluno, nome, class_id, classes!inner(school_id, nome_turma, serie), survey_responses(s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,e11,e12,e13,e14,e15,e16,e17,e18,e19,e20)`)
      .eq("classes.school_id", schoolData.id);

    if (studentsRaw) {
      const mapped = studentsRaw
        .map((raw: any) => {
          const sr = Array.isArray(raw.survey_responses) ? raw.survey_responses[0] : raw.survey_responses;
          if (!sr) return null;
          const result = { ...raw, survey_responses: sr };
          return result;
        })
        .filter(Boolean) as any[];
      const results: VDIExtra[] = [];
      for (const raw of mapped) {
        const sr = raw.survey_responses;
        const cl = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
        const student = {
          id: raw.id,
          nome: raw.nome || raw.codigo_aluno,
          codigo_aluno: raw.codigo_aluno,
          class_id: raw.class_id,
          survey: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => {
              const keys = [...(Array.from({ length: 20 }, (_, idx) => `s${String(idx + 1).padStart(2, "0")}`)), ...(Array.from({ length: 20 }, (_, idx) => `e${String(idx + 1).padStart(2, "0")}`))];
              const key = keys[i];
              return [key, sr[key] ?? 3];
            })
          ),
        } as any;

        const vdi = (await import("@/lib/descartes")).calcVDI(student);
        if (vdi) {
          results.push({ ...vdi, serie: cl?.serie, turma: cl?.nome_turma, classId: raw.class_id, studentId: raw.id, nome: student.nome, codigoAluno: raw.codigo_aluno });
        }
      }
      setVdis(results);
    }

    setLoading(false);
  }

  const filteredVdis = useMemo(() => {
    if (selectedClass === "all") return vdis;
    return vdis.filter((item) => item.classId === selectedClass);
  }, [selectedClass, vdis]);

  const statsByClass = useMemo(() => {
    return classes.map((classItem) => {
      const items = vdis.filter((item) => item.classId === classItem.id);
      const iede = calcIEDE(items);
      const sigma = calcDesvioPadrao(items);
      const vulneraveis = items.filter((item) => classifyVDI(item.modulo) === "vulneravel").length;
      const integrados = items.filter((item) => classifyVDI(item.modulo) === "integrado").length;
      return {
        ...classItem,
        total: items.length,
        iede,
        sigma,
        vulneraveis,
        integrados,
      };
    });
  }, [classes, vdis]);

  const overviewIede = calcIEDE(filteredVdis);
  const overviewSigma = calcDesvioPadrao(filteredVdis);
  const selectedClassInfo = statsByClass.find((item) => item.id === selectedClass) ?? null;
  const alunosAtencao = [...vdis].filter((item) => classifyVDI(item.modulo) === "vulneravel").sort((a, b) => a.modulo - b.modulo).slice(0, 5);

  if (loading) {
    return <div className="min-h-screen bg-background"><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando dashboard...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-primary/6 via-background to-accent/10 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Observatório escolar</p>
            <h1 className="mt-2 font-heading text-3xl font-bold">{school?.nome ?? "Dashboard"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Visão geral escolar e detalhamento por turma, com foco em risco, desigualdade e acompanhamento.</p>
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full max-w-64">
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda a escola</SelectItem>
              {classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>{classItem.serie} • {classItem.nome_turma}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Target className="h-5 w-5" />} label="IEDE" value={overviewIede.toFixed(3)} hint={classificar(overviewIede)} />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Desvio padrão" value={overviewSigma.toFixed(3)} hint="Desigualdade interna" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Alunos" value={filteredVdis.length.toString()} hint={selectedClass === "all" ? "Na escola" : "Na turma"} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Atenção" value={alunosAtencao.length.toString()} hint="Em vulnerabilidade" />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="class">Por turma</TabsTrigger>
            <TabsTrigger value="attention">Atenção</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Resumo da escola</CardTitle>
                  <CardDescription>Indicadores principais e distribuição por turma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statsByClass.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda não há turmas com dados suficientes.</p>
                  ) : (
                    statsByClass.map((item) => {
                      const ratio = item.total ? Math.max(10, (item.integrados / Math.max(item.total, 1)) * 100) : 0;
                      return (
                        <div key={item.id} className="rounded-2xl border p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{item.serie} • {item.nome_turma}</p>
                              <p className="text-xs text-muted-foreground">{item.total} alunos</p>
                            </div>
                            <Badge variant={item.iede >= 0.6 ? "secondary" : "outline"}>{classificar(item.iede)}</Badge>
                          </div>
                          <div className="mb-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <span>IEDE: <strong className="text-foreground">{item.iede.toFixed(3)}</strong></span>
                            <span>σ: <strong className="text-foreground">{item.sigma.toFixed(3)}</strong></span>
                            <span>Vuln: <strong className="text-foreground">{item.vulneraveis}</strong></span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-rose-500" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Distribuição de risco</CardTitle>
                  <CardDescription>Visualização rápida da situação por turma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statsByClass.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados para comparar.</p>
                  ) : (
                    statsByClass.map((item) => {
                      const total = Math.max(item.total, 1);
                      const integrated = (item.integrados / total) * 100;
                      const partial = (Math.max(item.total - item.integrados - item.vulneraveis, 0) / total) * 100;
                      const vulnerable = (item.vulneraveis / total) * 100;
                      return (
                        <div key={item.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.serie} {item.nome_turma}</span>
                            <span className="text-muted-foreground">{item.total}</span>
                          </div>
                          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-emerald-500" style={{ width: `${integrated}%` }} />
                            <div className="h-full bg-amber-400" style={{ width: `${partial}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${vulnerable}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="class" className="space-y-6">
            {selectedClassInfo ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading">Turma selecionada</CardTitle>
                    <CardDescription>{selectedClassInfo.serie} • {selectedClassInfo.nome_turma}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <MiniMetric label="IEDE" value={selectedClassInfo.iede.toFixed(3)} tone="primary" />
                    <MiniMetric label="σ" value={selectedClassInfo.sigma.toFixed(3)} tone="amber" />
                    <MiniMetric label="Vulneráveis" value={selectedClassInfo.vulneraveis.toString()} tone="rose" />
                    <MiniMetric label="Integrados" value={selectedClassInfo.integrados.toString()} tone="emerald" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading">Observações</CardTitle>
                    <CardDescription>Foco da turma em vigília.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredVdis.slice().sort((a, b) => a.modulo - b.modulo).slice(0, 5).map((item) => (
                        <div key={item.studentId} className="flex items-center justify-between rounded-xl border p-3">
                          <div>
                            <p className="font-medium">{item.nome}</p>
                            <p className="text-xs text-muted-foreground">{classifyVDI(item.modulo)}</p>
                          </div>
                          <span className="font-mono text-sm" style={{ color: VDI_COLORS[classifyVDI(item.modulo)] }}>{item.modulo.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">Selecione uma turma para ver o panorama detalhado.</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attention" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-500" /> Alunos em atenção</CardTitle>
                <CardDescription>Prioridade para acompanhamento e intervenção individual.</CardDescription>
              </CardHeader>
              <CardContent>
                {alunosAtencao.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno com sinal de vulnerabilidade identificado.</p>
                ) : (
                  <div className="space-y-3">
                    {alunosAtencao.map((item) => (
                      <div key={item.studentId} className="flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">{item.serie} • {item.turma}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm" style={{ color: VDI_COLORS[classifyVDI(item.modulo)] }}>{item.modulo.toFixed(3)}</span>
                          <Button asChild variant="outline" size="sm">
                            <Link to="/turmas/$id" params={{ id: item.classId }}>
                              Ver turma <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        </div>
        <p className="font-heading text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "primary" | "amber" | "rose" | "emerald" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    rose: "bg-rose-500/10 text-rose-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border p-4">
      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{label}</div>
      <p className="mt-3 font-heading text-2xl font-bold">{value}</p>
    </div>
  );
}
