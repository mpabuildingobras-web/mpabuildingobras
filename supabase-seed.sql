-- Carga inicial (seed) das duas obras de exemplo. GERADO por scripts/gerar-seed.mjs a partir
-- de src/lib/mockData.js: não edite à mão, mude o mock e gere de novo.
-- Pode rodar quantas vezes quiser: ATENÇÃO, ele apaga e recria os diários dessas duas obras
-- (e só delas). Dados de exemplo, todos fictícios.
begin;

delete from public.diarios where obra_id in ('a3020000-0000-4000-8000-000000000001', 'cf000000-0000-4000-8000-000000000002');

insert into public.obras (id, codigo, nome, cliente_nome, endereco, data_inicio, data_entrega, situacao, descricao, informacoes, foto, documentos)
values ('a3020000-0000-4000-8000-000000000001', 'AP302', 'Reforma Apto 302 — Ed. Aurora', 'Cláudia Cliente', 'Rua Aurora, 1200, apto 302', '2026-09-29', '2026-11-27', 'Em andamento', 'Reforma completa de apartamento de 85 m²: banheiros, piso da área social, forro de gesso e pintura geral.', 'Obra permitida de segunda a sexta, das 8h às 17h. Elevador de serviço reservado com a portaria. Síndico: Sr. Exemplo.', null, '[{"id":"doc1","nome":"Planta de reforma.pdf"},{"id":"doc2","nome":"ART de execução.pdf"}]'::jsonb)
on conflict (id) do update set codigo = excluded.codigo, nome = excluded.nome, cliente_nome = excluded.cliente_nome, endereco = excluded.endereco,
  data_inicio = excluded.data_inicio, data_entrega = excluded.data_entrega, situacao = excluded.situacao, descricao = excluded.descricao,
  informacoes = excluded.informacoes, foto = excluded.foto, documentos = excluded.documentos;
insert into public.obras_clientes (obra_id, telefone, email, documento)
values ('a3020000-0000-4000-8000-000000000001', '(11) 90000-0001', 'claudia@exemplo.com', '000.000.000-01')
on conflict (obra_id) do update set telefone = excluded.telefone, email = excluded.email, documento = excluded.documento;

insert into public.obras (id, codigo, nome, cliente_nome, endereco, data_inicio, data_entrega, situacao, descricao, informacoes, foto, documentos)
values ('cf000000-0000-4000-8000-000000000002', 'CJF', 'Reforma Casa Jardim das Flores', 'Roberto Exemplo', 'Rua das Hortênsias, 210 — Jardim das Flores', '2026-10-19', '2027-02-26', 'Em andamento', 'Reforma de casa térrea: nova cozinha e lavanderia, revisão elétrica e do telhado.', 'Moradores continuam na casa durante a obra. Chave com o caseiro.', null, '[]'::jsonb)
on conflict (id) do update set codigo = excluded.codigo, nome = excluded.nome, cliente_nome = excluded.cliente_nome, endereco = excluded.endereco,
  data_inicio = excluded.data_inicio, data_entrega = excluded.data_entrega, situacao = excluded.situacao, descricao = excluded.descricao,
  informacoes = excluded.informacoes, foto = excluded.foto, documentos = excluded.documentos;
insert into public.obras_clientes (obra_id, telefone, email, documento)
values ('cf000000-0000-4000-8000-000000000002', '(11) 90000-0002', 'roberto@exemplo.com', '00.000.000/0001-02')
on conflict (obra_id) do update set telefone = excluded.telefone, email = excluded.email, documento = excluded.documento;

