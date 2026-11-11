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

Situação da obra: `Em andamento`, `Parada`, `Concluída` — texto idêntico na tela e no CHECK (`SITUACOES` em `src/lib/obras.js` é o dono). Decidido em 10/11/2026, ainda não construído: entra `Em preparação`, que é a situação de toda obra nova. Só sócio vê obra nessa situação, e ela só vira `Em andamento` com cronograma.

## Dinheiro: quem não pode ver o quê

- **Auxiliar nunca vê preço nem valor** de nada.
- **Cliente nunca vê custo** (TOTAL MO da planilha, custos da obra, margem, Faturamento).
- **Cliente nunca recebe a lista de contratados nem tarefas.** No diário aprovado ele vê só o nome e a atividade do dia, inclusive o prestador de cada serviço lançado. Nunca vê a função.
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

## Checklist de testes vivo

Eu, Manuela, não programo: decido o produto e testo na tela. Você constrói. Para eu saber o que testar e você saber o que deu errado, a gente usa uma página de testes viva, que você mantém e eu marco. Vale em toda conversa, daqui pra frente.

### 1. A página

Na primeira melhoria que precisar de teste, crie uma página publicada chamada "Testes do Gestão de Obra", com um banco de dados próprio (as marcas ficam guardadas no servidor, não no navegador). Se não existir ferramenta de página publicada na conversa, crie um arquivo `testes.html` na pasta do projeto que guarde as marcas no próprio navegador, e me diga que, nesse caso, você precisa que eu cole o resultado de volta.

A página tem:

- No topo, a rodada: nome ("Rodada 2 · Cadastros no banco · 21/10"), uma nota curta do que mudou e o que fazer antes de começar (por exemplo, "aperte Ctrl+F5").
- Um cartão por item a testar, agrupado por módulo, com:
  - título: o que se testa, em uma linha;
  - passos: numerados, uma ação por passo, com os nomes exatos que aparecem na tela ("Clique em **+ Empresa**", e não "crie uma empresa");
  - **esperado**: o que eu devo ver se deu certo, de forma que eu consiga dizer sim ou não sem interpretar;
  - **três botões**: `A testar` · `Funcionou` · `Problema`;
  - **um campo de observação**, para eu escrever o que vi.
- Sem enfeite: a página é ferramenta. Funciona no celular.

### 2. O ciclo

1. **Você constrói** a melhoria.
2. **Antes de me passar**, você confere o que dá para conferir sozinho: roda os testes e o "portão" do projeto (aqui, `npm run check`), olha a tela no navegador, e quando mexer no banco, roda o teste de permissões. **Só me passa o que passou.** Se algo você não conseguiu conferir (por exemplo, porque exige a minha senha), diga qual.
3. **Você escreve os itens** na página e me manda o link com um resumo de uma linha por item.
4. **Eu testo** e marco cada item, escrevendo o que vi nos que deram problema.
5. **Eu aviso** ("atualizei os testes"). Você lê as marcas direto da página: eu não preciso copiar nada para o chat.
6. **Para cada problema**, você descobre a causa antes de mexer: lê o código, os registros do servidor e o banco. Me explica em uma linha o que estava acontecendo e o que mudou.
7. **Você limpa a página**: o que passou **sai**; o que deu problema volta como `A testar`, com os passos ajustados; o que é novo entra. Atualiza a nota da rodada.
8. Repete até não sobrar nada. Aí a rodada fecha, e a página diz "nada a testar agora".

**Nada morto fica guardado.** A página mostra só o que falta testar. Se você quiser manter histórico, uma linha por item aprovado vai para um diário em texto no projeto (`docs/DIARIO.md`: data, o que mudou, o que passou), nunca na página.

### 3. Como escrever um bom item

- **Um comportamento por item.** "Cadastrar e editar empresa" são dois, se puderem falhar separados.
- **Passos que qualquer pessoa repete** sem saber programar, na ordem da tela.
- **Esperado observável:** "a empresa aparece na lista com o telefone novo", e não "salva corretamente".
- **Teste o caminho errado também:** o campo vazio, o e-mail inválido, o botão clicado duas vezes, a coisa que não deveria ser permitida.
- **Diga qual conta usar** quando importar (admin, usuário comum, outro perfil).
- **Diga se o teste grava dado de verdade**, e como desfazer depois.

### 4. Quando o banco de dados entra: os itens que nunca faltam

Ligar o banco é o momento em que mais coisa quebra calada. Para cada tela que passa a gravar, inclua itens que provem:

