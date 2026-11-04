# PRD Backend — Gestão de Obra (nome provisório)

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> **Aviso:** a modelagem foi proposta pela IA "no chute", a pedido da sócia (03/11/2026). As permissões seguem a matriz que ela confirmou item por item na Etapa 1.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `diarios_execucoes`.
- Colunas em minúsculo com underline: `data_entrega`, `responsavel_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at`.
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface.
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`. Quantidades como `numeric(14,3)`.
- Foto vai para o Storage; o banco guarda só o caminho.

### A regra que protege o preço

As permissões do banco escolhem **linhas**, não colunas: quem pode ver uma linha vê todas as colunas dela. Por isso **nenhum preço ou valor fica numa tabela que o auxiliar lê**, e **nenhum custo fica numa tabela que o cliente lê**. Valor ao cliente de cada item (TOTAL ENG. da planilha) mora em `servicos_valores` (sócio e cliente); custo de mão de obra (TOTAL MO) mora em `servicos_custos` (só sócio); valor do contrato em `obras_contratos`; valores de medição em `medicoes` e `medicoes_itens`; custos em `custos`. O auxiliar não lê nenhuma dessas. Pela mesma razão, `contratados` não guarda telefone (o cliente lê os nomes da equipe no diário).

---

## Unidade principal

**Obra.** Vai existir mais de uma: **sim** (até 3 ao mesmo tempo, mais as concluídas). Alguém trabalha em mais de uma ao mesmo tempo: **sim**.

- Tabela `obras`.
- Coluna `obra_id` em **toda** tabela que pertence a uma obra (inclusive nas tabelas-filhas, para a permissão ser simples e rápida).
- Tabela `membros` (obra, pessoa, papel) diz qual auxiliar e qual cliente enxerga qual obra.
- **Sócios não precisam estar em `membros`:** o perfil `socio` enxerga todas as obras.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `socio`, `auxiliar`, `cliente`, `pendente`. Padrão `pendente` |
| tipo_pessoa | text | não | CHECK: `Pessoa física`, `Pessoa jurídica`; preenchido no primeiro acesso do cliente |
| documento | text | não | CPF ou CNPJ, só números; único quando preenchido |
| ativo | boolean | sim | padrão verdadeiro |
| ultima_obra_id | uuid | não | → `obras.id`; a obra que o seletor abre da próxima vez |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já com `role = 'pendente'`. O cadastro só é aberto pelo **Portal do cliente** ("Primeiro acesso?"); a equipe não se cadastra sozinha (o sócio libera). `documento` é dado pessoal: só o próprio usuário e os sócios leem.
Na tela: Sócio = `socio`, Auxiliar = `auxiliar`, Cliente = `cliente`, Aguardando liberação = `pendente`.

---

## Tabela `obras` — Fase 1

Cada obra. É a unidade que separa todos os dados.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| codigo | text | sim | código/apelido curto (ex.: `AP302`), único; aparece no seletor de obra |
| cliente_nome | text | sim | |
| endereco | text | não | |
| data_inicio | date | sim | |
| data_entrega | date | sim | data-meta de entrega contratada; base do cálculo de prazos |
| situacao | text | sim | CHECK: `Em andamento`, `Parada`, `Concluída`. Padrão `Em andamento` |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários membros, frentes, serviços, diários, fotos, medições, cotações, custos; tem um contrato.

### Faturamento (consulta agregada entre obras) — só sócios

Não é tabela: é **uma** função do banco (`faturamento_por_obra()`), que devolve uma linha por obra com: obra, código, situação, contrato, executado (valor), % executado, **bruto** (medições `Fechada` + `Paga`), recebido (medições `Paga`), custo (todos os `custos` lançados na obra, inclusive mão de obra), **líquido** (bruto − custo; impostos ainda não). Só executa para `socio` (a função confere o `role` e devolve vazio para os outros). É uma das exceções à regra "nenhuma tela junta obras", todas registradas no `AGENTS.md`.
**Regra de negócio:** `data_entrega` ≥ `data_inicio`.

---

## Tabela `obras_contratos` — Fase 1 (gravada na importação)

Valor do contrato, separado de `obras` para o auxiliar nunca ver.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id`, único (um contrato por obra) |
| valor_contrato | numeric(14,2) | sim | ≥ 0 |
| created_at | timestamptz | sim | automático |

