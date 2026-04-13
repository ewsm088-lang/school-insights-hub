// DESCARTES Mathematical Model
// 40 questions: S01-S20 (Social), E01-E20 (Socioemocional)
// All values stored as Likert 1-5 integers

export const SOCIAL_KEYS = [
  "s01","s02","s03","s04","s05","s06","s07","s08","s09","s10",
  "s11","s12","s13","s14","s15","s16","s17","s18","s19","s20",
] as const;

export const SOCIO_KEYS = [
  "e01","e02","e03","e04","e05","e06","e07","e08","e09","e10",
  "e11","e12","e13","e14","e15","e16","e17","e18","e19","e20",
] as const;

export type SurveyRow = Record<typeof SOCIAL_KEYS[number] | typeof SOCIO_KEYS[number], number>;

export interface StudentData {
  id: string;
  nome?: string;
  codigo_aluno: string;
  class_id: string;
  survey: SurveyRow;
  nota?: number;
  nota_min?: number;
  nota_max?: number;
}

export interface VDIResult {
  studentId: string;
  nome: string;
  codigoAluno: string;
  classId: string;
  A: number; // Eixo X - Acadêmico (0-1)
  S: number; // Eixo Y - Social (0-1)
  E: number; // Eixo Z - Socioemocional (0-1)
  modulo: number; // |VDI|
}

/**
 * Eixo X — Acadêmico: A_i = (N_i - N_min) / (N_max - N_min)
 */
export function calcAcademico(nota: number, notaMin: number, notaMax: number): number {
  if (notaMax === notaMin) return 0;
  return Math.max(0, Math.min(1, (nota - notaMin) / (notaMax - notaMin)));
}

/**
 * Eixo Y — Social: média das 20 respostas Likert (1-5), normalizada para 0-1: (média - 1) / 4
 */
export function calcSocial(survey: SurveyRow): number {
  const sum = SOCIAL_KEYS.reduce((acc, k) => acc + (survey[k] || 3), 0);
  const media = sum / 20;
  return (media - 1) / 4;
}

/**
 * Eixo Z — Socioemocional: média das 20 respostas Likert (1-5), normalizada para 0-1: (média - 1) / 4
 */
export function calcSocioemocional(survey: SurveyRow): number {
  const sum = SOCIO_KEYS.reduce((acc, k) => acc + (survey[k] || 3), 0);
  const media = sum / 20;
  return (media - 1) / 4;
}

/**
 * |VDI_i| = √(A² + S² + E²) — com acadêmico opcional
 * Se acadêmico não disponível: |VDI| = √(S² + E²)
 */
export function calcModuloVDI(A: number | null, S: number, E: number): number {
  if (A != null) return Math.sqrt(A * A + S * S + E * E);
  return Math.sqrt(S * S + E * E);
}

/**
 * Calculate VDI for a single student
 */
export function calcVDI(student: StudentData): VDIResult | null {
  const S = calcSocial(student.survey);
  const E = calcSocioemocional(student.survey);

  let A: number | null = null;
  if (student.nota != null && student.nota_min != null && student.nota_max != null) {
    A = calcAcademico(student.nota, student.nota_min, student.nota_max);
  }

  const modulo = calcModuloVDI(A, S, E);

  return {
    studentId: student.id,
    nome: student.nome || student.codigo_aluno,
    codigoAluno: student.codigo_aluno,
    classId: student.class_id,
    A: A ?? 0,
    S,
    E,
    modulo,
  };
}

/**
 * IEDE = média dos |VDI| da escola
 */
export function calcIEDE(vdis: VDIResult[]): number {
  if (vdis.length === 0) return 0;
  return vdis.reduce((sum, v) => sum + v.modulo, 0) / vdis.length;
}

/**
 * σ (desvio padrão dos |VDI|)
 */
export function calcDesvioPadrao(vdis: VDIResult[]): number {
  if (vdis.length <= 1) return 0;
  const mean = calcIEDE(vdis);
  const variance = vdis.reduce((sum, v) => sum + Math.pow(v.modulo - mean, 2), 0) / vdis.length;
  return Math.sqrt(variance);
}

/**
 * Correlação de Pearson entre dois arrays
 */
export function calcPearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n <= 1) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * Classificação do IEDE
 */
export function classificar(iede: number): string {
  if (iede >= 0.7) return "Alto";
  if (iede >= 0.4) return "Intermediário";
  return "Baixo";
}
