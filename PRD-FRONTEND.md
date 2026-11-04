# PRD Frontend — Gestão de Obra (nome provisório)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> **Aviso:** a Etapa 1 foi decidida com a sócia. Mapa de telas, visual e detalhes marcados **[CHUTE]** foram propostos pela IA a pedido dela (03/11/2026) e ainda não foram revisados.

## O que o sistema é

Um sistema de acompanhamento da execução de obras de reforma: o auxiliar lança o diário no canteiro, os sócios aprovam, e o sistema mostra toda manhã os serviços ordenados pelo que está mais atrasado, com a previsão de entrega calculada pela cadeia de serviços. Usado principalmente **no celular** (auxiliar no canteiro, cliente) e no celular e no computador pelos sócios. [CHUTE]

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Cores do logo da empresa: preto `#1E1E1E`, branco e vermelho `#C8232C`, em tons leves (tom exato a conferir com o arquivo do logo). Vermelho só na marca e em "atrasado"; botão principal preto. Verde e âmbar ficam só como status. Fonte **Inter** em tudo, caixa normal. Tema claro. Sem logo por enquanto (nome do sistema no lugar).
- Mobile primeiro: botões grandes, campos numéricos com teclado numérico, pouca digitação.
- Celular: barra inferior fixa com até 5 itens. Computador: menu lateral à esquerda.
- **Seletor de obra** no topo de toda tela interna para quem enxerga mais de uma obra. Trocar a obra recarrega a tela com os dados só daquela obra. Nenhuma tela mistura dados de obras diferentes.

## Perfis

- **Sócio** (a sócia engenheira e o sócio): entra no **Painel do dia**. Vê e faz tudo, em todas as obras.
- **Auxiliar:** entra no **Diário de hoje**. Lança o diário das obras em que está vinculado. Nunca vê preço nem valor.
- **Cliente:** entra no **Avanço da obra**. Só visualiza a obra dele. A única coisa que escreve é comentário em cotação.
- **Pendente:** quem se cadastrou e ainda não foi liberado. Só vê o aviso de conta aguardando liberação.

Nomes na tela × valor guardado: Sócio = `socio`, Auxiliar = `auxiliar`, Cliente = `cliente`, Aguardando liberação = `pendente`.

## Mapa de navegação

```
Login · Criar conta · Conta aguardando liberação
└── Sócio:    Início (Painel do dia) · Diário · Cronograma · Medições · Mais
              Mais = Orçamento · Cotações · Financeiro · Fotos · Obras · Equipe · Usuários · Meu perfil
              (no computador, o menu lateral mostra todos estes itens direto)
└── Auxiliar: Hoje (Diário de hoje) · Meus diários · Meu perfil
└── Cliente:  Avanço · Orçamento · Pagamentos · Diário · Mais
              Mais = Fotos · Cotações · Meu perfil
```

---

## Regras de cálculo (usadas no Painel, Cronograma, Diário e Avanço)

Tudo é calculado na hora, a partir dos dados; nada disto é digitado.

- **Dias úteis:** segunda a sexta. Sábados e feriados não contam [DESCOBRIR NO USO].
- **Executado de um serviço:** soma das quantidades lançadas nos diários. Para sócios e auxiliar contam diários **Enviado** e **Aprovado**; para o cliente, só **Aprovado**.
- **% executado:** executado ÷ quantidade prevista, no máximo 100%.
- **Concluído:** quando o % chega a 100%, ou quando um sócio marca "Concluir serviço". A data de término real é a do diário que fechou os 100%, ou a data em que o sócio marcou.
- **Data-limite de término (de trás para frente):** serviço sem ninguém depois dele termina, no limite, na data de entrega contratada da obra. Os outros: 1 dia útil antes da menor data-limite de início dos serviços que dependem dele.
- **Data-limite para programar (= data-limite de início):** data-limite de término − (duração − 1) dias úteis. É a última data em que o serviço pode começar sem empurrar a entrega.
- **Início previsto (de frente para trás):** se já tem lançamento, a data do primeiro lançamento. Se não, o dia útil seguinte ao maior término previsto dos serviços de que ele depende (ou a data de início da obra, se não depende de ninguém); se essa data já passou, hoje.
- **Término previsto:** se concluído, o término real. Se não, a partir do maior entre hoje e o início previsto, somando os dias que faltam: duração × (1 − % executado), arredondado para cima, mínimo 1.
- **Previsão de entrega da obra:** o maior término previsto entre todos os serviços.
- **Folga:** dias úteis entre o término previsto e a data-limite de término. Positiva = sobra; zero = no limite; negativa = este serviço está empurrando a entrega.
- **Dias de atraso:** se o serviço não está concluído e hoje passou da data-limite de término, os dias úteis entre a data-limite de término e hoje. Senão, 0.
- **Meta do dia:** quantidade que falta ÷ dias úteis de hoje até a data-limite de término (mínimo 1 dia), arredondada para cima. Se o sócio digitou uma meta manual para o serviço, vale a manual.
- **Itens medidos por percentual** (`vb`): a "quantidade" é em pontos de % (previsto = 100).
- **% da frente e % da obra:** valor executado ÷ valor orçado ao cliente, usando o orçamento importado. Valor executado de um item = valor do item × % executado. Item `Percentual` (Gestão de obra): % dele = % executado da soma dos outros itens.

