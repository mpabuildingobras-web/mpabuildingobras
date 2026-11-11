-- Obras e Diário de Obra (primeiro módulo no banco).
-- Os textos dos CHECK são idênticos aos da tela: SITUACOES em src/lib/obras.js,
-- STATUS_DIARIO em src/lib/diario.js e CLIMAS em src/screens/diario.jsx.
-- Se um deles mudar no código, muda aqui numa migration nova; senão o salvamento falha.
--
-- servico_id e contratado_id ainda são texto: serviços e contratados continuam nos dados
-- de exemplo até os módulos Cronograma e Contratados irem para o banco. Nesse dia viram
-- uuid com chave estrangeira.

-- updated_at automático
create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- obras ----------
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  cliente_nome text not null,
  endereco text,
  data_inicio date not null,
  data_entrega date not null,
  situacao text not null default 'Em andamento'
    check (situacao in ('Em andamento', 'Parada', 'Concluída')),
  descricao text,
  informacoes text,
  foto text,                                   -- só a URL (ou a imagem reduzida) até o Storage entrar
  documentos jsonb not null default '[]'::jsonb, -- [{ id, nome }] até virar obras_documentos
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obras_entrega_depois_do_inicio check (data_entrega >= data_inicio)
);
-- O código aparece no seletor: não pode repetir, nem com maiúscula diferente.
create unique index obras_codigo_unico on public.obras (lower(codigo));
create index obras_situacao_idx on public.obras (situacao);
create trigger obras_updated_at before update on public.obras
  for each row execute function public.atualizar_updated_at();

-- Dados pessoais do contratante ficam à parte: o auxiliar vai ler obras, nunca isto.
create table public.obras_clientes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null unique references public.obras (id) on delete cascade,
  telefone text,
  email text,
  documento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger obras_clientes_updated_at before update on public.obras_clientes
  for each row execute function public.atualizar_updated_at();

-- ---------- diarios ----------
create table public.diarios (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete restrict,
  data date not null,
  clima_manha text not null default 'Sol' check (clima_manha in ('Sol', 'Nublado', 'Chuva', 'Chuva forte')),
  clima_tarde text not null default 'Sol' check (clima_tarde in ('Sol', 'Nublado', 'Chuva', 'Chuva forte')),
  qtd_pessoas integer not null default 0 check (qtd_pessoas >= 0),
  ocorrencias text,
  status text not null default 'Rascunho' check (status in ('Rascunho', 'Enviado', 'Aprovado', 'Devolvido')),
  comentario_devolucao text,
  enviado_por text,          -- nome de quem enviou; vira profiles.id no passo do login
  enviado_em timestamptz,
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diarios_um_por_dia unique (obra_id, data),
  -- Permite às tabelas-filhas exigirem a MESMA obra do diário.
  constraint diarios_id_obra unique (id, obra_id),
  constraint diarios_devolvido_tem_motivo
    check (status <> 'Devolvido' or coalesce(btrim(comentario_devolucao), '') <> '')
);
-- obra_id já é indexado pelo unique (obra_id, data).
create index diarios_status_idx on public.diarios (obra_id, status);
create trigger diarios_updated_at before update on public.diarios
  for each row execute function public.atualizar_updated_at();

-- Quem foi na obra no dia e o que fez.
create table public.diarios_equipe (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  diario_id uuid not null,
  contratado_id text not null,
  atividade text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint diarios_equipe_diario foreign key (diario_id, obra_id)
    references public.diarios (id, obra_id) on delete cascade,
  constraint diarios_equipe_uma_vez unique (diario_id, contratado_id)
);
create index diarios_equipe_obra_idx on public.diarios_equipe (obra_id);

-- Quanto foi feito de cada serviço no dia: fonte do avanço, da cascata e da medição.
create table public.diarios_execucoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  diario_id uuid not null,
  servico_id text not null,
  quantidade numeric(14,3) not null check (quantidade >= 0),
  qtd_pessoas integer not null check (qtd_pessoas >= 1),
  descricao text,
  created_at timestamptz not null default now(),
  constraint diarios_execucoes_diario foreign key (diario_id, obra_id)
    references public.diarios (id, obra_id) on delete cascade,
  constraint diarios_execucoes_um_por_servico unique (diario_id, servico_id)
);
create index diarios_execucoes_obra_idx on public.diarios_execucoes (obra_id);
create index diarios_execucoes_servico_idx on public.diarios_execucoes (servico_id);

-- Fotos do diário: por enquanto só a URL.
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  diario_id uuid not null,
  servico_id text,
  url text,
  legenda text,
  created_at timestamptz not null default now(),
  constraint fotos_diario foreign key (diario_id, obra_id)
    references public.diarios (id, obra_id) on delete cascade
);
create index fotos_obra_idx on public.fotos (obra_id);
create index fotos_diario_idx on public.fotos (diario_id);

-- ---------- Salvar o diário inteiro de uma vez ----------
-- Cabeçalho, equipe e lançamentos numa transação só: se a internet cair no meio,
-- nada fica pela metade. security invoker = obedece à RLS de quem chama.
create or replace function public.salvar_diario(
  p_obra_id uuid,
  p_id uuid,
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
    on conflict (obra_id, data) do update
      set clima_manha = excluded.clima_manha, clima_tarde = excluded.clima_tarde,
          ocorrencias = excluded.ocorrencias, qtd_pessoas = excluded.qtd_pessoas
    returning * into d;
  else
    update public.diarios
       set clima_manha = p_clima_manha, clima_tarde = p_clima_tarde,
           ocorrencias = nullif(btrim(p_ocorrencias), ''), qtd_pessoas = p_qtd_pessoas
     where id = p_id and obra_id = p_obra_id
    returning * into d;
    if not found then
      raise exception 'Este diário não é desta obra.';
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

-- ---------- RLS ligada e liberação para quem está logado ----------
alter table public.obras enable row level security;
alter table public.obras_clientes enable row level security;
alter table public.diarios enable row level security;
alter table public.diarios_equipe enable row level security;
alter table public.diarios_execucoes enable row level security;
alter table public.fotos enable row level security;

grant select, insert, update, delete on public.obras to authenticated;
grant select, insert, update, delete on public.obras_clientes to authenticated;
grant select, insert, update, delete on public.diarios to authenticated;
grant select, insert, update, delete on public.diarios_equipe to authenticated;
grant select, insert, update, delete on public.diarios_execucoes to authenticated;
grant select, insert, update, delete on public.fotos to authenticated;

revoke execute on function public.salvar_diario(uuid, uuid, date, text, text, text, integer, jsonb, jsonb) from public;
grant execute on function public.salvar_diario(uuid, uuid, date, text, text, text, integer, jsonb, jsonb) to authenticated;
