import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { STUDENT_SELECT, buildSummary, aggregate, round } from "../query";

export default defineTool({
  name: "class_report",
  title: "Relatório da turma",
  description:
    "Relatório DESCARTES de uma turma: IEDE, desvio padrão, distribuição (vulnerável/parcial/integrado) e os eixos A, S, E e |VDI| de cada aluno.",
  inputSchema: {
    class_id: z.string().describe("ID da turma (obtido em list_classes)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("class_id", class_id)
      .order("nome");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const list = (data ?? []).map(buildSummary);
    const report = { ...aggregate(list), estudantes: round(list) };
    return {
      content: [{ type: "text", text: JSON.stringify(report) }],
      structuredContent: report,
    };
  },
});