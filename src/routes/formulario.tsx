import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { CheckCircle, CircleDashed, ShieldCheck } from "lucide-react";
import { LIKERT_OPTIONS, SOCIAL_QUESTIONS, SOCIO_QUESTIONS } from "@/lib/questions";

export const Route = createFileRoute("/formulario")({
  head: () => ({
    meta: [
      { title: "Formulário do Aluno — DESCARTES" },
      { name: "description", content: "Responda o questionário de convivência escolar" },
    ],
  }),
  component: FormularioPage,
});

interface Crede { id: string; numero: number; nome: string; cidade_sede: string; }
interface School { id: string; nome: string; }
interface ClassItem { id: string; nome_turma: string; serie: string; }

function sanitizeText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100);
}

function FormularioPage() {
  const [credes, setCredes] = useState<Crede[]>([]);
  const [selectedCrede, setSelectedCrede] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [nomeAluno, setNomeAluno] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void supabase.from("credes").select("id, numero, nome, cidade_sede").order("numero").then(({ data }) => {
      if (data) setCredes(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedCrede) {
      setSchools([]);
      setSelectedSchool("");
      return;
    }

    void supabase.from("schools").select("id, nome").eq("crede_id", selectedCrede).order("nome").then(({ data }) => {
      if (data) setSchools(data);
    });
    setSelectedSchool("");
    setSelectedClass("");
  }, [selectedCrede]);

  useEffect(() => {
    if (!selectedSchool) {
      setClasses([]);
      setSelectedClass("");
      return;
    }

    void supabase.from("classes").select("id, nome_turma, serie").eq("school_id", selectedSchool).order("serie").then(({ data }) => {
      if (data) setClasses(data);
    });
    setSelectedClass("");
  }, [selectedSchool]);

  const allQuestions = [...SOCIAL_QUESTIONS, ...SOCIO_QUESTIONS];
  const allAnswered = allQuestions.every((q) => responses[q.key]);
  const progress = useMemo(() => Math.round((Object.keys(responses).length / allQuestions.length) * 100), [responses, allQuestions.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const safeName = sanitizeText(nomeAluno);
    if (!safeName) {
      toast.error("Informe a matrícula do aluno antes de enviar.");
      return;
    }
    if (!selectedClass || !selectedSchool) {
      toast.error("Selecione a escola e a turma corretamente.");
      return;
    }
    if (!allAnswered) {
      toast.error("Responda todas as perguntas antes de enviar.");
      return;
    }

    setLoading(true);

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({ class_id: selectedClass, codigo_aluno: safeName, nome: safeName })
      .select("id")
      .single();

    if (studentError || !student) {
      toast.error("Erro ao registrar aluno: " + (studentError?.message || ""));
      setLoading(false);
      return;
    }

    const surveyData: Record<string, number> = { student_id: student.id } as any;
    for (const q of allQuestions) {
      const value = Number(responses[q.key]);
      surveyData[q.key] = Number.isFinite(value) ? value : 3;
    }

    const { error: surveyError } = await supabase.from("survey_responses").insert(surveyData as any);
    if (surveyError) {
      toast.error("Erro ao enviar respostas: " + surveyError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSubmitted(true);
    toast.success("Respostas enviadas com sucesso!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center px-4 py-20">
          <Card className="w-full max-w-md text-center">
            <CardContent className="space-y-5 pt-8 pb-8">
              <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
              <div>
                <h2 className="font-heading text-2xl font-bold">Obrigado!</h2>
                <p className="mt-2 text-muted-foreground">Suas respostas foram registradas com sucesso.</p>
              </div>
              <Button onClick={() => {
                setSubmitted(false);
                setResponses({});
                setNomeAluno("");
                setSelectedClass("");
              }}>
                Responder novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="xl:sticky xl:top-20">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/40">
                <CardTitle className="font-heading text-xl">Progresso do questionário</CardTitle>
                <CardDescription>Escala de 1 a 5 · avaliação do ambiente escolar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 py-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Concluído</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Escala de resposta</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {LIKERT_OPTIONS.map((opt) => (
                      <div key={opt.value} className="rounded-xl bg-muted/60 px-2 py-1.5">{opt.label}</div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium"><CircleDashed className="h-4 w-4 text-primary" /> Dimensões</div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Social: participação e convivência</li>
                    <li>• Socioemocional: empatia e regulação</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </aside>

          <Card>
            <CardHeader className="bg-gradient-to-r from-primary/5 via-background to-sky-500/5 pb-4">
              <div className="space-y-3">
                <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Diagnóstico escolar
                </span>
                <CardTitle className="font-heading text-2xl">Questionário de convivência democrática</CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Este formulário busca identificar como a escola está vivendo a convivência, a participação, o respeito e o suporte socioemocional. As respostas são analisadas em contexto escolar, com foco em padrões da comunidade e não apenas em notas isoladas.
                </CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-3 rounded-2xl border bg-muted/25 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Objetivo</p>
                    <p className="mt-2 text-sm font-medium">Mapear convivência escolar</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Escala</p>
                    <p className="mt-2 text-sm font-medium">1 a 5 · frequência/qualidade</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Apoio</p>
                    <p className="mt-2 text-sm font-medium">Contexto escolar e turma</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CREDE</Label>
                    <Select value={selectedCrede} onValueChange={setSelectedCrede}>
                      <SelectTrigger><SelectValue placeholder="Selecione a CREDE" /></SelectTrigger>
                      <SelectContent>
                        {credes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome} — {c.cidade_sede}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool} disabled={!selectedCrede}>
                      <SelectTrigger><SelectValue placeholder={selectedCrede ? "Selecione a escola" : "Primeiro a CREDE"} /></SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Turma</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                      <SelectTrigger><SelectValue placeholder={selectedSchool ? "Selecione a turma" : "Primeiro a escola"} /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.serie} — {c.nome_turma}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do aluno</Label>
                    <Input
                      id="nome"
                      placeholder="Digite seu nome completo"
                      value={nomeAluno}
                      onChange={(e) => setNomeAluno(sanitizeText(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/25 p-4">
                  <h3 className="font-heading text-lg font-semibold">Dimensão Social</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Participação, respeito e colaboração na rotina escolar.</p>
                </div>

                {SOCIAL_QUESTIONS.map((q, index) => (
                  <QuestionItem key={q.key} index={index + 1} question={q.label} value={responses[q.key] ?? ""} onChange={(value) => setResponses((prev) => ({ ...prev, [q.key]: value }))} />
                ))}

                <div className="rounded-2xl border bg-muted/25 p-4">
                  <h3 className="font-heading text-lg font-semibold">Dimensão Socioemocional</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Autogestão, empatia e capacidade de lidar com conflitos.</p>
                </div>

                {SOCIO_QUESTIONS.map((q, index) => (
                  <QuestionItem key={q.key} index={index + 21} question={q.label} value={responses[q.key] ?? ""} onChange={(value) => setResponses((prev) => ({ ...prev, [q.key]: value }))} />
                ))}

                <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedClass || !nomeAluno || !allAnswered}>
                  {loading ? "Enviando respostas..." : "Enviar respostas"}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuestionItem({ index, question, value, onChange }: { index: number; question: string; value: string; onChange: (value: string) => void; }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-3 text-sm font-medium"><span className="mr-2 text-muted-foreground">{index}.</span>{question}</p>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex flex-wrap gap-2">
          {LIKERT_OPTIONS.map((opt) => (
            <Label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:text-foreground">
              <RadioGroupItem value={opt.value} />
              <span>{opt.label}</span>
            </Label>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
