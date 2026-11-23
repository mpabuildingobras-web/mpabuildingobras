-- Passo 5 do login, parte 4 (23/11/2026): a trava do diário, achada pela revisão de código.
-- As regras da parte 2 diziam QUEM mexe no diário, mas não O QUE muda em cada status:
-- o sócio conseguia mexer no cabeçalho de um diário Enviado ou Aprovado, e até voltar um
-- Aprovado para Rascunho sem deixar rastro. Agora um gatilho confere cada mudança:
--
--   Aprovado ............ trava: ninguém muda nada (reabrir vem depois, com o porquê e o histórico)
--   Enviado ............. só o sócio, e só para Aprovado ou Devolvido; o conteúdo fica como foi enviado
--   Rascunho/Devolvido .. muda o conteúdo e vai para Enviado; nunca direto para Aprovado;
--                         só em obra Em andamento (Parada e Concluída ficam só para leitura)
--   Sempre .............. obra e data não mudam; "quem enviou" e "quando" quem escreve é o banco;
--                         a data de aprovação só o sócio grava, ao aprovar.
-- E o que está dentro do diário (equipe, lançamentos, fotos) também trava em obra que não está
-- Em andamento. Sai a regra de editar foto, que o quadro não tem.
--
-- DESFAZER (só se algo parar de funcionar):
--   drop trigger diarios_proteger on public.diarios; drop function public.proteger_diario();
--   e recriar diario_aberto como está em 20261123170000_regras_diario.sql;
--   e recriar fotos_editar e o grant update (servico_id, url, legenda) como em 20261123180000_regras_fotos.sql.

create or replace function public.proteger_diario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  socio boolean := (select public.sou_socio());
  conteudo_mudou boolean := (new.clima_manha, new.clima_tarde, new.qtd_pessoas, new.ocorrencias)
                            is distinct from (old.clima_manha, old.clima_tarde, old.qtd_pessoas, old.ocorrencias);
begin
  if eu is null then return new; end if;  -- quem roda SQL pelo painel

  if new.obra_id <> old.obra_id or new.data <> old.data then
    raise exception 'A obra e a data de um diário não mudam.';
  end if;

  if old.status = 'Aprovado' then
    raise exception 'Diário aprovado está travado. Para mudar, um sócio precisa reabrir.';
  end if;

  if old.status = 'Enviado' then
    if not socio or new.status not in ('Aprovado', 'Devolvido') or conteudo_mudou then
      raise exception 'Diário enviado espera o sócio: só dá para aprovar ou devolver.';
    end if;
  else  -- Rascunho ou Devolvido
    if new.status = 'Aprovado' then
      raise exception 'O diário precisa ser enviado antes de ser aprovado.';
    end if;
    if not exists (select 1 from public.obras o where o.id = old.obra_id and o.situacao = 'Em andamento') then
      raise exception 'Esta obra não está Em andamento: o diário fica só para leitura.';
    end if;
  end if;

  -- Quem enviou e quando: o banco escreve, ninguém digita.
  if new.status = 'Enviado' and old.status <> 'Enviado' then
    new.enviado_por := (select p.nome from public.profiles p where p.id = eu);
    new.enviado_em := now();
  else
    new.enviado_por := old.enviado_por;
    new.enviado_em := old.enviado_em;
  end if;

  -- Data de aprovação: só ao aprovar.
  if new.status = 'Aprovado' then
    new.aprovado_em := coalesce(new.aprovado_em, now());
  else
    new.aprovado_em := old.aprovado_em;
  end if;

  -- Motivo da devolução: o sócio escreve ao devolver; ao reenviar, ele é limpo.
  if not (socio and new.status = 'Devolvido') and new.comentario_devolucao is not null
     and new.comentario_devolucao is distinct from old.comentario_devolucao then
    raise exception 'Só o sócio escreve o motivo da devolução.';
  end if;

  return new;
end;
$$;
revoke execute on function public.proteger_diario() from public, anon, authenticated;
create trigger diarios_proteger before update on public.diarios
  for each row execute function public.proteger_diario();

-- O que está dentro do diário só muda com ele aberto E com a obra Em andamento.
create or replace function public.diario_aberto(p_diario uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.diarios d
                   join public.obras o on o.id = d.obra_id
                 where d.id = p_diario and d.status in ('Rascunho', 'Devolvido')
                   and o.situacao = 'Em andamento'
                   and d.obra_id in (select public.minhas_obras()))
$$;

-- Fotos: o quadro tem Ver, Enviar e Apagar; editar não existe.
drop policy fotos_editar on public.fotos;
revoke update on public.fotos from authenticated;
