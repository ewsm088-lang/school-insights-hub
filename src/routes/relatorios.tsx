import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileChartColumn, Users, Target, Sparkles } from "lucide-react";
import { classifyVDI, calcIEDE, VDI_COLORS } from "@/lib/descartes";
import { loadVdisBySchool, type VDIExtra } from "@/lib/load-data";
import { RelatorioCharts } from "@/components/charts/RelatorioCharts";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — DESCARTES" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const navigate = useNavigate();
  const [vdis, setVdis] = useState<VDIExtra[]>([]);
  const [classes, setClasses] = useState<{ id: string; label: string }[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // load is intentionally scoped to the initial authenticated report request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login" }); return; }
    const { data: school } = await supabase.from("schools").select("id").eq("responsavel_id", user.id).maybeSingle();
    if (!school) { setLoading(false); return; }
    const loaded = await loadVdisBySchool(school.id);
    setVdis(loaded);
    const classMap = new Map(loaded.map((item) => [item.classId, `${item.serie ?? ""} ${item.turma ?? ""}`.trim() || "Sem turma"]));
    setClasses(Array.from(classMap, ([id, label]) => ({ id, label })));
    setLoading(false);
  }

  const filtered = useMemo(
    () => classFilter === "all" ? vdis : vdis.filter((v) => v.classId === classFilter),
    [vdis, classFilter],
  );
  const schoolIede = calcIEDE(vdis);
  const filteredIede = calcIEDE(filtered);
  const selectedClassLabel = classFilter === "all" ? "Toda a escola" : classes.find((item) => item.id === classFilter)?.label ?? "Turma selecionada";

  const weakestDimension = useMemo(() => {
    if (!filtered.length) return null;
    const averages = [
      { label: "Acadêmica", value: filtered.reduce((sum, item) => sum + item.A, 0) / filtered.length },
      { label: "Social", value: filtered.reduce((sum, item) => sum + item.S, 0) / filtered.length },
      { label: "Socioemocional", value: filtered.reduce((sum, item) => sum + item.E, 0) / filtered.length },
    ];
    return averages.reduce((lowest, current) => current.value < lowest.value ? current : lowest);
  }, [filtered]);

  function exportCSV() {
    const rows = [
      ["Aluno", "Código", "Escola", "Turma", "A", "S", "E", "VDI", "Classificação"],
      ...filtered.map((v) => [v.nome, v.codigoAluno, v.schoolNome ?? "", `${v.serie ?? ""} ${v.turma ?? ""}`.trim(), v.A.toFixed(3), v.S.toFixed(3), v.E.toFixed(3), v.modulo.toFixed(3), classifyVDI(v.modulo)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "relatorio-descartes.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando relatório…</div>;

  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        <header className="flex flex-col gap-5 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-sm sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <FileChartColumn className="h-4 w-4" /> Projeto DESCARTES
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Relatório analítico</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Leia a convivência democrática em três escalas: estudante, turma e escola. Os oito gráficos seguem a estrutura do relatório acadêmico e respondem aos mesmos indicadores A, S, E e VDI.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5"><Sparkles className="h-3.5 w-3.5" /> {selectedClassLabel}</Badge>
        </header>

        <Card className="border-primary/15 bg-card/80 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="font-heading font-semibold">Escopo do relatório</p>
              <p className="mt-1 text-sm text-muted-foreground">Filtre por turma para comparar o recorte com a referência da escola.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar relatório por turma"><SelectValue placeholder="Turma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileChartColumn className="h-6 w-6" /></div>
              <div>
                <h2 className="font-heading text-lg font-semibold">Ainda não há dados para este relatório</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Quando houver respostas DESCARTES, os oito gráficos e a prévia dos estudantes aparecerão aqui.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do relatório">
              <SummaryCard icon={<Users className="h-4 w-4" />} label="Alunos analisados" value={String(filtered.length)} hint={selectedClassLabel} />
              <SummaryCard icon={<Target className="h-4 w-4" />} label="IEDE do recorte" value={formatMetric(filteredIede)} hint="Média do VDI" />
              <SummaryCard icon={<FileChartColumn className="h-4 w-4" />} label="IEDE da escola" value={formatMetric(schoolIede)} hint="Referência institucional" />
              <SummaryCard icon={<Sparkles className="h-4 w-4" />} label="Menor dimensão média" value={weakestDimension?.label ?? "—"} hint={weakestDimension ? formatMetric(weakestDimension.value) : "Sem dados"} />
            </section>

            <RelatorioCharts vdis={filtered} schoolVdis={vdis} />

            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Prévia dos estudantes</CardTitle>
                <CardDescription>{filtered.length} registros no recorte atual · clique em uma turma acima para alterar os gráficos e a tabela.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <caption className="sr-only">Dados individuais do relatório DESCARTES</caption>
                    <thead><tr className="border-b bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="p-4 text-left font-medium">Aluno</th><th scope="col" className="p-4 text-left font-medium">Turma</th>
                      <th scope="col" className="p-4 text-center font-medium">A</th><th scope="col" className="p-4 text-center font-medium">S</th><th scope="col" className="p-4 text-center font-medium">E</th>
                      <th scope="col" className="p-4 text-center font-medium">|VDI|</th><th scope="col" className="p-4 text-center font-medium">Classificação</th>
                    </tr></thead>
                    <tbody>
                      {filtered.map((v) => {
                        const classification = classifyVDI(v.modulo);
                        const label = classification === "vulneravel" ? "Vulnerável" : classification === "parcial" ? "Parcial" : "Integrado";
                        return (
                          <tr key={v.studentId} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-4"><div className="font-medium">{v.nome}</div><div className="text-xs text-muted-foreground">{v.codigoAluno}</div></td>
                            <td className="p-4 text-muted-foreground">{v.serie} {v.turma}</td>
                            <td className="p-4 text-center font-mono">{v.A.toFixed(2)}</td>
                            <td className="p-4 text-center font-mono">{v.S.toFixed(2)}</td>
                            <td className="p-4 text-center font-mono">{v.E.toFixed(2)}</td>
                            <td className="p-4 text-center font-mono font-semibold" style={{ color: VDI_COLORS[classification] }}>{v.modulo.toFixed(3)}</td>
                            <td className="p-4 text-center"><span className="rounded-full border px-2.5 py-1 text-xs font-medium capitalize" style={{ borderColor: `${VDI_COLORS[classification]}66`, color: VDI_COLORS[classification] }}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function formatMetric(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function SummaryCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        </div>
        <p className="mt-4 truncate font-heading text-2xl font-bold" title={value}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
