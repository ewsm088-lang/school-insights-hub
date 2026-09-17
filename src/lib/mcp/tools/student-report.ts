import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import {
  calcVDI, classifyVDI, calcSubdimensoes, dimensaoMaisFraca,
  type StudentData, type SurveyRow,
} from "@/lib/descartes";

export default defineTool({
  name: "student_report",
  title: "Relatório do aluno",
  description:
    "Detalhes DESCARTES de um aluno: eixos A, S, E, |VDI|, classificação, subdimensões e dimensão mais frágil.",
  inputSchema: { student_id: z.string().describe("ID do aluno (use class_report).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("students")
      .select("id, nome, codigo_aluno, class_id, academic_data(nota, nota_min, nota_max), survey_responses(*), observacoes(texto, created_at)")
      .eq("id", student_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Aluno não encontrado" }], isError: true };

    const survey = (data.survey_responses as unknown as SurveyRow[])?.[0];
    if (!survey) {
      return { content: [{ type: "text", text: "Aluno sem coleta DESCARTES registrada." }] };
    }
    const academic = (data.academic_data as unknown as { nota: number; nota_min: number; nota_max: number }[])?.[0];
    const student: StudentData = {
      id: data.id,
      nome: data.codigo_aluno, // LGPD: apenas matrícula
      codigo_aluno: data.codigo_aluno,
      class_id: data.class_id,
      survey,
      nota: academic?.nota,
      nota_min: academic?.nota_min,
      nota_max: academic?.nota_max,
    };
    const v = calcVDI(student)!;
    const result = {
      id: v.studentId,
      nome: v.nome,
      class_id: v.classId,
      A: Number(v.A.toFixed(4)),
      S: Number(v.S.toFixed(4)),
      E: Number(v.E.toFixed(4)),
      vdi: Number(v.modulo.toFixed(4)),
      status: classifyVDI(v.modulo),
      dimensao_mais_fraca: dimensaoMaisFraca(academic ? v.A : null, v.S, v.E),
      subdimensoes: calcSubdimensoes(survey),
      observacoes: data.observacoes ?? [],
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
