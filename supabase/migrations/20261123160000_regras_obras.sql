-- Passo 5 do login, parte 1 (23/11/2026): Obras e dados do contratante seguem o quadro
-- (docs/permissoes/QUEM-PODE-O-QUE.md, assuntos Obra e Dados do contratante).
-- Sai a regra provisória "todo mundo pode tudo" (20261110233600_rls_dev_temporaria.sql)
-- e sai todo acesso de quem não fez login.
--
--   obra.ver ............ cada um as obras dele (minhas_obras: sócio, todas)
--   obra.criar/editar/apagar ... só sócio (apagar só sem nada lançado: o banco já recusa)
--   contratante.ver ..... sócio; cliente só o da obra dele; auxiliar nunca
--   contratante.editar/apagar ... só sócio
--
-- minhas_obras() ganha o filtro da obra Em preparação (só sócio vê). A situação ainda não
-- existe no CHECK; quando entrar, o filtro já está aqui.
--
-- DESFAZER (volta à regra provisória; só se algo parar de funcionar):
--   drop policy obras_ver on public.obras; drop policy obras_criar on public.obras;
--   drop policy obras_editar on public.obras; drop policy obras_apagar on public.obras;
--   drop policy contratante_ver on public.obras_clientes; drop policy contratante_criar on public.obras_clientes;
--   drop policy contratante_editar on public.obras_clientes; drop policy contratante_apagar on public.obras_clientes;
--   create policy dev_liberado_obras on public.obras for all to anon, authenticated using (true) with check (true);
--   create policy dev_liberado_obras_clientes on public.obras_clientes for all to anon, authenticated using (true) with check (true);
--   grant select, insert, update, delete on public.obras, public.obras_clientes to anon;

create or replace function public.minhas_obras()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select o.id from public.obras o where (select public.sou_socio())
  union
  select m.obra_id from public.membros m
    join public.obras o on o.id = m.obra_id
  where m.profile_id = (select auth.uid())
    and (select public.meu_perfil()) in ('auxiliar', 'cliente')
    and o.situacao <> 'Em preparação'
$$;

drop policy dev_liberado_obras on public.obras;
drop policy dev_liberado_obras_clientes on public.obras_clientes;
revoke all on public.obras, public.obras_clientes from anon;

create policy obras_ver on public.obras for select to authenticated
  using (id in (select public.minhas_obras()));
create policy obras_criar on public.obras for insert to authenticated
  with check ((select public.sou_socio()));
create policy obras_editar on public.obras for update to authenticated
  using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy obras_apagar on public.obras for delete to authenticated
  using ((select public.sou_socio()));

create policy contratante_ver on public.obras_clientes for select to authenticated
  using ((select public.sou_socio())
         or ((select public.meu_perfil()) = 'cliente' and obra_id in (select public.minhas_obras())));
create policy contratante_criar on public.obras_clientes for insert to authenticated
  with check ((select public.sou_socio()));
create policy contratante_editar on public.obras_clientes for update to authenticated
  using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy contratante_apagar on public.obras_clientes for delete to authenticated
  using ((select public.sou_socio()));
