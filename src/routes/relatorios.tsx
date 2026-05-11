import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { classifyVDI, VDI_COLORS } from "@/lib/descartes";
import { loadVdisBySchool, type VDIExtra } from "@/lib/load-data";

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

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login" }); return; }
    const { data: school } = await supabase.from("schools").select("id").eq("responsavel_id", user.id).maybeSingle();
    if (!school) { setLoading(false); return; }
    const v = await loadVdisBySchool(school.id);
    setVdis(v);
    const cls = Array.from(new Map(v.map((x) => [x.classId, `${x.serie ?? ""} ${x.turma ?? ""}`.trim()])).entries());
    setClasses(cls.map(([id, label]) => ({ id, label })));
    setLoading(false);
  }

  const filtered = useMemo(() => classFilter === "all" ? vdis : vdis.filter((v) => v.classId === classFilter), [vdis, classFilter]);

  function exportCSV() {
    const rows = [
      ["Aluno", "Código", "Escola", "Turma", "A", "S", "E", "VDI", "Classificação"],
      ...filtered.map((v) => [v.nome, v.codigoAluno, v.schoolNome ?? "", `${v.serie ?? ""} ${v.turma ?? ""}`.trim(), v.A.toFixed(3), v.S.toFixed(3), v.E.toFixed(3), v.modulo.toFixed(3), classifyVDI(v.modulo)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `relatorio-descartes.csv`; a.click();
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Pré-visualize e exporte os dados consolidados.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>{filtered.length} alunos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b">
                <th className="text-left p-2">Aluno</th><th className="p-2">Turma</th>
                <th className="p-2">A</th><th className="p-2">S</th><th className="p-2">E</th>
                <th className="p-2">|VDI|</th><th className="p-2">Classificação</th>
              </tr></thead>
              <tbody>
                {filtered.map((v) => {
                  const cls = classifyVDI(v.modulo);
                  return (
                    <tr key={v.studentId} className="border-b">
                      <td className="p-2 font-medium">{v.nome}</td>
                      <td className="p-2 text-xs text-muted-foreground">{v.serie} {v.turma}</td>
                      <td className="p-2 text-center font-mono">{v.A.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono">{v.S.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono">{v.E.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono" style={{ color: VDI_COLORS[cls] }}>{v.modulo.toFixed(3)}</td>
                      <td className="p-2 text-center capitalize">{cls === "vulneravel" ? "Vulnerável" : cls}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
