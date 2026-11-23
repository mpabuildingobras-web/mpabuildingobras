-- Teste de permissões no BANCO (o que a RLS e os gatilhos deixam cada perfil fazer).
-- Roda pelo agente (ferramenta execute_sql do Supabase) depois de QUALQUER mudança de permissão.
-- Não entra no npm run check porque precisa do banco de verdade.
--
-- NADA FICA NO BANCO: tudo roda dentro de um bloco que termina SEMPRE com um erro de propósito
-- ("RESULTADO ..."), e o erro desfaz tudo o que o teste criou. Lendo a mensagem:
--   "RESULTADO 0 falha(s)"  → passou;
--   qualquer "FALHOU: ..."   → a regra do banco não bate com o quadro.
--
-- Pessoas de teste (e-mails @teste.invalid, nunca reais): uma sócia, um auxiliar liberado
-- na obra 1, um cliente liberado na obra 1 e uma conta pendente. Obras: as 2 primeiras do banco.

do $teste$
declare
  socia uuid := gen_random_uuid();
  aux   uuid := gen_random_uuid();
  cli   uuid := gen_random_uuid();
  pend  uuid := gen_random_uuid();
  obra1 uuid;
  obra2 uuid;
  n int;
  falhas text[] := '{}';
  passou int := 0;
  erro text;