| Prova | O item pergunta | Por que |
|---|---|---|
| **Ficou gravado** | Depois de salvar, **aperte F5**: continua lá? | O protótipo guardava na memória; o banco pode não ter gravado e a tela fingir que sim |
| **Gravou certo** | O que voltou do F5 é exatamente o que eu digitei (acento, data, número, ordem)? | Tradução entre a tela e o banco perde campo sem avisar |
| **Cada um vê o seu** | Com a conta de outro perfil (e de outro cliente, obra ou empresa, se o app tiver vários), eu vejo só o que devo? | A regra de permissão do banco é a única tranca de verdade; esconder botão não protege nada |
| **Quem não pode, não consegue, e é avisado** | O perfil sem permissão tenta gravar: o banco recusa **e a tela diz por quê**? | Recusa calada parece bug; aviso claro é produto |
| **Nada duplica** | Salvar duas vezes, importar de novo, tirar e pôr de volta: aparece repetido? | Botão clicado duas vezes e reimportação são as duplicatas mais comuns |
| **Apagar não some com histórico** | Desativar algo que outra tela usa: a outra tela continua funcionando? | Registro que outro lugar lê se desativa, não se apaga |
| **Lista vazia e lista grande** | A tela sem nenhum dado diz o que fazer? Com muitos dados, aparece tudo? | O banco corta listas grandes sem avisar (no Supabase, 1.000 linhas) |
| **Erro de rede** | Se a internet cair no meio, a tela diz que não salvou? | Gravação perdida sem aviso é o pior defeito possível |

E do seu lado, antes de me passar qualquer item de banco:

- **Toda mudança no banco é um arquivo versionado** no projeto, nunca um clique no painel.
- **Um teste de permissões automático**: cada perfil tenta ler e gravar no que é seu e no que é do vizinho, dentro de uma transação desfeita no fim (nada fica no banco). Roda depois de qualquer mudança de permissão.
- **Revisão de código** em toda mudança que toca a camada de dados, as regras de permissão ou o login, antes de subir.
- **Os avisos de segurança do painel do banco** conferidos depois de cada mudança, com cada aviso explicado (intencional ou a corrigir).

### 5. O que você nunca faz

- Digitar senha, chave ou token, nem criar conta em meu nome. Se um teste precisa disso, o passo diz "entre com a sua conta" e eu faço.
- Colocar qualquer segredo (chave, senha, `.env`) no código, no Git ou na página de testes.
- Usar dado real de cliente como exemplo. Exemplo é sempre fictício.
- Dizer que algo está pronto sem ter rodado o portão e olhado a tela; e, se não conseguiu olhar, dizer isso.
- Apagar dado de verdade para "limpar o teste". Desativar, sim; apagar, só com o meu ok.

### 6. Como me responder

Depois de cada rodada, uma resposta curta:

- o que passou e saiu da página;
- uma tabela com cada problema: **o que estava acontecendo** · **o que mudou**;
- o que voltou para teste e o que é novo;
- o que você não conseguiu conferir e por quê;
- o que está esperando uma decisão minha.

Em português simples, sem jargão. Se precisar de uma decisão minha, pergunte uma coisa de cada vez, com a sua recomendação.

## Onde paramos (atualizado em 10/11/2026)

Nota de passagem entre conversas: atualize ou apague esta seção ao retomar.

**Pronto**

- Combinado da página de testes guardado na seção "Checklist de testes vivo". A página em si ainda não existe: nasce na primeira melhoria que precisar de teste.
- `npm run check` passou (11/11 arquivos de teste). Nenhum código do app mudou nesta conversa.
- Combinado no ramo principal, aqui e no GitHub (versão `36ede35`), desde 10/11/2026.

**Pela metade**

- **Ainda sem commit:** esta seção e as decisões de 10/11 no `AGENTS.md`, no `PLANO-DO-PROJETO.md` e no `PRD-FRONTEND.md` são mudanças locais.
- **Revisão de código de `5107597...HEAD`, feita em duas partes:**
  - As duas partes terminaram: padrão do projeto e o que ela pediu (contra `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md` e `PRD-BACKEND.md`). Resultados abaixo.
  - **Nada foi consertado ainda.** A ordem do conserto está em "Próximo passo".
  - Vieram de subagentes, que leram o código; não foram conferidos de novo nem testados com o app rodando.

**Achados de padrão (violações das regras deste arquivo)**

1. Bug corrigido em `src/lib/` sem teste: `src/lib/dados.js:105` corrige o vazamento da função do prestador para o cliente, e nenhum teste cita `funcao`. É o mais importante, porque protege o que o cliente vê.
2. `if` de negócio em tela: `src/screens/diario.jsx:255,267,271,318,320`, `src/screens/editarServico.jsx:10` e `src/pages/Shell.jsx:81` (o mais leve).
3. Status do diário sem dono único: literais em `src/lib/dados.js:158` e `src/screens/diario.jsx:267,271`.
4. Tela importa direto de `mockData`: `src/screens/financeiro.jsx:6`, e outras 12 telas e páginas já faziam o mesmo. A regra está escrita, mas não é seguida na prática.