---

## Entrada em duas portas (decidido em 03/11/2026, a partir do print de referência da sócia)

Fundo claro, nome do sistema no topo, sem rodapé.

### Tela: Escolha do tipo de acesso
**Quem acessa:** todos, antes de entrar.
"Por favor, selecione o tipo de acesso" e dois botões grandes: **Acessar como construtor** (equipe: sócios e auxiliar) · **Acessar como cliente**.

### Tela: Acesso da equipe (construtor)
E-mail, senha, **Acessar**, "Esqueci minha senha", Voltar. Sem cadastro aqui: conta nova da equipe é liberada por um sócio.
- Sócio → Painel do dia; Auxiliar → Diário de hoje.
- E-mail de cliente nesta porta: "Este acesso é da equipe da obra. Clientes entram em 'Acessar como cliente'."

### Tela: Portal do cliente
Cartão com faixa "Portal do cliente" e duas colunas (uma embaixo da outra no celular):

**Primeiro acesso?** — o cliente cria o próprio login:

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Tipo | Pessoa física · Pessoa jurídica | sim | muda os campos abaixo |
| Nome completo / Razão social | texto | sim | |
| CPF / CNPJ | número | sim | 11 / 14 números |
| E-mail | e-mail | sim | será o login |
| Crie uma senha | senha | sim | mínimo 8 caracteres |
| Repita a senha | senha | sim | igual à anterior |

Botão **Cadastrar dados de acesso** → conta nasce `pendente` → tela "Conta criada!".

**Já sou cadastrado** — e-mail, senha, **Acessar**, "Esqueci minha senha". Cliente → Avanço da obra. E-mail da equipe nesta porta: "Este é o portal do cliente. A equipe entra em 'Acessar como construtor'."

Regras de conferência em `src/lib/acesso.js` (com teste).

### Tela: Conta criada (aguardando liberação)
"Conta criada! Seu acesso está aguardando a liberação da engenharia. Assim que a sua obra for vinculada à sua conta, você entra com o mesmo e-mail e senha." Botão Voltar ao início. Um sócio libera em Usuários e vincula a obra.

---

## Tela: Painel do dia (início do Sócio)

**Quem acessa:** Sócio.
**Chega aqui por:** item Início; é a primeira tela ao entrar.

**O que aparece**
1. Seletor de obra.
2. **Destaque da entrega**, em letra grande e faixa de ponta a ponta: "Entrega com 5 dias de atraso", com "Previsão 04/12, contratada 27/11" abaixo (fundo vermelho claro), ou "Entrega no prazo" (fundo verde claro). Abaixo, em letra menor: "2 diários aguardando aprovação" (toque leva ao Diário filtrado).
3. Filtros: Frente · Responsável.
4. Lista de serviços **não concluídos**, agrupada por frente, e dentro de cada grupo e entre grupos ordenada pela **menor folga primeiro**. O grupo que contém o serviço de menor folga vem em cima.

**Campos e informações (cada linha da lista)**

| Campo | Tipo | Observação |
|---|---|---|
| Serviço | texto | |
| Frente | texto | título do grupo |
| Responsável | texto | nome do funcionário |
| % executado | barra + número | |
| Dias de atraso | número | vermelho se > 0 |
| Data-limite para programar | data | vermelho se já passou e o serviço não começou |
| Folga | número de dias | vermelho ≤ 0, amarelo 1 a 3, verde > 3 |
| Depende de | texto | nomes dos serviços anteriores ainda não concluídos |
| Último lançamento | data | data do último diário com quantidade neste serviço |
| Aguardando aprovação | etiqueta | aparece se parte do executado vem de diário Enviado |

**Ações**
- **Tocar num serviço:** abre o Detalhe do serviço.
- Nesta tela não se edita nada.

**Regras por perfil**
- Só Sócio.

**Estado vazio**
"Nenhum serviço em aberto nesta obra." Se a obra não tem data de entrega: "Cadastre a data de entrega da obra para calcular os prazos." Se não tem serviços: "Esta obra ainda não tem serviços. Cadastre o cronograma." (botão leva ao Cronograma).

---

## Tela: Detalhe do serviço

**Quem acessa:** Sócio.
**Chega aqui por:** toque num serviço no Painel do dia ou no Cronograma.

**O que aparece**
Nome, frente, responsável, unidade, quantidade prevista e executada, %, duração, depende de, datas (limite para programar, limite de término, início e término previstos, término real), folga, dias de atraso, meta do dia. Abaixo, o histórico de lançamentos (data do diário, quantidade, pessoas, status do diário) e as fotos ligadas a este serviço.

**Ações**
- **Editar serviço:** abre Editar serviço.
- **Concluir serviço:** pede confirmação ("Marcar como concluído mesmo com X% executado?") e grava a data de hoje como término real.
- **Reabrir serviço:** desfaz o concluído manual.

---

## Tela: Diário (lista)

**Quem acessa:** Sócio, Auxiliar (como "Meus diários"), Cliente.
**Chega aqui por:** item Diário (Sócio, Cliente) ou Meus diários (Auxiliar).

**O que aparece**
Seletor de obra. Filtro de status (Sócio e Auxiliar). Lista por data, da mais recente para a mais antiga: data, status, quantas pessoas, número de serviços com lançamento, número de fotos.

