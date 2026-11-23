# Quem pode o quê: Gestão de Obra

Última atualização: 23/11/2026 · Decidido por: Manuela

Conferido linha por linha na página `docs/permissoes/quem-pode-o-que.html`. A cópia que o código lê é `docs/permissoes/quadro.json`. **Em permissões, este arquivo manda sobre o PLANO e os PRDs.**

## 1. Os perfis

| Perfil (valor gravado) | Quem é | Quantas pessoas hoje | Usa mais no | Vê quais obras |
|---|---|---|---|---|
| socio | a sócia engenheira e o sócio: tocam as obras e cuidam das contas | 2 | computador e celular | **todas**, porque comparam obras (Faturamento, Gestão, conflito de prestador) e só eles preparam obra nova |
| auxiliar | lança o diário no canteiro | 1 | celular | as obras liberadas para ele, menos as Em preparação |
| cliente | dono da reforma: acompanha a obra dele | 1 por obra | celular | só a dele, e só depois que ela sai da preparação |

Os perfis do curso (admin_master, gerente, usuario) foram trocados de propósito: `socio` faz o papel de admin_master (são dois, e os dois cuidam das contas), `auxiliar` é o usuario e `cliente` é o perfil a mais que o plano pede. Não existe gerente: hoje ninguém fica entre o sócio e o auxiliar. Decidido em 15/11/2026.

Situações, que valem para qualquer perfil: **pendente** (conta nova, não vê nada até um sócio liberar), **ativo** e **bloqueado** (perdeu o acesso; o que lançou continua no app, com o nome dele). Substituem o "pendente como perfil" e o campo ativo/inativo do PRD-BACKEND.

Regras que valem para todo o app:
- Ninguém escolhe o próprio perfil. **Só os sócios criam login, de todos** (decidido em 15/11/2026): o cadastro público fica fechado, inclusive o "Primeiro acesso?" do Portal do cliente.
- Saiu da equipe é bloqueado, não excluído: perde o acesso na hora, e o que fez continua com o nome dele.
- Ninguém muda o próprio perfil, a própria situação nem as próprias obras, e o app nunca fica sem um sócio ativo.

## 2. As duas perguntas de cada célula

1. **O perfil:** o que a pessoa pode fazer.
2. **As obras:** em quais. Auxiliar e cliente só nas obras liberadas para eles (tabela `membros`). Sócio em todas, pelo motivo da seção 1.

**Terceira dimensão, as telas:** cada pessoa começa com todas as telas do seu perfil. O sócio pode esconder telas de alguém (`telas_bloqueadas`), nunca liberar uma que o perfil não tem. Esconder tela não protege dado: a proteção é a regra do banco.

## 3. Os valores de uma célula

| Na célula | Quer dizer | O que exige do banco |
|---|---|---|
| pode | pode, em toda linha das obras dele | nada além da obra |
| só os dele | só no que ele mesmo criou | a tabela guarda quem criou (`created_by`), e ninguém troca o dono depois |
| só da equipe dele | não usado neste app | — |
| só ver | lê, não mexe | nada |
| · | não pode, e não vê o botão | nada |
| ninguém | nem o sócio: o banco escreve sozinho | um gatilho ou uma função do banco |

## 4. O quadro

