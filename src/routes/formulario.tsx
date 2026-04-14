import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { SOCIAL_QUESTIONS, SOCIO_QUESTIONS, LIKERT_OPTIONS } from "@/lib/questions";

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
    supabase.from("credes").select("id, numero, nome, cidade_sede").order("numero").then(({ data }) => {
      if (data) setCredes(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedCrede) { setSchools([]); setSelectedSchool(""); return; }
    supabase.from("schools").select("id, nome").eq("crede_id", selectedCrede).order("nome").then(({ data }) => {
      if (data) setSchools(data);
    });
    setSelectedSchool("");
    setSelectedClass("");
  }, [selectedCrede]);

  useEffect(() => {
    if (!selectedSchool) { setClasses([]); setSelectedClass(""); return; }
    supabase.from("classes").select("id, nome_turma, serie").eq("school_id", selectedSchool).order("serie").then(({ data }) => {
      if (data) setClasses(data);
    });
    setSelectedClass("");
  }, [selectedSchool]);

  const allQuestions = [...SOCIAL_QUESTIONS, ...SOCIO_QUESTIONS];
  const allAnswered = allQuestions.every(q => responses[q.key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) { toast.error("Responda todas as perguntas"); return; }

    setLoading(true);

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({ class_id: selectedClass, codigo_aluno: nomeAluno, nome: nomeAluno })
      .select("id")
      .single();

    if (studentError || !student) {
      toast.error("Erro ao registrar aluno: " + (studentError?.message || ""));
      setLoading(false);
      return;
    }

    const surveyData: Record<string, any> = { student_id: student.id };
    for (const q of allQuestions) {
      surveyData[q.key] = parseInt(responses[q.key]);
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
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-secondary mx-auto" />
              <h2 className="font-heading text-2xl font-bold">Obrigado!</h2>
              <p className="text-muted-foreground">Suas respostas foram registradas com sucesso.</p>
              <Button onClick={() => { setSubmitted(false); setResponses({}); setNomeAluno(""); }}>
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
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Questionário de Convivência Democrática</CardTitle>
            <CardDescription>Responda com sinceridade. Suas respostas ajudam a melhorar a convivência escolar.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* CREDE → School → Class selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>CREDE</Label>
                  <Select value={selectedCrede} onValueChange={setSelectedCrede}>
                    <SelectTrigger><SelectValue placeholder="Selecione a CREDE..." /></SelectTrigger>
                    <SelectContent>
                      {credes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} — {c.cidade_sede}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool} disabled={!selectedCrede}>
                      <SelectTrigger><SelectValue placeholder={selectedCrede ? "Selecione a escola..." : "Selecione a CREDE primeiro"} /></SelectTrigger>
                      <SelectContent>
                        {schools.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                        {schools.length === 0 && selectedCrede && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma escola cadastrada nesta CREDE</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turma</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                      <SelectTrigger><SelectValue placeholder={selectedSchool ? "Selecione..." : "Selecione a escola primeiro"} /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.serie} — {c.nome_turma}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" placeholder="Seu nome completo" value={nomeAluno} onChange={e => setNomeAluno(e.target.value)} required />
              </div>

              <hr />

              {/* Social dimension */}
              <div>
                <h3 className="font-heading text-lg font-semibold mb-1 text-primary">Dimensão Social</h3>
                <p className="text-sm text-muted-foreground mb-4">Participação, Respeito e Colaboração</p>
              </div>
              {SOCIAL_QUESTIONS.map((q, i) => (
                <QuestionItem key={q.key} index={i + 1} question={q.label} questionKey={q.key} value={responses[q.key] || ""} onChange={v => setResponses(prev => ({ ...prev, [q.key]: v }))} />
              ))}

              <hr />

              {/* Socioemocional dimension */}
              <div>
                <h3 className="font-heading text-lg font-semibold mb-1 text-primary">Dimensão Socioemocional</h3>
                <p className="text-sm text-muted-foreground mb-4">Autogestão, Empatia e Resolução de Conflitos</p>
              </div>
              {SOCIO_QUESTIONS.map((q, i) => (
                <QuestionItem key={q.key} index={i + 21} question={q.label} questionKey={q.key} value={responses[q.key] || ""} onChange={v => setResponses(prev => ({ ...prev, [q.key]: v }))} />
              ))}

              <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedClass || !nomeAluno || !allAnswered}>
                {loading ? "Enviando..." : "Enviar Respostas"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}

function QuestionItem({ index, question, questionKey, value, onChange }: {
  index: number; question: string; questionKey: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium"><span className="text-muted-foreground mr-2">{index}.</span>{question}</p>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex flex-wrap gap-2">
          {LIKERT_OPTIONS.map(opt => (
            <Label key={opt.value} className="flex items-center gap-1.5 cursor-pointer rounded-md border px-3 py-2 text-xs hover:bg-muted transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </Label>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
