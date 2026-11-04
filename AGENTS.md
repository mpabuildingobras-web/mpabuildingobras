# Gestão de Obra

Acompanhamento da execução de reformas: o auxiliar lança o diário no canteiro, os sócios aprovam, e o Painel do dia mostra o serviço mais atrasado e a previsão de entrega pela cadeia de serviços. O cliente acompanha avanço, orçamento, pagamentos e fotos.
React + Vite + Supabase + Vercel; única biblioteca do app: `@supabase/supabase-js`. Perfis: `socio`, `auxiliar`, `cliente` (e `pendente`, antes da liberação). O que cada um vê está em `PRD-FRONTEND.md` e `PRD-BACKEND.md`, que mandam sobre este arquivo em produto; este arquivo manda em como o código é feito.

## Este app é MULTI-OBRA (vale para todo módulo, agora e depois)

1. **Toda tabela de lançamento tem `obra_id` obrigatório**, apontando para `obras`. Sem exceção nos módulos novos. Só ficam fora o que não pertence a uma obra: `profiles` e `contratados` (a equipe circula entre obras).
2. **Todo módulo novo filtra por `obra_id`.** Quem filtra é a camada de dados (`src/lib/dados.js`), que lê a obra atual do contexto; as telas não passam o id e não filtram sozinhas. Recorte pronto em `src/lib/obras.js` (`somenteDaObra`): sem obra escolhida devolve **nada**, nunca tudo.
3. **Nenhuma tela mostra dado de duas obras juntas**, a não ser que seja explicitamente um comparativo entre obras. Hoje são: **Faturamento**, **Gestão de Obras**, **Tarefas em "Todas as obras"** e a detecção de conflito de prestador em **Serviços**. Todas só para sócios, com consulta agregada na camada de dados (uma linha por obra), nunca um laço chamando o banco obra a obra.
4. **Seletor de obra sempre visível no topo.** Trocar de obra remonta a árvore de telas (`key={obraId}` na shell): nada da obra anterior pode sobrar na tela, nem ser salvo nela.
5. **A obra escolhida fica guardada** e volta ao reabrir (`escolherObraInicial` em `src/lib/obras.js`). Qualquer coisa guardada no navegador tem o `obra_id` na chave.
6. **Desenvolve-se sempre com duas obras diferentes** no mock e no seed. Com uma só, filtro esquecido não dá sintoma.
7. No banco (Etapa 7): RLS por obra em toda tabela, com a mesma política repetida, via função `minhas_obras()`; sócio vê todas.

Situação da obra: `Em andamento`, `Parada`, `Concluída` — texto idêntico na tela e no CHECK (`SITUACOES` em `src/lib/obras.js` é o dono).

## Dinheiro: quem não pode ver o quê

- **Auxiliar nunca vê preço nem valor** de nada.
- **Cliente nunca vê custo** (TOTAL MO da planilha, custos da obra, margem, Faturamento).
- **Cliente nunca recebe a lista de contratados nem tarefas.** No diário aprovado ele vê só o nome e a atividade do dia.
- **`telas_bloqueadas` só esconde tela.** O perfil é o teto; dinheiro se protege por perfil na RLS, nunca por essa lista.
- O banco esconde por **linha, não por coluna**: valor e custo moram em tabelas separadas (`servicos_valores` × `servicos_custos`). Não junte numa tabela só "para simplificar".

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo da cascata, recorte por obra, medição, formatação. Sem React, sem banco, sem `window`. Import com `.js` explícito. É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface e layout. A tela pede a decisão à lib.
- `src/lib/dados.js` — **única porta do banco** (e do mock). Nenhuma tela chama o Supabase direto.

`if` de negócio dentro de tela vai para `lib`, mesmo com três linhas. Constante compartilhada (status, papéis, situações) tem um dono só.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base. Aviso novo é seu e é de agora.
Verde não prova que a tela funciona: a tela se confere olhando.
**Todo bug corrigido em `src/lib/` nasce com teste junto**, em `tests/`.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, políticas RLS, migrations, regra de `obra_id`, ou fluxo de dinheiro (orçamento, medição, pagamentos, faturamento) → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. RLS frouxa vaza a obra de um cliente para outro sem sintoma.

## Deploy

Ainda não publicado (Etapa 9). O agente roda npm e git; a pessoa não digita comando.

## Armadilhas desta base

- **Pasta fora do OneDrive de propósito** (`C:\Users\manue\projetos\gestao-de-obra`). A `node_modules` dentro do OneDrive trava sincronização e o app.
- **No Windows, se `npm` der "execução de scripts desabilitada"**, use `npm.cmd`. Nunca mexer na política do Windows.
- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` na migration, só para `authenticated`. Erro 42501 é GRANT faltando, não RLS. Nunca `grant all`, nunca `to anon`.

## Higiene de código (vale para toda mudança)

- Ao remover um recurso, cace a cadeia inteira no mesmo lote: função em `lib/dados.js` → contexto → telas → query.
- Zero avisos novos de lint.
- Código comentado não é backup, o git é. Comentário explica *por quê*.
- Antes de apagar, prove que está morto (grep no projeto inteiro).
- Estado que nunca muda ou nunca é lido é lixo.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua existindo até decisão de quem é dono.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, porquê de decisão, proibição, comando não óbvio. Nada de árvore de pastas, histórico ou boa prática genérica.