**Ações**
- **Tocar num diário:** abre o Diário do dia.
- **Novo diário** (Sócio e Auxiliar): abre o Diário do dia com a data de hoje. Se já existe diário dessa obra nessa data, abre o existente.

**Regras por perfil**
- **Sócio:** vê todos os status. Os **Enviado** aparecem no topo com a etiqueta "Aguardando aprovação".
- **Auxiliar:** vê os diários das obras em que está vinculado; os **Devolvido** aparecem no topo com o comentário do sócio.
- **Cliente:** vê só os **Aprovado** da obra dele.

**Estado vazio**
Sócio e Auxiliar: "Nenhum diário lançado ainda. Lance o de hoje." Cliente: "Nenhum diário aprovado ainda."

---

## Tela: Diário do dia (início do Auxiliar, como "Hoje")

**Quem acessa:** Auxiliar e Sócio (lançar/editar/aprovar); Cliente (só leitura, só Aprovado).
**Chega aqui por:** item Hoje (Auxiliar); toque num diário da lista.

**O que aparece, de cima para baixo**
1. Obra e data. Etiqueta de status. Se Devolvido: o comentário do sócio em destaque.
2. **Clima:** manhã e tarde.
3. **Equipe do dia:** lista de funcionários com caixa de marcar; contador "X pessoas".
4. **Serviços do dia:** os serviços em aberto da obra que já podem ser executados (todos os anteriores concluídos) ou já começaram. Cada um em um cartão:
   *"Revestimento parede banheiros — meta de hoje: 7 m² · já executado 18 de 45 m²"*
   com campo **Executado hoje (m²)**, campo **Pessoas neste serviço** e campo **O que foi feito** (texto curto, opcional). Botão "Mostrar outros serviços" lista também os que ainda dependem de outro.
5. **Ocorrências:** texto livre (ex.: "faltou argamassa", "chuva parou o serviço às 14h").
6. **Fotos:** botão grande "Tirar foto / Escolher foto"; cada foto pode ser ligada a um serviço e ter legenda.
7. Botões no rodapé.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | padrão hoje; um diário por obra por dia |
| Clima manhã | lista: Sol, Nublado, Chuva, Chuva forte | sim | |
| Clima tarde | lista: Sol, Nublado, Chuva, Chuva forte | sim | |
| Equipe do dia | marcar funcionários | sim | pelo menos 1 |
| Quantidade de pessoas | número | sim | preenche sozinho com o total marcado; pode ajustar (ex.: diarista não cadastrado) |
| Executado hoje (por serviço) | número decimal | não | itens por quantidade: na unidade do serviço, não negativo. Itens em `vb` (por percentual): botões grandes **+25% · +50% · +75% · Concluído**, mostrando "já feito 40%" |
| Pessoas neste serviço | número inteiro | não | obrigatório se lançou quantidade |
| O que foi feito (por serviço) | texto curto | não | |
| Ocorrências | texto longo | não | |
| Fotos | imagem | não | comprimida antes de subir |
| Legenda da foto | texto curto | não | |
| Serviço da foto | lista | não | |

**Ações**
- **Salvar rascunho** (Auxiliar, Sócio): grava como Rascunho.
- **Enviar para aprovação** (Auxiliar): grava como Enviado. Mostra "Diário enviado. Você ou o sócio será avisado quando for aprovado." Depois disso o auxiliar ainda pode editar até ser aprovado.
- **Aprovar** (Sócio, diário Enviado): grava como Aprovado. Mostra "Diário aprovado. O cliente já pode ver."
- **Devolver** (Sócio, diário Enviado): pede um comentário obrigatório e grava como Devolvido.
- **Editar** (Sócio, qualquer status): corrige quantidades, equipe, fotos.
- **Excluir diário** (Sócio): pede confirmação.

**Regras por perfil**
- **Auxiliar:** vê unidade, quantidade prevista, executado e meta do dia. **Nunca vê preço nem valor.** Edita só enquanto o diário está Rascunho, Enviado ou Devolvido. Não aprova. Não exclui.
- **Sócio:** tudo.
- **Cliente:** só leitura, só diários Aprovado; vê equipe, clima, serviços, quantidades, ocorrências e fotos.

**Estado vazio**
Sem serviços liberados para hoje: "Nenhum serviço liberado para hoje. Toque em 'Mostrar outros serviços' se a equipe adiantou algo."

---

## Tela: Cronograma em Gantt (frentes e serviços)

**Quem acessa:** Sócio.
**Chega aqui por:** item Cronograma.
**Referência visual aprovada:** `preview.html`, tela Cronograma.

