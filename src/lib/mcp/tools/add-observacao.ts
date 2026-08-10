import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_observacao",
  title: "Registrar observação",
  description: "Registra uma observação pedagógica sobre um aluno, assinada pelo usuário autenticado.",
  inputSchema: {
    student_id: z.string().describe("ID do aluno."),
    texto: z.string().trim().describe("Texto da observação pedagógica."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ student_id, texto }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    if (!texto.trim()) {
      return { content: [{ type: "text", text: "O texto da observação é obrigatório." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("observacoes")
      .insert({ student_id, texto: texto.trim(), author_id: ctx.getUserId()! })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Observação registrada (${data.id}).` }],
      structuredContent: { observacao: data },
    };
  },
});