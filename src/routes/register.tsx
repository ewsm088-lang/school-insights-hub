import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar Escola — DESCARTES" },
      { name: "description", content: "Cadastre sua escola no sistema DESCARTES" },
    ],
  }),
  component: RegisterPage,
});

interface Crede {
  id: string;
  numero: number;
  nome: string;
  cidade_sede: string;
}


function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeEscola, setNomeEscola] = useState("");
  const [cidade, setCidade] = useState("");
  const [inep, setInep] = useState("");
  const [credeId, setCredeId] = useState("");
  const [credes, setCredes] = useState<Crede[]>([]);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(
    SERIES.flatMap(s => TURMAS.map(t => `${s}${t}`))
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("credes").select("*").order("numero").then(({ data }) => {
      if (data) setCredes(data);
    });
  }, []);

  const toggleTurma = (turma: string) => {
    setSelectedTurmas(prev =>
      prev.includes(turma) ? prev.filter(t => t !== turma) : [...prev, turma]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credeId) { toast.error("Selecione uma CREDE"); return; }
    if (selectedTurmas.length === 0) { toast.error("Selecione pelo menos uma turma"); return; }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (authError || !authData.user) {
      toast.error("Erro no cadastro: " + (authError?.message || "Erro desconhecido"));
      setLoading(false);
      return;
    }

    const { data: schoolData, error: schoolError } = await supabase.from("schools").insert({
      crede_id: credeId,
      nome: nomeEscola,
      cidade,
      inep: inep || null,
      responsavel_id: authData.user.id,
    }).select("id").single();

    if (schoolError || !schoolData) {
      toast.error("Erro ao cadastrar escola: " + (schoolError?.message || ""));
      setLoading(false);
      return;
    }

    // Auto-create selected classes
    const classInserts = selectedTurmas.map(t => {
      const serie = t.slice(0, 2); // "1°", "2°", "3°"
      const turma = t.slice(2);    // "A", "B", "C", "D"
      return {
        school_id: schoolData.id,
        serie,
        nome_turma: turma,
      };
    });

    const { error: classError } = await supabase.from("classes").insert(classInserts);
    if (classError) {
      toast.error("Escola criada, mas erro ao criar turmas: " + classError.message);
    }

    setLoading(false);
    toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">Cadastrar Escola</CardTitle>
            <CardDescription>Registre sua escola no sistema DESCARTES</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CREDE</Label>
                <Select value={credeId} onValueChange={setCredeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a CREDE..." />
                  </SelectTrigger>
                  <SelectContent>
                    {credes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} — {c.cidade_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome-escola">Nome da Escola</Label>
                <Input id="nome-escola" placeholder="Ex: EEEP Exemplo" value={nomeEscola} onChange={e => setNomeEscola(e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" placeholder="Ex: Fortaleza" value={cidade} onChange={e => setCidade(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inep">Código INEP</Label>
                  <Input id="inep" placeholder="Ex: 23012345" value={inep} onChange={e => setInep(e.target.value)} />
                </div>
              </div>

              {/* Turmas selection */}
              <div className="space-y-3">
                <Label>Turmas da Escola</Label>
                <p className="text-xs text-muted-foreground">Selecione as turmas que a escola possui</p>
                <div className="space-y-3">
                  {SERIES.map(serie => (
                    <div key={serie} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-8">{serie}</span>
                      <div className="flex gap-3">
                        {TURMAS.map(turma => {
                          const key = `${serie}${turma}`;
                          return (
                            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                                checked={selectedTurmas.includes(key)}
                                onCheckedChange={() => toggleTurma(key)}
                              />
                              <span className="text-sm">{turma}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr />
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail do Responsável</Label>
                <Input id="reg-email" type="email" placeholder="responsavel@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Senha</Label>
                <Input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/login" className="text-primary hover:underline">Entrar</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