---

## Tabela `membros` — Fase 1

Quem (auxiliar ou cliente) enxerga qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| profile_id | uuid | sim | → `profiles.id` |
| papel | text | sim | CHECK: `auxiliar`, `cliente` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** único por (`obra_id`, `profile_id`). O `papel` precisa bater com o `role` da pessoa.

---

## Tabela `contratados` — Fase 1 (antes `funcionarios`)

A equipe. Não entra no sistema; aparece como responsável e na equipe do diário. Não pertence a uma obra (circula entre elas).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| funcao | text | não | ex.: pedreiro, eletricista |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** funcionário com lançamento não é apagado, só desativado.

---

## Tabela `frentes` — Fase 1

Frentes de serviço de cada obra (Demolição, Hidráulica, Revestimento…).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| nome | text | sim | |
| ordem | integer | sim | posição na lista |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** não pode ser apagada se tiver serviços.

---

## Tabela `servicos` — Fase 1

Cada serviço do cronograma = cada item do orçamento. **Sem preço** (ver `servicos_valores` e `servicos_custos`).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| frente_id | uuid | sim | → `frentes.id`, da mesma obra |
| numero_item | text | não | número do item na planilha (ex.: `2.3`); vazio se cadastrado à mão |
| nome | text | sim | descrição do item |
| unidade | text | sim | CHECK: `m²`, `m`, `ml`, `m³`, `un`, `vb`, `kg`, `%` |
| tipo | text | sim | CHECK: `Normal`, `Percentual`. `Percentual` = item tipo "Gestão de obra 10%": não aparece no diário nem no cronograma; o valor acompanha o executado dos outros itens |
| percentual | numeric(6,3) | não | obrigatório se `Percentual` (ex.: 10) |
| forma_medicao | text | sim | CHECK: `Quantidade`, `Percentual`. Padrão: `Percentual` para `vb`, `Quantidade` para o resto |
| quantidade_prevista | numeric(14,3) | sim | > 0; quando `forma_medicao = 'Percentual'`, vale 100 |
| observacao | text | não | coluna OBSERVAÇÕES da planilha |
| aditivo | boolean | sim | padrão falso; verdadeiro para item incluído depois da importação |
| duracao_dias | integer | não | ≥ 1, em dias úteis; obrigatório para entrar na cascata (item importado chega sem) |
| responsavel_id | uuid | não | → `funcionarios.id`; preenchido depois da importação |
| meta_diaria_manual | numeric(14,3) | não | se vazio, a meta é calculada |
| concluido_em | date | não | preenchido quando o sócio marca "Concluir serviço" |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra e a uma frente; tem várias dependências, execuções, fotos; tem um preço.
**Índices úteis:** `obra_id`, `frente_id`.
**Regra de negócio:** não pode ser apagado se tiver execução lançada ou item de medição.
O status (Não iniciado / Em andamento / Concluído), as datas previstas, a folga e os atrasos **não são guardados**: são calculados pela interface (ver "Regras de cálculo" no PRD-FRONTEND.md).

---

## Tabela `servicos_dependencias` — Fase 1

"Este serviço só começa quando aquele termina."

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| servico_id | uuid | sim | → `servicos.id` (o que espera) |
| depende_de_id | uuid | sim | → `servicos.id` (o que tem que terminar antes) |
| created_at | timestamptz | sim | automático |

**Regras de negócio:** único por (`servico_id`, `depende_de_id`); os dois serviços da mesma obra; um serviço não depende de si mesmo; **o banco recusa a gravação que cria ciclo** (A → B → A), com mensagem que nomeia os serviços.

---

