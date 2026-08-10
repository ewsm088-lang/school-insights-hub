import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { STUDENT_SELECT, buildSummary, aggregate } from "../query";

export default defineTool({
  name: "school_report",
  title: "Relatório da escola",
  description:
    "Relatório DESCARTES agregado da escola: IEDE e desvio padrão da escola inteira e de cada turma, com a distribuição por classificação.",
  inputSchema: {
    school_id: z.string().describe("ID da escola (obtido em list_schools)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ school_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_SELECT)
      .eq("classes.school_id", school_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const list = (data ?? []).map(buildSummary);
    const byClass = new Map<string, typeof list>();
    for (const s of list) {
      const key = `${s.serie ?? ""} ${s.turma ?? ""}`.trim() || s.classId;
      byClass.set(key, [...(byClass.get(key) ?? []), s]);
    }
    const report = {
      escola: list[0]?.schoolNome,
      ...aggregate(list),
      turmas: [...byClass.entries()].map(([turma, alunos]) => ({ turma, ...aggregate(alunos) })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(report) }],
      structuredContent: report,
    };
  },
});