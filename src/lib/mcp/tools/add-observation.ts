import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_observation",
  title: "Registrar observação",
  description: "Registra uma observação pedagógica sobre um aluno da sua escola.",
  inputSchema: {
    student_id: z.string().describe("ID do aluno."),
    texto: z.string().trim().min(1).describe("Texto da observação."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ student_id, texto }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Não foi possível identificar o usuário.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("observacoes")
      .insert({ student_id, author_id: userId, texto })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { observacao: data } };
  },
});
