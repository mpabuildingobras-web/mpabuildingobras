-- publico-de-proposito: TEMPORÁRIO, modo desenvolvimento.
-- O app ainda não tem login de verdade (o login é de exemplo até o passo 10, "login e banco"),
-- então as chamadas chegam ao banco como "anon" (quem não fez login). Para o app rodar no
-- computador da Manuela, estas políticas liberam tudo para anon e authenticated.
--
-- NO PASSO 10 ESTE ARQUIVO É DESFEITO: uma migration nova apaga as políticas "dev_*",
-- revoga os grants de anon e cria as políticas por obra (minhas_obras(), sócio vê todas,
-- cliente só Aprovado). Nada disto pode ir para o ar.

grant select, insert, update, delete on public.obras to anon;
grant select, insert, update, delete on public.obras_clientes to anon;
grant select, insert, update, delete on public.diarios to anon;
grant select, insert, update, delete on public.diarios_equipe to anon;
grant select, insert, update, delete on public.diarios_execucoes to anon;
grant select, insert, update, delete on public.fotos to anon;
grant execute on function public.salvar_diario(uuid, uuid, date, text, text, text, integer, jsonb, jsonb) to anon;

create policy dev_liberado_obras on public.obras for all to anon, authenticated using (true) with check (true);
create policy dev_liberado_obras_clientes on public.obras_clientes for all to anon, authenticated using (true) with check (true);
create policy dev_liberado_diarios on public.diarios for all to anon, authenticated using (true) with check (true);
create policy dev_liberado_diarios_equipe on public.diarios_equipe for all to anon, authenticated using (true) with check (true);
create policy dev_liberado_diarios_execucoes on public.diarios_execucoes for all to anon, authenticated using (true) with check (true);
create policy dev_liberado_fotos on public.fotos for all to anon, authenticated using (true) with check (true);
