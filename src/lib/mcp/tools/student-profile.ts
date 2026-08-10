import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { STUDENT_SELECT, buildSummary } from "../query";
import { calcSubdimensoes, dimensaoMaisFraca, SOCIAL_KEYS, SOCIO_KEYS, type SurveyRow } from "@/lib/descartes";

export default defineTool({
  name: "student_profile",
  title: "Perfil do aluno",
  description:
    "Perfil DESCARTES de um aluno: eixos A, S, E, |VDI|, classificação, subdimensões, dimensão mais frágil e observações registradas.",
  inputSchema: {
    student_id: z.string().describe("ID do aluno (obtido em class_report)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("id", student_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Aluno não encontrado." }], isError: true };

    const s = buildSummary(data);
    const raw: any = data;
    const sr = Array.isArray(raw.survey_responses) ? raw.survey_responses[0] : raw.survey_responses;
    const survey = {} as SurveyRow;
    for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) survey[k] = sr?.[k] ?? 3;

    const { data: obs } = await supabase
      .from("observacoes")
      .select("texto, created_at")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false });

    const profile = {
      id: s.studentId,
      nome: s.nome,
      serie: s.serie,
      turma: s.turma,
      escola: s.schoolNome,
      A: Number(s.A.toFixed(4)),
      S: Number(s.S.toFixed(4)),
      E: Number(s.E.toFixed(4)),
      moduloVDI: Number(s.modulo.toFixed(4)),
      nota: s.nota,
      classificacao: s.classificacao,
      temColeta: s.temColeta,
      subdimensoes: s.temColeta ? calcSubdimensoes(survey) : null,
      dimensaoMaisFraca: dimensaoMaisFraca(s.nota != null ? s.A : null, s.S, s.E),
      observacoes: obs ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(profile) }],
      structuredContent: profile,
    };
  },
});