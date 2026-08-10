import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSchools from "./tools/list-schools";
import listClasses from "./tools/list-classes";
import classReport from "./tools/class-report";
import schoolReport from "./tools/school-report";
import studentProfile from "./tools/student-profile";
import addObservacao from "./tools/add-observacao";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "school-insights-hub",
  title: "School Insights Hub",
  version: "0.1.0",
  instructions:
    "Ferramentas do DESCARTES — sistema de convivência democrática escolar. Use list_schools e list_classes para navegar pela hierarquia, class_report e school_report para indicadores agregados (IEDE, desvio padrão, distribuição vulnerável/parcial/integrado), student_profile para o perfil individual (eixos A acadêmico, S social, E socioemocional e |VDI|) e add_observacao para registrar observações pedagógicas. Todos os dados respeitam as permissões do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSchools, listClasses, classReport, schoolReport, studentProfile, addObservacao],
});