| Assunto | Ação | socio | auxiliar | cliente |
|---|---|---|---|---|
| Obra | Ver · Só as obras liberadas; obra Em preparação, só sócio | pode | pode | pode |
| Obra | Criar · Nasce Em preparação | pode | · | · |
| Obra | Editar os dados da obra | pode | · | · |
| Obra | Apagar · Só obra sem nada lançado | pode | · | · |
| Obra | Mudar a situação · Em andamento só com cronograma | pode | · | · |
| Obra | Obra Concluída · Fica só para leitura | pode | só ver | só ver |
| Dados do contratante (CPF, telefone, e-mail) | Ver · Cliente vê só os dados dele próprio | pode | · | só os dele |
| Dados do contratante | Criar e editar | pode | · | · |
| Dados do contratante | Apagar | pode | · | · |
| Documentos da obra | Ver | pode | · | · |
| Documentos da obra | Criar, editar e apagar | pode | · | · |
| Usuários | Ver a lista | pode | · | · |
| Usuários | Criar login, liberar, mudar perfil, obras e telas, bloquear · Ninguém mexe em si mesmo | pode | · | · |
| Usuários | Apagar · Não se apaga: bloqueia | · | · | · |
| Usuários | Meu perfil: ver e mudar o nome · O sócio muda o de qualquer pessoa | pode | só os dele | só os dele |
| Contratados | Ver nome e função · O cliente não abre a tela: vê só nome e atividade de quem trabalhou na obra dele, no diário aprovado | pode | só ver | · |
| Contratados | Criar e editar | pode | · | · |
| Contratados | Apagar · Só sem lançamento; com lançamento, desativa | pode | · | · |
| Cronograma (frentes, serviços e dependências) | Ver serviços, quantidades e avanço · Sem nenhum valor | pode | pode | pode |
| Cronograma | Criar e editar | pode | · | · |
| Cronograma | Apagar · Só sem lançamento e sem dependente | pode | · | · |
| Cronograma | Importar a planilha | pode | · | · |
| Cronograma | Marcar concluído antes do previsto | pode | · | · |
| Planejamento (EAP e subatividades) | Ver | pode | · | · |
| Planejamento | Criar e editar | pode | · | · |
| Planejamento | Apagar · Arquiva | pode | · | · |
| Restrições (Planejamento · médio prazo) | Ver · O quadro das próximas semanas | pode | · | · |
| Restrições | Criar e editar · Editar só enquanto não resolvida | pode | · | · |
| Restrições | Marcar resolvida ou reabrir | pode | · | · |
| Restrições | Mudar de semana | pode | · | · |
| Restrições | Apagar · Apaga de vez; nada depende da restrição | pode | · | · |
| Semana (Planejamento · curto prazo, kanban e PPC) | Ver o kanban e o PPC | pode | · | · |
| Semana | Mover atividade e marcar subatividade feita | pode | · | · |
| Semana | Marcar "não realizado" · Pede a causa | pode | · | · |
| Semana | Mexer numa semana que já terminou · Muda o PPC dela e fica no histórico | pode | · | · |
| Diário | Ver · Cliente só os aprovados pelo sócio, da obra dele | pode | pode | pode |
| Diário | Criar · Só em obra Em andamento | pode | pode | · |
| Diário | Editar · Só Rascunho ou Devolvido | pode | pode | · |
| Diário | Apagar · Só antes de aprovado; as fotos saem junto | pode | · | · |
| Diário | Enviar para aprovação | pode | pode | · |
| Diário | Aprovar ou devolver · Devolver pede o motivo | pode | · | · |
| Diário | Reabrir diário aprovado · Pede o porquê e fica no histórico | pode | · | · |
| Fotos do diário | Ver · Cliente só de diário aprovado | pode | pode | pode |
| Fotos do diário | Enviar · Só antes de aprovado | pode | pode | · |
| Fotos do diário | Apagar · Auxiliar só antes de enviar | pode | só os dele | · |
| Painel do dia | Ver · Junta o cronograma e os diários da obra | pode | · | · |
| Orçamento (valor ao cliente por etapa e item) | Ver os valores · O cliente não vê o orçamento | pode | · | · |
| Orçamento | Editar valor e importar | pode | · | · |
| Orçamento | Publicar para o cliente · Hoje sem efeito: o cliente não vê o orçamento | pode | · | · |
| Custo de mão de obra e margem | Ver | pode | · | · |
| Custo de mão de obra e margem | Criar, editar e apagar | pode | · | · |
| Medições | Ver a tela · O cliente recebe o PDF, não abre a tela | pode | · | · |
| Medições | Gerar e editar · Só Rascunho | pode | · | · |
| Medições | Apagar · Só Rascunho | pode | · | · |
| Medições | Fechar · Trava o que foi medido | pode | · | · |
| Medições | Marcar como paga | pode | · | · |
| Medições | Exportar em PDF | pode | · | · |
| Medições | Disponibilizar o PDF ao cliente | pode | · | · |
| Medições | Ver o PDF disponibilizado | pode | · | só ver |
| Pagamentos (evolução financeira da obra) | Ver quanto já pagou, quanto falta e o próximo pagamento com data | pode | · | só ver |
| Pagamentos | Agendar a data de um pagamento | pode | · | · |
| Compras (cotações) | Ver · Cliente só depois de enviada a ele, com os preços dos fornecedores | pode | · | só ver |
| Compras | Criar, editar e apagar · Apagar só Em cotação | pode | · | · |
| Compras | Enviar ao cliente e marcar comprado | pode | · | · |
| Compras | Comentar a escolha · Cliente só em Aguardando cliente ou Escolhido | pode | · | pode |
| Compras | Editar ou apagar comentário · Fica no histórico | pode | ninguém | ninguém |
| Custos e Financeiro da obra | Ver | pode | · | · |
| Custos e Financeiro da obra | Criar, editar e apagar custos | pode | · | · |
| Faturamento, Gestão de Obras e quadro de Serviços | Ver (juntam várias obras) | pode | · | · |
| Tarefas | Ver | pode | · | · |
| Tarefas | Criar, editar, concluir e apagar | pode | · | · |
| Histórico de mudanças (novo) | Ver | pode | · | · |
| Histórico de mudanças | Criar, editar e apagar · O banco escreve sozinho | ninguém | ninguém | ninguém |