**O que aparece**
1. Título com a previsão e a entrega contratada ("Previsão 04/12 · contratada 27/11").
2. Escala: **Compacto** (obra inteira) · **Detalhado** (dia a dia). Botão **+ Novo serviço**.
3. Legenda: Concluído (verde) · Executado (azul-turquesa) · Previsto (barra vazada) · Passa do limite (hachurado vermelho) · Hoje (linha cheia) · Entrega contratada (linha tracejada vermelha).
4. **O gráfico:** coluna da esquerda fixa com o nome do serviço, responsável e %; à direita, a linha do tempo por semana e por dia, fins de semana sombreados. Cada frente é uma faixa de título; cada serviço, uma barra do início ao término (real ou previsto pela cascata), preenchida até o % executado. A parte da barra que passa da data-limite de término fica hachurada em vermelho. Ao lado da barra, a data de término (vermelha se passa do limite, verde se no prazo, "✓" se concluído).
5. No celular, só o gráfico rola para os lados; a coluna dos nomes fica parada. Abre já posicionado perto de hoje.
6. Abaixo do gráfico, um quadro que mostra o serviço tocado: início, término, programar até, limite de término e de quem depende.
7. Serviços importados do orçamento sem duração aparecem numa lista "Completar para entrar no cronograma" acima do gráfico, com o que falta (duração, dependência, responsável, quantidade).

**Ações**
- **Tocar numa barra:** mostra o quadro do serviço; tocar de novo abre o Detalhe do serviço.
- **Nova frente:** nome. Frentes podem ser reordenadas (subir/descer).
- **Novo serviço:** abre Editar serviço vazio (marcado como Aditivo se a obra já tem orçamento importado).
- **Excluir frente:** só se não tiver serviços.

**Estado vazio**
"Esta obra ainda não tem cronograma. Importe a planilha de orçamento para criar as etapas e os serviços de uma vez." Botão **Importar planilha** (leva a Orçamento) e link "ou criar à mão".

---

## Tela: Editar serviço

**Quem acessa:** Sócio.
**Chega aqui por:** Novo serviço ou Editar serviço.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nº do item | texto | não | vem da planilha (ex.: 2.3) |
| Nome | texto | sim | |
| Frente | lista das frentes da obra | sim | |
| Unidade | lista: m², m, ml, m³, un, vb, kg | sim | |
| Como medir | lista: Quantidade, Percentual | sim | padrão: Percentual para vb, Quantidade para o resto |
| Quantidade prevista | número decimal | sim | > 0; escondido se "Percentual" |
| Valor ao cliente (R$) | dinheiro | sim | vem da planilha (TOTAL ENG.); só Sócio vê |
| Custo de mão de obra (R$) | dinheiro | não | vem da planilha (TOTAL MO); só Sócio vê |
| Observação | texto | não | vem da planilha; o cliente vê |
| Duração (dias úteis) | número inteiro | sim | ≥ 1 |
| Depende de | escolha múltipla dos serviços da mesma obra | não | vazio só para o primeiro serviço da cadeia |
| Responsável | lista de funcionários | sim | |
| Meta diária manual | número decimal | não | se vazio, a meta é calculada |

**Ações**
- **Salvar:** se a dependência criar um ciclo, recusa e mostra "Não dá para salvar: 'Pintura' depende de 'Reboco', que já depende de 'Pintura'."
- **Excluir serviço:** só se não tiver lançamento em diário nem em medição; senão mostra "Este serviço já tem lançamentos e não pode ser excluído."

---

## Tela: Medições — Fase 2

**Quem acessa:** Sócio.
**Chega aqui por:** item Medições.

**O que aparece**
Seletor de obra. Lista: Medição nº, período, valor total, vencimento, status (Rascunho / Fechada / Paga).

**Ações**
- **Gerar medição:** pede período (início e fim) e vencimento; soma o executado dos diários **Aprovado** no período que ainda não entrou em outra medição, converte em % de cada item, multiplica pelo valor do item no orçamento, soma a Gestão de obra (% sobre os outros itens) e cria como Rascunho. Se nada a medir: "Nenhum diário aprovado neste período."
- **Tocar numa medição:** abre o Detalhe da medição.

**Estado vazio**
"Nenhuma medição ainda. Gere a primeira a partir dos diários aprovados."

---

## Tela: Detalhe da medição — Fase 2

**Quem acessa:** Sócio (edita); Cliente (lê, só Fechada e Paga, pela tela Pagamentos).

**O que aparece**
Número, período, vencimento, status. Tabela de itens: nº do item, serviço, executado no período (quantidade ou %), % do item, valor do item no orçamento, valor medido. Linha da Gestão de obra. Total. Observação.

**Ações (Sócio)**
- **Ajustar quantidade** de um item (só em Rascunho).
- **Fechar medição:** status Fechada; passa a aparecer para o cliente.
- **Marcar como paga:** pede a data do pagamento; status Paga.
- **Excluir:** só em Rascunho.

---

## Tela: Orçamento — importação na Fase 1, visão do cliente na Fase 2

**Quem acessa:** Sócio (importa e vê tudo); Cliente (só leitura, sem custo).
**Chega aqui por:** Sócio: Mais → Orçamento (menu lateral no computador). Cliente: item Orçamento da barra inferior.
**Referência visual:** `preview.html`, tela Orçamento (tem a chave "Ver como Sócio / Cliente").

**O que aparece**
1. Título da planilha (ex.: "ORÇAMENTO - APTO 52, BLOCO 2 - VITA BELLE") e data da importação.
2. Faixa de 3 números: **Valor do contrato** · **Executado** (R$ e %) · **Saldo a executar**.
3. Barra geral da obra (% pelo valor).
4. Lista de etapas na ordem da planilha (1, 2, 3…). Cada etapa: número e nome, valor orçado, % executado (barra), valor executado. Tocar abre os itens da etapa: nº, descrição, unidade, valor, % executado, observação.
5. Item de Gestão de obra aparece como etapa própria, com o % acompanhando o resto.
6. **Só Sócio:** coluna de custo de mão de obra e margem (valor ao cliente − custo) por etapa e no total; botão **Baixar planilha original**.

