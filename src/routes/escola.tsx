import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { Plus, Trash2, Users, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { calcSocial, calcSocioemocional, calcAcademico, type SurveyRow, SOCIAL_KEYS, SOCIO_KEYS } from "@/lib/descartes";

export const Route = createFileRoute("/escola")({
  head: () => ({
    meta: [
      { title: "Minha Escola — DESCARTES" },
      { name: "description", content: "Gerencie turmas, alunos e notas da sua escola" },
    ],
  }),
  component: EscolaPage,
});

interface ClassItem { id: string; nome_turma: string; serie: string; ano_letivo: number; }
interface SurveyData { s01:number;s02:number;s03:number;s04:number;s05:number;s06:number;s07:number;s08:number;s09:number;s10:number;s11:number;s12:number;s13:number;s14:number;s15:number;s16:number;s17:number;s18:number;s19:number;s20:number;e01:number;e02:number;e03:number;e04:number;e05:number;e06:number;e07:number;e08:number;e09:number;e10:number;e11:number;e12:number;e13:number;e14:number;e15:number;e16:number;e17:number;e18:number;e19:number;e20:number; }
interface Student {
  id: string;
  codigo_aluno: string;
  nome?: string;
  academic_data: { nota: number } | null;
  survey_responses: SurveyData | null;
}

function EscolaPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<{ id: string; nome: string } | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newTurma, setNewTurma] = useState("");
  const [newSerie, setNewSerie] = useState("");
  const [newCodigo, setNewCodigo] = useState("");
  const [notaInputs, setNotaInputs] = useState<Record<string, string>>({});
  const [editingSurvey, setEditingSurvey] = useState<string | null>(null);
  const [surveyEdits, setSurveyEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // nota_min and nota_max calculated from all notas in the class
  const classNotas = students
    .map(s => s.academic_data?.nota)
    .filter((n): n is number => n != null);
  const notaMin = classNotas.length > 0 ? Math.min(...classNotas) : 0;
  const notaMax = classNotas.length > 0 ? Math.max(...classNotas) : 10;

  useEffect(() => { loadSchool(); }, []);
  useEffect(() => { if (selectedClass) loadStudents(selectedClass); }, [selectedClass]);

  async function loadSchool() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login" }); return; }
    const { data } = await supabase.from("schools").select("id, nome").eq("responsavel_id", user.id).single();
    if (!data) { toast.error("Nenhuma escola encontrada para este usuário"); setLoading(false); return; }
    setSchool(data);
    loadClasses(data.id);
    setLoading(false);
  }

  async function loadClasses(schoolId: string) {
    const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId).order("serie");
    if (data) setClasses(data);
  }

  async function loadStudents(classId: string) {
    const { data } = await supabase
      .from("students")
      .select("id, codigo_aluno, nome, academic_data(nota), survey_responses(s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,e11,e12,e13,e14,e15,e16,e17,e18,e19,e20)")
      .eq("class_id", classId)
      .order("nome");

    if (data) {
      const mapped = data.map((s: any) => ({
        ...s,
        academic_data: Array.isArray(s.academic_data) ? s.academic_data[0] || null : s.academic_data,
        survey_responses: Array.isArray(s.survey_responses) ? s.survey_responses[0] || null : s.survey_responses,
      }));
      setStudents(mapped);
      const inputs: Record<string, string> = {};
      mapped.forEach((s: Student) => {
        inputs[s.id] = s.academic_data?.nota?.toString() || "";
      });
      setNotaInputs(inputs);
    }
  }

  async function addClass() {
    if (!school || !newTurma || !newSerie) return;
    const { error } = await supabase.from("classes").insert({ school_id: school.id, nome_turma: newTurma, serie: newSerie });
    if (error) { toast.error(error.message); return; }
    toast.success("Turma criada!");
    setNewTurma(""); setNewSerie("");
    loadClasses(school.id);
  }

  async function addStudent() {
    if (!selectedClass || !newCodigo) return;
    const { error } = await supabase.from("students").insert({ class_id: selectedClass, codigo_aluno: newCodigo, nome: newCodigo });
    if (error) { toast.error(error.message); return; }
    toast.success("Aluno adicionado!");
    setNewCodigo("");
    loadStudents(selectedClass);
  }

  async function saveNota(studentId: string) {
    const nota = notaInputs[studentId];
    if (!nota) return;
    const payload = {
      student_id: studentId,
      nota: parseFloat(nota),
      nota_min: 0,
      nota_max: 10,
    };
    const existing = students.find(s => s.id === studentId)?.academic_data;
    let error;
    if (existing) {
      ({ error } = await supabase.from("academic_data").update({ nota: payload.nota }).eq("student_id", studentId));
    } else {
      ({ error } = await supabase.from("academic_data").insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Nota salva!");
    if (selectedClass) loadStudents(selectedClass);
  }

  function startEditSurvey(student: Student) {
    if (!student.survey_responses) return;
    const edits: Record<string, string> = {};
    for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) {
      edits[k] = ((student.survey_responses as any)[k] ?? 3).toString();
    }
    setSurveyEdits(edits);
    setEditingSurvey(student.id);
  }

  async function saveSurveyEdits(studentId: string) {
    const payload: Record<string, any> = {};
    for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) {
      payload[k] = parseInt(surveyEdits[k] || "3");
    }
    const { error } = await supabase.from("survey_responses").update(payload as any).eq("student_id", studentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Respostas atualizadas!");
    setEditingSurvey(null);
    if (selectedClass) loadStudents(selectedClass);
  }

  async function deleteClass(id: string) {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Turma removida");
    if (school) loadClasses(school.id);
    if (selectedClass === id) { setSelectedClass(null); setStudents([]); }
  }

  function getSocialDecimal(sr: SurveyData | null): string {
    if (!sr) return "—";
    const val = calcSocial(sr as unknown as SurveyRow);
    return Math.round(val * 100).toString();
  }

  function getSocioDecimal(sr: SurveyData | null): string {
    if (!sr) return "—";
    const val = calcSocioemocional(sr as unknown as SurveyRow);
    return Math.round(val * 100).toString();
  }

  function getAcademicoDecimal(nota: number | undefined): string {
    if (nota == null || classNotas.length === 0) return "—";
    const val = calcAcademico(nota, notaMin, notaMax);
    return Math.round(val * 100).toString();
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">{school?.nome || "Minha Escola"}</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Classes panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Turmas</CardTitle>
              <CardDescription>Gerencie as turmas da escola</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Série (ex: 1°)" value={newSerie} onChange={e => setNewSerie(e.target.value)} className="w-24" />
                <Input placeholder="Turma (ex: A)" value={newTurma} onChange={e => setNewTurma(e.target.value)} />
                <Button size="icon" onClick={addClass}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1">
                {classes.map(c => (
                  <div key={c.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${selectedClass === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                    <span onClick={() => setSelectedClass(c.id)} className="flex-1">
                      {c.serie} — {c.nome_turma}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteClass(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {classes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma turma cadastrada</p>}
              </div>
            </CardContent>
          </Card>

          {/* Students panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" /> Alunos
                  </CardTitle>
                  <CardDescription>
                    {selectedClass ? `${students.length} aluno(s)` : "Selecione uma turma"}
                    {selectedClass && classNotas.length > 0 && (
                      <span className="ml-2 text-xs">(Nota mín: {notaMin} | máx: {notaMax})</span>
                    )}
                  </CardDescription>
                </div>
                {selectedClass && (
                  <div className="flex gap-2">
                    <Input placeholder="Nome do aluno" value={newCodigo} onChange={e => setNewCodigo(e.target.value)} className="w-40" />
                    <Button size="sm" onClick={addStudent}><Plus className="h-4 w-4 mr-1" /> Aluno</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedClass && students.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">S (Social)</TableHead>
                        <TableHead className="text-center">E (Socioem.)</TableHead>
                        <TableHead className="text-center">A (Acadêm.)</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.nome || s.codigo_aluno}</TableCell>
                          <TableCell className="text-center font-mono text-sm">{getSocialDecimal(s.survey_responses)}</TableCell>
                          <TableCell className="text-center font-mono text-sm">{getSocioDecimal(s.survey_responses)}</TableCell>
                          <TableCell className="text-center font-mono text-sm">{getAcademicoDecimal(s.academic_data?.nota)}</TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-20" value={notaInputs[s.id] || ""} onChange={e => setNotaInputs(prev => ({ ...prev, [s.id]: e.target.value }))} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => saveNota(s.id)}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              {s.survey_responses && (
                                <Dialog open={editingSurvey === s.id} onOpenChange={open => { if (!open) setEditingSurvey(null); }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => startEditSurvey(s)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="font-heading">Editar Respostas — {s.nome || s.codigo_aluno}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <h4 className="font-heading font-semibold text-primary">Social (S01-S20)</h4>
                                      <div className="grid grid-cols-4 gap-2">
                                        {SOCIAL_KEYS.map(k => (
                                          <div key={k} className="flex items-center gap-2">
                                            <Label className="text-xs w-8 uppercase">{k}</Label>
                                            <Input type="number" min={1} max={5} className="w-16" value={surveyEdits[k] || "3"} onChange={e => setSurveyEdits(prev => ({ ...prev, [k]: e.target.value }))} />
                                          </div>
                                        ))}
                                      </div>
                                      <h4 className="font-heading font-semibold text-primary">Socioemocional (E01-E20)</h4>
                                      <div className="grid grid-cols-4 gap-2">
                                        {SOCIO_KEYS.map(k => (
                                          <div key={k} className="flex items-center gap-2">
                                            <Label className="text-xs w-8 uppercase">{k}</Label>
                                            <Input type="number" min={1} max={5} className="w-16" value={surveyEdits[k] || "3"} onChange={e => setSurveyEdits(prev => ({ ...prev, [k]: e.target.value }))} />
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <DialogClose asChild>
                                          <Button variant="outline"><X className="h-4 w-4 mr-1" /> Cancelar</Button>
                                        </DialogClose>
                                        <Button onClick={() => saveSurveyEdits(s.id)}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedClass ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno cadastrado nesta turma</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Selecione uma turma para ver os alunos</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
