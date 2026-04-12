// DESCARTES Mathematical Model
// All calculations per the pre-project document

export interface StudentData {
  id: string;
  codigo_aluno: string;
  class_id: string;
  nota?: number;
  nota_min?: number;
  nota_max?: number;
  participacao?: number;
  respeito?: number;
  colaboracao?: number;
  autogestao?: number;
  empatia?: number;
  resolucao_conflitos?: number;
}

export interface VDIResult {
  studentId: string;
  codigoAluno: string;
  classId: string;
  A: number; // Eixo X - Acadêmico
  S: number; // Eixo Y - Social
  E: number; // Eixo Z - Socioemocional
  modulo: number; // |VDI|
}

/**
 * Eixo X — Acadêmico: A_i = (N_i - N_min) / (N_max - N_min)
 * Normalização min-max das notas escolares
 */
export function calcAcademico(nota: number, notaMin: number, notaMax: number): number {
  if (notaMax === notaMin) return 0;
  return Math.max(0, Math.min(1, (nota - notaMin) / (notaMax - notaMin)));
}

/**
 * Eixo Y — Social: S_i = (P + R + C) / 3 → normalizado para 0-1: (S - 1) / 4
 * P = Participação, R = Respeito, C = Colaboração (Likert 1-5)
 */
export function calcSocial(participacao: number, respeito: number, colaboracao: number): number {
  const media = (participacao + respeito + colaboracao) / 3;
  return (media - 1) / 4;
}

/**
 * Eixo Z — Socioemocional: E_i = (AG + EM + RC) / 3 → normalizado para 0-1: (E - 1) / 4
 * AG = Autogestão, EM = Empatia, RC = Resolução de Conflitos (Likert 1-5)
 */
export function calcSocioemocional(autogestao: number, empatia: number, resolucaoConflitos: number): number {
  const media = (autogestao + empatia + resolucaoConflitos) / 3;
  return (media - 1) / 4;
}

/**
 * |VDI_i| = √(A² + S² + E²)
 */
export function calcModuloVDI(A: number, S: number, E: number): number {
  return Math.sqrt(A * A + S * S + E * E);
}

/**
 * Calculate VDI for a single student
 */
export function calcVDI(student: StudentData): VDIResult | null {
  if (
    student.nota == null || student.nota_min == null || student.nota_max == null ||
    student.participacao == null || student.respeito == null || student.colaboracao == null ||
    student.autogestao == null || student.empatia == null || student.resolucao_conflitos == null
  ) {
    return null;
  }

  const A = calcAcademico(student.nota, student.nota_min, student.nota_max);
  const S = calcSocial(student.participacao, student.respeito, student.colaboracao);
  const E = calcSocioemocional(student.autogestao, student.empatia, student.resolucao_conflitos);
  const modulo = calcModuloVDI(A, S, E);

  return {
    studentId: student.id,
    codigoAluno: student.codigo_aluno,
    classId: student.class_id,
    A, S, E, modulo,
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
 * r(S, A) = correlação entre Social e Acadêmico
 */
export function calcPearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n <= 1) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

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
