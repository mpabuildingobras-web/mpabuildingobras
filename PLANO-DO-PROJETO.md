# Plano do Projeto — Gestão de Obra (nome provisório)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 03/11/2026 — Etapa 1 fechada com a sócia. Etapa 2 parcial. Etapa 3 inteira proposta pela IA "no chute", a pedido da sócia: tudo marcado [CHUTE] ou sob o aviso da Etapa 3 precisa de revisão.

## Em uma frase

Um sistema de **acompanhamento de execução de obras de reforma** que resolve **o atraso descoberto tarde demais** para **a engenheira e o sócio que tocam até 3 obras ao mesmo tempo**, fazendo **o auxiliar lançar o diário todo dia no canteiro e o sistema ordenar, toda manhã, os serviços pelo que está mais atrasado**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — Não sei o que foi executado na semana
- **Como acontece hoje:** o que foi feito na obra fica na cabeça da equipe e em fotos soltas no Drive e no WhatsApp. Não existe diário de obra organizado.
- **Frequência:** toda sexta, no fim do dia, para as 3 obras.
- **Custo:** quando um atraso numa frente aparece, já se passaram **duas semanas**. Custo em horas ou R$ por semana: [PENDENTE]
- **Último caso:** na segunda, ainda não dá para responder se a data de entrega do cliente está de pé.

### Problema 2 — Medição sem controle, pagamento sem programação
- **Como acontece hoje:** planilha de medição feita na mão, desligada do que foi executado.
- **Frequência:** a cada medição. Periodicidade: [CHUTE] quinzenal; o sistema aceita qualquer período.
- **Custo:** não dá para programar os próximos pagamentos com segurança. [PENDENTE: valor/horas]

### Problema 3 — Cotação, fotos e financeiro espalhados
- **Como acontece hoje:** cotações e quadro de concorrência montados na mão para o cliente escolher fornecedor. Fotos no Drive/WhatsApp. Saúde financeira da obra sem visão consolidada.
- **Frequência:** por obra, ao longo dela toda.
- **Custo:** [PENDENTE]

## A solução

O auxiliar lança no celular, todo dia, o diário de cada obra: quem estava lá, o que foi executado em cada serviço e as fotos. Com isso o sistema sabe o avanço de cada serviço e mostra para os sócios, toda manhã, a lista de serviços por frente, do mais atrasado para o menos atrasado, com o responsável e a data-limite para programar. As medições saem do que foi executado e viram a cobrança ao cliente. O cliente acompanha, só olhando, a obra dele: avanço, diário, fotos, o que tem para pagar e as cotações para escolher fornecedor. Ele não vê o custo interno da obra.

**O que ele NÃO faz (v1):**
- **Montar** orçamento: continua sendo feito na planilha da sócia. O sistema **importa** a planilha pronta (ver módulo 8).
- Folha de pagamento e ponto dos funcionários.
- Emissão de nota fiscal e integração com contador.
- App nativo de loja (Play Store / App Store): é um site que funciona bem no celular.
- Controle de estoque de material.

## Funcionalidades