insert into public.diarios (id, obra_id, data, clima_manha, clima_tarde, qtd_pessoas, ocorrencias, status, comentario_devolucao, enviado_por, enviado_em) values
('dd000000-0000-4000-8000-000000643031', 'a3020000-0000-4000-8000-000000000001', '2026-09-30', 'Sol', 'Sol', 3, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643032', 'a3020000-0000-4000-8000-000000000001', '2026-10-05', 'Sol', 'Sol', 3, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643033', 'a3020000-0000-4000-8000-000000000001', '2026-10-06', 'Sol', 'Sol', 2, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643034', 'a3020000-0000-4000-8000-000000000001', '2026-10-07', 'Sol', 'Sol', 2, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643035', 'a3020000-0000-4000-8000-000000000001', '2026-10-08', 'Sol', 'Sol', 4, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643036', 'a3020000-0000-4000-8000-000000000001', '2026-10-09', 'Sol', 'Sol', 4, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643037', 'a3020000-0000-4000-8000-000000000001', '2026-10-15', 'Nublado', 'Sol', 3, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643133', 'a3020000-0000-4000-8000-000000000001', '2026-10-16', 'Sol', 'Sol', 3, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643134', 'a3020000-0000-4000-8000-000000000001', '2026-10-20', 'Chuva forte', 'Chuva', 2, 'Chuva forte de manhã: entrou água pela janela da sala, sem estragar nada. Vedada com lona até a troca da borracha.', 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643135', 'a3020000-0000-4000-8000-000000000001', '2026-10-21', 'Nublado', 'Sol', 4, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643038', 'a3020000-0000-4000-8000-000000000001', '2026-10-22', 'Sol', 'Sol', 2, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643136', 'a3020000-0000-4000-8000-000000000001', '2026-10-23', 'Sol', 'Sol', 5, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643137', 'a3020000-0000-4000-8000-000000000001', '2026-10-27', 'Nublado', 'Chuva', 3, 'Placas de gesso chegaram às 14h, não às 8h combinadas. O gesseiro adiantou os perfis enquanto esperava.', 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643039', 'a3020000-0000-4000-8000-000000000001', '2026-10-28', 'Sol', 'Sol', 4, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643130', 'a3020000-0000-4000-8000-000000000001', '2026-10-29', 'Nublado', 'Chuva', 3, 'Chuva parou a obra às 15h.', 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000643131', 'a3020000-0000-4000-8000-000000000001', '2026-10-30', 'Sol', 'Sol', 3, null, 'Devolvido', 'Faltou a foto do teste de estanqueidade.', null, null),
('dd000000-0000-4000-8000-000000643132', 'a3020000-0000-4000-8000-000000000001', '2026-11-03', 'Sol', 'Nublado', 4, 'Faltou registro de gaveta do banheiro da suíte. Compra pedida, chega amanhã às 8h.', 'Enviado', null, 'Rita Auxiliar', '2026-11-03 17:12:00-03'),
('dd000000-0000-4000-8000-000000653031', 'cf000000-0000-4000-8000-000000000002', '2026-10-19', 'Sol', 'Sol', 2, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000653032', 'cf000000-0000-4000-8000-000000000002', '2026-10-20', 'Sol', 'Sol', 2, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000653033', 'cf000000-0000-4000-8000-000000000002', '2026-10-26', 'Nublado', 'Nublado', 3, null, 'Aprovado', null, null, null),
('dd000000-0000-4000-8000-000000653034', 'cf000000-0000-4000-8000-000000000002', '2026-11-03', 'Sol', 'Sol', 5, null, 'Rascunho', null, null, null);

insert into public.diarios_equipe (obra_id, diario_id, contratado_id, atividade, ordem) values
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643133', 'f3', 'Eletrodutos do corredor e dos quartos', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643133', 'f2', 'Marcação dos pontos de água da suíte', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643133', 'f1', 'Limpeza e descida de entulho', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643134', 'f2', 'Abertura da parede do banheiro da suíte para a prumada', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643134', 'f8', 'Proteção do piso com lona e apoio ao encanador', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643135', 'f2', 'Tubulação de esgoto do banheiro da suíte', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643135', 'f3', 'Caixinhas de tomada da cozinha', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643135', 'f8', 'Apoio ao encanador', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643135', 'f1', 'Limpeza e organização do material', 3),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643136', 'f2', 'Ramal de água quente da suíte', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643136', 'f3', 'Fiação dos circuitos dos quartos', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643136', 'f6', 'Marcação do nível do forro', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643136', 'f8', 'Apoio à hidráulica', 3),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643136', 'f1', 'Descida de entulho', 4),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643137', 'f6', 'Tabicas e perfis do forro da sala', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643137', 'f2', 'Conferência das prumadas', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643137', 'f8', 'Recebimento e subida das placas de gesso', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 'f2', 'Prumadas do banheiro social', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 'f8', 'Apoio à hidráulica', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 'f6', 'Estrutura do forro da sala', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 'f1', 'Apoio ao gesso e limpeza', 3),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643130', 'f6', 'Placas do forro da sala', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643130', 'f1', 'Apoio ao gesso', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643130', 'f2', 'Conferência de pontos', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643131', 'f2', 'Teste de estanqueidade', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643131', 'f8', 'Apoio à hidráulica', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643131', 'f1', 'Limpeza', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 'f2', 'Ligou o ramal de água fria do banheiro social', 0),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 'f8', 'Apoio ao encanador', 1),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 'f4', 'Preparou a argamassa do reboco', 2),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 'f1', 'Limpeza e descida de entulho', 3),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653034', 'f3', 'Levantamento do quadro antigo', 0),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653034', 'f8', 'Retirada de entulho da cozinha', 1),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653034', 'f6', 'Vistoria do telhado', 2),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653034', 'f4', null, 3),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653034', 'f7', null, 4);

insert into public.diarios_execucoes (obra_id, diario_id, servico_id, quantidade, qtd_pessoas, descricao) values
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643031', 's1', 40, 3, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643032', 's1', 45, 3, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643033', 's2', 50, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643034', 's2', 50, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643035', 's4', 30, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643035', 's3', 10, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643036', 's4', 30, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643037', 's4', 60, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643037', 's3', 20, 1, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643038', 's3', 20, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 's3', 10, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 's9', 10, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643130', 's9', 8, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643131', 's3', 10, 2, null),
('a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 's3', 10, 2, 'Ramal de água fria do banheiro social ligado'),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653031', 'c1', 50, 2, null),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653032', 'c1', 50, 2, null),
('cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653033', 'c2', 12, 3, null);

insert into public.fotos (id, obra_id, diario_id, servico_id, url, legenda) values
('ff000000-0000-4000-8000-000000007031', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 's3', null, 'Ramal banheiro social'),
('ff000000-0000-4000-8000-000000007032', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643132', 's3', null, 'Registro faltando'),
('ff000000-0000-4000-8000-000000007033', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643130', 's9', null, 'Estrutura do forro, sala'),
('ff000000-0000-4000-8000-000000007034', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643039', 's9', null, 'Início do forro'),
('ff000000-0000-4000-8000-000000007035', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643037', 's4', null, 'Eletrodutos concluídos'),
('ff000000-0000-4000-8000-000000007036', 'a3020000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000643032', 's1', null, 'Banheiros demolidos'),
('ff000000-0000-4000-8000-000000007037', 'cf000000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000653033', 'c2', null, 'Demolição da cozinha');

commit;
