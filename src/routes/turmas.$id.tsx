import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Download, ChevronRight, Search, Sparkles, Users, GraduationCap, AlertTriangle } from "lucide-react";
import {
  calcIEDE, calcDesvioPadrao, calcPearson, classifyVDI, VDI_COLORS, classificar,
} from "@/lib/descartes";
import { loadStudentsByClass, type StudentRow } from "@/lib/load-data";
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
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [info, setInfo] = useState<{ nome: string; serie: string; school: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [obsOpenFor, setObsOpenFor] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");

  async function saveObservation(studentId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Você precisa estar logado para registrar observação"); return; }
      const payload = { student_id: studentId, author_id: user.id, texto: obsText };
      const { error } = await supabase.from("observacoes").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Observação registrada");
      setObsOpenFor(null);
      setObsText("");
    } catch (err: any) {
      toast.error(err?.message || String(err));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: turma } = await supabase
        .from("classes").select("nome_turma, serie, schools(nome)").eq("id", id).maybeSingle();
      if (!cancelled && turma) {
        const sc: any = Array.isArray((turma as any).schools) ? (turma as any).schools[0] : (turma as any).schools;
        setInfo({ nome: turma.nome_turma, serie: turma.serie, school: sc?.nome ?? "" });
      }
      const rows = await loadStudentsByClass(id);
      if (!cancelled) { setStudents(rows); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const vdis = useMemo(() => students.map((s) => s.vdi).filter((v): v is NonNullable<typeof v> => !!v), [students]);
  const withNota = useMemo(() => students.filter((s) => s.nota != null), [students]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.nome.toLowerCase().includes(q));
  }, [students, query]);

  const iede = calcIEDE(vdis);
  const sigma = calcDesvioPadrao(vdis);
  const r = calcPearson(
    vdis.filter((v) => v.A > 0).map((v) => v.S),
    vdis.filter((v) => v.A > 0).map((v) => v.A),
  );
  const counts = { integrado: 0, parcial: 0, vulneravel: 0 };
  for (const v of vdis) counts[classifyVDI(v.modulo)]++;

  const mediaNota = withNota.length
    ? withNota.reduce((s, x) => s + (x.nota ?? 0), 0) / withNota.length
    : 0;

  function exportCSV() {
    const rows = [
      ["Aluno", "Código", "Nota", "A", "S", "E", "|VDI|", "Classificação"],
      ...students.map((s) => [
        s.nome, s.codigoAluno,
        s.nota?.toFixed(2) ?? "",
        s.A?.toFixed(3) ?? "",
        s.vdi?.S.toFixed(3) ?? "",
        s.vdi?.E.toFixed(3) ?? "",
        s.vdi?.modulo.toFixed(3) ?? "",
        s.vdi ? classifyVDI(s.vdi.modulo) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `turma-${info?.serie}-${info?.nome}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-10 w-72 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasSurveys = vdis.length > 0;
  const hasAcademic = withNota.length > 0;

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
        {/* Hero header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
            <Link to="/turmas"><ArrowLeft className="h-4 w-4 mr-1" /> Todas as turmas</Link>
          </Button>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" /> {info?.school}
              </div>
              <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight leading-none">
                {info?.serie} <span className="text-primary">{info?.nome}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{students.length} alunos</Badge>
                {hasAcademic && <Badge variant="secondary">{withNota.length} com nota</Badge>}
                {hasSurveys
                  ? <Badge variant="secondary">{vdis.length} com coleta DESCARTES</Badge>
                  : <Badge variant="outline" className="border-dashed">Sem coletas DESCARTES</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="shrink-0">
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Média acadêmica"
            value={hasAcademic ? mediaNota.toFixed(2) : "—"}
            hint={hasAcademic ? `${withNota.length} de ${students.length} alunos` : "Sem dados"}
            accent="primary"
          />
          <KpiCard
            label="IEDE"
            value={hasSurveys ? iede.toFixed(3) : "—"}
            hint={hasSurveys ? classificar(iede) : "Aguardando coletas"}
          />
          <KpiCard
            label="σ desvio"
            value={hasSurveys ? sigma.toFixed(3) : "—"}
            hint="Desigualdade interna"
          />
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">Distribuição</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {hasSurveys ? (
                <>
                  <div className="flex items-baseline gap-3 font-mono">
                    <DistDot color={VDI_COLORS.integrado} value={counts.integrado} label="Int." />
                    <DistDot color={VDI_COLORS.parcial} value={counts.parcial} label="Parc." />
                    <DistDot color={VDI_COLORS.vulneravel} value={counts.vulneravel} label="Vuln." />
                  </div>
                  <div className="flex h-1.5 mt-3 rounded-full overflow-hidden bg-muted">
                    {(["integrado","parcial","vulneravel"] as const).map((k) => {
                      const total = vdis.length || 1;
                      const w = (counts[k] / total) * 100;
                      return <div key={k} style={{ width: `${w}%`, background: VDI_COLORS[k] }} />;
                    })}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Sem coletas</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty-state CTA when no surveys */}
        {!hasSurveys && (
          <Card className="border-dashed bg-card/40">
            <CardContent className="py-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Esta turma ainda não tem coletas DESCARTES</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compartilhe o formulário com os alunos para gerar os indicadores Social, Socioemocional e os gráficos da turma.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to="/formulario">Abrir formulário <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Charts: only when surveys exist */}
        {hasSurveys && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">G4 — Posição cartesiana dos alunos</CardTitle>
                <CardDescription>Cada aluno como ponto em A × S × E. Alterne entre 3D e 2D.</CardDescription>
              </CardHeader>
              <CardContent><Scatter3DAlunos vdis={vdis} /></CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">G5 — Correlação Pearson (S × A)</CardTitle>
                  <CardDescription>Linha de tendência {isNaN(r) ? "" : `· r = ${r.toFixed(3)}`}</CardDescription>
                </CardHeader>
                <CardContent><ScatterPearson vdis={vdis} /></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">G6 — Perfil médio da turma</CardTitle>
                  <CardDescription>6 subdimensões · referência ideal = 1.0</CardDescription>
                </CardHeader>
                <CardContent><RadarPerfil vdis={vdis} /></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading">G7 — Distribuição dos |VDI|</CardTitle>
                <CardDescription>Faixas vulnerável / parcial / integrado</CardDescription>
              </CardHeader>
              <CardContent><HistogramaVDI vdis={vdis} /></CardContent>
            </Card>
          </>
        )}

        {/* Students list */}
        <Card>
          <CardHeader className="flex flex-row items-end justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="font-heading">Alunos da turma</CardTitle>
              <CardDescription>
                {hasSurveys ? "Ordenado por |VDI| crescente · alunos vulneráveis em destaque"
                            : "Ordenado por nota acadêmica decrescente"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
                      <th className="text-left p-3 font-medium">Aluno</th>
                      <th className="p-3 font-medium text-right">Nota</th>
                      <th className="p-3 font-medium text-center">A</th>
                      <th className="p-3 font-medium text-center">S</th>
                      <th className="p-3 font-medium text-center">E</th>
                      <th className="p-3 font-medium text-center">|VDI|</th>
                      <th className="p-3 font-medium text-center">Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sortStudents(filtered, hasSurveys).map((s) => {
                      const cls = s.vdi ? classifyVDI(s.vdi.modulo) : null;
                      const rowBg = cls === "vulneravel"
                        ? { background: `color-mix(in oklab, ${VDI_COLORS.vulneravel} 6%, transparent)` }
                        : {};
                      return (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors" style={rowBg}>
                          <td className="p-3">
                            <div className="font-medium leading-tight">{s.nome}</div>
                            <div className="text-xs text-muted-foreground">{s.codigoAluno}</div>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {s.nota != null ? s.nota.toFixed(2) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {s.A != null ? s.A.toFixed(2) : "—"}
                          </td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {s.vdi ? s.vdi.S.toFixed(2) : "—"}
                          </td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {s.vdi ? s.vdi.E.toFixed(2) : "—"}
                          </td>
                          <td className="p-3 text-center font-mono font-semibold"
                              style={cls ? { color: VDI_COLORS[cls] } : {}}>
                            {s.vdi ? s.vdi.modulo.toFixed(3) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {cls ? (
                              <Badge
                                variant="outline"
                                className="font-medium border-2 capitalize"
                                style={{ borderColor: VDI_COLORS[cls], color: VDI_COLORS[cls] }}
                              >
                                {cls === "vulneravel" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {cls === "vulneravel" ? "Vulnerável" : cls}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem coleta</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setObsOpenFor(s.id); setObsText(""); }}>
                                Observação
                              </Button>
                              <Button asChild variant="ghost" size="sm">
                                <Link to="/alunos/$id" params={{ id: s.id }}>
                                  Ver <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Observação — modal */}
        <Dialog open={!!obsOpenFor} onOpenChange={(open) => { if (!open) setObsOpenFor(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar observação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Aluno: {obsOpenFor ? (students.find(s => s.id === obsOpenFor)?.nome || obsOpenFor) : ""}</p>
              <Textarea value={obsText} onChange={(e) => setObsText((e.target as HTMLTextAreaElement).value)} placeholder="Descreva a observação pedagógica" />
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={() => obsOpenFor && saveObservation(obsOpenFor)}>Salvar observação</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function sortStudents(list: StudentRow[], byVdi: boolean): StudentRow[] {
  const copy = [...list];
  if (byVdi) {
    copy.sort((a, b) => (a.vdi?.modulo ?? Infinity) - (b.vdi?.modulo ?? Infinity));
  } else {
    copy.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  }
  return copy;
}

function KpiCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: "primary" }) {
  return (
    <Card className={accent === "primary" ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wider">{label}</CardDescription>
        <CardTitle className={`font-mono text-3xl ${accent === "primary" ? "text-primary" : ""}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function DistDot({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-xl font-bold leading-none" style={{ color }}>{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}