### 1. Painel do dia — "O que está atrasado" (a tela de toda manhã)
- **Abre em:** lista agrupada por frente de serviço, uma obra por vez (troca de obra no topo).
- **Mostra, por serviço:** nome do serviço · frente · responsável · % executado · **dias de atraso** · **data-limite para programar** · **folga** (dias até a data-limite; negativa = já empurra a entrega) · serviço anterior de que depende · data do último lançamento no diário.
- **No topo:** a resposta à pergunta da segunda: *"Entrega contratada 15/12 · Previsão hoje 22/12 · 7 dias de atraso"* ou *"Entrega contratada 15/12 · Previsão hoje 12/12 · no prazo"*.
- **Ordem:** sempre do mais atrasado para o menos: menor folga primeiro (quem já está empurrando a entrega vem no topo). Concluídos somem da lista.
- **Filtro:** obra, frente, responsável.
- **Ações:** nenhuma edição aqui; só olhar e clicar.
- **Ao clicar num serviço:** abre o detalhe com histórico de lançamentos e fotos.
- **Vazio:** "Nenhum serviço atrasado nesta obra. A entrega está de pé."
- **Como calcula (confirmado em 03/11/2026: todo serviço só começa quando o anterior termina):**
  - Cada serviço tem **duração** (dias úteis) e **um ou mais serviços anteriores** ("só começa quando X termina"). Só o primeiro serviço da obra não tem anterior.
  - *Data-limite para programar* = a última data em que o serviço pode começar sem mexer na data de entrega do cliente. O sistema calcula de trás para frente: parte da data de entrega e volta pela cadeia de serviços, descontando as durações.
  - *Previsão de entrega* = o sistema calcula de frente para trás: usa as datas reais de término dos serviços já concluídos (vindas do diário) e soma as durações do que falta, seguindo a cadeia. Atrasou um serviço → todos os que dependem dele andam junto, e a previsão de entrega muda no mesmo dia.
  - *Dias de atraso* = hoje − término previsto, se o serviço não estiver concluído.
  - *Folga* = data-limite − início previsto pela cadeia. Folga zero ou negativa = esse serviço está segurando a entrega.
  - *Dias úteis:* segunda a sexta. Feriados e sábados: [DESCOBRIR NO USO].

### 2. Diário de obra
- **Abre em:** lista por data, da mais recente para a mais antiga, da obra escolhida.
- **Mostra:** data · clima (manhã/tarde) · equipe que foi no dia (nomes) e quantas pessoas · o que foi feito, por serviço · ocorrências · fotos.
- **Quem registra o avanço (confirmado em 03/11/2026):** o auxiliar, no diário. Para cada serviço programado no dia ele vê **a meta do dia** (ex.: "Revestimento — executar 12 m² em 03/11/2026") e lança **quanto foi executado**, na unidade do serviço (m², m, un). Ele vê só quantidades, nunca preço. Quando a quantidade acumulada chega à prevista, o serviço fica concluído (o sócio pode marcar concluído antes, se o restante não for necessário).
- **Meta do dia:** proposta: o sistema calcula sozinho (quantidade que falta ÷ dias úteis que faltam até o término previsto), e os sócios podem ajustar.
- **Aprovação:** o auxiliar envia o diário; você ou o sócio aprova ou devolve com um comentário. Status: Rascunho → Enviado → Aprovado / Devolvido.
  - **Antes de aprovar:** os sócios já veem o diário e o avanço no Painel do dia, marcado "aguardando aprovação" (para o atraso aparecer no mesmo dia).
  - **Só depois de aprovado:** o diário aparece para o cliente e as quantidades passam a valer para a medição.
- **Ações:** auxiliar cria o diário do dia, lança quantidades, anexa fotos pelo celular, envia; edita enquanto não for aprovado (e quando for devolvido). Sócios aprovam, devolvem ou corrigem.
- **Ao clicar:** abre o diário completo do dia.
- **Vazio:** "Nenhum diário lançado ainda. Lance o de hoje."
- **Nasce e morre:** o auxiliar cria; depois de aprovado só os sócios editam; só os sócios apagam.

### 3. Serviços e frentes (o cronograma da obra)
- **Abre em:** lista por frente (ex.: Demolição, Alvenaria, Elétrica, Hidráulica, Revestimento, Pintura).
- **Mostra:** serviço · unidade (m², m, un, vb) · quantidade prevista · quantidade executada · % · responsável · **duração (dias úteis)** · **serviços anteriores** · início e término previstos (calculados pela cadeia) · início e término reais · valor ao cliente e custo de mão de obra (só sócios, vindos da planilha importada).
- **Vista em Gantt** (decidido em 03/11/2026): barras por frente, linha de hoje, linha da entrega contratada e o trecho que passa do limite destacado.
- **Obra:** guarda a **data de entrega contratada com o cliente** (é dela que sai toda data-limite).
- **Ações:** criar, editar, apagar (só sócios); importar de planilha [DESCOBRIR NO USO].
- **Não existe obra sem cronograma** (decidido em 10/11/2026):
  - A obra nova nasce na situação **Em preparação** e o app leva o sócio direto ao Cronograma.
  - Em preparação, só os sócios veem a obra: o auxiliar não lança diário e o cliente não vê.
  - Ela só pode passar para Em andamento quando tiver cronograma.