## Tabela `orcamentos` — Fase 1

A planilha importada. Uma por obra na v1.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id`, único |
| titulo | text | sim | título da planilha (ex.: "ORÇAMENTO - APTO 52, BLOCO 2 - VITA BELLE") |
| arquivo | text | sim | caminho do `.xlsx` original no Storage (pasta `orcamentos/<obra_id>/`) |
| total_cliente | numeric(14,2) | sim | total TOTAL ENG. lido da planilha e conferido com a soma dos itens |
| qtd_etapas | integer | sim | |
| qtd_itens | integer | sim | |
| importado_por | uuid | sim | → `profiles.id` |
| created_at | timestamptz | sim | automático = data da importação |

O total de TOTAL MO **não** fica aqui, porque o cliente lê esta tabela: é a soma de `servicos_custos`, que só o sócio lê.

---

## Tabela `servicos_valores` — Fase 1 (gravada na importação)

Valor ao cliente de cada item (coluna TOTAL ENG.). Sócio e cliente leem.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| servico_id | uuid | sim | → `servicos.id`, único |
| valor_cliente | numeric(14,2) | sim | ≥ 0; para item `Percentual`, o valor orçado da planilha |
| created_at | timestamptz | sim | automático |

---

## Tabela `servicos_custos` — Fase 1 (gravada na importação)

Custo de mão de obra de cada item (coluna TOTAL MO). **Só sócio.**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| servico_id | uuid | sim | → `servicos.id`, único |
| custo_mo | numeric(14,2) | sim | ≥ 0 |
| created_at | timestamptz | sim | automático |

---

## Tabela `diarios` — Fase 1

O diário de um dia de uma obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| data | date | sim | |
| clima_manha | text | sim | CHECK: `Sol`, `Nublado`, `Chuva`, `Chuva forte` |
| clima_tarde | text | sim | CHECK: `Sol`, `Nublado`, `Chuva`, `Chuva forte` |
| qtd_pessoas | integer | sim | ≥ 0 |
| ocorrencias | text | não | |
| status | text | sim | CHECK: `Rascunho`, `Enviado`, `Aprovado`, `Devolvido`. Padrão `Rascunho` |
| comentario_devolucao | text | não | obrigatório quando `Devolvido` |
| criado_por | uuid | sim | → `profiles.id` |
| enviado_em | timestamptz | não | |
| aprovado_por | uuid | não | → `profiles.id` |
| aprovado_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra; tem várias pessoas da equipe, execuções e fotos.
**Índices úteis:** (`obra_id`, `data`) único; `status`.
**Regras de negócio:** um diário por obra por dia. Só sócio grava `Aprovado` ou `Devolvido`. Ao aprovar, `aprovado_por` e `aprovado_em` são preenchidos pelo banco.

---

## Tabela `diarios_equipe` — Fase 1

Quem foi na obra no dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| diario_id | uuid | sim | → `diarios.id` |
| funcionario_id | uuid | sim | → `funcionarios.id` |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** único por (`diario_id`, `funcionario_id`).

---

## Tabela `diarios_execucoes` — Fase 1

Quanto foi executado de cada serviço no dia. É a fonte do avanço, da cascata e da medição.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| diario_id | uuid | sim | → `diarios.id` |
| servico_id | uuid | sim | → `servicos.id`, da mesma obra |
| quantidade | numeric(14,3) | sim | ≥ 0, na unidade do serviço |
| qtd_pessoas | integer | sim | ≥ 1; quantas pessoas trabalharam neste serviço (guarda a produtividade para a pergunta de um ano) |
| descricao | text | não | "o que foi feito" |
| medicao_id | uuid | não | → `medicoes.id`; preenchido quando entra numa medição (Fase 2) |
| created_at | timestamptz | sim | automático |

**Índices úteis:** `servico_id`, `diario_id`, `medicao_id`.
**Regra de negócio:** único por (`diario_id`, `servico_id`). Execução que já entrou numa medição não pode ser alterada nem apagada.

---

## Tabela `fotos` — Fase 1

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| diario_id | uuid | sim | → `diarios.id` |
| servico_id | uuid | não | → `servicos.id` |
| caminho | text | sim | caminho no Storage |
| legenda | text | não | |
| created_at | timestamptz | sim | automático |

---

## Tabela `medicoes` — Fase 2

A cobrança ao cliente de um período.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| numero | integer | sim | 1, 2, 3… por obra |
| periodo_inicio | date | sim | |
| periodo_fim | date | sim | ≥ `periodo_inicio` |
| data_vencimento | date | sim | |
| status | text | sim | CHECK: `Rascunho`, `Fechada`, `Paga`. Padrão `Rascunho` |
| data_pagamento | date | não | obrigatório quando `Paga` |
| valor_total | numeric(14,2) | sim | soma dos itens; mantido pelo banco |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Regras de negócio:** único por (`obra_id`, `numero`). Só `Rascunho` pode ter itens alterados ou ser apagada.

---

## Tabela `medicoes_itens` — Fase 2

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| medicao_id | uuid | sim | → `medicoes.id` |
| servico_id | uuid | sim | → `servicos.id` |
| quantidade | numeric(14,3) | sim | ≥ 0; executado no período (na unidade do item, ou pontos de % para itens medidos por percentual); ajustável em Rascunho |
| percentual_periodo | numeric(7,4) | sim | quantidade ÷ quantidade_prevista do serviço (para item `Percentual`: medido dos outros ÷ total dos outros) |
| valor_item | numeric(14,2) | sim | copiado de `servicos_valores.valor_cliente` na geração (mudança depois não altera medição antiga) |
| valor | numeric(14,2) | sim | valor_item × percentual_periodo; item `Percentual`: percentual × soma dos outros itens desta medição |
| created_at | timestamptz | sim | automático |

---

## Tabela `cotacoes` — Fase 3

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| titulo | text | sim | |
| descricao | text | não | |
| status | text | sim | CHECK: `Em cotação`, `Aguardando cliente`, `Escolhido`, `Comprado`. Padrão `Em cotação` |
| proposta_escolhida_id | uuid | não | → `cotacoes_propostas.id`; obrigatório em `Escolhido` e `Comprado` |
| created_at | timestamptz | sim | automático |

## Tabela `cotacoes_propostas` — Fase 3

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| cotacao_id | uuid | sim | → `cotacoes.id` |
| fornecedor | text | sim | |
| valor | numeric(14,2) | sim | ≥ 0 |
| prazo_entrega | text | não | |
| condicao_pagamento | text | não | |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

## Tabela `cotacoes_comentarios` — Fase 3

A escolha do cliente fica registrada aqui.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| cotacao_id | uuid | sim | → `cotacoes.id` |
| autor_id | uuid | sim | → `profiles.id`; preenchido pelo banco com quem está logado |
| texto | text | sim | |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** comentário não é editado nem apagado por ninguém (é o registro da escolha).

---

## Tabela `custos` — Fase 3

Custo interno da obra. Só sócios.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → `obras.id` |
| data | date | sim | |
| descricao | text | sim | |
| categoria | text | sim | CHECK: `Mão de obra`, `Material`, `Equipamento`, `Terceirizado`, `Outros` |
| valor | numeric(14,2) | sim | ≥ 0 |
| pago | boolean | sim | padrão falso |
| created_at | timestamptz | sim | automático |

---

## Tabelas pedidas em 04/11/2026

- **`tarefas`** (com `obra_id`): titulo, responsavel_id → `profiles`, prazo date, prioridade CHECK `Alta`, `Média`, `Baixa`, status CHECK `Pendente`, `Em andamento`, `Concluída`. Ver, criar, editar e apagar: só sócio.
- **`contratados`** substitui `contratados`: nome, funcao, empresa, tipo CHECK `Funcionário`, `Prestador`, ativo. Ver: sócio e auxiliar. Editar: sócio. **O cliente não lê a tabela:** recebe o nome e a atividade só pela leitura do diário aprovado (função do banco).
- **`diarios_equipe`** ganha `atividade` (o que a pessoa fez no dia).
- **`obras`** ganha foto_caminho, descricao, informacoes. Dados do contratante moram em `obras_clientes` (obra_id único, telefone, email, documento), só sócio: o auxiliar lê `obras` e não pode receber dado pessoal do cliente.
- **`obras_documentos`** (com `obra_id`): nome, caminho no Storage. Só sócio.
- **`profiles`** ganha `telas_bloqueadas` (lista). Esconde telas dentro do que o perfil permite; **a proteção de dinheiro continua na RLS por perfil**, nunca nesta lista.
- **Conflito de prestador:** função `alocacoes_por_prestador()`, só sócio; o cálculo é o de `src/lib/conflitos.js`.
- **Gestão de Obras:** função `gestao_por_obra()`, uma linha por obra, só sócio.

## Permissões

Escrito em português. Vira RLS na hora de construir.
"Membro da obra" = tem linha em `membros` para aquela obra. "Ativo" = `profiles.ativo` verdadeiro e `role` diferente de `pendente`. Todas as regras abaixo exigem pessoa ativa.

### `profiles`
- **Ver:** cada um vê o próprio; sócio vê todos.
- **Criar:** só o gatilho do cadastro.
- **Editar:** cada um edita o próprio `nome` e `ultima_obra_id`; só sócio muda `role` e `ativo`.
- **Apagar:** ninguém (desativar no lugar).
- **Sem login:** nada.

### `obras`
- **Ver:** sócio todas; auxiliar e cliente só as obras de que são membros.
- **Criar / editar / apagar:** sócio.
- **Sem login:** nada.

### `obras_contratos`
- **Ver:** sócio; cliente da obra.
- **Criar / editar / apagar:** sócio.
- **Auxiliar:** nada.

### `membros`
- **Ver:** sócio todos; cada pessoa vê as próprias linhas.
- **Criar / editar / apagar:** sócio.

### `contratados`
- **Ver:** sócio, auxiliar, cliente (só nome e função existem na tabela).
- **Criar / editar:** sócio. **Apagar:** sócio, só sem lançamento.

### `frentes`, `servicos`, `servicos_dependencias`
- **Ver:** sócio; auxiliar e cliente das obras de que são membros.
- **Criar / editar / apagar:** sócio.

### `orcamentos`
- **Ver:** sócio; cliente da obra.
- **Criar:** sócio, pela importação. **Editar / apagar:** sócio.
- **Auxiliar:** nada.

### `servicos_valores`
- **Ver:** sócio; cliente da obra.
- **Criar / editar / apagar:** sócio.
- **Auxiliar:** nada.

### `servicos_custos`
- **Ver / criar / editar / apagar:** só sócio.
- **Auxiliar e cliente:** nada.

### `diarios`
- **Ver:** sócio todos; auxiliar os das obras de que é membro, em qualquer status; cliente só `Aprovado` da obra dele.
- **Criar:** sócio; auxiliar nas obras de que é membro, com status `Rascunho` ou `Enviado`.
- **Editar:** sócio sempre; auxiliar só enquanto o diário está `Rascunho`, `Enviado` ou `Devolvido`, e nunca para `Aprovado` ou `Devolvido`.
- **Apagar:** sócio.

### `diarios_equipe`, `diarios_execucoes`, `fotos`
- **Ver:** sócio; auxiliar das obras de que é membro; cliente só os ligados a diário `Aprovado` da obra dele.
- **Criar / editar / apagar:** sócio; auxiliar só enquanto o diário pai não está `Aprovado`. Execução com `medicao_id` preenchido: ninguém altera.

### `medicoes`, `medicoes_itens`
- **Ver:** sócio; cliente só `Fechada` e `Paga` da obra dele (e os itens delas).
- **Criar / editar / apagar:** sócio (apagar só `Rascunho`).
- **Auxiliar:** nada.

### `cotacoes`, `cotacoes_propostas`
- **Ver:** sócio; cliente da obra, só cotações em `Aguardando cliente`, `Escolhido` ou `Comprado` (e as propostas delas).
- **Criar / editar / apagar:** sócio.
- **Auxiliar:** nada.

### `cotacoes_comentarios`
- **Ver:** sócio; cliente da obra, nas cotações que ele vê.
- **Criar:** sócio; cliente da obra, nas cotações em `Aguardando cliente` ou `Escolhido`.
- **Editar / apagar:** ninguém.
- **Auxiliar:** nada.

### `custos`
- **Ver / criar / editar / apagar:** só sócio.

### Storage (fotos)
- Pasta `fotos-obras/<obra_id>/<diario_id>/`.
- **Ver:** sócio; auxiliar das obras de que é membro; cliente só de diários `Aprovado` da obra dele.
- **Enviar:** sócio; auxiliar nas obras de que é membro.
- **Apagar:** sócio.
- Sem acesso público: o arquivo é aberto por link temporário.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra sozinha com e-mail e senha.
2. O gatilho cria a linha em `profiles` com `role = 'pendente'`; ela não vê dado nenhum.
3. Ela vê "Conta aguardando liberação".
4. Um sócio libera: escolhe o perfil (`socio`, `auxiliar`, `cliente`) e, para auxiliar e cliente, cria as linhas em `membros` com as obras.
5. **Primeiro sócio:** como ninguém pode liberar o primeiro, ele é promovido a `socio` à mão no painel do Supabase, uma única vez, na construção.

## Processos automáticos

### Cálculo da cascata (cronograma vivo)
- **Gatilho:** abrir Painel do dia, Cronograma, Diário do dia ou Avanço; salvar diário; editar serviço.
- **Passos:** a interface lê serviços, dependências, execuções (filtradas pelo status do diário conforme o perfil) e a data de entrega, e aplica as "Regras de cálculo" do PRD-FRONTEND.md.
- **Resultado:** data-limite para programar, folga, dias de atraso, meta do dia e previsão de entrega. Nada é gravado.
- **Se falhar:** ciclo de dependência é impedido na gravação (ver `servicos_dependencias`). Obra sem `data_entrega` não chega a existir (campo obrigatório).

### Gerar medição do período — Fase 2
- **Gatilho:** sócio informa período e vencimento e clica "Gerar medição".
- **Passos (tudo de uma vez, numa função do banco):** 1. Pega as execuções de diários `Aprovado` com data no período e `medicao_id` vazio. 2. Soma por serviço e converte em % do previsto. 3. Copia o valor do item de `servicos_valores` e calcula o valor medido. 4. Calcula os itens `Percentual` (ex.: Gestão de obra 10%) sobre a soma dos outros itens da medição. 5. Cria a medição `Rascunho` com o próximo número e os itens. 6. Preenche `medicao_id` nas execuções usadas.
- **Resultado:** medição em Rascunho; o sócio ajusta e fecha.
- **Se falhar:** nada é gravado (tudo ou nada). Serviço sem valor no orçamento: a medição não é gerada e a mensagem lista esses serviços. Nada a medir: "Nenhum diário aprovado neste período."
- **Apagar uma medição Rascunho** limpa o `medicao_id` das execuções, que voltam a ficar disponíveis.

### Importar a planilha de orçamento — Fase 1
- **Gatilho:** sócio escolhe o `.xlsx` na tela Orçamento.
- **Leitura (no navegador):** abre a aba `ORÇAMENTO`; acha a linha de cabeçalho com `SERVIÇOS`, `UNID.`, `TOTAL MO`, `TOTAL ENG.`, `OBSERVAÇÕES` (no modelo: linha 7, colunas C a G; coluna B = número do item); o título é a primeira célula de texto acima do cabeçalho; o total é a linha logo abaixo do cabeçalho (fórmula `SUM`). Usa o **valor calculado** guardado em cada célula, não a fórmula. Linha com número inteiro em B = etapa; número com ponto = item; unidade `%` = item `Percentual`. Linhas vazias são ignoradas.
- **Como ler o .xlsx:** o stack é uma biblioteca só (`@supabase/supabase-js`). O `.xlsx` é um zip de XML; o navegador consegue abrir com `DecompressionStream`. Se isso ficar frágil na construção, a alternativa (SheetJS) **precisa da aprovação da sócia** antes, porque foge do stack.
- **Gravação (função do banco, tudo ou nada):** recebe as etapas e os itens já lidos; cria `orcamentos`, `frentes` (ordem = número da etapa), `servicos` (unidade, tipo, forma de medição, observação), `servicos_valores`, `servicos_custos` e `obras_contratos.valor_contrato` = total. Sobe o arquivo original para `orcamentos/<obra_id>/`.
- **Resultado:** a obra ganha o cronograma inicial; faltam duração, dependências, responsável e quantidade dos itens medidos por quantidade, que a tela Cronograma pede.
- **Se falhar:** sem aba `ORÇAMENTO`, sem o cabeçalho ou soma dos itens diferente do total (tolerância R$ 0,05) → nada é gravado e a mensagem diz o motivo. Obra que já tem orçamento → recusa na v1 ("Esta obra já tem orçamento importado").

## Arquivos

- Guardados no Storage, na pasta `fotos-obras` (privada).
- Imagem comprimida no navegador antes de subir (máx. 1200px, qualidade 0.8).
- O banco guarda o `caminho`.
- Atenção ao limite de 1 GB do plano grátis do Supabase [DESCOBRIR NO USO].

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] Cliente, consultando o banco direto, não consegue ler nenhuma linha de `servicos_custos` nem `custos`, nem nenhum valor de TOTAL MO.
- [ ] Importar a planilha modelo (`Estudo_Viabilidade_Apto52_Vita_Belle_gestao.xlsx`) cria 14 frentes e 28 serviços, e o contrato fica R$ 48.795,98.
- [ ] Uma planilha com soma diferente do total não grava nada.
- [ ] Auxiliar, consultando o banco direto (não só pela tela), não consegue ler nenhuma linha de `orcamentos`, `servicos_valores`, `servicos_custos`, `obras_contratos`, `medicoes`, `medicoes_itens`, `cotacoes`, `cotacoes_propostas`, `cotacoes_comentarios` nem `custos`.
- [ ] Auxiliar não consegue gravar um diário como `Aprovado` nem `Devolvido`.
- [ ] Auxiliar não consegue alterar diário `Aprovado` nem suas execuções e fotos.
- [ ] Cliente não lê diário que não esteja `Aprovado`, nem as execuções e fotos dele.
- [ ] Cliente não lê nada de obra da qual não é membro.
- [ ] Cliente só lê medições `Fechada` e `Paga`, e consegue criar comentário em cotação, mas nada mais.
- [ ] Auxiliar vinculado só à Obra 1 não lê nenhuma linha da Obra 2.
- [ ] Gravar uma dependência que cria ciclo é recusado.
- [ ] Gerar medição não pega execução de diário não aprovado nem execução que já está em outra medição.
- [ ] Os valores de status, clima, unidade, categoria e role do banco são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.

## A conta que vai chegar depois

- `[PENDENTE: revisão da modelagem pela sócia]` — custo: a modelagem foi chutada; mudar depois que houver dados é mais caro.
- `[PENDENTE: confirmar que o cliente pode ver o valor do contrato]` — hoje ficou: vê (aparece em Pagamentos).

## Decidir depois de usar

- `[DESCOBRIR NO USO: espaço das fotos no plano grátis]` — por enquanto: fotos comprimidas, plano grátis.
- `[DESCOBRIR NO USO: parcelar medição]` — por enquanto: um vencimento por medição.
- `[DESCOBRIR NO USO: feriados]` — por enquanto: não há tabela de feriados; só segunda a sexta.
