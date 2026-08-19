import { MathBlock } from "@/components/Formula";
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
              description="O responsável pela escola se cadastra, seleciona sua CREDE, informa o INEP e as turmas são criadas automaticamente."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Formulário do Aluno"
              description="Alunos selecionam a CREDE, a escola cadastrada e respondem 40 perguntas Likert (1-5) sobre Participação, Respeito, Colaboração, Autogestão, Empatia e Resolução de Conflitos."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Dashboards e Análise"
              description="Gráficos 3D de dispersão, IEDE, VDI individual, correlação de Pearson e comparações entre turmas, séries e escola."
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
              formula={String.raw`A=\frac{N-N_{\min}}{N_{\max}-N_{\min}}`}
              description="Normalização min-max das notas escolares para o intervalo [0, 1]"
              color="bg-chart-1"
            />
            <AxisCard
              axis="Y"
              label="Social (S)"
              formula={String.raw`S=\frac{\bar{s}-1}{4}`}
              subdimensions="20 itens · Participação, Respeito, Colaboração"
              description="Resposta dos alunos em escala Likert, normalizada para [0, 1]"
              color="bg-chart-2"
            />
            <AxisCard
              axis="Z"
              label="Socioemocional (E)"
              formula={String.raw`E=\frac{\bar{e}-1}{4}`}
              subdimensions="20 itens · Autogestão, Empatia, Resolução de Conflitos"
              description="Resposta dos alunos em escala Likert, normalizada para [0, 1]"
              color="bg-chart-3"
            />
          </div>

          <div className="mt-8 rounded-3xl border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Comparação escolar</p>
                <h3 className="font-heading text-2xl font-semibold mt-2">Como a escola vira referência</h3>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">Benchmark por escola</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <MathBlock>{String.raw`z=\frac{x-\mu}{\sigma}`}</MathBlock>
                <MathBlock>{String.raw`\text{escala}_{0\text{-}100}=50+10z`}</MathBlock>
                <p className="text-sm leading-7 text-muted-foreground">
                  O aluno não é avaliado por uma nota absoluta isolada. Ele é comparado à média da sua escola e ao desvio padrão da própria instituição, mantendo o VDI como estrutura principal e tornando a avaliação justa entre escolas diferentes.
                </p>
              </div>

              <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-sky-500/10 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Interpretação</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"><span>Acima da escola</span><strong className="text-emerald-600">&gt; 60</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"><span>Na linha da escola</span><strong className="text-amber-600">40 a 60</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"><span>Abaixo da escola</span><strong className="text-red-600">&lt; 40</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* VDI and IEDE formulas */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-heading font-semibold mb-3">Vetor Democrático Individual (VDI)</h3>
              <div className="space-y-3 mb-3"><MathBlock>{String.raw`\mathrm{VDI}=(A,\;S,\;E)`}</MathBlock><MathBlock>{String.raw`\left|\mathrm{VDI}\right|=\sqrt{A^{2}+S^{2}+E^{2}}`}</MathBlock></div>
              <p className="text-sm text-muted-foreground">Módulo do vetor que representa o estudante no espaço tridimensional (0 a √3), mantendo o modelo principal intacto.</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-heading font-semibold mb-3">Indicadores da Escola</h3>
              <div className="space-y-3 mb-3"><MathBlock>{String.raw`\mathrm{IEDE}=\frac{1}{n}\sum_{i=1}^{n}\left|\mathrm{VDI}_i\right|`}</MathBlock><MathBlock>{String.raw`\sigma=\sqrt{\frac{1}{n}\sum_{i=1}^{n}\left(\left|\mathrm{VDI}_i\right|-\mathrm{IEDE}\right)^{2}}`}</MathBlock><MathBlock>{String.raw`r=\frac{\sum (x_i-\bar{x})(y_i-\bar{y})}{\sqrt{\sum (x_i-\bar{x})^{2}}\;\sqrt{\sum (y_i-\bar{y})^{2}}}`}</MathBlock></div>
              <p className="text-sm text-muted-foreground">IEDE, σ e correlação continuam sendo indicadores da escola, mas a comparação agora é relativizada pela própria distribuição institucional.</p>
            </div>
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

function AxisCard({ axis, label, formula, subdimensions, description, color }: { axis: string; label: string; formula: string; subdimensions?: string; description: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white font-heading font-bold`}>
          {axis}
        </div>
        <h3 className="font-heading font-semibold">{label}</h3>
      </div>
      <div className="mb-2"><MathBlock>{formula}</MathBlock></div>
      {subdimensions && (
        <p className="text-xs text-muted-foreground mb-2">{subdimensions}</p>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
