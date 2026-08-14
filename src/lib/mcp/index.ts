import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSchools from "./tools/list-schools";
import listClasses from "./tools/list-classes";
import classReport from "./tools/class-report";
import studentReport from "./tools/student-report";
import addObservation from "./tools/add-observation";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "descartes",
  title: "DESCARTES",
  version: "0.1.0",
  instructions:
    "Ferramentas do DESCARTES — análise vetorial da convivência democrática escolar (eixos Acadêmico, Social e Socioemocional). Use list_schools e list_classes para navegar, class_report e student_report para obter |VDI|, IEDE e desvio padrão, e add_observation para registrar observações pedagógicas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSchools, listClasses, classReport, studentReport, addObservation],
});
