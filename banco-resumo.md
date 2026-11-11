# Resumo do banco (Supabase)

A memória do banco para os próximos módulos e para o passo 10 (login e banco). Linguagem simples; o detalhe técnico está nos arquivos de `supabase/migrations/`.
Atualizado em 10/11/2026.

- **Projeto:** `gestao-de-obra` (id `pbhlrdvjeaqrctmkmouu`), região São Paulo, plano grátis.
- **O app usa** a chave publicável (`sb_publishable_…`), guardada no `.env.local`, que não vai para o GitHub. A chave secreta nunca entra no app.
- **Quem conversa com o banco:** só `src/lib/dados.js`. A chave `USAR_MOCK` lá dentro volta Obras e Diário para os dados de exemplo.

## Tabelas que existem

| Tabela | O que guarda | Observação |
|---|---|---|
| `obras` | Cada obra: código (AP302), nome, cliente, endereço, datas de início e entrega, situação, descrição, informações, foto e lista de documentos | Situação só aceita `Em andamento`, `Parada` ou `Concluída` (o mesmo texto da tela). O código não repete. A entrega não pode ser antes do início |
| `obras_clientes` | Telefone, e-mail e CPF/CNPJ do contratante, um por obra | Separada de `obras` de propósito: no passo 10, só sócio lê |
| `diarios` | O diário de um dia de uma obra: clima da manhã e da tarde, pessoas na obra, ocorrências, status, motivo da devolução, quem enviou e quando, quando foi aprovado | Um diário por obra por dia. Status só `Rascunho`, `Enviado`, `Aprovado` ou `Devolvido`. Devolvido exige motivo. Clima só `Sol`, `Nublado`, `Chuva` ou `Chuva forte` |
| `diarios_equipe` | Quem foi na obra no dia e o que cada um fez, na ordem da tela | A mesma pessoa não entra duas vezes no mesmo dia |
| `diarios_execucoes` | Quanto foi feito de cada serviço no dia, e com quantas pessoas | Um lançamento por serviço por diário. É a fonte do avanço, da cascata e da medição |
| `fotos` | Fotos do diário: legenda, serviço e endereço da foto (`url`) | Por enquanto só a URL. O arquivo de verdade vai para o Storage depois |

Toda tabela tem `id`, `obra_id` e `created_at`. As que são editadas têm também `updated_at`, que o banco atualiza sozinho. As tabelas-filhas do diário não aceitam uma obra diferente da do diário.

**Função `salvar_diario`:** grava cabeçalho, equipe e lançamentos de uma vez só. Se a internet cair no meio, nada fica pela metade. Ela também não atropela ninguém: só grava se o diário ainda estiver no status que a tela leu, e não cria um segundo diário no mesmo dia.

## Ainda NÃO estão no banco (vêm dos dados de exemplo)

Serviços e frentes, contratados, tarefas, orçamento, valores e custos, medições, compras (cotações), custos da obra, usuários, membros e login.
Por isso `diarios_execucoes.servico_id`, `fotos.servico_id` e `diarios_equipe.contratado_id` ainda são **texto** (ex.: `s3`, `f2`). Quando Serviços e Contratados forem para o banco, viram ligação de verdade (uuid com chave estrangeira).

## Segurança: TEMPORÁRIA até o passo 10

- A RLS (a tranca por linha) está **ligada** em todas as tabelas, mas com políticas `dev_liberado_*`, que deixam **qualquer um** com a chave publicável ler e gravar tudo, inclusive quem não fez login (`anon`).
- Isso só é aceitável porque o app roda no computador da Manuela, sem login de verdade. **Não pode ir para o ar assim.**
- **No passo 10:**
  - apagar as políticas `dev_*` e os grants para `anon` (arquivo `20261110233600_rls_dev_temporaria.sql`);
  - criar `profiles`, `membros` e a função `minhas_obras()`;
  - criar as políticas por obra: sócio vê todas; auxiliar e cliente só as suas; cliente só diário `Aprovado`; `obras_clientes` só sócio.

## Dados de exemplo

O `supabase-seed.sql` (gerado por `node scripts/gerar-seed.mjs` a partir de `src/lib/mockData.js`) recria as duas obras de exemplo: AP302 com 17 diários e CJF com 4. Rodá-lo de novo **apaga os diários dessas duas obras** e põe os de exemplo de volta.

## Régua

O `npm run check` inclui:
- `tests/check-schema.mjs`: as colunas que o código pede batem com o banco. Depois de qualquer migration, regenere o `tests/_schema-snapshot.json`.
- `tests/check-grants.mjs`: toda tabela tem RLS e liberação escrita.