- **Vazio** (só o sócio vê, durante a preparação): "Esta obra ainda não tem cronograma." Botão **Cadastrar o primeiro serviço**. Quando a importação existir, entra também **Importar planilha**, em destaque.

### 4. Medições
- **Abre em:** lista de medições da obra (Medição 1, 2, 3…), com período e valor.
- **Mostra:** período · por item: % executado no período (vindo do diário) × valor do item no orçamento = valor medido · item percentual (Gestão de obra) sobre o medido dos outros · total · status (Rascunho, Fechada, Paga).
- **Ações:** gerar medição do período (o sistema puxa do que foi executado), ajustar quantidades, fechar, marcar como paga, exportar.
- **Para quem é o pagamento:** é o **cliente quem paga** (confirmado em 03/11/2026). A medição é a cobrança ao cliente e serve para programar os próximos recebimentos.
- **Aba do cliente "Pagamentos":** só leitura. Mostra o que tem para pagar hoje, o que vence nos próximos dias e o que já foi pago, com o detalhe de cada medição (serviço, quantidade, valor). Referência que a sócia deu: o app Falcon Finanças [PENDENTE: ver o app na Etapa 2].

### 5. Fotos
- **Abre em:** galeria da obra, por data, filtrável por frente/serviço.
- **Origem:** as fotos lançadas no diário caem aqui sozinhas.

### 6. Cotações e quadro de concorrência
- **Abre em:** lista de cotações da obra (ex.: "Porcelanato sala", "Esquadrias").
- **Mostra:** item · fornecedores · preço, prazo e condição de cada um · lado a lado.
- **Ações (sócios):** criar cotação, lançar propostas, enviar ao cliente para escolher, comprar o material.
- **Ações (cliente):** vê o quadro com os preços e deixa a escolha registrada num comentário (ex.: "Fico com o fornecedor B"). Não edita nada.
- **Status:** Em cotação → Aguardando cliente → Escolhido → Comprado.

### 8. Orçamento do cliente (importado da planilha) — decidido em 03/11/2026
- **Origem:** a sócia sobe a planilha `.xlsx` no modelo dela (exemplo: `Estudo_Viabilidade_Apto52_Vita_Belle_gestao.xlsx`, aba **ORÇAMENTO**).
- **O que o sistema lê da aba ORÇAMENTO** (colunas B a G, a partir da linha de cabeçalho "SERVIÇOS · UNID. · TOTAL MO · TOTAL ENG. · OBSERVAÇÕES"):
  - Linha com número inteiro (1, 2, 3…) = **etapa** → vira uma **frente** do cronograma.
  - Linha com número de item (1.1, 2.3…) = **item** → vira um **serviço**, com descrição, unidade, **valor ao cliente** (TOTAL ENG.), **custo de mão de obra** (TOTAL MO) e observação.
  - Unidade `%` (ex.: 14.1 Gestão de obra, 10%) = item **percentual**: o valor dele acompanha o que foi executado dos outros itens.
  - O total da planilha (TOTAL ENG.) vira o **valor do contrato**. O sistema confere: a soma dos itens tem que bater com o total da planilha; se não bater, avisa antes de gravar.
- **Antes de gravar**, mostra a prévia: "14 etapas · 28 itens · total R$ 48.795,98 · confere com a planilha ✓". A sócia confirma.
- **Depois de importar**, a sócia completa no Cronograma o que a planilha não tem: duração, de quem cada serviço depende, responsável e, nos itens em m²/ml, a quantidade (a aba ORÇAMENTO não traz quantidade).
- **Como cada item é medido** [CHUTE]: itens em m², ml, un → por **quantidade** (o auxiliar lança "12 m²"); itens em vb → por **percentual** (o auxiliar toca 25% · 50% · 75% · 100%). O % executado de qualquer item = executado ÷ previsto.
- **O que o cliente vê (aba Orçamento):** por etapa e por item: valor orçado, % executado, valor executado e saldo; total do contrato e % geral da obra. Só com diários aprovados. **Nunca vê TOTAL MO** (custo) nem a margem.
- **O que os sócios veem a mais:** custo de mão de obra e margem por item e por etapa.
- **Publicar para o cliente** (decidido em 10/11/2026):
  - O cliente só vê a aba Orçamento depois que o orçamento é publicado.
  - **Importar a planilha publica sozinho.**
  - Orçamento montado à mão, com valor digitado em cada serviço no Cronograma, fica só para os sócios até um sócio tocar **Publicar para o cliente** na tela Orçamento.
  - [CHUTE] Depois de publicado, valor novo ou alterado aparece para o cliente na hora, sem publicar de novo.