**Ações (Sócio)**
- **Importar planilha** (obra sem orçamento): escolher o `.xlsx` → tela de conferência → **Confirmar importação**.
- **Baixar planilha original.**

**Tela de conferência da importação (Sócio)**
- "Lemos a aba ORÇAMENTO: **14 etapas · 28 itens · total R$ 48.795,98 · confere com a planilha ✓**".
- Lista das etapas com o total de cada uma e os itens recolhidos dentro.
- Avisos, se houver: itens em m²/ml que vão precisar de quantidade; soma que não bate (bloqueia o botão Confirmar).
- Botões: **Confirmar importação** · **Cancelar**.

**Regras por perfil**
- **Cliente:** vê só a obra dele; % e valores executados só com diários Aprovado; **nunca vê custo de mão de obra nem margem.**
- **Auxiliar:** não acessa.

**Estado vazio**
Sócio: "Esta obra ainda não tem orçamento. Suba a planilha no seu modelo e o sistema monta as etapas e os serviços." Botão **Importar planilha**. Cliente: "O orçamento da sua obra ainda não foi publicado."

---

## Tela: Pagamentos (cliente) — Fase 2

**Quem acessa:** Cliente (e Sócio, para ver como o cliente vê).
**Chega aqui por:** item Pagamentos.

**O que aparece** (referência: Falcon Finanças, simples)
1. **Para pagar hoje / vencidos:** cartão em destaque com o valor e a medição.
2. **Próximos vencimentos:** lista com data e valor.
3. **Pagos:** lista com data de pagamento e valor.
4. Total do contrato · total já pago · saldo do contrato.

**Ações**
- **Tocar numa medição:** abre o Detalhe da medição em leitura.

**Regras por perfil**
- **Cliente:** só a obra dele; só medições Fechada e Paga. Nunca vê custos internos.

**Estado vazio**
"Nenhum pagamento por enquanto."

---

## Tela: Cotações — Fase 3

**Quem acessa:** Sócio; Cliente (leitura + comentário).
**Chega aqui por:** item Cotações.

**O que aparece**
Seletor de obra (Sócio). Lista: título, número de propostas, status (Em cotação / Aguardando cliente / Escolhido / Comprado), fornecedor escolhido.

**Ações (Sócio)**
- **Nova cotação:** título e descrição (ex.: "Porcelanato piso sala — 70 m²").
- **Tocar:** abre o Quadro de concorrência.

**Regras por perfil**
- **Cliente:** vê as cotações a partir de Aguardando cliente (não vê as Em cotação).

**Estado vazio**
"Nenhuma cotação nesta obra."

---

## Tela: Quadro de concorrência — Fase 3

**Quem acessa:** Sócio; Cliente.

**O que aparece**
Título e descrição. Propostas lado a lado (no celular, uma embaixo da outra): fornecedor, valor, prazo de entrega, condição de pagamento, observação. A de menor valor tem a etiqueta "Menor preço". Abaixo, os comentários (autor, data, texto).

**Campos (proposta)**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Fornecedor | texto | sim |
| Valor (R$) | dinheiro | sim |
| Prazo de entrega | texto curto | não |
| Condição de pagamento | texto curto | não |
| Observação | texto | não |

**Ações**
- **Sócio:** adicionar/editar/excluir proposta; **Enviar ao cliente** (status Aguardando cliente); **Registrar escolha** (escolhe a proposta, status Escolhido); **Marcar como comprado** (status Comprado); comentar.
- **Cliente:** **Comentar** (ex.: "Fico com o fornecedor B"). É a única coisa que ele escreve no sistema.

---

## Tela: Financeiro — Fase 3

**Quem acessa:** Sócio.
**Chega aqui por:** item Financeiro.

**O que aparece**
Seletor de obra. Cartões: valor do contrato · total medido · recebido · a receber · custos lançados · saldo (recebido − custos pagos). Um gráfico de barras respondendo **"a obra está andando no mesmo ritmo que está sendo cobrada?"**: % físico executado × % financeiro medido. Abaixo, a lista de custos.

**Campos (custo)**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | |
| Descrição | texto | sim | |
| Categoria | lista: Mão de obra, Material, Equipamento, Terceirizado, Outros | sim | |
| Valor (R$) | dinheiro | sim | |
| Pago | sim/não | sim | |

**Ações**
- Novo custo, editar, excluir.

**Regras por perfil**
- Só Sócio. Cliente e Auxiliar não têm acesso.

**Estado vazio**
"Nenhum custo lançado nesta obra."

---

## Tela: Fotos

**Quem acessa:** Sócio, Cliente (só de diários Aprovado). Auxiliar vê as fotos dentro dos diários.
**Chega aqui por:** item Fotos.

**O que aparece**
Galeria da obra por data (mais recente primeiro), filtrável por frente e serviço. Tocar abre a foto grande com legenda, data e serviço.

**Estado vazio**
"Nenhuma foto ainda. As fotos lançadas no diário aparecem aqui."

---

## Tela: Avanço da obra (início do Cliente)