## 5. O menu de cada perfil

- **socio:** Início (Painel do dia) · Diário · Cronograma · Tarefas · Planejamento · Gestão de Obras · Serviços · Contratados · Compras · Medições · Orçamento · Financeiro · Faturamento · Fotos · Obras · Usuários · Meu perfil.
- **auxiliar:** Hoje · Meus diários · Meu perfil.
- **cliente:** Avanço · Pagamentos · Diário · Fotos · Compras · Meu perfil. **Sai o Orçamento** (decidido em 15/11/2026). O PDF da medição ele abre por Pagamentos.

## 6. As perguntas que pegam (respondidas em 15/11/2026 e 23/11/2026)

Planejamento (respostas da Manuela em 23/11/2026)
- [x] **O auxiliar não participa da semana:** só o sócio mexe no kanban, nas restrições e no PPC.
- [x] **O cliente não vê o PPC nem as restrições:** só o sócio vê. O avanço ele continua vendo na tela Avanço.
- [x] **Semana que já terminou não trava:** o sócio ainda mexe, e a mudança fica no histórico com nome e hora, porque muda o PPC daquela semana.
- [x] **Restrição se apaga de vez, pelo sócio:** nada depende dela. (Antes da revisão, a proposta era "não se apaga: marca resolvida".)

Dinheiro e dado de terceiro (respostas da Manuela)
- [x] **Quem vê valor:** os sócios veem tudo. O auxiliar só vê a quantidade da etapa, para lançar o avanço no diário, e nunca vê preço. O cliente só vê a evolução financeira da obra: quanto já pagou, quanto falta pagar e o próximo pagamento com data. Ele não vê orçamento, medição, custo nem margem.
- [x] **O cliente sem a tela Orçamento:** confirmado. Muda a decisão de 03/11; o avanço físico (%) ele continua vendo na tela Avanço.
- [x] **Preços em Compras:** o cliente vê os preços de cada fornecedor para escolher, porque é ele quem escolhe e paga o material.
- [x] **Medição:** só o sócio exporta em PDF e disponibiliza o PDF para o cliente.
- [x] **Dado pessoal:** o cliente vê só os dados de contratante dele próprio. O auxiliar nunca vê CPF, telefone nem e-mail.
- [x] **Rascunho:** o diário só aparece para o cliente quando um sócio aprova. O auxiliar lança e envia para a aprovação dos sócios.

Apagar
- [x] Apaga de vez só o que não tem nada ligado; o banco recusa e a tela diz o que está ligado. Nada é apagado em cascata.
- [x] Obra, contratado e serviço com lançamento não se apagam; contratado se desativa.
- [x] As fotos saem junto com o diário, e só é possível apagar o diário antes de aprovado.

Assinar e travar
- [x] Quem "assina" é a aprovação do diário: o aprovado trava a equipe, os lançamentos e as fotos dele. Lançamento que entrou em medição fechada nunca se altera.
- [x] Só o sócio reabre, escrevendo o porquê; fica no histórico com nome e hora.
- [x] Serviço fora do planejado entra pelo Cronograma (Aditivo), sem mexer em diário já aprovado.

