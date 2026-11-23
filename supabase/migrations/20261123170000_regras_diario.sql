-- Passo 5 do login, parte 2 (23/11/2026): Diário, equipe do dia e lançamentos seguem o quadro
-- (docs/permissoes/QUEM-PODE-O-QUE.md, assunto Diário). Aplicado pela Manuela no SQL Editor.
--
--   diario.ver ....... obras dele; cliente só os Aprovados
--   diario.criar ..... sócio e auxiliar, só em obra Em andamento, nasce Rascunho
--   diario.editar .... só Rascunho ou Devolvido (sócio e auxiliar); auxiliar só pode levar a Enviado
--   aprovar/devolver/reabrir ... só sócio (é a mudança de status que o sócio faz)
--   diario.apagar .... só sócio, só antes de aprovado (equipe, lançamentos e fotos saem junto)
--   equipe e lançamentos: veem os do diário que a pessoa vê; mudam só com o diário em
--   Rascunho ou Devolvido (aprovado trava tudo o que está dentro).
-- Decidido em 23/11/2026: o diário aprovado NÃO se corrige direto; o sócio reabre (com o porquê).
--
-- DESFAZER (volta à regra provisória; só se algo parar de funcionar):
--   drop policy diarios_ver on public.diarios; drop policy diarios_criar on public.diarios;
--   drop policy diarios_editar on public.diarios; drop policy diarios_apagar on public.diarios;
--   drop policy equipe_ver on public.diarios_equipe; drop policy equipe_criar on public.diarios_equipe;
--   drop policy equipe_editar on public.diarios_equipe; drop policy equipe_apagar on public.diarios_equipe;
--   drop policy lancamentos_ver on public.diarios_execucoes; drop policy lancamentos_criar on public.diarios_execucoes;
--   drop policy lancamentos_editar on public.diarios_execucoes; drop policy lancamentos_apagar on public.diarios_execucoes;
--   create policy dev_liberado_diarios on public.diarios for all to anon, authenticated using (true) with check (true);
--   create policy dev_liberado_diarios_equipe on public.diarios_equipe for all to anon, authenticated using (true) with check (true);
--   create policy dev_liberado_diarios_execucoes on public.diarios_execucoes for all to anon, authenticated using (true) with check (true);
--   grant select, insert, update, delete on public.diarios, public.diarios_equipe, public.diarios_execucoes to anon;

-- O diário ainda aceita mudança no que está dentro? (security definer: a regra não se chama em laço)
create or replace function public.diario_aberto(p_diario uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.diarios d
                 where d.id = p_diario and d.status in ('Rascunho', 'Devolvido')
                   and d.obra_id in (select public.minhas_obras()))
$$;
revoke execute on function public.diario_aberto(uuid) from public, anon;
grant execute on function public.diario_aberto(uuid) to authenticated;

drop policy dev_liberado_diarios on public.diarios;
drop policy dev_liberado_diarios_equipe on public.diarios_equipe;
drop policy dev_liberado_diarios_execucoes on public.diarios_execucoes;
revoke all on public.diarios, public.diarios_equipe, public.diarios_execucoes from anon;

-- ---------- diarios ----------
create policy diarios_ver on public.diarios for select to authenticated
  using (obra_id in (select public.minhas_obras())
         and ((select public.meu_perfil()) <> 'cliente' or status = 'Aprovado'));
create policy diarios_criar on public.diarios for insert to authenticated
  with check (obra_id in (select public.minhas_obras())
              and (select public.meu_perfil()) in ('socio', 'auxiliar')
              and status = 'Rascunho'
              and exists (select 1 from public.obras o where o.id = obra_id and o.situacao = 'Em andamento'));
create policy diarios_editar on public.diarios for update to authenticated
  using (obra_id in (select public.minhas_obras())
         and ((select public.sou_socio())
              or ((select public.meu_perfil()) = 'auxiliar' and status in ('Rascunho', 'Devolvido'))))
  with check (obra_id in (select public.minhas_obras())
              and ((select public.sou_socio())
                   or ((select public.meu_perfil()) = 'auxiliar' and status in ('Rascunho', 'Devolvido', 'Enviado'))));
create policy diarios_apagar on public.diarios for delete to authenticated
  using ((select public.sou_socio()) and status <> 'Aprovado');

-- ---------- equipe do dia ----------
create policy equipe_ver on public.diarios_equipe for select to authenticated
  using (exists (select 1 from public.diarios d where d.id = diario_id));
create policy equipe_criar on public.diarios_equipe for insert to authenticated
  with check ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));
create policy equipe_editar on public.diarios_equipe for update to authenticated
  using ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id))
  with check ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));
create policy equipe_apagar on public.diarios_equipe for delete to authenticated
  using ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));

-- ---------- lançamentos do dia ----------
create policy lancamentos_ver on public.diarios_execucoes for select to authenticated
  using (exists (select 1 from public.diarios d where d.id = diario_id));
create policy lancamentos_criar on public.diarios_execucoes for insert to authenticated
  with check ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));
create policy lancamentos_editar on public.diarios_execucoes for update to authenticated
  using ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id))
  with check ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));
create policy lancamentos_apagar on public.diarios_execucoes for delete to authenticated
  using ((select public.meu_perfil()) in ('socio', 'auxiliar') and public.diario_aberto(diario_id));
