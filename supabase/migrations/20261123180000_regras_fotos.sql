-- Passo 5 do login, parte 3 (23/11/2026): Fotos do diário seguem o quadro
-- (docs/permissoes/QUEM-PODE-O-QUE.md, assunto Fotos do diário). Aplicado pela Manuela no SQL Editor.
--
--   fotos.ver ...... as do diário que a pessoa vê (cliente: só de diário aprovado)
--   fotos.enviar ... sócio, até o diário ser aprovado; auxiliar, em Rascunho ou Devolvido
--   fotos.apagar ... sócio, até o diário ser aprovado; auxiliar, só as dele, antes de enviar
-- "Só as dele" pede saber quem enviou: entra created_by, preenchido pelo banco com quem está
-- logado, e ninguém troca depois (o UPDATE só alcança servico_id, url e legenda).
-- As 7 fotos que já existiam ficam sem dono: o auxiliar não apaga nenhuma delas.
-- Fecha também a função salvar_diario para quem não fez login.
--
-- DESFAZER (volta à regra provisória; só se algo parar de funcionar):
--   drop policy fotos_ver on public.fotos; drop policy fotos_enviar on public.fotos;
--   drop policy fotos_editar on public.fotos; drop policy fotos_apagar on public.fotos;
--   create policy dev_liberado_fotos on public.fotos for all to anon, authenticated using (true) with check (true);
--   grant select, insert, update, delete on public.fotos to anon;
--   grant update on public.fotos to authenticated;
--   alter table public.fotos drop column created_by;
--   grant execute on function public.salvar_diario(uuid, uuid, text, date, text, text, text, integer, jsonb, jsonb) to anon;

alter table public.fotos
  add column created_by uuid references public.profiles (id) default auth.uid();

drop policy dev_liberado_fotos on public.fotos;
revoke all on public.fotos from anon;
revoke update on public.fotos from authenticated;
grant update (servico_id, url, legenda) on public.fotos to authenticated;

create policy fotos_ver on public.fotos for select to authenticated
  using (exists (select 1 from public.diarios d where d.id = diario_id));
create policy fotos_enviar on public.fotos for insert to authenticated
  with check (created_by = (select auth.uid())
              and (((select public.sou_socio())
                    and exists (select 1 from public.diarios d where d.id = diario_id and d.status <> 'Aprovado'))
                   or ((select public.meu_perfil()) = 'auxiliar' and public.diario_aberto(diario_id))));
create policy fotos_editar on public.fotos for update to authenticated
  using (((select public.sou_socio())
          and exists (select 1 from public.diarios d where d.id = diario_id and d.status <> 'Aprovado'))
         or ((select public.meu_perfil()) = 'auxiliar' and created_by = (select auth.uid())
             and public.diario_aberto(diario_id)))
  with check (((select public.sou_socio())
               and exists (select 1 from public.diarios d where d.id = diario_id and d.status <> 'Aprovado'))
              or ((select public.meu_perfil()) = 'auxiliar' and created_by = (select auth.uid())
                  and public.diario_aberto(diario_id)));
create policy fotos_apagar on public.fotos for delete to authenticated
  using (((select public.sou_socio())
          and exists (select 1 from public.diarios d where d.id = diario_id and d.status <> 'Aprovado'))
         or ((select public.meu_perfil()) = 'auxiliar' and created_by = (select auth.uid())
             and public.diario_aberto(diario_id)));

revoke execute on function public.salvar_diario(uuid, uuid, text, date, text, text, text, integer, jsonb, jsonb) from anon;
