import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "Listar turmas",
  description: "Lista as turmas (série, nome, ano letivo) de uma escola, com o número de alunos.",
  inputSchema: { school_id: z.string().describe("ID da escola (use list_schools).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ school_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("classes")
      .select("id, nome_turma, serie, ano_letivo, students(count)")
      .eq("school_id", school_id)
      .order("serie");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((c) => ({
      id: c.id,
      nome_turma: c.nome_turma,
      serie: c.serie,
      ano_letivo: c.ano_letivo,
      total_alunos: (c.students as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { classes: rows } };
  },
});
