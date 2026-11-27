import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { classifyVDI, VDI_COLORS, dimensaoMaisFraca } from "@/lib/descartes";
import { loadStudentVdi, loadVdisByClass, type VDIExtra } from "@/lib/load-data";
import { GaugeVDI } from "@/components/charts/GaugeVDI";
import { RadarPerfil } from "@/components/charts/RadarPerfil";

export const Route = createFileRoute("/alunos/$id")({
  head: () => ({ meta: [{ title: "Aluno — DESCARTES" },
      { name: "description", content: "Perfil por matrícula e acompanhamento educacional no DESCARTES." },
      { property: "og:title", content: "Aluno — DESCARTES" },
      { property: "og:description", content: "Perfil por matrícula e acompanhamento educacional no DESCARTES." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] }),
  component: AlunoPage,
});

interface Obs { id: string; texto: string; created_at: string }

function AlunoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<VDIExtra | null>(null);
  const [turmaVdis, setTurmaVdis] = useState<VDIExtra[]>([]);
  const [obs, setObs] = useState<Obs[]>([]);
  const [novoObs, setNovoObs] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The detail view reloads whenever the route ID changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [id]);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    setUser(u.user);
    const v = await loadStudentVdi(id);
    setAluno(v);
    if (v) {
      const turma = await loadVdisByClass(v.classId);
      setTurmaVdis(turma);
    }
    const { data: o } = await supabase.from("observacoes").select("id, texto, created_at").eq("student_id", id).order("created_at", { ascending: false });
    setObs(o ?? []);
    setLoading(false);
  }

  async function deleteStudent() {
    if (!aluno) return;
    setDeleting(true);
    const { data, error } = await supabase.from("students").delete().eq("id", aluno.studentId).select("id");
    setDeleting(false);
    if (error || !data?.length) {
      toast.error("Não foi possível excluir. Só o responsável pela escola pode remover alunos.");
      return;
    }
    toast.success(`${aluno.nome} foi removido`);
    navigate({ to: "/turmas/$id", params: { id: aluno.classId } });
  }

  async function addObs() {
    if (!novoObs.trim() || !user) return;
    const { error } = await supabase.from("observacoes").insert({ student_id: id, author_id: user.id, texto: novoObs.trim() });
    if (error) { toast.error("Não foi possível salvar a observação. Verifique se você é responsável pela escola."); return; }
    toast.success("Observação salva");
    setNovoObs("");
    load();
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!aluno) return <div className="p-8 text-sm text-muted-foreground">Aluno não encontrado.</div>;

  const cls = classifyVDI(aluno.modulo);
  const fraca = dimensaoMaisFraca(aluno.A > 0 ? aluno.A : null, aluno.S, aluno.E);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/turmas/$id" params={{ id: aluno.classId }}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar à turma</Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">{aluno.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {aluno.schoolNome} · {aluno.serie} {aluno.turma} · cód. {aluno.codigoAluno}
            </p>
          </div>
          <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir aluno
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Acadêmico (A)</CardDescription><CardTitle className="font-mono text-2xl">{aluno.A.toFixed(3)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Social (S)</CardDescription><CardTitle className="font-mono text-2xl">{aluno.S.toFixed(3)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Socioemocional (E)</CardDescription><CardTitle className="font-mono text-2xl">{aluno.E.toFixed(3)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>|VDI|</CardDescription><CardTitle className="font-mono text-2xl" style={{ color: VDI_COLORS[cls] }}>{aluno.modulo.toFixed(3)}</CardTitle></CardHeader>
          <CardContent className="text-xs">{cls === "vulneravel" ? "Vulnerável" : cls === "parcial" ? "Parcial" : "Integrado"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Dim. mais fraca</CardDescription><CardTitle className="font-mono text-2xl">{fraca}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{fraca === "A" ? "Acadêmico" : fraca === "S" ? "Social" : "Socioemocional"}</CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>G8 — Gauge VDI</CardTitle><CardDescription>Escala 0 a √3 (≈1.73)</CardDescription></CardHeader>
          <CardContent className="flex items-center justify-center py-6"><GaugeVDI modulo={aluno.modulo} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>G9 — Perfil individual × turma</CardTitle><CardDescription>Linha azul = aluno · âmbar = média da turma</CardDescription></CardHeader>
          <CardContent><RadarPerfil vdis={turmaVdis} individual={aluno} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Observações do professor</CardTitle><CardDescription>Apenas o responsável da escola consegue salvar</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="space-y-2">
              <Textarea value={novoObs} onChange={(e) => setNovoObs(e.target.value)} placeholder="Anotação sobre o aluno…" />
              <Button onClick={addObs} disabled={!novoObs.trim()}>Salvar observação</Button>
            </div>
          )}
          <div className="space-y-3">
            {obs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma observação ainda.</p> : obs.map((o) => (
              <div key={o.id} className="rounded-md border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                <div className="whitespace-pre-wrap">{o.texto}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!open && !deleting) setDeleteOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{aluno.nome}</strong> será removido junto com respostas, notas e observações associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting} onClick={(event) => { event.preventDefault(); void deleteStudent(); }}>
              {deleting ? "Excluindo…" : "Sim, excluir aluno"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