- **A medição muda junto:** valor medido de um item = valor ao cliente × % executado no período. Não existe mais "preço unitário".
- **Fase:** a importação entra na **Fase 1** (economiza cadastrar serviços à mão); a aba do cliente entra na **Fase 2**, junto com as medições.

### 7. Saúde financeira da obra (só sócios)
- **Abre em:** painel por obra.
- **Mostra:** valor do contrato · total medido · total pago · a pagar programado (próximas medições) · % físico executado × % financeiro medido.

### 9. Faturamento de todas as obras (só sócios) — pedido em 03/11/2026
- Painel simples com faturamento **bruto** e **líquido** de todas as obras somadas e obra a obra, e quanto cada uma já executou do contrato.
- **Só a sócia e o sócio** acessam. É a única tela que junta obras (comparativo explícito).
- Bruto = medições fechadas e pagas. Líquido = bruto − custos lançados de verdade, inclusive mão de obra (decidido em 04/11/2026). Custo não lançado não entra. Impostos: `[PENDENTE]`.

### 10. Tarefas (só sócios) — pedido em 04/11/2026
- O que está pendente em cada obra: título, responsável, prazo, prioridade, status. Abre na obra selecionada; "Todas as obras" mostra as de todas, dizendo de qual é.

### 11. Serviços (só sócios) — pedido em 04/11/2026
- Quadro de duas semanas com o prestador de cada serviço. **Alerta** quando o prestador está em duas obras nas mesmas datas (vermelho) ou em dois serviços da mesma obra nas mesmas datas (âmbar). Só conta de hoje em diante e em dia útil.

### 12. Contratados (só sócios) — pedido em 04/11/2026
- Funcionários e prestadores: nome, função, empresa, tipo. No **diário** aparecem o nome de cada um e o que fez no dia; quem lê o diário aprovado, inclusive o cliente, vê essa parte. Fora do escopo agora: contratos, diárias e produção do prestador.

### 13. Gestão de Obras (só sócios) — pedido em 04/11/2026
- Parâmetro geral de todas as obras: situação, % do cronograma, serviços e tarefas atrasados, diários e compras aguardando, conflitos de prestador.

### 14. Ficha da obra (só sócios) — pedido em 04/11/2026
- Foto do projeto ou da obra, endereço, dados do contratante (nome, CPF/CNPJ, telefone, e-mail), contrato, prazo, início, término, descrição, informações importantes, equipe e documentos.

### 15. Usuários (só sócios) — pedido em 04/11/2026
- O sócio cadastra quem acessa, escolhe o perfil, as obras e as telas. **O perfil é o teto:** as telas só restringem dentro dele, para não abrir preço ao auxiliar nem custo ao cliente por engano.

## Unidade principal

**Obra** (nome, código/apelido, endereço, cliente, início, data-meta de entrega, situação: Em andamento / Parada / Concluída) — vai existir mais de uma? **Sim** (até 3 ao mesmo tempo, e as concluídas ficam guardadas). Alguém trabalha em mais de uma ao mesmo tempo? **Sim (chute)**: os sócios veem todas; funcionários e auxiliar podem circular entre obras. Dados de uma obra nunca aparecem em outra.

## Perfis de usuário

- **Sócia (engenheira):** toca as obras · primeira tela: Painel do dia
- **Sócio:** toca as obras · primeira tela: Painel do dia
- **Auxiliar:** lança o diário no canteiro · primeira tela: Diário de hoje
- **Cliente:** dono da reforma · primeira tela: Avanço da minha obra
- **Funcionários (8):** não entram no sistema (chute); aparecem como responsáveis e no efetivo do diário.