begin
  select id into obra1 from public.obras order by codigo limit 1;
  select id into obra2 from public.obras order by codigo offset 1 limit 1;
  if obra2 is null then raise exception 'O teste precisa de duas obras no banco.'; end if;

  -- ---------- preparo (como administrador do banco) ----------
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (socia, 'socia@teste.invalid', '{"nome":"Sócia Teste"}', 'authenticated', 'authenticated'),
         (aux,   'aux@teste.invalid',   '{"nome":"Auxiliar Teste"}', 'authenticated', 'authenticated'),
         (cli,   'cli@teste.invalid',   '{"nome":"Cliente Teste"}', 'authenticated', 'authenticated'),
         (pend,  'pend@teste.invalid',  '{}', 'authenticated', 'authenticated');

  -- 1. Conta nova nasce pendente, sem perfil, com o nome do cadastro.
  select count(*) into n from public.profiles
   where id in (socia, aux, cli, pend) and situacao = 'pendente' and perfil is null;
  if n = 4 then passou := passou + 1; else falhas := falhas || 'conta nova nasce pendente'; end if;
  select count(*) into n from public.profiles where id = pend and nome = 'pend';
  if n = 1 then passou := passou + 1; else falhas := falhas || 'sem nome, usa o começo do e-mail'; end if;

  -- Se já existir sócio ativo de verdade no banco, a sócia de teste é mais uma.
  update public.profiles set perfil = 'socio', situacao = 'ativo' where id = socia;
  update public.profiles set perfil = 'auxiliar', situacao = 'ativo' where id = aux;
  update public.profiles set perfil = 'cliente', situacao = 'ativo' where id = cli;
  insert into public.membros (obra_id, profile_id) values (obra1, aux), (obra1, cli);

  -- ---------- PENDENTE ----------
  perform set_config('request.jwt.claims', json_build_object('sub', pend, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.minhas_obras();
  if n = 0 then passou := passou + 1; else falhas := falhas || 'pendente não vê nenhuma obra'; end if;
  select count(*) into n from public.profiles;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'pendente vê só a própria conta'; end if;
  perform set_config('role', 'postgres', true);

  -- ---------- AUXILIAR ----------
  perform set_config('request.jwt.claims', json_build_object('sub', aux, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.minhas_obras() o where o = obra1;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'auxiliar vê a obra liberada'; end if;
  select count(*) into n from public.minhas_obras() o where o = obra2;
  if n = 0 then passou := passou + 1; else falhas := falhas || 'auxiliar NÃO vê a obra não liberada'; end if;
  select count(*) into n from public.profiles;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'auxiliar não vê a lista de usuários'; end if;
  select count(*) into n from public.membros;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'auxiliar vê só as próprias liberações'; end if;

  update public.profiles set nome = 'Auxiliar Renomeado' where id = aux;
  get diagnostics n = row_count;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'auxiliar muda o próprio nome'; end if;

  begin
    update public.profiles set perfil = 'socio' where id = aux;
    falhas := falhas || 'auxiliar NÃO vira sócio sozinho';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'authenticated', true);

  update public.profiles set situacao = 'bloqueado' where id = cli;
  get diagnostics n = row_count;
  if n = 0 then passou := passou + 1; else falhas := falhas || 'auxiliar NÃO bloqueia outra pessoa'; end if;

  begin
    insert into public.membros (obra_id, profile_id) values (obra2, aux);
    falhas := falhas || 'auxiliar NÃO se libera em outra obra';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'authenticated', true);

  begin
    delete from public.profiles where id = aux;
    falhas := falhas || 'ninguém apaga pessoa (auxiliar)';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'authenticated', true);

  -- TRUNCATE passa por cima da RLS. Se passar aqui, o erro do fim desfaz tudo mesmo assim.
  begin
    truncate public.fotos;
    falhas := falhas || 'quem fez login NÃO esvazia tabela (TRUNCATE)';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- CLIENTE ----------
  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.minhas_obras();
  if n = 1 then passou := passou + 1; else falhas := falhas || 'cliente vê só a obra dele'; end if;
  select count(*) into n from public.profiles where id <> cli;
  if n = 0 then passou := passou + 1; else falhas := falhas || 'cliente não vê outras pessoas'; end if;
  perform set_config('role', 'postgres', true);

  -- ---------- SÓCIA ----------
  perform set_config('request.jwt.claims', json_build_object('sub', socia, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.minhas_obras();
  if n = (select count(*) from public.obras) then passou := passou + 1; else falhas := falhas || 'sócia vê todas as obras'; end if;
  select count(*) into n from public.profiles where id in (socia, aux, cli, pend);
  if n = 4 then passou := passou + 1; else falhas := falhas || 'sócia vê a lista de usuários'; end if;

  update public.profiles set perfil = 'auxiliar', situacao = 'ativo' where id = pend;
  get diagnostics n = row_count;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'sócia libera conta pendente'; end if;

  insert into public.membros (obra_id, profile_id) values (obra2, pend);
  get diagnostics n = row_count;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'sócia libera obra para outra pessoa'; end if;

  update public.profiles set situacao = 'bloqueado' where id = cli;
  get diagnostics n = row_count;
  if n = 1 then passou := passou + 1; else falhas := falhas || 'sócia bloqueia cliente'; end if;

  begin
    update public.profiles set perfil = 'cliente' where id = socia;
    falhas := falhas || 'sócia NÃO muda o próprio perfil';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'authenticated', true);

  begin
    update public.profiles set telas_bloqueadas = '{faturamento}' where id = socia;
    falhas := falhas || 'sócia NÃO mexe nas próprias telas';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'authenticated', true);

  begin
    delete from public.profiles where id = cli;
    falhas := falhas || 'ninguém apaga pessoa (sócia)';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'postgres', true);

  -- Cliente bloqueado perde as obras na hora.
  perform set_config('request.jwt.claims', json_build_object('sub', cli, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.minhas_obras();
  if n = 0 then passou := passou + 1; else falhas := falhas || 'bloqueado perde as obras na hora'; end if;
  update public.profiles set nome = 'Tentativa' where id = cli;
  get diagnostics n = row_count;
  if n = 0 then passou := passou + 1; else falhas := falhas || 'bloqueado não muda nem o próprio nome'; end if;
  perform set_config('role', 'postgres', true);

  -- ---------- QUEM NÃO FEZ LOGIN ----------
  -- Sócio não entra em membros (já vê todas as obras).
  begin
    insert into public.membros (obra_id, profile_id) values (obra1, socia);
    falhas := falhas || 'obra se libera só para auxiliar ou cliente';
  exception when others then passou := passou + 1;
  end;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin
    truncate public.fotos;
    falhas := falhas || 'quem não fez login NÃO esvazia tabela (TRUNCATE)';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from public.profiles;
    falhas := falhas || 'quem não fez login NÃO lê pessoas';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from public.membros;
    falhas := falhas || 'quem não fez login NÃO lê liberações';
  exception when others then passou := passou + 1;
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- Nunca sem sócio ativo ----------
  -- Bloqueia todos os sócios ativos menos a de teste; depois tenta bloquear a última.
  begin
    update public.profiles set situacao = 'bloqueado'
     where perfil = 'socio' and situacao = 'ativo' and id <> socia;
    update public.profiles set situacao = 'bloqueado' where id = socia;
    falhas := falhas || 'o app NÃO fica sem sócio ativo';
  exception when others then
    get stacked diagnostics erro = message_text;
    if erro like '%pelo menos um sócio%' then passou := passou + 1;
    else falhas := falhas || ('último sócio: erro inesperado: ' || erro); end if;
  end;

  raise exception 'RESULTADO % falha(s), % acerto(s)%', coalesce(array_length(falhas, 1), 0), passou,
    case when array_length(falhas, 1) > 0 then E'\nFALHOU: ' || array_to_string(falhas, E'\nFALHOU: ') else '' end;
end
$teste$;
