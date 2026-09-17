import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import {
  calcVDI, calcIEDE, calcDesvioPadrao, classifyVDI, classificar,
  type StudentData, type SurveyRow,
} from "@/lib/descartes";

export default defineTool({
  name: "class_report",
  title: "Relatório da turma",
  description:
    "Relatório DESCARTES de uma turma: A (acadêmico), S (social), E (socioemocional), |VDI| por aluno, além de IEDE, desvio padrão e classificação da turma.",
  inputSchema: { class_id: z.string().describe("ID da turma (use list_classes).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("students")
      .select("id, nome, codigo_aluno, class_id, academic_data(nota, nota_min, nota_max), survey_responses(*)")
      .eq("class_id", class_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const vdis = (data ?? [])
      .map((s) => {
        const survey = (s.survey_responses as unknown as SurveyRow[])?.[0];
        if (!survey) return null;
        const academic = (s.academic_data as unknown as { nota: number; nota_min: number; nota_max: number }[])?.[0];
        const student: StudentData = {
          id: s.id,
          nome: s.codigo_aluno, // LGPD: apenas matrícula
          codigo_aluno: s.codigo_aluno,
          class_id: s.class_id,
          survey,
          nota: academic?.nota,
          nota_min: academic?.nota_min,
          nota_max: academic?.nota_max,
        };
        return calcVDI(student);
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const iede = calcIEDE(vdis);
    const report = {
      total_alunos: data?.length ?? 0,
      com_coleta: vdis.length,
      iede: Number(iede.toFixed(4)),
      desvio_padrao: Number(calcDesvioPadrao(vdis).toFixed(4)),
      classificacao: classificar(iede),
      alunos: vdis.map((v) => ({
        id: v.studentId,
        nome: v.nome,
        A: Number(v.A.toFixed(4)),
        S: Number(v.S.toFixed(4)),
        E: Number(v.E.toFixed(4)),
        vdi: Number(v.modulo.toFixed(4)),
        status: classifyVDI(v.modulo),
      })),
    };
    return { content: [{ type: "text", text: JSON.stringify(report) }], structuredContent: report };
  },
});
