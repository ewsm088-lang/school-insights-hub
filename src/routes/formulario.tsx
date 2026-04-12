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

export const Route = createFileRoute("/formulario")({
  head: () => ({
    meta: [
      { title: "Formulário do Aluno — DESCARTES" },
      { name: "description", content: "Responda o questionário de convivência escolar" },
    ],
  }),
  component: FormularioPage,
});

interface School { id: string; nome: string; }
interface ClassItem { id: string; nome_turma: string; serie: string; }

const LIKERT_OPTIONS = [
  { value: "1", label: "1 — Nunca" },
  { value: "2", label: "2 — Raramente" },
  { value: "3", label: "3 — Às vezes" },
  { value: "4", label: "4 — Frequentemente" },
  { value: "5", label: "5 — Sempre" },
];

const QUESTIONS = [
  { key: "participacao", label: "Participação", description: "Você participa ativamente das atividades em sala de aula?" },
  { key: "respeito", label: "Respeito", description: "Você respeita as opiniões e diferenças dos colegas?" },
  { key: "colaboracao", label: "Colaboração", description: "Você colabora com os colegas em trabalhos e atividades?" },
  { key: "autogestao", label: "Autogestão", description: "Você consegue organizar suas tarefas e controlar suas emoções?" },
  { key: "empatia", label: "Empatia", description: "Você se coloca no lugar dos outros e compreende seus sentimentos?" },
  { key: "resolucao_conflitos", label: "Resolução de Conflitos", description: "Você resolve desentendimentos de forma pacífica e dialogada?" },
];

function FormularioPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [codigoAluno, setCodigoAluno] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("schools").select("id, nome").order("nome").then(({ data }) => {
      if (data) setSchools(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedSchool) { setClasses([]); return; }
    supabase.from("classes").select("id, nome_turma, serie").eq("school_id", selectedSchool).order("serie").then(({ data }) => {
      if (data) setClasses(data);
    });
  }, [selectedSchool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (QUESTIONS.some(q => !responses[q.key])) {
      toast.error("Responda todas as perguntas");
      return;
    }

    setLoading(true);

    // Create student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({ class_id: selectedClass, codigo_aluno: codigoAluno })
      .select("id")
      .single();

    if (studentError || !student) {
      toast.error("Erro ao registrar aluno: " + (studentError?.message || ""));
      setLoading(false);
      return;
    }

    // Submit survey
    const { error: surveyError } = await supabase.from("survey_responses").insert({
      student_id: student.id,
      participacao: parseInt(responses.participacao),
      respeito: parseInt(responses.respeito),
      colaboracao: parseInt(responses.colaboracao),
      autogestao: parseInt(responses.autogestao),
      empatia: parseInt(responses.empatia),
      resolucao_conflitos: parseInt(responses.resolucao_conflitos),
    });

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
              <Button onClick={() => { setSubmitted(false); setResponses({}); setCodigoAluno(""); }}>
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
            <CardTitle className="font-heading text-2xl">Questionário de Convivência</CardTitle>
            <CardDescription>Responda com sinceridade. Suas respostas são anônimas e ajudam a melhorar a convivência escolar.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* School & Class selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Escola</Label>
                  <Select value={selectedSchool} onValueChange={v => { setSelectedSchool(v); setSelectedClass(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {schools.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.serie} — {c.nome_turma}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código do Aluno</Label>
                <Input id="codigo" placeholder="Ex: ALU001" value={codigoAluno} onChange={e => setCodigoAluno(e.target.value)} required />
              </div>

              <hr />

              {/* Likert questions */}
              {QUESTIONS.map(q => (
                <div key={q.key} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <h3 className="font-heading font-semibold">{q.label}</h3>
                    <p className="text-sm text-muted-foreground">{q.description}</p>
                  </div>
                  <RadioGroup value={responses[q.key] || ""} onValueChange={v => setResponses(prev => ({ ...prev, [q.key]: v }))}>
                    <div className="flex flex-wrap gap-3">
                      {LIKERT_OPTIONS.map(opt => (
                        <Label key={opt.value} className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                          <RadioGroupItem value={opt.value} />
                          {opt.label}
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              ))}

              <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedClass || !codigoAluno}>
                {loading ? "Enviando..." : "Enviar Respostas"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