**Quem acessa:** Cliente (e Sócio, para ver como o cliente vê).
**Chega aqui por:** item Avanço; primeira tela do cliente.

**O que aparece**
1. Nome da obra. **Entrega contratada** e **Previsão de entrega** (calculada só com diários Aprovado).
2. % geral da obra.
3. Lista de frentes com % de cada uma; tocar abre os serviços da frente com % e status (sem preço, sem responsável [CHUTE]).
4. As 6 fotos mais recentes (toque leva a Fotos).

**Estado vazio**
"A obra ainda não começou."

---

## Tela: Obras

**Quem acessa:** Sócio.
**Chega aqui por:** Mais → Obras.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | ex.: "Reforma Apto 302 — Ed. Aurora" |
| Código / apelido | texto curto | sim | ex.: "AP302"; único; aparece no seletor |
| Cliente (nome) | texto | sim | |
| Endereço | texto | não | |
| Data de início | data | sim | |
| Data-meta de entrega | data | sim | base de todo o cálculo de prazos |
| Valor do contrato (R$) | dinheiro | não | vem do orçamento importado; guardado à parte para o auxiliar nunca ver |
| Situação | lista: Em andamento, Parada, Concluída | sim | |

**Ações**
- Nova obra, editar, mudar situação. Obras Concluída saem do seletor (aparecem em "Mostrar concluídas").
- **Pessoas desta obra:** vincular auxiliares e o cliente à obra.

**Estado vazio**
"Nenhuma obra cadastrada. Comece pela primeira."

---

## Seletor de obra (no topo de toda tela interna)

- Sempre visível, mostrando **código e nome** da obra atual e a situação.
- Tocar abre a lista das obras que a pessoa enxerga (sócio: todas; auxiliar e cliente: as vinculadas). Quem só enxerga uma vê o nome, sem botão de trocar.
- Trocar de obra **recarrega a tela inteira** com os dados daquela obra; nada da anterior sobra.
- A obra escolhida fica guardada: fechar e abrir o app volta nela.

---

## Tela: Faturamento — só Sócio (comparativo entre obras)

**Quem acessa:** só Sócio. Auxiliar e Cliente não veem o item nem a tela.
**Chega aqui por:** menu lateral (computador) ou Mais → Faturamento (celular).
**É a única tela que junta obras:** mostra todas, seja qual for a obra do seletor, que continua visível no topo. Tocar numa obra abre o Painel dela.

**O que aparece**
1. Faixa de números de todas as obras somadas: **Faturamento bruto** · **Líquido** · **A receber** · **Contratos em carteira**.
2. Barra: quanto do total contratado já foi executado.
3. Lista de obras (uma linha cada): código e nome, situação, contrato, % executado (barra), bruto, líquido e margem %.

**Definições (decididas em 04/11/2026)**
- **Bruto** = soma das medições Fechada e Paga (o que foi cobrado do cliente).
- **Líquido** = bruto − custos lançados de verdade na obra, inclusive mão de obra. Custo não lançado não entra. Impostos ainda não são descontados.
- **A receber** = medições Fechada ainda não pagas.

**Estado vazio**
"Nenhuma medição fechada ainda. O faturamento aparece aqui quando a primeira medição for fechada."

---

## Tela: Equipe

**Quem acessa:** Sócio.
**Chega aqui por:** Mais → Contratados. (Antes chamada Equipe; ver "Telas pedidas em 04/11/2026".)

**Campos:** Nome (sim), Função (não; ex.: pedreiro, eletricista), Ativo (sim/não). Sem telefone: o cliente enxerga os nomes da equipe no diário, e telefone de funcionário não deve chegar a ele.
**Ações:** novo, editar, desativar (funcionário com lançamento não é excluído, só desativado).
**Estado vazio:** "Nenhum funcionário cadastrado. Cadastre a equipe para lançar o diário."

---

## Tela: Usuários

**Quem acessa:** Sócio.
**Chega aqui por:** Mais → Usuários.

**O que aparece**
Contas "Aguardando liberação" no topo. Lista de usuários: nome, e-mail, perfil, obras vinculadas, ativo.

**Ações**
- **Liberar:** escolhe o perfil (Sócio, Auxiliar, Cliente) e, para Auxiliar e Cliente, as obras.
- **Trocar perfil**, **mudar obras**, **desativar**.

**Estado vazio**
"Nenhuma conta aguardando liberação."

---

## Tela: Meu perfil

**Quem acessa:** todos os perfis liberados.
Nome (editável), e-mail, perfil (só leitura), botão Sair.

---

## Telas pedidas em 04/11/2026 (referência de layout: o app já construído)

Todas só para Sócio, exceto o diário e Compras. Telas que juntam obras: Gestão de Obras, Faturamento, Tarefas em "Todas as obras" e o alerta de conflito em Serviços.