### Matriz de permissões (linhas de dinheiro confirmadas item por item em 03/11/2026)

| Ação | Sócios | Auxiliar | Cliente |
|---|---|---|---|
| Quais obras vê | todas | só as que for vinculado | só a dele |
| Ver serviços e avanço (%) | sim | sim | sim |
| Ver valores do orçamento ao cliente (TOTAL ENG.) e de medição | sim | **não, nenhum preço** | **sim, da obra dele** |
| Ver custo de mão de obra (TOTAL MO) e margem | sim | **não** | **não** |
| Importar a planilha de orçamento | sim | não | não |
| Ver o que tem para pagar / pago (aba Pagamentos) | sim | não | **sim, só leitura** |
| Ver saúde financeira (custo interno, margem) | sim | não | **não** [confirmar o que é "custo" para o cliente] |
| Lançar / editar diário | sim | sim (até ser aprovado) | não |
| Ver quantidade prevista e meta do dia por serviço | sim | **sim** | sim |
| Aprovar ou devolver diário | sim | não | não |
| Ver diário completo (inclusive ocorrências) | sim | sim | **sim, só os aprovados** |
| Ver fotos | sim | sim | sim |
| Ver cotações / quadro de concorrência com preços | sim | não | **sim** |
| Registrar a escolha do fornecedor (comentário) | sim | não | **sim, só comentário** |
| Criar / editar serviços, medições, cotações | sim | não | não |
| Apagar qualquer coisa | sim | não | não |
| Gerenciar usuários | sim | não | não |
| **Quem não fez login** | não vê nada | | |

Regra geral: **sócios fazem tudo. Auxiliar só lança diário (equipe, quantas pessoas, o que fez, fotos) e nunca vê preço. Cliente só visualiza a obra dele; a única coisa que ele escreve é o comentário de escolha do fornecedor.**

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com e-mail e senha.
2. Entra sem perfil e não vê dado nenhum.
3. Vê o aviso "Conta aguardando liberação".
4. Um dos sócios libera, escolhe o perfil e as obras que ela enxerga.

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no começo. Atenção: fotos ocupam espaço; com 3 obras lançando fotos todo dia, o plano grátis do Supabase (1 GB de arquivos) pode apertar. [DESCOBRIR NO USO]
**O que custaria a alternativa pronta:** a sócia já pagou **R$ 297/mês** por um sistema (≈ R$ 3.564 por ano). É a régua: este sistema sai por R$ 0/mês no começo. Qual era o sistema e por que deixou de usar: `[PENDENTE]` (ver "A conta que vai chegar depois").

## Prazo

- **Horas por semana disponíveis:** 2 h por dia, todos os dias (~14 h por semana).
- **Quer usar de verdade em:** **Fase 1 rodando numa obra real no início de dezembro/2026** (confirmado em 03/11/2026).
- **Ordem de construção (por fases, a que mata a dor de sexta primeiro):**
  1. **Fase 1 — saber o que foi executado:** obras, **importação da planilha de orçamento** (cria frentes e serviços), cadeia "só começa quando o anterior termina", diário com meta do dia, quantidade, fotos e aprovação, o Painel do dia com a previsão de entrega e o Cronograma em Gantt.
  2. **Fase 2 — cobrar:** medições, abas **Orçamento** e Pagamentos do cliente, e o acesso do cliente.
  3. **Fase 3 — comprar e enxergar o dinheiro:** cotações e quadro de concorrência com a escolha do cliente, e a saúde financeira da obra.

---

# 2. Insights do Mercado

## Benchmark (pesquisado na web em 03/11/2026; preços são os divulgados pelos fornecedores e podem ter mudado)

### Mais Controle
- Site: https://maiscontroleerp.com.br/planos/ · Preço: a partir de R$ 269/mês
- Faz bem: medição, diário de obra e portal do cliente com pagamentos, fotos e cronograma, num pacote só.
- Falta: não confirmei na busca se tem a cascata de atraso entre serviços ou aprovação do diário antes do cliente ver. [PENDENTE: testar]

