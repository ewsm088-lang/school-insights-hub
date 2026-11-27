import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileChartColumn } from "lucide-react";
import { classifyVDI, VDI_COLORS } from "@/lib/descartes";
import { loadVdisBySchool, type VDIExtra } from "@/lib/load-data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — DESCARTES" },
      { name: "description", content: "Indicadores e relatórios da convivência escolar no DESCARTES." },
      { property: "og:title", content: "Relatórios — DESCARTES" },
      { property: "og:description", content: "Indicadores e relatórios da convivência escolar no DESCARTES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] }),
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
  const selectedClassLabel = classFilter === "all" ? "Toda a escola" : classes.find((item) => item.id === classFilter)?.label ?? "Turma selecionada";

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
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><FileChartColumn className="h-4 w-4" /> Projeto DESCARTES</div>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Relatórios</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Consulte os dados individuais consolidados e exporte o recorte desejado. A leitura analítica completa está no Dashboard.</p>
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
        </header>

        <Card className="border-primary/15 bg-card/80 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="font-heading font-semibold">Filtrar consulta</p>
              <p className="mt-1 text-sm text-muted-foreground">Exibindo: <strong className="text-foreground">{selectedClassLabel}</strong></p>
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar consulta por turma"><SelectValue placeholder="Turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileChartColumn className="h-6 w-6" /></div>
              <div>
                <h2 className="font-heading text-lg font-semibold">Nenhum registro disponível</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Quando houver respostas DESCARTES, os dados individuais aparecerão nesta consulta.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Dados individuais</CardTitle>
              <CardDescription>{filtered.length} registros no recorte atual. Para a leitura visual completa, acesse o Dashboard.</CardDescription>
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
        )}
      </div>
    </main>
  );
}
