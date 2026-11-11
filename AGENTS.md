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

**Back-end do Diário: LIGADO, falta a conferência da Manuela (10/11/2026)**

- `src/lib/dados.js` agora lê e grava Obras e Diário no Supabase (`USAR_MOCK = false`). O resto continua no `dadosMock.js`.
- Régua: `check-schema` e `check-grants` estão no `npm run check`, que fecha em zero.
- Memória do banco: `banco-resumo.md`.
- Conferido pelo agente:
  - a leitura vem do banco: uma marca posta no banco apareceu na tela;
  - a gravação pela tela no diário da CJF chegou na tabela certa, com a obra e o dia certos, e foi desfeita.
- Falta:
  - conferência com ela;
  - revisão de código (`/code-review`) antes de subir para o GitHub;
  - commit.
- Para o app ver o `.env.local`, o servidor tem que ser religado depois que o arquivo foi criado. A porta 5174 (`gestao-de-obra-prints`) já está certa.
- Depois disto: módulo Planejamento, começando pela EAP. Ela pediu terminar o Diário antes.

Histórico da pausa (resolvido):

- Feito:
  - Projeto Supabase `gestao-de-obra` (id `pbhlrdvjeaqrctmkmouu`, sa-east-1), com `.env.local` montado.
  - Tabelas `obras`, `obras_clientes`, `diarios`, `diarios_equipe`, `diarios_execucoes`, `fotos` e a função `salvar_diario`, em `supabase/migrations/`.
  - RLS ligada com políticas `dev_*` liberadas (TEMPORÁRIO, sai no passo 10).
  - CHECK testado.
  - Seed carregado (`supabase-seed.sql`, gerado por `scripts/gerar-seed.mjs`).
  - Ids das duas obras do mock viraram uuid fixo (`OBRA_AP302`, `OBRA_CJF`).
  - O miolo de exemplo virou `src/lib/dadosMock.js`, e os testes usam ele.
- Falta:
  - Escrever no `src/lib/dados.js` (hoje só repassa o mock) as funções de banco de obras, diários, execuções, fotos e das bases de Gestão e Faturamento, com `USAR_MOCK = false`.
  - Guardas de execução no banco em `salvarServico` e `excluirServico`.
  - Erro de carregamento no `ObraContext`.
  - `banco-resumo.md`, `tests/check-schema.mjs` com snapshot, conferência com ela e revisão de código.
- Nada disso foi para o GitHub ainda.

**Rodada 1 pronta, esperando a Manuela testar**

- Feito:
  - Item em vb por botões, com "Lançado hoje" e Tirar.
  - Equipe mínima de 1 para enviar.
  - Valor ao cliente e prestador obrigatórios.
  - Só o primeiro serviço da obra sem anterior.
  - Trocar de frente não renumera.
  - Obra Concluída fora do seletor.
  - Trava de medição do diário removida; ficou [PENDENTE] no PRD para a Fase 2.
- Arrumação:
  - Regras e status do diário em `src/lib/diario.js`.
  - Telas leem `HOJE` de `dados.js`.
  - Teste da função do prestador escondida do cliente.
- Verificado:
  - `npm run check` em zero.
  - Telas olhadas no navegador.
  - Revisão de código em duas partes (padrão e pedido), com os achados corrigidos.
- Página de testes: "Testes do Gestão de Obra", https://claude.ai/artifact/RCuRE6JgabL8nCNSDpsMTg. As marcas ficam no banco da página (`rodada/atual` e a coleção `itens`); leia com a ferramenta de dados da página, sem pedir que ela copie nada.
- Fonte da página: `docs/testes/testes.html`.
- **Ficou de fora, de propósito:**
  - `src/pages/Shell.jsx:81` (`perfil === 'socio'` decide quem cadastra a primeira obra), o caso mais leve de `if` em tela.
  - Os cheiros de avaliação da revisão de 04/11: repetições de "Confira os campos.", `gravarValor`, `arred`, `'__novo__'` e o apoio de teste que só reexporta.
- **Dado de exemplo:** os serviços da obra CJF não têm valor ao cliente, então editá-los pede o valor antes de salvar. É o comportamento decidido.

**Decisões de 10/11** (registradas no PLANO e no PRD)

- Orçamento: botão **Publicar para o cliente**; importar já publica.
- Prestador no diário: o cliente vê o nome e a atividade, nunca a função.
- Lançar acima do que falta: não pode.
- Excluir serviço com dependente: não pode.
- Logo e nome "MPA Building": ficam.
- Obra sem cronograma: não existe. Obra nova nasce **Em preparação**, visível só para os sócios.
- O campo Ocorrências é a observação livre do dia.

**Próximo passo**

1. Ler as marcas da página de testes quando a Manuela avisar, e seguir o ciclo do "Checklist de testes vivo".
2. **Rodada 2:** situação Em preparação e botão Publicar para o cliente.
3. **Rodadas seguintes, um módulo por vez, na ordem que ela escolher:**
   - Diário: excluir, "O que foi feito" e ajuste de pessoas.
   - Editar serviço: Nº do item, Como medir e Meta manual.
   - Cronograma: Aditivo, nova frente, reordenar e excluir frente.
   - Financeiro: recebido, a receber, saldo, gráfico e editar custo.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, porquê de decisão, proibição, comando não óbvio. Nada de árvore de pastas, histórico ou boa prática genérica.
