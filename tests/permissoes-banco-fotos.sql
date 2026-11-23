-- Teste de permissões das FOTOS no banco (passo 5, parte 3). Roda no SQL Editor do Supabase.
-- NADA FICA NO BANCO: termina SEMPRE com um erro de propósito, que desfaz tudo o que o teste criou.
--   "RESULTADO 0 falha(s), 12 acerto(s)" → passou; qualquer "FALHOU: ..." → regra errada.
do $t$
declare
  socia uuid := gen_random_uuid(); aux uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  obra1 uuid; dia uuid; foto_aux uuid; foto2 uuid; n int; falhas text[] := '{}'; passou int := 0;
begin
  select id into obra1 from public.obras order by codigo limit 1;
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (socia,'socia@teste.invalid','{}','authenticated','authenticated'),
    (aux,'aux@teste.invalid','{}','authenticated','authenticated'),
    (cli,'cli@teste.invalid','{}','authenticated','authenticated');
  update public.profiles set perfil='socio', situacao='ativo' where id=socia;
  update public.profiles set perfil='auxiliar', situacao='ativo' where id=aux;
  update public.profiles set perfil='cliente', situacao='ativo' where id=cli;
  insert into public.membros (obra_id, profile_id) values (obra1, aux), (obra1, cli);

  -- AUXILIAR: diário em rascunho, envia e apaga as dele
  perform set_config('request.jwt.claims', json_build_object('sub', aux, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select (public.salvar_diario(obra1, null, null, '2099-01-05', 'Sol', 'Sol', 'teste', 1, '[]'::jsonb, '[]'::jsonb)).id into dia;
  insert into public.fotos (obra_id, diario_id, url, legenda) values (obra1, dia, 'teste', 'a') returning id into foto_aux;
  if foto_aux is not null then passou:=passou+1; else falhas:=falhas||'auxiliar envia foto'; end if;
  select count(*) into n from public.fotos where id=foto_aux and created_by=aux;
  if n=1 then passou:=passou+1; else falhas:=falhas||'o banco guarda quem enviou'; end if;
  begin
    insert into public.fotos (obra_id, diario_id, url, created_by) values (obra1, dia, 'teste', socia);
    falhas:=falhas||'auxiliar NÃO envia foto em nome de outra pessoa';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  begin
    update public.fotos set created_by = socia where id=foto_aux;
    falhas:=falhas||'ninguém troca o dono da foto';
  exception when others then passou:=passou+1; end;
  perform set_config('role','authenticated', true);
  insert into public.fotos (obra_id, diario_id, url) values (obra1, dia, 'teste2') returning id into foto2;
  delete from public.fotos where id=foto2; get diagnostics n=row_count;
  if n=1 then passou:=passou+1; else falhas:=falhas||'auxiliar apaga a dele antes de enviar'; end if;
  update public.diarios set status='Enviado' where id=dia;
  delete from public.fotos where id=foto_aux; get diagnostics n=row_count;
  if n=0 then passou:=passou+1; else falhas:=falhas||'auxiliar NÃO apaga depois de enviar'; end if;
  begin
    insert into public.fotos (obra_id, diario_id, url) values (obra1, dia, 'teste3');
    falhas:=falhas||'auxiliar NÃO envia foto depois de enviar o diário';
  exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  -- CLIENTE não vê foto de diário não aprovado
  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select count(*) into n from public.fotos where id=foto_aux; if n=0 then passou:=passou+1; else falhas:=falhas||'cliente NÃO vê foto de diário não aprovado'; end if;
  perform set_config('role','postgres', true);

  -- SÓCIA aprova; a foto trava
  perform set_config('request.jwt.claims', json_build_object('sub', socia, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  update public.diarios set status='Aprovado', aprovado_em=now() where id=dia;
  delete from public.fotos where id=foto_aux; get diagnostics n=row_count;
  if n=0 then passou:=passou+1; else falhas:=falhas||'aprovado trava as fotos, até para a sócia'; end if;
  begin
    insert into public.fotos (obra_id, diario_id, url) values (obra1, dia, 'teste4');
    falhas:=falhas||'NÃO entra foto em diário aprovado';
  exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  select count(*) into n from public.fotos where id=foto_aux; if n=1 then passou:=passou+1; else falhas:=falhas||'cliente vê a foto depois de aprovado'; end if;
  perform set_config('role','postgres', true);

  perform set_config('request.jwt.claims','', true);
  perform set_config('role','anon', true);
  begin select count(*) into n from public.fotos; falhas:=falhas||'sem login NÃO vê fotos'; exception when others then passou:=passou+1; end;
  perform set_config('role','postgres', true);

  raise exception 'RESULTADO % falha(s), % acerto(s)%', coalesce(array_length(falhas,1),0), passou,
    case when array_length(falhas,1)>0 then E'\nFALHOU: '||array_to_string(falhas,E'\nFALHOU: ') else '' end;
end $t$;