- **Tarefas:** grupos por prazo; concluir marcando a caixa; etiqueta Atrasada; nova tarefa com obra, responsável, prazo e prioridade. Vazio: "Nenhuma tarefa nesta obra".
- **Serviços:** alertas no topo; para cada serviço, prestador (lista), status e faixa de 14 dias. Vermelho = conflito entre obras; âmbar = mesmas datas na mesma obra.
- **Contratados:** lista com função, empresa, tipo, obras em que está alocado e etiqueta de conflito; novo contratado.
- **Gestão de Obras:** números gerais e um cartão por obra; tocar abre o Painel da obra.
- **Obras e ficha da obra:** cartões com foto; ficha com foto, dados, descrição, informações importantes, equipe e documentos; nova obra e editar.
- **Usuários:** novo usuário ou liberar conta; perfil, obras e telas. "Meu perfil" não pode ser bloqueado, e o sócio não bloqueia a própria tela de Usuários.
- **Diário:** cada pessoa marcada ganha o campo "O que fez hoje"; quem lê o diário vê nome e atividade.
- **Compras (antes Cotações):** o cliente envia a aprovação como comentário nas cotações Aguardando cliente e Escolhido.

## Textos do sistema

- Botões: Salvar, Salvar rascunho, Enviar para aprovação, Aprovar, Devolver, Cancelar, Novo, Excluir, Gerar medição, Fechar medição, Marcar como paga, Enviar ao cliente, Registrar escolha, Marcar como comprado, Comentar.
- Confirmação de exclusão: "Tem certeza que quer excluir? Isso não pode ser desfeito."
- Aviso de conta pendente: "Conta aguardando liberação. Um dos sócios precisa liberar seu acesso e escolher as obras que você vai ver."
- Erro genérico: "Não foi possível salvar. Verifique a internet e tente de novo. Nada foi perdido do que está na tela."
- Salvo: "Salvo."

## Dados de exemplo

Hoje nos dados de exemplo: **terça, 03/11/2026**. Nomes fictícios.

**Usuários (um de cada perfil)**
- Ana Exemplo — Sócio — todas as obras
- Bruno Exemplo — Sócio — todas as obras
- Rita Auxiliar — Auxiliar — Obras 1 e 2
- Cláudia Cliente — Cliente — Obra 1
- Novo Usuário — Pendente

**Equipe (8):** José (servente), Carlos (encanador), Paulo (eletricista), Marcos (pedreiro), Antônio (azulejista), Rafael (gesseiro), Luiz (pintor), Edson (servente).

**Obras**
1. Reforma Apto 302 — Ed. Aurora · cliente Cláudia Cliente · início 29/09/2026 · entrega 27/11/2026 · contrato R$ 43.307,00 (vindo do orçamento importado) · Em andamento
2. Reforma Casa Jardim das Flores · início 19/10/2026 · entrega 26/02/2027 · contrato R$ 185.000,00 · Em andamento
3. Reforma Loja Centro · início 05/10/2026 · entrega 18/12/2026 · contrato R$ 64.000,00 · Parada
4. Reforma Cozinha Ed. Ipê · início 03/08/2026 · entrega 25/09/2026 · contrato R$ 32.000,00 · Concluída

**Orçamento importado da Obra 1** — mesmo formato da planilha modelo (etapa = número inteiro, item = número com ponto). Valor ao cliente (TOTAL ENG.) = custo de mão de obra (TOTAL MO) × 1,5. Total R$ 43.307,00.

**Serviços da Obra 1** (item · frente · serviço · unidade · como medir · prevista · duração · depende de · responsável · valor ao cliente · custo MO · executado)
1. 1.1 · Demolição · Demolição de revestimentos · m² · Quantidade · 85 · 5 · — · José · R$ 2.975,00 · R$ 1.983,33 · 85 (concluído 05/10)
2. 1.2 · Demolição · Retirada de entulho · vb · Percentual · 100 · 2 · (1) · Edson · R$ 1.800,00 · R$ 1.200,00 · 100% (concluído 07/10)
3. 2.1 · Hidráulica · Hidráulica embutida banheiros · vb · Percentual · 100 · 8 · (2) · Carlos · R$ 9.500,00 · R$ 6.333,33 · 70% (60% aprovado + 10% aguardando; em andamento desde 08/10, atrasado)
4. 3.1 · Elétrica · Infra elétrica (eletrodutos) · m · Quantidade · 120 · 6 · (2) · Paulo · R$ 3.360,00 · R$ 2.240,00 · 120 (concluído 15/10)
5. 4.1 · Alvenaria · Reboco de paredes · m² · Quantidade · 60 · 6 · (3, 4) · Marcos · R$ 2.520,00 · R$ 1.680,00 · 0 (não iniciado, esperando a hidráulica)
6. 5.1 · Pisos · Contrapiso · m² · Quantidade · 70 · 4 · (3) · Marcos · R$ 2.660,00 · R$ 1.773,33 · 0
7. 6.1 · Revestimento · Porcelanato piso · m² · Quantidade · 70 · 8 · (6) · Antônio · R$ 4.550,00 · R$ 3.033,33 · 0
8. 6.2 · Revestimento · Revestimento parede banheiros · m² · Quantidade · 45 · 7 · (5) · Antônio · R$ 3.150,00 · R$ 2.100,00 · 0
9. 7.1 · Gesso · Forro de gesso · m² · Quantidade · 65 · 6 · (4) · Rafael · R$ 3.575,00 · R$ 2.383,33 · 18 (em andamento)
10. 8.1 · Pintura · Pintura geral · m² · Quantidade · 240 · 8 · (7, 8, 9) · Luiz · R$ 5.280,00 · R$ 3.520,00 · 0
11. 9.1 · Gestão de obra · Gestão de obra — 10% sobre o total · % · tipo Percentual (10) · — · — · — · — · R$ 3.937,00 · R$ 0,00 · acompanha os outros itens

