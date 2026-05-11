import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight } from "lucide-react";
import { calcIEDE, calcDesvioPadrao, classifyVDI, VDI_COLORS, classificar } from "@/lib/descartes";
import { loadVdisBySchool, type VDIExtra } from "@/lib/load-data";

export const Route = createFileRoute("/turmas")({
  head: () => ({ meta: [{ title: "Turmas — DESCARTES" }] }),
  component: TurmasPage,
});

interface TurmaCard {
  id: string;
  nome: string;
  serie: string;
  ano: number;
  vdis: VDIExtra[];
}

function TurmasPage() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<TurmaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login" }); return; }
    const { data: school } = await supabase.from("schools").select("id, nome").eq("responsavel_id", user.id).maybeSingle();
    if (!school) { setLoading(false); return; }
    setSchoolName(school.nome);
    const { data: cls } = await supabase.from("classes").select("id, nome_turma, serie, ano_letivo").eq("school_id", school.id).order("serie");
    const allVdis = await loadVdisBySchool(school.id);
    const byClass = new Map<string, VDIExtra[]>();
    for (const v of allVdis) {
      if (!byClass.has(v.classId)) byClass.set(v.classId, []);
      byClass.get(v.classId)!.push(v);
    }
    setTurmas((cls ?? []).map((c) => ({
      id: c.id, nome: c.nome_turma, serie: c.serie, ano: c.ano_letivo,
      vdis: byClass.get(c.id) ?? [],
    })));
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (turmas.length === 0) return (
    <div className="p-8 space-y-4">
      <h1 className="font-heading text-2xl font-bold">Turmas</h1>
      <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
      <Button asChild><Link to="/escola">Ir para Minha Escola</Link></Button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Turmas</h1>
        <p className="text-sm text-muted-foreground">{schoolName} · {turmas.length} turma(s)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {turmas.map((t) => {
          const iede = calcIEDE(t.vdis);
          const sigma = calcDesvioPadrao(t.vdis);
          const status = iede ? classificar(iede) : "—";
          return (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 font-heading">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      {t.serie} {t.nome}
                    </CardTitle>
                    <CardDescription>{t.ano} · {t.vdis.length} alunos com coleta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IEDE</span>
                  <span className="font-mono font-semibold">{iede.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">σ (desvio)</span>
                  <span className="font-mono">{sigma.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold">{status}</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                  {(["vulneravel","parcial","integrado"] as const).map((k) => {
                    const c = t.vdis.filter((v) => classifyVDI(v.modulo) === k).length;
                    const total = t.vdis.length || 1;
                    return <div key={k} style={{ width: `${100*c/total}%`, background: VDI_COLORS[k] }} />;
                  })}
                </div>
                <Button asChild className="w-full mt-2" variant="outline">
                  <Link to="/turmas/$id" params={{ id: t.id }}>Ver turma <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