Quem dá poder a quem
- [x] Só os sócios criam login (de todos), mudam perfil e bloqueiam.
- [x] "Só os dele": fotos e comentários guardam quem criou. O diário é da obra, não de uma pessoa.

Obra
- [x] Os sócios veem todas as obras: comparam obras e preparam obra nova.
- [x] A obra Concluída: quem já via continua vendo, só para ler.
- [x] O sócio abre obra nova sozinho, pelo app.

Histórico
- [x] Criar o histórico, começando pelo diário (reabrir e editar depois de aprovado). Ninguém apaga o histórico. **Risco aceito pela Manuela em 15/11/2026:** o sócio pode editar ou apagar o comentário de escolha do cliente em Compras; por isso essa mudança precisa ficar no histórico.

Telas
- [x] Botão que a pessoa não pode usar não aparece. Botão que aparece e dá erro é defeito.
- [x] O menu bate com o "Ver" (seção 5).

## 7. Como o quadro vira app

1. `docs/permissoes/quadro.json`: uma entrada por ação (`assunto.acao`), com o valor de cada perfil.
2. Um lugar só no código: `src/lib/permissoes.js`. Toda tela pergunta `pode('diario.reabrir', usuario, dono)`; nenhuma tela decide sozinha por perfil.
3. Um teste confere o código contra o JSON, dentro do `npm run check`.
4. A barreira é o banco (RLS): uma regra por ação, com a lista dos perfis que podem, e nenhuma `using (true)`.
5. Um teste de permissões no banco: cada perfil tenta cada ação na obra dele e numa obra de outra pessoa.
6. Antes de abrir para gente de verdade, o teste do estranho: alguém usa o app como cada perfil e tenta o que não devia.

## 8. Mudar depois

Mudar uma permissão é mudar, de uma vez: este quadro, o JSON, o `src/lib/permissoes.js`, a regra do banco e o teste de permissões. E uma linha aqui embaixo com a data, quem decidiu e por quê.

- 15/11/2026 · Manuela · Quadro criado. Mudanças em relação ao plano de 03/11: o cliente deixa de ver Orçamento e Medições (vê só Pagamentos e o PDF da medição); o cadastro público fecha (só os sócios criam login); as situações viram pendente, ativo e bloqueado; o sócio pode editar ou apagar comentário em Compras.

- 15/11/2026 · Manuela · As 6 linhas pendentes foram confirmadas: o auxiliar e o cliente veem as obras liberadas (Em preparação, só sócio); só os sócios criam obra; o cliente não abre Contratados nem cadastra contratados (vê nome e atividade no diário aprovado); o cliente vê os diários aprovados da obra dele e os pagamentos dela, só para ler. Onde ela tinha marcado "só os dele" para o cliente, queria dizer "da obra dele", e isso já é a regra da obra.

- 23/11/2026 · Manuela · O banco passou a seguir o quadro (RLS de obras, contratante, diário, equipe, lançamentos e fotos; nada para quem não fez login). Confirmado: diário enviado não se edita (o sócio aprova ou devolve) e o aprovado trava até para o sócio, que reabre; o botão "Corrigir" do aprovado saiu. Fotos passam a guardar quem enviou (as 7 antigas ficam sem dono, e o auxiliar não as apaga).

- 23/11/2026 · Manuela · Revisão depois do módulo Planejamento: entram as Restrições (5 ações), a Semana com kanban e PPC (4 ações) e o Painel do dia (1 ação), todas só do sócio. O sócio pode apagar restrição de vez e mexer em semana que já terminou, com registro no histórico. Nenhuma das 63 linhas de 15/11 mudou.

## Em aberto

Nenhuma linha do quadro está pendente.

**Para alinhar depois:** o PLANO-DO-PROJETO.md, o PRD-FRONTEND.md e o PRD-BACKEND.md ainda dizem que o cliente vê o Orçamento e as Medições e que ele se cadastra sozinho. Em permissões, vale este arquivo.

**[DESCOBRIR NO USO]:** se o sócio também precisa de uma tela para o cliente baixar o PDF fora de Pagamentos.
