// 40 questions from the DESCARTES Likert scale

export interface Question {
  key: string;
  dimension: "social" | "socioemocional";
  label: string;
}

export const SOCIAL_QUESTIONS: Question[] = [
  { key: "s01", dimension: "social", label: "Eu participo das atividades coletivas com atenção." },
  { key: "s02", dimension: "social", label: "Eu escuto meus colegas sem interromper." },
  { key: "s03", dimension: "social", label: "Eu respeito os combinados da turma." },
  { key: "s04", dimension: "social", label: "Eu colaboro quando o grupo precisa de ajuda." },
  { key: "s05", dimension: "social", label: "Eu trato colegas com educação no dia a dia." },
  { key: "s06", dimension: "social", label: "Eu aceito opiniões diferentes da minha." },
  { key: "s07", dimension: "social", label: "Eu consigo trabalhar em grupo sem causar atrito." },
  { key: "s08", dimension: "social", label: "Eu procuro manter a sala organizada." },
  { key: "s09", dimension: "social", label: "Eu contribuo para um ambiente de respeito." },
  { key: "s10", dimension: "social", label: "Eu sigo orientações dadas em sala." },
  { key: "s11", dimension: "social", label: "Eu evito atitudes que atrapalham a convivência." },
  { key: "s12", dimension: "social", label: "Eu respeito o momento de fala dos outros." },
  { key: "s13", dimension: "social", label: "Eu procuro resolver desentendimentos conversando." },
  { key: "s14", dimension: "social", label: "Eu participo quando a turma precisa decidir algo." },
  { key: "s15", dimension: "social", label: "Eu incluo colegas que ficam mais isolados." },
  { key: "s16", dimension: "social", label: "Eu me comporto de forma respeitosa com professores e colegas." },
  { key: "s17", dimension: "social", label: "Eu coopero mesmo quando a tarefa não é a minha preferida." },
  { key: "s18", dimension: "social", label: "Eu cumpro minha parte nas atividades em grupo." },
  { key: "s19", dimension: "social", label: "Eu consigo conviver bem com colegas diferentes de mim." },
  { key: "s20", dimension: "social", label: "Eu ajudo a manter a turma mais unida." },
];

export const SOCIO_QUESTIONS: Question[] = [
  { key: "e01", dimension: "socioemocional", label: "Eu consigo me acalmar quando fico irritado." },
  { key: "e02", dimension: "socioemocional", label: "Eu penso antes de agir em situações de tensão." },
  { key: "e03", dimension: "socioemocional", label: "Eu consigo falar sobre o que sinto com respeito." },
  { key: "e04", dimension: "socioemocional", label: "Eu aceito correções sem reagir mal." },
  { key: "e05", dimension: "socioemocional", label: "Eu consigo lidar com frustrações sem perder o controle." },
  { key: "e06", dimension: "socioemocional", label: "Eu percebo quando estou ficando nervoso." },
  { key: "e07", dimension: "socioemocional", label: "Eu tento entender o sentimento de outras pessoas." },
  { key: "e08", dimension: "socioemocional", label: "Eu me coloco no lugar do outro antes de julgar." },
  { key: "e09", dimension: "socioemocional", label: "Eu consigo pedir desculpas quando erro." },
  { key: "e10", dimension: "socioemocional", label: "Eu consigo recuperar meu equilíbrio depois de um conflito." },
  { key: "e11", dimension: "socioemocional", label: "Eu mantenho a calma mesmo quando discordo." },
  { key: "e12", dimension: "socioemocional", label: "Eu tento ouvir o outro até o fim." },
  { key: "e13", dimension: "socioemocional", label: "Eu consigo lidar com críticas sem desistir." },
  { key: "e14", dimension: "socioemocional", label: "Eu respeito o espaço emocional das outras pessoas." },
  { key: "e15", dimension: "socioemocional", label: "Eu procuro soluções antes de brigar." },
  { key: "e16", dimension: "socioemocional", label: "Eu consigo demonstrar empatia quando alguém está mal." },
  { key: "e17", dimension: "socioemocional", label: "Eu não desconto minha raiva nos outros." },
  { key: "e18", dimension: "socioemocional", label: "Eu consigo esperar o momento certo para falar." },
  { key: "e19", dimension: "socioemocional", label: "Eu consigo perdoar sem guardar raiva por muito tempo." },
  { key: "e20", dimension: "socioemocional", label: "Eu consigo manter o respeito mesmo sob pressão." },
];

export const ALL_QUESTIONS = [...SOCIAL_QUESTIONS, ...SOCIO_QUESTIONS];

export const LIKERT_OPTIONS = [
  { value: "1", label: "1 — Nunca" },
  { value: "2", label: "2 — Raramente" },
  { value: "3", label: "3 — Às vezes" },
  { value: "4", label: "4 — Frequentemente" },
  { value: "5", label: "5 — Sempre" },
];