**Visão do cliente (só aprovados):** executado R$ 16.307,50 de R$ 43.307,00 = 37,7%. **Visão do sócio (com o diário aguardando):** R$ 17.352,50 = 40,1%.

**Diários da Obra 1**
- 28/10/2026 · Aprovado · Sol/Sol · 4 pessoas · Hidráulica +10% (2 pessoas) · Forro 10 m² (2 pessoas)
- 29/10/2026 · Aprovado · Nublado/Chuva · 3 pessoas · Forro 8 m² (2 pessoas) · ocorrência "chuva parou a obra às 15h"
- 30/10/2026 · Devolvido · Sol/Sol · 3 pessoas · Hidráulica +10% · comentário do sócio: "Faltou a foto do teste de estanqueidade."
- 03/11/2026 · Enviado · Sol/Nublado · 4 pessoas · Hidráulica +10% (2 pessoas) · ocorrência "faltou registro de gaveta, compra pedida"
- Obra 2, 03/11/2026 · Rascunho · 5 pessoas

**Medições da Obra 1**
- Medição 1 · 29/09 a 09/10/2026 · R$ 8.145,50 (demolição 85 m² R$ 2.975 + entulho 100% R$ 1.800 + elétrica 60 m R$ 1.680 + hidráulica 10% R$ 950 = R$ 7.405 + gestão 10% R$ 740,50) · vencimento 14/10/2026 · Paga em 14/10/2026
- Medição 2 · 12/10 a 23/10/2026 · R$ 6.028,00 (elétrica 60 m R$ 1.680 + hidráulica 40% R$ 3.800 = R$ 5.480 + gestão 10% R$ 548) · vencimento 05/11/2026 · Fechada
- Medição 3 · 26/10 a 06/11/2026 · Rascunho

**Cotações da Obra 1**
- Porcelanato piso 70 m² · Aguardando cliente · Fornecedor A R$ 6.300 (15 dias) · Fornecedor B R$ 5.880 (20 dias) · Fornecedor C R$ 6.950 (7 dias)
- Louças e metais banheiros · Escolhido (Fornecedor B) · comentário da cliente: "Fico com o B, gostei mais do acabamento."
- Placas de gesso · Em cotação · 1 proposta
- Tinta acrílica · Comprado

**Custos da Obra 1:** 3 de Mão de obra, 2 de Material, 1 de Equipamento, com pagos e não pagos.

## Critérios de aceite

- [ ] O Sócio entra e cai no Painel do dia da última obra que usou, com a lista ordenada pela menor folga.
- [ ] Com os dados de exemplo (hoje = 03/11/2026, feriado de 02/11 ignorado), a Obra 1 mostra "Entrega com 5 dias de atraso", "Previsão 04/12, contratada 27/11", e a Hidráulica embutida aparece no topo (folga −5, 3 dias de atraso).
- [ ] Lançar quantidade num diário Enviado muda o % e a previsão no Painel do dia sem recarregar a página.
- [ ] Atrasar a Hidráulica empurra Reboco, Contrapiso, Revestimentos e Pintura, e a previsão de entrega muda junto.
- [ ] Salvar um serviço que cria ciclo de dependência é recusado com a mensagem que nomeia o ciclo.
- [ ] O Auxiliar não vê preço, valor, Orçamento, Medições, Pagamentos, Cotações nem Financeiro em nenhuma tela.
- [ ] Na tela Orçamento, o Cliente vê R$ 16.307,50 executados (37,7%) e não vê nenhuma coluna de custo de mão de obra nem margem; o Sócio vê R$ 17.352,50 (40,1%) e a margem.
- [ ] Importar a planilha modelo mostra na conferência "14 etapas · 28 itens · total R$ 48.795,98 · confere com a planilha ✓".
- [ ] No diário, um item em vb mostra os botões +25% · +50% · +75% · Concluído no lugar do campo de quantidade.
- [ ] O Cliente só vê a obra dele, só diários Aprovado, só medições Fechada e Paga, e não vê Financeiro nem custos.
- [ ] O Cliente consegue comentar numa cotação Aguardando cliente e não consegue alterar mais nada.
- [ ] Trocar a obra no seletor nunca deixa aparecer dado de outra obra.
- [ ] Um diário Devolvido aparece no topo de Meus diários do Auxiliar com o comentário.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal.
- [ ] Cada lista tem estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: confirmar os CHUTES de visual (cor, tema, logo) e de uso (celular × computador)]` — custo: retrabalho de interface se mudar depois.
- `[PENDENTE: cliente vê o responsável de cada serviço?]` — hoje ficou: não vê.
- `[PENDENTE: peso do % da frente e da obra]` — hoje ficou: ponderado pela duração; se a sócia quiser pelo valor, muda o número que o cliente vê.

## Decidir depois de usar

- `[DESCOBRIR NO USO: sábados e feriados]` — por enquanto: segunda a sexta.
- `[DESCOBRIR NO USO: meta do dia automática serve?]` — por enquanto: automática, com meta manual opcional.
- `[DESCOBRIR NO USO: parcelar medição]` — por enquanto: um vencimento por medição.
