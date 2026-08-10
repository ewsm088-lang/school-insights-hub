import {
  calcVDI, calcIEDE, calcDesvioPadrao, classifyVDI,
  SOCIAL_KEYS, SOCIO_KEYS, type SurveyRow, type VDIResult,
} from "@/lib/descartes";

export const STUDENT_SELECT = `
  id, codigo_aluno, nome, class_id,
  academic_data(nota, nota_min, nota_max),
  survey_responses(${[...SOCIAL_KEYS, ...SOCIO_KEYS].join(",")}),
  classes!inner(id, school_id, nome_turma, serie, schools(id, nome))
`;

export interface StudentSummary extends VDIResult {
  serie?: string;
  turma?: string;
  schoolNome?: string;
  nota?: number;
  classificacao: "vulneravel" | "parcial" | "integrado";
  temColeta: boolean;
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export function buildSummary(raw: any): StudentSummary {
  const sr = one<any>(raw.survey_responses);
  const ad = one<any>(raw.academic_data);
  const cl = one<any>(raw.classes);
  const sc = cl ? one<any>(cl.schools) : undefined;

  const survey = {} as SurveyRow;
  for (const k of [...SOCIAL_KEYS, ...SOCIO_KEYS]) survey[k] = sr?.[k] ?? 3;

  const vdi = calcVDI({
    id: raw.id,
    nome: raw.nome ?? undefined,
    codigo_aluno: raw.codigo_aluno,
    class_id: raw.class_id,
    survey,
    nota: ad?.nota,
    nota_min: ad?.nota_min,
    nota_max: ad?.nota_max,
  })!;

  return {
    ...vdi,
    serie: cl?.serie,
    turma: cl?.nome_turma,
    schoolNome: sc?.nome,
    nota: ad?.nota != null ? Number(ad.nota) : undefined,
    classificacao: classifyVDI(vdi.modulo),
    temColeta: Boolean(sr),
  };
}

export function aggregate(list: StudentSummary[]) {
  const withColeta = list.filter((s) => s.temColeta);
  return {
    alunos: list.length,
    comColeta: withColeta.length,
    iede: Number(calcIEDE(withColeta).toFixed(4)),
    desvioPadrao: Number(calcDesvioPadrao(withColeta).toFixed(4)),
    distribuicao: {
      vulneravel: withColeta.filter((s) => s.classificacao === "vulneravel").length,
      parcial: withColeta.filter((s) => s.classificacao === "parcial").length,
      integrado: withColeta.filter((s) => s.classificacao === "integrado").length,
    },
  };
}

export function round(list: StudentSummary[]) {
  return list.map((s) => ({
    id: s.studentId,
    nome: s.nome,
    serie: s.serie,
    turma: s.turma,
    A: Number(s.A.toFixed(4)),
    S: Number(s.S.toFixed(4)),
    E: Number(s.E.toFixed(4)),
    moduloVDI: Number(s.modulo.toFixed(4)),
    nota: s.nota,
    classificacao: s.classificacao,
    temColeta: s.temColeta,
  }));
}