import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import {
  calcIEDE, calcDesvioPadrao, calcPearson, classifyVDI, VDI_COLORS, classificar,
} from "@/lib/descartes";
import { loadVdisByClass, type VDIExtra } from "@/lib/load-data";
import { Scatter3DAlunos } from "@/components/charts/Scatter3DAlunos";
import { ScatterPearson } from "@/components/charts/ScatterPearson";
import { RadarPerfil } from "@/components/charts/RadarPerfil";
import { HistogramaVDI } from "@/components/charts/HistogramaVDI";

export const Route = createFileRoute("/turmas/$id")({
  head: () => ({ meta: [{ title: "Turma — DESCARTES" }] }),
  component: TurmaPage,
});

function TurmaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [vdis, setVdis] = useState<VDIExtra[]>([]);
  const [info, setInfo] = useState<{ nome: string; serie: string; school: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    setLoading(true);
    const { data: turma } = await supabase
      .from("classes").select("nome_turma, serie, schools(nome)").eq("id", id).maybeSingle();
    if (turma) {
      const sc: any = Array.isArray((turma as any).schools) ? (turma as any).schools[0] : (turma as any).schools;
      setInfo({ nome: turma.nome_turma, serie: turma.serie, school: sc?.nome ?? "" });
    }
    const v = await loadVdisByClass(id);
    setVdis(v);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  const iede = calcIEDE(vdis);
  const sigma = calcDesvioPadrao(vdis);
  const r = calcPearson(vdis.filter((v) => v.A > 0).map((v) => v.S), vdis.filter((v) => v.A > 0).map((v) => v.A));
  const counts = { integrado: 0, parcial: 0, vulneravel: 0 };
  for (const v of vdis) counts[classifyVDI(v.modulo)]++;

  function exportCSV() {
    const rows = [
      ["Aluno", "Código", "A", "S", "E", "VDI", "Classificação"],
      ...vdis.map((v) => [v.nome, v.codigoAluno, v.A.toFixed(3), v.S.toFixed(3), v.E.toFixed(3), v.modulo.toFixed(3), classifyVDI(v.modulo)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `turma-${info?.serie}-${info?.nome}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/turmas"><ArrowLeft className="h-4 w-4 mr-1" /> Turmas</Link>
          </Button>
          <h1 className="font-heading text-3xl font-bold tracking-tight">{info?.serie} {info?.nome}</h1>
          <p className="text-sm text-muted-foreground">{info?.school} · {vdis.length} alunos com coleta</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>IEDE</CardDescription><CardTitle className="font-mono text-2xl">{iede.toFixed(3)}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{classificar(iede)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>σ (desvio)</CardDescription><CardTitle className="font-mono text-2xl">{sigma.toFixed(3)}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Desigualdade interna</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pearson r (S × A)</CardDescription><CardTitle className="font-mono text-2xl">{isNaN(r) ? "—" : r.toFixed(3)}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Correlação social × acadêmico</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Distribuição</CardDescription>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold" style={{ color: VDI_COLORS.integrado }}>{counts.integrado}</span>
            <span className="text-lg font-bold" style={{ color: VDI_COLORS.parcial }}>{counts.parcial}</span>
            <span className="text-lg font-bold" style={{ color: VDI_COLORS.vulneravel }}>{counts.vulneravel}</span>
          </div></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Integ. · Parc. · Vuln.</CardContent></Card>
      </div>

      {vdis.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma coleta cadastrada para esta turma.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>G4 — Posição cartesiana dos alunos</CardTitle>
              <CardDescription>Cada aluno como ponto em A×S×E. Toggle 3D/2D.</CardDescription></CardHeader>
            <CardContent><Scatter3DAlunos vdis={vdis} /></CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>G5 — Correlação Pearson (S × A)</CardTitle>
                <CardDescription>Linha de tendência + valor de r</CardDescription></CardHeader>
              <CardContent><ScatterPearson vdis={vdis} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>G6 — Perfil médio da turma</CardTitle>
                <CardDescription>6 subdimensões · referência ideal = 1.0</CardDescription></CardHeader>
              <CardContent><RadarPerfil vdis={vdis} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>G7 — Distribuição dos |VDI|</CardTitle>
              <CardDescription>Faixas vulnerável / parcial / integrado</CardDescription></CardHeader>
            <CardContent><HistogramaVDI vdis={vdis} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alunos</CardTitle>
              <CardDescription>Ordenado por |VDI| crescente</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left p-2">Aluno</th><th className="p-2">A</th><th className="p-2">S</th><th className="p-2">E</th><th className="p-2">|VDI|</th><th className="p-2">Classificação</th><th></th>
                  </tr></thead>
                  <tbody>
                    {[...vdis].sort((a,b) => a.modulo - b.modulo).map((v) => {
                      const cls = classifyVDI(v.modulo);
                      return (
                        <tr key={v.studentId} className="border-b" style={cls === "vulneravel" ? { background: "color-mix(in oklab, " + VDI_COLORS.vulneravel + " 8%, transparent)" } : {}}>
                          <td className="p-2 font-medium">{v.nome}</td>
                          <td className="p-2 text-center font-mono">{v.A.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono">{v.S.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono">{v.E.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono font-semibold" style={{ color: VDI_COLORS[cls] }}>{v.modulo.toFixed(3)}</td>
                          <td className="p-2 text-center capitalize">{cls === "vulneravel" ? "Vulnerável" : cls}</td>
                          <td className="p-2 text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link to="/alunos/$id" params={{ id: v.studentId }}>Ver <ExternalLink className="h-3 w-3 ml-1" /></Link>
                            </Button>
                          </td>
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
  );
}
