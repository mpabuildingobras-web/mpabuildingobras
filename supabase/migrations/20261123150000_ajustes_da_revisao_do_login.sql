-- Ajustes que a revisão de código dos passos 1 a 4 do login achou (23/11/2026).
--
-- 1. TRUNCATE também sai de quem FEZ login (authenticated). Ele passa por cima da RLS:
--    qualquer conta, até a pendente, conseguiria esvaziar uma tabela inteira.
-- 2. Ninguém mexe no created_at da própria conta, e a "última obra" só pode ser uma das obras dela.
-- 3. Só se libera obra para auxiliar ou cliente (sócio já vê todas; pendente ainda não tem perfil).
-- 4. "Nunca sem sócio ativo" com trava: dois sócios se bloqueando ao mesmo tempo não zeram o app.
-- 5. Login sem e-mail (por celular, se um dia existir) não quebra a criação da conta.
--
-- DESFAZER (só se algo parar de funcionar):
--   grant truncate on public.obras, public.obras_clientes, public.diarios,
--     public.diarios_equipe, public.diarios_execucoes, public.fotos to authenticated;
--   e recriar proteger_profile, proteger_membros e criar_profile_do_login como estão em
--   20261123130000_pessoas_e_obras_liberadas.sql.

-- 1 ----------
revoke truncate on public.obras, public.obras_clientes, public.diarios,
  public.diarios_equipe, public.diarios_execucoes, public.fotos from authenticated;

-- 2 e 4 ----------
create or replace function public.proteger_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
begin
  if new.id <> old.id or lower(new.email) <> lower(old.email) or new.created_at <> old.created_at then
    raise exception 'O login, o e-mail e a data de criação de uma pessoa não mudam por aqui.';
  end if;

  if eu is not null and (new.perfil is distinct from old.perfil
      or new.situacao is distinct from old.situacao
      or new.telas_bloqueadas is distinct from old.telas_bloqueadas) then
    if eu = old.id then
      raise exception 'Ninguém muda o próprio perfil, a própria situação nem as próprias telas.';
    end if;
    if not (select public.sou_socio()) then
      raise exception 'Só um sócio muda o perfil, a situação e as telas de outra pessoa.';
    end if;
  end if;

  -- A última obra aberta só pode ser uma das que a pessoa vê.
  if eu is not null and new.ultima_obra_id is distinct from old.ultima_obra_id
     and new.ultima_obra_id is not null
     and new.ultima_obra_id not in (select public.minhas_obras()) then
    raise exception 'Esta obra não está liberada para você.';
  end if;

  if old.perfil = 'socio' and old.situacao = 'ativo'
     and (new.perfil is distinct from 'socio' or new.situacao <> 'ativo') then
    -- Trava as contas de sócio ativas: a segunda mudança espera a primeira terminar.
    perform 1 from public.profiles p
     where p.perfil = 'socio' and p.situacao = 'ativo' order by p.id for update;
    if not exists (select 1 from public.profiles p
                   where p.id <> old.id and p.perfil = 'socio' and p.situacao = 'ativo') then
      raise exception 'O app precisa de pelo menos um sócio ativo.';
    end if;
  end if;

  return new;
end;
$$;

-- 3 ----------
create or replace function public.proteger_membros()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  linha public.membros := coalesce(new, old);
begin
  if eu is not null and linha.profile_id = eu then
    raise exception 'Ninguém muda as próprias obras.';
  end if;
  if tg_op <> 'DELETE' and not exists (select 1 from public.profiles p
       where p.id = new.profile_id and p.perfil in ('auxiliar', 'cliente')) then
    raise exception 'Obra se libera só para auxiliar ou cliente. Sócio já vê todas.';
  end if;
  return coalesce(new, old);
end;
$$;

-- 5 ----------
create or replace function public.criar_profile_do_login()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  contato text := coalesce(new.email, new.phone, new.id::text);
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(contato, '@', 1)),
    contato
  );
  return new;
end;
$$;

revoke execute on function public.criar_profile_do_login(), public.proteger_profile(), public.proteger_membros()
  from public, anon, authenticated;