### Obra Next
- Site: https://obranext.com.br/ · Preço: R$ 127 / R$ 397 / R$ 997 por mês
- Faz bem: portal onde o cliente acompanha avanço, custos e fotos.
- Falta: o portal mostra custos ao cliente; não vi controle fino do que o cliente enxerga. [PENDENTE: testar]

### ConstruApp
- Site: https://www.constru.app.br/ · Preço: R$ 49,90 / R$ 79,90 / R$ 139,90 por mês
- Faz bem: RDO (diário), medição de subempreitada, compartilhamento com o cliente, barato.
- Falta: traz orçamento com SINAPI, que a sócia não quer; não confirmei cronograma com cascata. [PENDENTE: testar]

**Atenção:** um comparativo de 2026 (feito por um fornecedor, a Vobi) estima que, com diário, medição, compras e portal do cliente juntos, o custo real chega perto de **R$ 550/mês**. Tratar como estimativa.

**Régua:** a sócia já pagou R$ 297/mês (≈ R$ 3.564/ano). Sistema pronto com tudo: R$ 270 a R$ 550/mês.

### Referência para a aba Pagamentos do cliente: Falcon Finanças
- https://apps.apple.com/us/app/id1474465261 · grátis, finanças pessoais.
- Segundo a loja: substitui planilha, gráficos de gasto por mês, parcelas recorrentes, fluxo de caixa, anexar documentos.
- Vale copiar: o jeito simples de mostrar "o que pagar hoje / próximas parcelas / pago".

## Por que ainda vale construir o meu

[CHUTE — a sócia pediu para seguir sem responder; revisar] Os sistemas prontos cobram de R$ 270 a R$ 550 por mês para ter diário, medição e portal do cliente juntos, e nenhum confirmou na pesquisa as duas coisas que são o centro deste: **a cascata de atraso pela cadeia de serviços, com a previsão de entrega no mesmo dia**, e **o diário que só chega ao cliente depois de aprovado**. O meu sai por R$ 0/mês no começo, faz do jeito da obra e não traz orçamento, que já está resolvido fora.

Sistema anterior de R$ 297/mês e motivo de ter parado: `[PENDENTE]`.

## Referências de interface

- **Gosta de:** Falcon Finanças, para a aba Pagamentos do cliente (simples, "o que pagar hoje").
- **Odeia:** `[PENDENTE]`
- **Usa mais em:** [CHUTE] **celular** para o auxiliar (no canteiro) e o cliente; **celular e computador** para os sócios. Por isso: mobile primeiro, botões grandes, pouca digitação.
- **Cores (decidido em 04/11/2026):** as do logo: preto, branco e vermelho, em tons leves. Tom exato a conferir com o arquivo do logo.
- **Fonte (decidido em 04/11/2026):** Inter, em caixa normal.
- **Tema:** claro (melhor no sol do canteiro)
- **Logo (decidido em 10/11/2026):** logo da MPA Building na entrada, no menu e no ícone do celular. Na aba do navegador aparece "MPA Building | Gestão de Obras".

---

# 3. Arquitetura

> Toda esta etapa foi proposta pela IA sem revisão da sócia (ela pediu para seguir no chute em 03/11/2026). Revisar antes de construir.

## Mapa de telas

```
Login  ·  Cadastro  ·  Conta aguardando liberação
└── Sócios (sócia e sócio)
    ├── Início = Painel do dia → Detalhe do serviço
    ├── Diário → Diário do dia (aprovar / devolver)
    ├── Cronograma (frentes e serviços) → Editar serviço
    ├── Medições → Detalhe da medição
    ├── Cotações → Quadro de concorrência
    ├── Financeiro (saúde financeira + custos)
    └── Mais: Fotos · Obras · Equipe · Usuários · Meu perfil
└── Auxiliar
    ├── Início = Diário de hoje (meta do dia, quantidades, equipe, fotos, enviar)
    ├── Meus diários (status e devolvidos)
    └── Meu perfil
└── Cliente
    ├── Início = Avanço da obra (previsão de entrega, % por frente)
    ├── Diário (só aprovados)
    ├── Fotos
    ├── Pagamentos
    ├── Cotações (ver e comentar a escolha)
    └── Meu perfil
```

