-- Índices que o aviso de desempenho do Supabase pediu: as tabelas-filhas do diário
-- apontam para (diario_id, obra_id) e o banco precisa achar essas linhas rápido
-- ao apagar ou conferir um diário.
create index diarios_equipe_diario_obra_idx on public.diarios_equipe (diario_id, obra_id);
create index diarios_execucoes_diario_obra_idx on public.diarios_execucoes (diario_id, obra_id);
drop index public.fotos_diario_idx;
create index fotos_diario_obra_idx on public.fotos (diario_id, obra_id);
