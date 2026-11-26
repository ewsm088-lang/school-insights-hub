import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { ALL_QUESTIONS } from "@/lib/questions";
import { toast } from "sonner";

export const Route = createFileRoute("/responder/$token")({
  head: () => ({ meta: [
    { title: "Questionário — DESCARTES" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
  ]}),
  component: ResponderPage,
});

interface School { id: string; nome: string }
interface ClassItem { id: string; nome_turma: string; serie: string }

function ResponderPage() {
  const { token } = Route.useParams();
  // Etapas: 0 = escola, 1 = turma, 2 = aluno, 3..3+N = perguntas, last = done
  const [stage, setStage] = useState(0);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Token = school id (se válido); senão lista todas
  useEffect(() => {
    async function init() {
      if (token && token !== "open") {
        const { data } = await supabase.rpc("list_public_schools", {
          p_crede_id: null,
          p_school_id: token,
        });
        if (data?.length) {
          setSchools(data);
          setSchoolId(data[0].id);
          setStage(1);
          return;
        }
      }
      const { data: all } = await supabase.rpc("list_public_schools", {
        p_crede_id: null,
        p_school_id: null,
      });
      setSchools(all ?? []);
    }
    init();
  }, [token]);

  useEffect(() => {
    if (!schoolId) return;
    supabase.rpc("list_public_classes", { p_school_id: schoolId }).then(({ data }) => setClasses(data ?? []));
  }, [schoolId]);

  const totalQuestions = ALL_QUESTIONS.length;
  const qIndex = stage - 3;
  const isQuestion = stage >= 3 && stage < 3 + totalQuestions;
  const currentQ = isQuestion ? ALL_QUESTIONS[qIndex] : null;
  const progress = isQuestion ? ((qIndex + 1) / totalQuestions) * 100 : 0;

  async function submit() {
    setSubmitting(true);
    try {
      const code = newStudentName.trim().replace(/[^0-9A-Za-z/-]/g, "").slice(0, 20);
      if (!code || !classId) throw new Error("Informe a matrícula e a turma.");
      const { data: submitResult, error } = await supabase.rpc("submit_survey_response", {
        p_class_id: classId,
        p_codigo_aluno: code,
        p_answers: answers,
      });
      if (
        error ||
        !submitResult ||
        typeof submitResult !== "object" ||
        !("ok" in submitResult) ||
        submitResult.ok !== true
      ) {
        throw error ?? new Error("Não foi possível enviar as respostas.");
      }
      setDone(true);
    } catch (e: any) {
      toast.error(e?.message === "Informe a matrícula e a turma." ? e.message : "Não foi possível enviar as respostas. Confira a matrícula e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <CheckCircle2 className="h-20 w-20 text-[var(--secondary)] mb-4" />
      <h1 className="font-heading text-3xl font-bold">Pronto!</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">Suas respostas foram enviadas. Obrigado por participar.</p>
      <p className="text-xs text-muted-foreground mt-6">Esta janela pode ser fechada.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b p-4">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">D</div>
          <span className="font-heading font-semibold">DESCARTES</span>
          {isQuestion && (
            <div className="ml-auto text-xs text-muted-foreground">Pergunta {qIndex + 1} de {totalQuestions}</div>
          )}
        </div>
        {isQuestion && <Progress value={progress} className="mt-3 max-w-xl mx-auto" />}
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 space-y-6">
            {stage === 0 && (
              <Step title="Passo 1 de 3" subtitle="Selecione sua escola">
                <Select value={schoolId} onValueChange={setSchoolId}>
                  <SelectTrigger><SelectValue placeholder="Escolha sua escola" /></SelectTrigger>
                  <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Button className="w-full" size="lg" disabled={!schoolId} onClick={() => setStage(1)}>Continuar</Button>
              </Step>
            )}

            {stage === 1 && (
              <Step title="Passo 2 de 3" subtitle="Selecione sua turma">
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Escolha sua turma" /></SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 && <div className="p-3 text-sm text-muted-foreground">Sem turmas. Seu professor ainda não abriu o questionário.</div>}
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.serie} {c.nome_turma}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" onClick={() => setStage(0)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button className="flex-1" size="lg" disabled={!classId} onClick={() => setStage(2)}>Continuar</Button>
                </div>
              </Step>
            )}

            {stage === 2 && (
              <Step title="Passo 3 de 3" subtitle="Informe sua matrícula">
                <Input
                  inputMode="numeric"
                  maxLength={20}
                  placeholder="Ex.: 3601121"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value.replace(/[^0-9A-Za-z/-]/g, "").slice(0, 20))}
                />
                <p className="text-center text-xs text-muted-foreground">Digite sua matrícula. Não informe seu nome.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" onClick={() => setStage(1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button className="flex-1" size="lg" disabled={!newStudentName.trim()} onClick={() => setStage(3)}>Começar</Button>
                </div>
              </Step>
            )}

            {currentQ && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{currentQ.dimension === "social" ? "Convivência social" : "Socioemocional"}</div>
                  <h2 className="font-heading text-xl font-semibold mt-1">{currentQ.label}</h2>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1,2,3,4,5].map((n) => {
                    const selected = answers[currentQ.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQ.key]: n })}
                        className={`h-14 rounded-lg border-2 text-xl font-bold transition-all ${selected ? "bg-primary text-primary-foreground border-primary scale-105" : "bg-background hover:border-primary/40"}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 = Nunca</span><span>5 = Sempre</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="lg" onClick={() => setStage((s) => s - 1)} disabled={qIndex === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                  </Button>
                  {qIndex < totalQuestions - 1 ? (
                    <Button className="flex-1" size="lg" disabled={!answers[currentQ.key]} onClick={() => setStage((s) => s + 1)}>
                      Próxima <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button className="flex-1" size="lg" disabled={!answers[currentQ.key] || submitting} onClick={submit}>
                      {submitting ? "Enviando…" : "Enviar respostas"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <h2 className="font-heading text-xl font-semibold mt-1">{subtitle}</h2>
      </div>
      {children}
    </div>
  );
}