**Seletor de obra** no topo de toda tela (sócios e auxiliar com mais de uma obra). O cliente só tem a dele.

**Navegação:** celular com barra inferior de até 5 itens (sócios: Início · Diário · Cronograma · Medições · Mais); computador com menu lateral.

**Atenção, a v1 está grande:** 6 itens de menu para os sócios, 21 tabelas, 3 processos (cascata, medição e importação da planilha). Passa do teto de 7 tabelas e de 2 processos. Por isso a construção vai por fases. A Fase 1 (dezembro/2026) tem 15 tabelas e 14 telas, só com o que mata a dor de sexta (ver "Prazo"). Com ~14 h por semana, é apertado para o início de dezembro: se apertar, o primeiro corte é Fotos virar só anexo do diário, sem galeria.

## Processos automáticos

### Cálculo da cascata (cronograma vivo)
- **Gatilho:** abrir o Painel do dia, o Cronograma ou o Avanço do cliente; salvar um diário; editar um serviço.
- **Passos:** 1. De trás para frente a partir da data de entrega contratada: calcula a data-limite de início e de término de cada serviço pela cadeia. 2. De frente para trás a partir de hoje e do que já foi executado: calcula início e término previstos e a previsão de entrega. 3. Calcula folga, dias de atraso e meta do dia.
- **Resultado:** a lista ordenada por folga e a previsão de entrega no topo. Nada é gravado: é recalculado sempre a partir dos dados, então nunca fica desatualizado.
- **Se falhar:** se a cadeia tiver um ciclo (A depende de B que depende de A), o sistema recusa salvar o serviço e diz qual é o ciclo. Se faltar data de entrega na obra, o painel mostra "Cadastre a data de entrega da obra para calcular os prazos".

### Gerar medição do período
- **Gatilho:** o sócio escolhe o período e clica "Gerar medição".
- **Passos:** 1. Soma, por item, o executado nos diários **aprovados** no período que ainda não entrou em outra medição. 2. Converte em % do previsto e multiplica pelo valor do item no orçamento. 3. Calcula o item percentual (Gestão de obra) sobre o total medido dos outros. 4. Cria a medição como Rascunho.
- **Resultado:** medição pronta para ajustar e fechar; só aparece para o cliente quando fechada.
- **Se falhar:** nada é gravado e aparece "Não foi possível gerar a medição. Nenhum dado foi alterado." Se não houver quantidade aprovada no período: "Nenhum diário aprovado neste período."

### Importar a planilha de orçamento
- **Gatilho:** o sócio escolhe o arquivo `.xlsx` na tela Orçamento e toca "Importar planilha".
- **Passos:** 1. Lê a aba ORÇAMENTO no navegador. 2. Separa etapas (número inteiro) e itens (número com ponto). 3. Confere a soma dos itens com o total da planilha. 4. Mostra a prévia. 5. Na confirmação, grava frentes, serviços, valores e o valor do contrato de uma vez só.
- **Resultado:** cronograma da obra criado com as etapas e os itens do orçamento; o cliente passa a ver a aba Orçamento.
- **Se falhar:** arquivo sem aba ORÇAMENTO, sem o cabeçalho esperado ou com soma diferente do total → não grava nada e diz o motivo ("A soma dos itens dá R$ 48.700,00 e o total da planilha diz R$ 48.795,98").

## Modelagem de dados (resumo; detalhe no PRD-BACKEND.md)

