import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ArrowRight, BarChart3, Users, School, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DESCARTES — Sistema de Convivência Democrática Escolar" },
      { name: "description", content: "Plataforma para análise vetorial 3D da convivência escolar usando os eixos Acadêmico, Social e Socioemocional." },
      { property: "og:title", content: "DESCARTES — Convivência Democrática Escolar" },
      { property: "og:description", content: "Análise vetorial 3D da convivência escolar." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              Modelagem Vetorial 3D
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Convivência
              <br />
              <span className="text-primary">Democrática</span>
              <br />
              Escolar
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              O <strong>DESCARTES</strong> analisa a convivência escolar por meio de vetores nos eixos
              Acadêmico (A), Social (S) e Socioemocional (E), gerando o Vetor Democrático Individual (VDI) e o IEDE.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link to="/register">
                  Cadastrar Escola <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/formulario">Responder Formulário</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-12">Como Funciona</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<School className="h-6 w-6" />}
              title="Cadastro da Escola"
              description="O responsável pela escola se cadastra, seleciona sua CREDE, e cria turmas e séries."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Formulário do Aluno"
              description="Alunos respondem perguntas Likert (1-5) sobre participação, respeito, colaboração, autogestão, empatia e resolução de conflitos."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Dashboards e Análise"
              description="Gráficos 3D de dispersão, IEDE, correlação de Pearson e comparações entre turmas, séries e escola."
            />
          </div>
        </div>
      </section>

      {/* Axes */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-12">Os Três Eixos</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <AxisCard
              axis="X"
              label="Acadêmico (A)"
              formula="A = (N - Nmin) / (Nmax - Nmin)"
              description="Normalização min-max das notas escolares"
              color="bg-chart-1"
            />
            <AxisCard
              axis="Y"
              label="Social (S)"
              formula="S = ((P+R+C)/3 - 1) / 4"
              description="Participação, Respeito, Colaboração"
              color="bg-chart-2"
            />
            <AxisCard
              axis="Z"
              label="Socioemocional (E)"
              formula="E = ((AG+EM+RC)/3 - 1) / 4"
              description="Autogestão, Empatia, Resolução de Conflitos"
              color="bg-chart-3"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>DESCARTES — Projeto de Convivência Democrática Escolar © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function AxisCard({ axis, label, formula, description, color }: { axis: string; label: string; formula: string; description: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white font-heading font-bold`}>
          {axis}
        </div>
        <h3 className="font-heading font-semibold">{label}</h3>
      </div>
      <code className="block rounded bg-muted px-3 py-2 text-sm font-mono mb-3">{formula}</code>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
