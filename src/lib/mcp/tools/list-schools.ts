import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_schools",
  title: "Listar escolas",
  description: "Lista as escolas cadastradas no DESCARTES com sua CREDE, cidade e INEP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("schools")
      .select("id, nome, cidade, inep, responsavel_id, credes(numero, nome, cidade_sede)")
      .order("nome");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((s) => ({ ...s, is_minha_escola: s.responsavel_id === ctx.getUserId() }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { schools: rows } };
  },
});
