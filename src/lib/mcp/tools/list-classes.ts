import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "Listar turmas",
  description: "Lista as turmas de uma escola, com série, nome da turma e número de alunos.",
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
      .from("classes")
      .select("id, serie, nome_turma, ano_letivo, students(count)")
      .eq("school_id", school_id)
      .order("serie");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const classes = (data ?? []).map((c: any) => ({
      id: c.id,
      serie: c.serie,
      turma: c.nome_turma,
      anoLetivo: c.ano_letivo,
      alunos: c.students?.[0]?.count ?? 0,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(classes) }],
      structuredContent: { classes },
    };
  },
});