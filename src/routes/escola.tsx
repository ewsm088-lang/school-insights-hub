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
import { Plus, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
interface Student { id: string; codigo_aluno: string; academic_data: { nota: number; nota_min: number; nota_max: number } | null; }

function EscolaPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<{ id: string; nome: string } | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newTurma, setNewTurma] = useState("");
  const [newSerie, setNewSerie] = useState("");
  const [newCodigo, setNewCodigo] = useState("");
  const [notaInputs, setNotaInputs] = useState<Record<string, { nota: string; min: string; max: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchool();
  }, []);

  useEffect(() => {
    if (selectedClass) loadStudents(selectedClass);
  }, [selectedClass]);

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
      .select("id, codigo_aluno, academic_data(nota, nota_min, nota_max)")
      .eq("class_id", classId)
      .order("codigo_aluno");

    if (data) {
      const mapped = data.map((s: any) => ({
        ...s,
        academic_data: Array.isArray(s.academic_data) ? s.academic_data[0] || null : s.academic_data,
      }));
      setStudents(mapped);
      const inputs: Record<string, { nota: string; min: string; max: string }> = {};
      mapped.forEach((s: Student) => {
        inputs[s.id] = {
          nota: s.academic_data?.nota?.toString() || "",
          min: s.academic_data?.nota_min?.toString() || "0",
          max: s.academic_data?.nota_max?.toString() || "10",
        };
      });
      setNotaInputs(inputs);
    }
  }

  async function addClass() {
    if (!school || !newTurma || !newSerie) return;
    const { error } = await supabase.from("classes").insert({
      school_id: school.id,
      nome_turma: newTurma,
      serie: newSerie,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Turma criada!");
    setNewTurma(""); setNewSerie("");
    loadClasses(school.id);
  }

  async function addStudent() {
    if (!selectedClass || !newCodigo) return;
    const { error } = await supabase.from("students").insert({
      class_id: selectedClass,
      codigo_aluno: newCodigo,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Aluno adicionado!");
    setNewCodigo("");
    loadStudents(selectedClass);
  }

  async function saveNota(studentId: string) {
    const input = notaInputs[studentId];
    if (!input?.nota) return;

    const payload = {
      student_id: studentId,
      nota: parseFloat(input.nota),
      nota_min: parseFloat(input.min || "0"),
      nota_max: parseFloat(input.max || "10"),
    };

    const existing = students.find(s => s.id === studentId)?.academic_data;
    let error;
    if (existing) {
      ({ error } = await supabase.from("academic_data").update(payload).eq("student_id", studentId));
    } else {
      ({ error } = await supabase.from("academic_data").insert(payload));
    }

    if (error) { toast.error(error.message); return; }
    toast.success("Nota salva!");
    if (selectedClass) loadStudents(selectedClass);
  }

  async function deleteClass(id: string) {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Turma removida");
    if (school) loadClasses(school.id);
    if (selectedClass === id) { setSelectedClass(null); setStudents([]); }
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8">
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
                <Input placeholder="Série (ex: 1º)" value={newSerie} onChange={e => setNewSerie(e.target.value)} className="w-24" />
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
                  </CardDescription>
                </div>
                {selectedClass && (
                  <div className="flex gap-2">
                    <Input placeholder="Código (ex: ALU001)" value={newCodigo} onChange={e => setNewCodigo(e.target.value)} className="w-40" />
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
                        <TableHead>Código</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Mín</TableHead>
                        <TableHead>Máx</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">{s.codigo_aluno}</TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-20" value={notaInputs[s.id]?.nota || ""} onChange={e => setNotaInputs(prev => ({ ...prev, [s.id]: { ...prev[s.id], nota: e.target.value } }))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-20" value={notaInputs[s.id]?.min || "0"} onChange={e => setNotaInputs(prev => ({ ...prev, [s.id]: { ...prev[s.id], min: e.target.value } }))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-20" value={notaInputs[s.id]?.max || "10"} onChange={e => setNotaInputs(prev => ({ ...prev, [s.id]: { ...prev[s.id], max: e.target.value } }))} />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => saveNota(s.id)}>Salvar</Button>
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
