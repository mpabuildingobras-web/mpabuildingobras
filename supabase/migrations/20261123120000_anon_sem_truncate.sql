-- Passo 1 do login (decidido pela Manuela em 23/11/2026): quem não fez login (anon)
-- deixa de poder esvaziar uma tabela inteira de uma vez (TRUNCATE).
-- Por quê: TRUNCATE passa por cima da RLS. Com a chave publicável do app, qualquer pessoa
-- apagaria todas as obras e diários num comando só. O app nunca usa TRUNCATE.
-- Ler e gravar continuam como estão até o passo 5, quando as regras provisórias
-- (20261110233600_rls_dev_temporaria.sql) saem e as do quadro de permissões entram.
--
-- DESFAZER (só se algo parar de funcionar):
--   grant truncate on public.obras, public.obras_clientes, public.diarios,
--     public.diarios_equipe, public.diarios_execucoes, public.fotos to anon;

revoke truncate on public.obras, public.obras_clientes, public.diarios,
  public.diarios_equipe, public.diarios_execucoes, public.fotos from anon;
