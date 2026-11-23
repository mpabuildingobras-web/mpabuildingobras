-- Teste de permissões do DIÁRIO no banco (passo 5, partes 2 e 4). Roda no SQL Editor do Supabase.
-- NADA FICA NO BANCO: termina SEMPRE com um erro de propósito, que desfaz tudo o que o teste criou.
-- Lendo a mensagem vermelha do fim:
--   "RESULTADO 0 falha(s), 27 acerto(s)" → passou;
--   qualquer "FALHOU: ..."              → a regra do banco não bate com o quadro.
-- Pessoas e obra de teste: e-mails @teste.invalid e a obra ZZTESTE (Parada). Nenhum dado real muda.
do $t$
declare
  socia uuid := gen_random_uuid(); aux uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  obra1 uuid; obra2 uuid; parada uuid; dia uuid; dia2 uuid; dia3 uuid; diap uuid;
  n int; txt text; falhas text[] := '{}'; passou int := 0;
begin
  select id into obra1 from public.obras order by codigo limit 1;
  select id into obra2 from public.obras order by codigo offset 1 limit 1;
  insert into public.obras (codigo, nome, cliente_nome, data_inicio, data_entrega, situacao)
    values ('ZZTESTE', 'Obra de teste', 'Teste', '2099-01-01', '2099-12-31', 'Parada') returning id into parada;
  insert into public.diarios (obra_id, data) values (parada, '2099-01-09') returning id into diap;
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (socia,'socia@teste.invalid','{}','authenticated','authenticated'),
    (aux,'aux@teste.invalid','{}','authenticated','authenticated'),
    (cli,'cli@teste.invalid','{}','authenticated','authenticated');
  update public.profiles set perfil='socio', situacao='ativo' where id=socia;
  update public.profiles set perfil='auxiliar', situacao='ativo' where id=aux;
  update public.profiles set perfil='cliente', situacao='ativo' where id=cli;
  insert into public.membros (obra_id, profile_id) values (obra1, aux), (obra1, cli);

  -- AUXILIAR
  perform set_config('request.jwt.claims', json_build_object('sub', aux, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select (public.salvar_diario(obra1, null, null, '2099-01-05', 'Sol', 'Sol', 'teste', 1,
          '[{"contratado_id":"f1","atividade":"x"}]'::jsonb,
          '[{"servico_id":"s1","quantidade":"1","qtd_pessoas":"1"}]'::jsonb)).id into dia;
  if dia is not null then passou:=passou+1; else falhas:=falhas||'auxiliar lança diário na obra dele'; end if;
  begin
    perform public.salvar_diario(obra2, null, null, '2099-01-05', 'Sol', 'Sol', 'x', 1, '[]'::jsonb, '[]'::jsonb);
    falhas:=falhas||'auxiliar NÃO lança em obra que não é dele';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  select count(*) into n from public.diarios where obra_id=obra2; if n=0 then passou:=passou+1; else falhas:=falhas||'auxiliar NÃO vê diário de outra obra'; end if;
  begin
    update public.diarios set status='Aprovado' where id=dia;
    falhas:=falhas||'auxiliar NÃO aprova';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  update public.diarios set aprovado_em=now() where id=dia;
  select count(*) into n from public.diarios where id=dia and aprovado_em is null;
  if n=1 then passou:=passou+1; else falhas:=falhas||'auxiliar NÃO grava data de aprovação'; end if;
  update public.diarios set status='Enviado', enviado_por='Outra Pessoa' where id=dia; get diagnostics n=row_count;
  if n=1 then passou:=passou+1; else falhas:=falhas||'auxiliar envia'; end if;
  select enviado_por into txt from public.diarios where id=dia;
  if txt='aux' then passou:=passou+1; else falhas:=falhas||('quem enviou é o banco que escreve (veio: '||coalesce(txt,'vazio')||')'); end if;
  update public.diarios set ocorrencias='mexeu' where id=dia; get diagnostics n=row_count;
  if n=0 then passou:=passou+1; else falhas:=falhas||'auxiliar NÃO edita depois de enviar'; end if;
  begin
    insert into public.diarios_equipe (obra_id, diario_id, contratado_id) values (obra1, dia, 'f9');
    falhas:=falhas||'equipe NÃO muda com o diário enviado';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  delete from public.diarios where id=dia; get diagnostics n=row_count;
  if n=0 then passou:=passou+1; else falhas:=falhas||'auxiliar NÃO apaga diário'; end if;
  select (public.salvar_diario(obra1, null, null, '2099-01-08', 'Sol', 'Sol', 'outro', 1, '[]'::jsonb, '[]'::jsonb)).id into dia2;
  update public.diarios set status='Enviado' where id=dia2;
  perform set_config('role','postgres', true);

  -- CLIENTE
  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select count(*) into n from public.diarios where id=dia; if n=0 then passou:=passou+1; else falhas:=falhas||'cliente NÃO vê diário não aprovado'; end if;
  select count(*) into n from public.diarios_execucoes where diario_id=dia; if n=0 then passou:=passou+1; else falhas:=falhas||'cliente NÃO vê lançamento de diário não aprovado'; end if;
  select count(*) into n from public.diarios where status<>'Aprovado'; if n=0 then passou:=passou+1; else falhas:=falhas||'cliente vê só aprovados'; end if;
  begin
    perform public.salvar_diario(obra1, null, null, '2099-01-06', 'Sol', 'Sol', 'x', 1, '[]'::jsonb, '[]'::jsonb);
    falhas:=falhas||'cliente NÃO lança diário';
  exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  -- SÓCIA
  perform set_config('request.jwt.claims', json_build_object('sub', socia, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  begin
    update public.diarios set ocorrencias='mexeu' where id=dia2;
    falhas:=falhas||'enviado: nem a sócia muda o conteúdo';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  update public.diarios set status='Aprovado' where id=dia; get diagnostics n=row_count;
  if n=1 then passou:=passou+1; else falhas:=falhas||'sócia aprova'; end if;
  begin
    insert into public.diarios_execucoes (obra_id, diario_id, servico_id, quantidade, qtd_pessoas) values (obra1, dia, 's2', 1, 1);
    falhas:=falhas||'aprovado trava os lançamentos, até para a sócia';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    update public.diarios set ocorrencias='mexeu' where id=dia;
    falhas:=falhas||'aprovado: nem a sócia muda o cabeçalho';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    update public.diarios set status='Rascunho' where id=dia;
    falhas:=falhas||'aprovado NÃO volta a rascunho sem reabrir';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    perform public.salvar_diario(obra1, dia, 'Aprovado', '2099-01-05', 'Chuva', 'Chuva', 'por cima', 1, '[]'::jsonb, '[]'::jsonb);
    falhas:=falhas||'aprovado: nem a função de salvar passa por cima';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  delete from public.diarios where id=dia; get diagnostics n=row_count;
  if n=0 then passou:=passou+1; else falhas:=falhas||'sócia NÃO apaga aprovado'; end if;
  begin
    perform public.salvar_diario(parada, null, null, '2099-01-07', 'Sol', 'Sol', 'x', 1, '[]'::jsonb, '[]'::jsonb);
    falhas:=falhas||'NÃO lança diário em obra Parada';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    update public.diarios set ocorrencias='mexeu' where id=diap;
    falhas:=falhas||'obra Parada: o rascunho fica só para leitura';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    insert into public.diarios_equipe (obra_id, diario_id, contratado_id) values (parada, diap, 'f1');
    falhas:=falhas||'obra Parada: a equipe do rascunho também trava';
  exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select count(*) into n from public.diarios where id=dia; if n=1 then passou:=passou+1; else falhas:=falhas||'cliente vê depois de aprovado'; end if;
  select count(*) into n from public.diarios_execucoes where diario_id=dia; if n=1 then passou:=passou+1; else falhas:=falhas||'cliente vê os lançamentos do aprovado'; end if;
  perform set_config('role','postgres', true);

  -- SEM LOGIN
  perform set_config('request.jwt.claims','', true);
  perform set_config('role','anon', true);
  begin select count(*) into n from public.diarios; falhas:=falhas||'sem login NÃO lê diários'; exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  raise exception 'RESULTADO % falha(s), % acerto(s)%', coalesce(array_length(falhas,1),0), passou,
    case when array_length(falhas,1)>0 then E'\nFALHOU: '||array_to_string(falhas,E'\nFALHOU: ') else '' end;
end $t$;