| Tabela | Serve para | Fase |
|---|---|---|
| `profiles` | quem entra no sistema e seu perfil | 1 |
| `obras` | cada obra, com data de entrega contratada | 1 |
| `membros` | quem (auxiliar, cliente) enxerga qual obra | 1 |
| `funcionarios` | a equipe (não entra no sistema) | 1 |
| `frentes` | frentes de serviço de cada obra | 1 |
| `servicos` | serviços com quantidade, duração, responsável | 1 |
| `servicos_dependencias` | "só começa quando X termina" | 1 |
| `diarios` | o diário do dia, com status de aprovação | 1 |
| `diarios_equipe` | quem foi no dia | 1 |
| `diarios_execucoes` | quanto foi executado de cada serviço no dia | 1 |
| `fotos` | fotos do diário e da obra | 1 |
| `orcamentos` | a planilha importada: arquivo, data, total conferido | 1 |
| `servicos_valores` | valor ao cliente de cada item (TOTAL ENG.; o auxiliar nunca vê) | 1 (gravado na importação) |
| `servicos_custos` | custo de mão de obra de cada item (TOTAL MO; só sócios, o cliente nunca vê) | 1 (gravado na importação) |
| `obras_contratos` | valor do contrato (separado para o auxiliar nunca ver) | 1 (gravado na importação) |
| `medicoes` + `medicoes_itens` | cobrança ao cliente | 2 |
| `cotacoes` + `cotacoes_propostas` + `cotacoes_comentarios` | quadro de concorrência e escolha | 3 |
| `custos` | custo interno da obra (só sócios) | 3 |

## A pergunta de um ano

[CHUTE] *"Quanto cada tipo de serviço rende de verdade por pessoa por dia, e qual responsável atrasa mais?"* Para isso, desde o primeiro dia, cada lançamento de execução guarda a data, a quantidade e **quantas pessoas** trabalharam naquele serviço, e cada serviço guarda o responsável. Com um ano disso, o cronograma da próxima obra sai da produtividade real, não do chute.

## Melhorias para a v2

- Aviso automático (WhatsApp ou e-mail) quando o diário do dia não foi lançado ou um serviço passou da data-limite — cortado porque é o 3º processo e depende de serviço pago.
- Relatório em PDF do diário e da medição — cortado para manter a v1 enxuta; o cliente vê tudo no próprio sistema.
- Linha de base do cronograma (comparar com o planejado original) — cortado; na v1 o atraso é medido contra a data de entrega.
- Importar serviços de planilha — cortado; cadastro na mão na v1.
- Funcionar sem internet no canteiro — cortado; exige outra arquitetura.

---

# A conta que vai chegar depois

- `[PENDENTE: custo em horas/R$ por semana do problema 1]` — custo: sem ele, não dá para medir se o sistema se pagou.
- `[PENDENTE: custo do problema 2]` — idem.
- `[PENDENTE: qual era o sistema de R$ 297/mês e por que parou]` — custo: risco de repetir o mesmo motivo de abandono.
- `[PENDENTE: testar Mais Controle, Obra Next e ConstruApp]` — custo: pode existir pronto o que estamos construindo.
- `[PENDENTE: confirmar os CHUTES da Etapa 2 e toda a Etapa 3]` — custo: a construção segue os chutes como se fossem decisão.
- `[PENDENTE: cliente vê o diário no mesmo formato dos sócios?]` — hoje ficou: vê tudo, só dos aprovados.

# Decidir depois de usar

- `[DESCOBRIR NO USO: aditivo de contrato]` — por enquanto: item novo cadastrado à mão na etapa, marcado "Aditivo"; reimportar a planilha inteira fica para a v2.
- `[DESCOBRIR NO USO: cliente vê as observações da planilha?]` — por enquanto: vê (elas descrevem o escopo, ex.: "Valor já incluso o material").
- `[DESCOBRIR NO USO: puxar a quantidade da aba QUANTITATIVO]` — por enquanto: a sócia digita a quantidade dos itens em m²/ml depois de importar.
- `[DESCOBRIR NO USO: sábados e feriados no cálculo de dias úteis]` — por enquanto: segunda a sexta, sem feriados.
- `[DESCOBRIR NO USO: parcelar uma medição em mais de um pagamento]` — por enquanto: cada medição tem um vencimento.
- `[DESCOBRIR NO USO: meta do dia automática serve ou os sócios preferem programar à mão]` — por enquanto: automática, com ajuste manual.
- `[DESCOBRIR NO USO: espaço das fotos]` — por enquanto: plano grátis, fotos reduzidas ao enviar.
