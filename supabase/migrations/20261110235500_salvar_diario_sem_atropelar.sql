-- publico-de-proposito: a linha "to anon" abaixo é TEMPORÁRIA, como em 20261110233600_rls_dev_temporaria.sql;
-- sai no passo 10 (login e banco).
--
-- salvar_diario não atropela mais ninguém (achado da revisão de código):
--  * diário existente só é gravado se ainda estiver no status que a tela leu (p_status_lido);
--    se alguém enviou ou aprovou no meio tempo, o banco recusa;
--  * diário novo não sobrescreve outro criado no mesmo dia por outra pessoa ao mesmo tempo.
drop function public.salvar_diario(uuid, uuid, date, text, text, text, integer, jsonb, jsonb);

create function public.salvar_diario(
  p_obra_id uuid,
  p_id uuid,
  p_status_lido text,
  p_data date,
  p_clima_manha text,
  p_clima_tarde text,
  p_ocorrencias text,
  p_qtd_pessoas integer,
  p_equipe jsonb,      -- [{ contratado_id, atividade }] na ordem da tela
  p_execucoes jsonb    -- [{ servico_id, quantidade, qtd_pessoas, descricao }]
)
returns public.diarios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d public.diarios;
begin
  if p_id is null then
    insert into public.diarios (obra_id, data, clima_manha, clima_tarde, ocorrencias, qtd_pessoas)
    values (p_obra_id, p_data, p_clima_manha, p_clima_tarde, nullif(btrim(p_ocorrencias), ''), p_qtd_pessoas)
    on conflict (obra_id, data) do nothing
    returning * into d;
    if not found then
      raise exception 'Alguém acabou de criar o diário deste dia. Recarregue a tela.';
    end if;
  else
    update public.diarios
       set clima_manha = p_clima_manha, clima_tarde = p_clima_tarde,
           ocorrencias = nullif(btrim(p_ocorrencias), ''), qtd_pessoas = p_qtd_pessoas
     where id = p_id and obra_id = p_obra_id and status = p_status_lido
    returning * into d;
    if not found then
      raise exception 'O diário mudou enquanto você olhava. Recarregue a tela.';
    end if;
  end if;

  delete from public.diarios_equipe where diario_id = d.id;
  insert into public.diarios_equipe (obra_id, diario_id, contratado_id, atividade, ordem)
  select d.obra_id, d.id, e.item ->> 'contratado_id', nullif(btrim(e.item ->> 'atividade'), ''), (e.n - 1)::integer
    from jsonb_array_elements(coalesce(p_equipe, '[]'::jsonb)) with ordinality as e(item, n);

  delete from public.diarios_execucoes where diario_id = d.id;
  insert into public.diarios_execucoes (obra_id, diario_id, servico_id, quantidade, qtd_pessoas, descricao)
  select d.obra_id, d.id, x ->> 'servico_id', (x ->> 'quantidade')::numeric, (x ->> 'qtd_pessoas')::integer,
         nullif(btrim(x ->> 'descricao'), '')
    from jsonb_array_elements(coalesce(p_execucoes, '[]'::jsonb)) as x;

  return d;
end;
$$;

revoke execute on function public.salvar_diario(uuid, uuid, text, date, text, text, text, integer, jsonb, jsonb) from public;
grant execute on function public.salvar_diario(uuid, uuid, text, date, text, text, text, integer, jsonb, jsonb) to authenticated;
grant execute on function public.salvar_diario(uuid, uuid, text, date, text, text, text, integer, jsonb, jsonb) to anon;
