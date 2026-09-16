import { supabase } from "@/integrations/supabase/client";
import {
  calcVDI, SOCIAL_KEYS, SOCIO_KEYS, type SurveyRow, type StudentData, type VDIResult,
} from "@/lib/descartes";

export type VDIExtra = VDIResult & {
  serie?: string;
  turma?: string;
  schoolId?: string;
  schoolNome?: string;
  hasA?: boolean;
  nota?: number;
  survey: SurveyRow;
};

export interface StudentRow {
  id: string;
  nome: string;
  codigoAluno: string;
  classId: string;
  serie?: string;
  turma?: string;
  schoolId?: string;
  schoolNome?: string;
  nota?: number;
  notaMin?: number;
  notaMax?: number;
  A?: number;          // acadêmico normalizado 0-1, se houver nota
  vdi?: VDIExtra;      // presente apenas quando há survey
}

const STUDENT_SELECT = `
  id, codigo_aluno, nome, class_id,
  academic_data(nota, nota_min, nota_max),
  survey_responses(s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,e11,e12,e13,e14,e15,e16,e17,e18,e19,e20),
  classes!inner(school_id, nome_turma, serie, schools(id, nome))
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVdi(raw: any): VDIExtra | null {
  const sr = Array.isArray(raw.survey_responses) ? raw.survey_responses[0] : raw.survey_responses;
  if (!sr) return null;
  const survey: SurveyRow = {} as SurveyRow;
  for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) survey[k] = sr[k] ?? 3;
  const ad = Array.isArray(raw.academic_data) ? raw.academic_data[0] : raw.academic_data;
  const student: StudentData = {
    id: raw.id,
    nome: raw.codigo_aluno, // LGPD: identificação apenas por matrícula
    codigo_aluno: raw.codigo_aluno,
    class_id: raw.class_id,
    survey,
    nota: ad?.nota,
    nota_min: ad?.nota_min,
    nota_max: ad?.nota_max,
  };
  const vdi = calcVDI(student);
  if (!vdi) return null;
  const cl = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
  const sc = cl?.schools ? (Array.isArray(cl.schools) ? cl.schools[0] : cl.schools) : null;
  const hasA = ad?.nota != null && ad?.nota_min != null && ad?.nota_max != null;
  return {
    ...vdi,
    serie: cl?.serie,
    turma: cl?.nome_turma,
    schoolId: sc?.id,
    schoolNome: sc?.nome,
    hasA,
    nota: ad?.nota != null ? Number(ad.nota) : undefined,
    survey,
  };
}

export async function loadVdisBySchool(schoolId: string): Promise<VDIExtra[]> {
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("classes.school_id", schoolId);
  return (data ?? []).map(buildVdi).filter((v): v is VDIExtra => v !== null);
}

export async function loadVdisByClass(classId: string): Promise<VDIExtra[]> {
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("class_id", classId);
  return (data ?? []).map(buildVdi).filter((v): v is VDIExtra => v !== null);
}

export async function loadStudentVdi(studentId: string): Promise<VDIExtra | null> {
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("id", studentId).maybeSingle();
  if (!data) return null;
  return buildVdi(data);
}

import { calcAcademico } from "@/lib/descartes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStudentRow(raw: any): StudentRow {
  const ad = Array.isArray(raw.academic_data) ? raw.academic_data[0] : raw.academic_data;
  const cl = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
  const sc = cl?.schools ? (Array.isArray(cl.schools) ? cl.schools[0] : cl.schools) : null;
  const nota = ad?.nota;
  const notaMin = ad?.nota_min;
  const notaMax = ad?.nota_max;
  const A = (nota != null && notaMin != null && notaMax != null)
    ? calcAcademico(Number(nota), Number(notaMin), Number(notaMax))
    : undefined;
  const vdi = buildVdi(raw) ?? undefined;
  return {
    id: raw.id,
    nome: raw.codigo_aluno, // LGPD: identificação apenas por matrícula
    codigoAluno: raw.codigo_aluno,
    classId: raw.class_id,
    serie: cl?.serie,
    turma: cl?.nome_turma,
    schoolId: sc?.id,
    schoolNome: sc?.nome,
    nota: nota != null ? Number(nota) : undefined,
    notaMin: notaMin != null ? Number(notaMin) : undefined,
    notaMax: notaMax != null ? Number(notaMax) : undefined,
    A,
    vdi,
  };
}

export async function loadStudentsByClass(classId: string): Promise<StudentRow[]> {
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("class_id", classId).order("nome");
  return (data ?? []).map(buildStudentRow);
}
