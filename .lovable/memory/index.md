# Project Memory

## Core
DESCARTES — Sistema de Convivência Democrática Escolar (Ceará).
40 perguntas Likert: S01-S20 (Social), E01-E20 (Socioemocional). Valores 1-5 inteiros.
Fórmulas: Social=(média20-1)/4, Socioemocional=(média20-1)/4, Acadêmico=(N-Nmin)/(Nmax-Nmin).
VDI=√(A²+S²+E²), IEDE=média|VDI|, Pearson r(S,A).
Space Grotesk headings, DM Sans body. Navy blue primary palette.
Escolas organizadas por CREDE (1-20 + SEFOR). Cadastro aberto.
Formulário público: aluno seleciona escola cadastrada, responde 40 Likert 1-5.
User speaks Portuguese (Brazil).

## Memories
- [Fórmulas DESCARTES](mem://features/formulas) — Conversões decimais, VDI, IEDE, Pearson
- [CREDEs do Ceará](mem://features/credes) — Lista das 20 CREDEs + SEFOR
- [DB Schema](mem://features/schema) — Tabelas: credes, schools, classes, students, academic_data, survey_responses (s01-s20, e01-e20), user_roles
- [Perguntas Likert](mem://features/questions) — 40 perguntas: S01-S20 social, E01-E20 socioemocional
