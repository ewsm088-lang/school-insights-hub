import { useState } from "react";
import { AlertCircle, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type ReportSection = {
  id: string;
  scope: "school" | "series" | "class";
  label: string;
  respondents: number;
  metrics: {
    academicAverage: number | null;
    academicCoverage: "none" | "low" | "partial" | "high";
    socialAverage: number;
    socioemotionalAverage: number;
    vdiAverage: number;
    vdiStdDev: number;
    subdimensions: Record<string, number>;
  };
  summary: string;
  findings: string[];
  recommendations: string[];
};

type ReportResponse = {
  generatedAt: string;
  minimumGroupSize: number;
  suppressedGroups: boolean;
  sections: ReportSection[];
};

const scopeLabel: Record<ReportSection["scope"], string> = {
  school: "Escola",
  series: "Série",
  class: "Turma",
};

function formatMetric(value: number | null) {
  return value == null ? "Sem dados" : value.toFixed(2);
}

async function getFunctionErrorMessage(error: unknown) {
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : undefined;

  if (!context || typeof context !== "object") {
    return "Não foi possível conectar ao serviço de relatórios. Confira o projeto Supabase usado pelo preview.";
  }

  const response = context as {
    status?: unknown;
    clone?: () => { json: () => Promise<unknown> };
  };
  const status = typeof response.status === "number" ? response.status : null;
  let body: Record<string, unknown> | null = null;

  try {
    const clonedResponse = response.clone?.();
    if (clonedResponse) {
      const parsed = await clonedResponse.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // Some gateway errors return plain text instead of JSON.
  }

  if (status === 404) {
    return "A função generate-school-report não está publicada no mesmo projeto Supabase conectado ao preview.";
  }

  const serverMessage = body?.error ?? body?.message;
  if (typeof serverMessage === "string") return serverMessage;

  if (status === 401) {
    return "Sua sessão expirou. Entre novamente na conta da escola e tente de novo.";
  }
  if (status === 403) {
    return "Esta conta não tem uma escola vinculada como responsável no Supabase.";
  }
  if (status != null) {
    return `O serviço de relatórios respondeu com erro HTTP ${status}. Confira os logs da função no Lovable Cloud.`;
  }
  return "Não foi possível conectar ao serviço de relatórios. Confira o projeto Supabase usado pelo preview.";
}

export function AiSchoolReport() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");

  async function generateReport() {
    setLoading(true);
    setErrorMessage("");
    setEmptyMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-school-report", {
        body: {},
      });

      if (error) {
        setErrorMessage(await getFunctionErrorMessage(error));
        return;
      }
      if (data?.code === "insufficient_data" || data?.code === "no_data") {
        setReport(null);
        setEmptyMessage(data.message ?? "Ainda não há dados suficientes para gerar o relatório.");
        return;
      }
      if (!data?.sections || !Array.isArray(data.sections)) {
        setErrorMessage(data?.error ?? "A resposta do serviço ficou incompleta. Tente novamente.");
        return;
      }

      setReport(data as ReportResponse);
      toast.success("Relatório da escola gerado.");
    } catch {
      setErrorMessage("Não foi possível falar com o serviço de relatórios. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="ai-school-report-title">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/10">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" />
              Análise com IA
            </div>
            <CardTitle id="ai-school-report-title" className="font-heading text-xl">
              Relatório por turma, série e escola
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              Gere uma leitura dos indicadores acadêmicos, sociais e socioemocionais já registrados no DESCARTES.
            </CardDescription>
          </div>
          <Button onClick={generateReport} disabled={loading} className="shrink-0">
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Gerando relatório..." : report ? "Gerar novamente" : "Gerar relatório"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Para gerar o texto, serão enviados ao OpenRouter apenas indicadores agregados, sem nomes ou matrículas.
            Recortes com menos de 10 respostas são omitidos. A análise serve como apoio pedagógico, não como diagnóstico individual.
          </p>
          {errorMessage && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {emptyMessage && (
            <p role="status" className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          {report.suppressedGroups && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              Alguns recortes não aparecem porque tinham menos de {report.minimumGroupSize} respostas.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {report.sections.map((section) => (
              <Card key={section.id} className={section.scope === "school" ? "border-primary/25 lg:col-span-2" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={section.scope === "school" ? "default" : "secondary"}>{scopeLabel[section.scope]}</Badge>
                    <span className="text-sm font-medium">{section.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{section.respondents} respostas</span>
                  </div>
                  <CardDescription className="pt-2 leading-6 text-foreground">{section.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <Metric label="Acadêmico (A)" value={formatMetric(section.metrics.academicAverage)} />
                    <Metric label="Social (S)" value={formatMetric(section.metrics.socialAverage)} />
                    <Metric label="Socioemocional (E)" value={formatMetric(section.metrics.socioemotionalAverage)} />
                    <Metric label="VDI médio" value={formatMetric(section.metrics.vdiAverage)} />
                  </div>
                  {Object.keys(section.metrics.subdimensions).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subdimensões</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(section.metrics.subdimensions).map(([label, value]) => (
                          <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                            {label}: {formatMetric(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {section.findings.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">O que os indicadores mostram</h3>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-5 text-muted-foreground">
                          {section.findings.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {section.recommendations.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">Possíveis ações pedagógicas</h3>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-5 text-muted-foreground">
                          {section.recommendations.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
