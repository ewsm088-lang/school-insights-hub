## Reconciliação com o sistema atual

A spec propõe um schema simplificado (tabela única `coletas` com 6 Likert + 1 nota). O sistema atual já está **mais rico**: 40 perguntas (S01-S20, E01-E20), `academic_data` separado, hierarquia `credes → schools → classes → students`. Vou **manter o schema atual** e adaptar a UI da spec a ele.

Mapeamento:
- "Coleta" da spec = `survey_responses` + `academic_data` no atual
- 6 subdimensões do radar = agregações sobre os 40 itens (definir grupos de 3-4 itens por subdimensão em `src/lib/questions.ts`)
- Classificação por VDI: `<0.58` vulnerável, `<1.15` parcial, ≥1.15 integrado

## Escopo desta entrega

Já existem: `/`, `/login`, `/register`, `/dashboard` (Gestor com G4 3D/2D, G5, heatmap, boxplot — funcional), `/escola` (gerência de turmas/alunos), `/formulario` (questionário público de 40 perguntas).

Vou criar/ajustar:

### 1. Rotas novas
- `/turmas` — lista de turmas com cards (nome, escola, nº alunos, IEDE, status)
- `/turmas/$id` — dashboard da turma com G4 (3D/2D toggle), G5 (Pearson 2D/3D), G6 (radar perfil médio), G7 (histograma VDIs), tabela de alunos, export CSV
- `/alunos/$id` — perfil individual com G8 (gauge VDI), G9 (radar individual vs turma), G10 (linha do tempo — só funciona quando houver múltiplas coletas; por enquanto exibe o ponto único), histórico, campo de observações
- `/relatorios` — filtros + preview + export CSV/PDF
- `/responder/$token` — formulário público "uma pergunta por tela" mobile-first com cascata escola → turma → aluno (versão alternativa ao `/formulario` atual; usa as mesmas 40 perguntas mas com UX one-per-screen)

### 2. Ajustes em telas existentes
- `/dashboard`: adicionar G1 (heatmap turmas × A/S/E com células coloridas verde/âmbar/vermelho), G2 (bubble IEDE × σ, tamanho = nº alunos), G3 (barras empilhadas % integrado/parcial/vulnerável), tabela de turmas ordenável, lista de atenção (VDI < 0.58)
- Sidebar nova com links: Dashboard | Turmas | Alunos | Relatórios

### 3. Schema — uma migração pequena
- Tabela `observacoes` (id, student_id, author_id, texto, created_at) com RLS para responsável da escola

### 4. Biblioteca de cálculos
- Manter `src/lib/descartes.ts` (já existe) como única fonte das fórmulas; adicionar helpers de classificação e agrupamento por 6 subdimensões

## Detalhes técnicos

```text
src/
├── routes/
│   ├── turmas.tsx              (nova — lista)
│   ├── turmas.$id.tsx          (nova — dashboard turma)
│   ├── alunos.$id.tsx          (nova — perfil aluno)
│   ├── relatorios.tsx          (nova — export)
│   ├── responder.$token.tsx    (nova — form mobile one-per-screen)
│   ├── dashboard.tsx           (adicionar G1/G2/G3 + tabela + atenção)
│   └── __root.tsx              (adicionar sidebar)
├── components/
│   ├── Sidebar.tsx             (nova)
│   ├── charts/
│   │   ├── HeatmapDimensoes.tsx
│   │   ├── BubbleEquidade.tsx
│   │   ├── BarrasDistribuicao.tsx
│   │   ├── Scatter3DAlunos.tsx
│   │   ├── ScatterPearson.tsx
│   │   ├── RadarPerfil.tsx
│   │   ├── HistogramaVDI.tsx
│   │   ├── GaugeVDI.tsx
│   │   └── LinhaTempoVDI.tsx
└── lib/
    └── descartes.ts            (estender com subdimensões e classificação)
```

Migração:
```sql
create table public.observacoes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  author_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now()
);
alter table public.observacoes enable row level security;
-- responsável da escola insere/lê/atualiza
```

**Não vou implementar nesta rodada:**
- Importação de notas via IA (`/turmas/$id/importar-notas`) — pode entrar depois
- Exportação PDF de relatórios — começo com CSV; PDF pode ser próximo passo
- Token único por aluno na rota `/responder/$token` — uso o token como ID da escola por enquanto (cascata pública igual à da spec, mas sem geração de link único por aluno)

## Ordem de execução

1. Migração `observacoes` + estender `src/lib/descartes.ts`
2. Sidebar + ajuste no `__root.tsx`
3. Componentes de gráfico (charts/)
4. `/turmas` e `/turmas/$id`
5. `/alunos/$id`
6. Reforçar `/dashboard` com G1/G2/G3 e tabela
7. `/relatorios` (CSV)
8. `/responder/$token` mobile-first one-per-screen

Quer que eu siga essa ordem ou prefere começar por outra coisa (ex.: pular a sidebar e ir direto na turma)?