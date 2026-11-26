# Relatórios escolares com OpenRouter

A função generate-school-report é chamada pelo Dashboard e usa o usuário autenticado para localizar a escola responsável. Ela calcula indicadores agregados no servidor e envia ao OpenRouter apenas médias, desvio padrão, subdimensões, uma faixa de tamanho do grupo e rótulos de turma/série. Não envia nomes, matrículas, IDs de alunos ou respostas individuais.

Recortes com menos de 10 respostas não são enviados nem aparecem no relatório. A análise é descritiva e deve apoiar a equipe escolar; não deve ser usada como diagnóstico ou decisão individual sobre estudantes.

## Configuração

1. Aplique as migrações do banco, incluindo a que protege os dados do questionário:

   supabase db push

2. Revogue qualquer chave OpenRouter que tenha sido compartilhada em chat ou commit e crie uma nova chave.
3. No OpenRouter, configure um limite de gasto para a chave.
4. Configure o segredo no projeto Supabase:

   supabase secrets set OPENROUTER_API_KEY=COLE_A_NOVA_CHAVE_AQUI

5. Opcionalmente escolha o modelo com OPENROUTER_MODEL. O padrão é openrouter/auto.
6. Publique a função:

   supabase functions deploy generate-school-report

7. Em desenvolvimento local, copie supabase/functions/.env.example para supabase/functions/.env e preencha uma chave nova. Esse arquivo local é ignorado pelo Git.

O endpoint da função usa o JWT da sessão do Supabase e consulta somente a escola vinculada ao responsável autenticado. A chave OpenRouter fica exclusivamente no ambiente da função, nunca no navegador.
