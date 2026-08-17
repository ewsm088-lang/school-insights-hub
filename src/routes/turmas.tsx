import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarrasDistribuicao } from "@/components/charts/BarrasDistribuicao";
import { BubbleEquidade } from "@/components/charts/BubbleEquidade";
import { ArrowRight, GraduationCap, ShieldAlert, Users } from "lucide-react";
import { calcDesvioPadrao, calcIEDE, classificar, classifyVDI, VDI_COLORS } from "@/lib/descartes";
import { loadVdisBySchool, type VDIExtra } from "@/lib/load-data";

export const Route = createFileRoute("/turmas")({
  head: () => ({ meta: [{ title: "Turmas — DESCARTES" }] }),
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { next: location.href },
      });
    }
  },
  component: TurmasPage,
});

interface TurmaCard {
  id: string;
  nome: string;
  serie: string;
  ano: number;
  vdis: VDIExtra[];
}

function TurmasPage() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<TurmaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const { data: school } = await supabase.from("schools").select("id, nome").eq("responsavel_id", user.id).maybeSingle();
    if (!school) {
      setSchoolName("");
      setTurmas([]);
      setLoading(false);
      return;
    }

    setSchoolName(school.nome);
    const { data: cls } = await supabase.from("classes").select("id, nome_turma, serie, ano_letivo").eq("school_id", school.id).order("serie");
    const allVdis = await loadVdisBySchool(school.id);
    const byClass = new Map<string, VDIExtra[]>();
    for (const v of allVdis) {
      if (!byClass.has(v.classId)) byClass.set(v.classId, []);
      byClass.get(v.classId)!.push(v);
    }

    setTurmas((cls ?? []).map((c) => ({
      id: c.id,
      nome: c.nome_turma,
      serie: c.serie,
      ano: c.ano_letivo,
      vdis: byClass.get(c.id) ?? [],
    })));
    setLoading(false);
  }

  const allVdis = useMemo(() => turmas.flatMap((turma) => turma.vdis), [turmas]);

  const resumo = useMemo(() => {
    const total = allVdis.length;
    const vulneraveis = allVdis.filter((v) => classifyVDI(v.modulo) === "vulneravel").length;
    return { total, vulneraveis };
  }, [allVdis]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando turmas…</div>;

  if (!schoolName && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Nenhuma escola vinculada</CardTitle>
              <CardDescription>Cadastre a escola do responsável antes de visualizar as turmas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild><Link to="/register">Cadastrar escola</Link></Button>
              <Button asChild variant="outline"><Link to="/escola">Ir para Minha Escola</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (turmas.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Ainda não há turmas cadastradas</CardTitle>
              <CardDescription>
                {schoolName ? `${schoolName} ainda não possui turmas registradas.` : "Cadastre a escola e adicione as turmas para continuar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild><Link to="/escola">Gerenciar escola</Link></Button>
              <Button asChild variant="outline"><Link to="/dashboard">Voltar ao dashboard</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-6">
        <div className="rounded-3xl border bg-gradient-to-br from-primary/6 via-background to-amber-500/5 p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Estrutura escolar</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold">Turmas</h1>
              <p className="mt-1 text-sm text-muted-foreground">{schoolName} · {turmas.length} turma(s) · {resumo.total} alunos monitorados</p>
            </div>
            <Badge variant="secondary" className="w-fit">{resumo.vulneraveis} em atenção</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Turmas" value={turmas.length.toString()} icon={<GraduationCap className="h-4 w-4" />} />
          <SummaryMetric label="Alunos" value={resumo.total.toString()} icon={<Users className="h-4 w-4" />} />
          <SummaryMetric label="Vulneráveis" value={resumo.vulneraveis.toString()} icon={<ShieldAlert className="h-4 w-4" />} />
          <SummaryMetric label="Acompanhamento" value="Ativo" icon={<ArrowRight className="h-4 w-4" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Comparativo setorial</CardTitle>
              <CardDescription>Distribuição percentual por turma e nível de risco.</CardDescription>
            </CardHeader>
            <CardContent>
              <BarrasDistribuicao vdis={allVdis} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Equidade por turma</CardTitle>
              <CardDescription>Relacione grau de desigualdade e nível de IEDE.</CardDescription>
            </CardHeader>
            <CardContent>
              <BubbleEquidade vdis={allVdis} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {turmas.map((t) => {
            const iede = calcIEDE(t.vdis);
            const sigma = calcDesvioPadrao(t.vdis);
            const status = t.vdis.length ? classificar(iede) : "—";
            const vulneraveis = t.vdis.filter((v) => classifyVDI(v.modulo) === "vulneravel").length;
            return (
              <Card key={t.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-heading text-xl">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        {t.serie} {t.nome}
                      </CardTitle>
                      <CardDescription>{t.ano ? `${t.ano} • ` : ""}{t.vdis.length} alunos com coleta</CardDescription>
                    </div>
                    <Badge variant={status === "Integrado" ? "secondary" : status === "Parcial" ? "outline" : "destructive"}>{status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-muted/70 p-3">
                      <p className="text-xs text-muted-foreground">IEDE</p>
                      <p className="mt-1 font-mono text-lg font-semibold">{t.vdis.length ? iede.toFixed(3) : "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/70 p-3">
                      <p className="text-xs text-muted-foreground">σ</p>
                      <p className="mt-1 font-mono text-lg font-semibold">{t.vdis.length ? sigma.toFixed(3) : "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Risco</span>
                      <span>{vulneraveis} vulneráveis</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      {(["vulneravel", "parcial", "integrado"] as const).map((key) => {
                        const count = t.vdis.filter((v) => classifyVDI(v.modulo) === key).length;
                        const total = t.vdis.length || 1;
                        return <div key={key} style={{ width: `${(count / total) * 100}%`, background: VDI_COLORS[key] }} />;
                      })}
                    </div>
                  </div>

                  <Button asChild className="w-full" variant="outline">
                    <Link to="/turmas/$id" params={{ id: t.id }}>
                      Ver turma <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      </div>
      <p className="font-heading text-2xl font-bold">{value}</p>
    </div>
  );
}
