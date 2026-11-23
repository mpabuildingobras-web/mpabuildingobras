-- Passo 2 do login (decidido pela Manuela em 23/11/2026): a base de pessoas.
-- Segue docs/permissoes/QUEM-PODE-O-QUE.md (seção 1 e o assunto Usuários).
--
--   profiles: quem é cada login. perfil = socio | auxiliar | cliente;
--             situacao = pendente | ativo | bloqueado. Conta nova nasce pendente.
--   membros:  qual obra está liberada para qual pessoa (auxiliar e cliente).
--             O sócio vê todas as obras e não precisa estar aqui.
--
-- Regras que o banco garante sozinho (gatilho, não tela):
--   - ninguém muda o próprio perfil, a própria situação, as próprias telas nem as próprias obras;
--   - só sócio ativo muda o perfil, a situação e as telas de outra pessoa;
--   - o app nunca fica sem um sócio ativo;
--   - ninguém apaga pessoa: bloqueia (não existe regra de delete).
-- Quem roda SQL pelo painel ou pelo agente (sem login, auth.uid() vazio) passa: é assim
-- que a primeira sócia é marcada no passo 3.
--
-- As regras das tabelas antigas (obras, diários...) NÃO mudam aqui: isso é o passo 5.
--
-- DESFAZER (só se algo parar de funcionar; apaga as pessoas cadastradas):
--   drop trigger if exists ao_criar_login on auth.users;
--   drop table if exists public.membros;
--   drop table if exists public.profiles cascade;
--   drop function if exists public.criar_profile_do_login();
--   drop function if exists public.proteger_profile();
--   drop function if exists public.proteger_membros();
--   drop function if exists public.meu_perfil();
--   drop function if exists public.sou_socio();
--   drop function if exists public.minhas_obras();

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id),   -- sem cascade: pessoa não se apaga, bloqueia
  nome text not null check (btrim(nome) <> ''),
  email text not null,
  perfil text check (perfil in ('socio', 'auxiliar', 'cliente')),
  situacao text not null default 'pendente' check (situacao in ('pendente', 'ativo', 'bloqueado')),
  telas_bloqueadas text[] not null default '{}',
  ultima_obra_id uuid references public.obras (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pendente pode ainda não ter perfil; ativo e bloqueado sempre têm.
  constraint profiles_ativo_tem_perfil check (situacao = 'pendente' or perfil is not null)
);
create unique index profiles_email_unico on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.atualizar_updated_at();

-- ---------- membros ----------
create table public.membros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint membros_uma_vez unique (obra_id, profile_id)
);
create index membros_profile_idx on public.membros (profile_id);

-- ---------- Funções que as regras usam ----------
-- security definer: leem profiles/membros sem cair na própria RLS (senão a regra se chama em laço).
-- Só devolvem algo para quem está ATIVO: pendente e bloqueado não têm perfil nem obra.
create or replace function public.meu_perfil()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.perfil from public.profiles p
  where p.id = (select auth.uid()) and p.situacao = 'ativo'
$$;

create or replace function public.sou_socio()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select public.meu_perfil()) = 'socio', false)
$$;

-- As obras que a pessoa logada pode ver: sócio ativo, todas; auxiliar e cliente ativos, as liberadas.
create or replace function public.minhas_obras()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select o.id from public.obras o where (select public.sou_socio())
  union
  select m.obra_id from public.membros m
  where m.profile_id = (select auth.uid())
    and (select public.meu_perfil()) in ('auxiliar', 'cliente')
$$;

-- ---------- Conta nova nasce pendente ----------
create or replace function public.criar_profile_do_login()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;
create trigger ao_criar_login after insert on auth.users
  for each row execute function public.criar_profile_do_login();

-- ---------- Ninguém mexe em si mesmo; só sócio mexe nos outros; nunca sem sócio ativo ----------
create or replace function public.proteger_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
begin
  if new.id <> old.id or lower(new.email) <> lower(old.email) then
    raise exception 'O login e o e-mail de uma pessoa não mudam por aqui.';
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

  if old.perfil = 'socio' and old.situacao = 'ativo'
     and (new.perfil is distinct from 'socio' or new.situacao <> 'ativo')
     and not exists (select 1 from public.profiles p
                     where p.id <> old.id and p.perfil = 'socio' and p.situacao = 'ativo') then
    raise exception 'O app precisa de pelo menos um sócio ativo.';
  end if;

  return new;
end;
$$;
create trigger profiles_proteger before update on public.profiles
  for each row execute function public.proteger_profile();

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
  return coalesce(new, old);
end;
$$;
create trigger membros_proteger before insert or update or delete on public.membros
  for each row execute function public.proteger_membros();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.membros enable row level security;

-- profiles: cada um vê a própria linha (o pendente precisa saber que está pendente);
-- o sócio ativo vê todas (quadro: usuarios.ver). Ninguém cria nem apaga por aqui.
create policy profiles_ver on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.sou_socio()));
-- Quadro: usuarios.meu_perfil (cada um muda o próprio nome) e usuarios.gerenciar (sócio).
-- O que cada um pode mudar em si mesmo é cuidado pelo gatilho proteger_profile.
-- Bloqueado perdeu o acesso: não muda nem o próprio nome.
create policy profiles_editar on public.profiles for update to authenticated
  using ((id = (select auth.uid()) and situacao <> 'bloqueado') or (select public.sou_socio()))
  with check ((id = (select auth.uid()) and situacao <> 'bloqueado') or (select public.sou_socio()));

-- membros: só o sócio vê e libera obras (quadro: usuarios.gerenciar); cada um vê as próprias.
create policy membros_ver on public.membros for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.sou_socio()));
create policy membros_liberar on public.membros for insert to authenticated
  with check ((select public.sou_socio()));
create policy membros_tirar on public.membros for delete to authenticated
  using ((select public.sou_socio()));

-- ---------- Liberações (tabela nasce fechada) ----------
revoke all on public.profiles, public.membros from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.membros to authenticated;

revoke execute on function public.meu_perfil(), public.sou_socio(), public.minhas_obras() from public, anon;
grant execute on function public.meu_perfil(), public.sou_socio(), public.minhas_obras() to authenticated;
revoke execute on function public.criar_profile_do_login(), public.proteger_profile(), public.proteger_membros()
  from public, anon, authenticated;