Além disso, a revisão apontou pontos de avaliação, que não são violações: repetições (recusa "Confira os campos." em `dados.js`, tratamento de `r.erros`/`r.erro` em cinco telas, logo em três páginas), nomes pouco claros (`gravarValor` também apaga; `arred`) e o texto mágico `'__novo__'` em `src/lib/lancamentos.js:74`.

**Achados contra o que ela pediu**

Quem vê o quê: nenhum vazamento encontrado. Em aberto: o cliente vê o prestador no cartão do diário (`dados.js:108`, `diario.jsx:208,292`), e PRD-FRONTEND:663 está [PENDENTE], "hoje ficou: não vê".

Faltando ou parcial:

1. Excluir diário não existe (PRD-FRONTEND:218, PLANO:73).
2. Diário: sem campo "O que foi feito" (PRD-FRONTEND:206), sem ajuste de pessoas (:203), equipe mínima de 1 não conferida (:202).
3. Editar serviço: faltam Nº do item, Como medir e Meta manual (:265,269,277). Valor e Responsável são obrigatórios na especificação e opcionais no código (:271,276); serviço sem valor some do orçamento e do contrato sem aviso (`mockData.js:203`). Dependência vazia é aceita (:275, PLANO:55).
4. Cronograma: sem marca de Aditivo (:248); sem nova frente, reordenar ou excluir frente (:247,249).
5. Financeiro (Fase 3): faltam recebido, a receber, saldo e gráfico (:421); não há editar custo (:434).
6. Seletor: obra Concluída continua na lista (:492; `SeletorObra.jsx:57`).
7. Cronograma vazio perdeu o caminho para importar (:252), mas PLANO:81 pede só cadastro: a especificação se contradiz.

Não pedido:

1. Recusa lançamento acima do que falta (`lancamentos.js:47`); PRD-FRONTEND:51 só limita o % a 100, e isso pode travar o diário de um dia real.
2. Orçamento criado sozinho ao digitar valor (`dados.js:205-207`). O cliente não o vê (`dados.js:303`), não há botão de publicar e a importação está inativa (`orcamento.jsx:24`): obra nova nunca chega ao cliente (PLANO:111).
3. Exclusão bloqueada por dependente (`lancamentos.js:93-94`); PRD-FRONTEND:281 só cita lançamento e medição.
4. Botão Voltar nas subtelas (`Shell.jsx:117`). Pequeno.
5. Logo e nome "MPA Building" (`index.html:7`): PLANO:253 está [CHUTE] e PRD-FRONTEND:17 diz sem logo. Se ela pediu, falta registrar no plano.

Parece pronto, mas está errado:

1. Item em vb: os botões deveriam ficar "no lugar do campo" (PRD-FRONTEND:204,652); aparecem botões e campo juntos (`diario.jsx:315-331`). O campo de pessoas precisa ficar.
2. Trava de medição (`dados.js:154`) nunca dispara: nada grava `medicao_id`. Se disparasse, contrariaria "Sócio, qualquer status" (PRD-FRONTEND:217).
3. Trocar de frente renumera o item sem avisar (`dados.js:196`). A medição guarda o número antigo (`mockData.js:161`), e a trava de `dados.js:225` deixa de encontrá-lo.

**Próximo passo**

Ordem combinada com a Manuela em 10/11/2026:

**As 6 decisões foram fechadas em 10/11** e estão registradas no PLANO e no PRD. Isso tira da lista acima os itens "Não pedido" 1, 2, 3 e 5, o item 7 de "Faltando" e o "Em aberto" do prestador:

- **Orçamento:** botão **Publicar para o cliente**; importar já publica. A construir.
- **Prestador no diário:** o cliente vê o nome e a atividade, nunca a função. Já é assim; falta o teste.
- **Lançar acima do que falta:** não pode. A recusa atual fica.
- **Excluir serviço com dependente:** não pode. O bloqueio atual fica.
- **Logo e nome "MPA Building":** ficam.
- **Obra sem cronograma:** não existe. Obra nova nasce **Em preparação**, visível só para os sócios, e só vira Em andamento com cronograma. A construir.
- **Lembrete dela:** o campo Ocorrências do diário é a observação livre do dia.

1. **Rodada 1: consertar o que está errado:** item em vb, renumeração ao trocar de frente, trava de medição, obra Concluída no seletor, Valor/Responsável obrigatórios, dependência vazia, equipe mínima. Junto vai a arrumação de padrão e os testes da função do prestador.
2. **Rodada 2: o que foi decidido:** situação Em preparação e botão Publicar para o cliente.
3. **Rodadas seguintes: o que falta**, um módulo por rodada, na ordem que ela escolher: diário, editar serviço, cronograma, financeiro.

Toda rodada segue o "Checklist de testes vivo", que cria a página de testes.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, porquê de decisão, proibição, comando não óbvio. Nada de árvore de pastas, histórico ou boa prática genérica.
