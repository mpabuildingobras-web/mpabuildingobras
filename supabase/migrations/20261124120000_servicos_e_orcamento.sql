-- Serviços (cronograma) e orçamento no banco (24/11/2026), pelo PRD-BACKEND.md:
-- frentes, servicos, servicos_dependencias, orcamentos, servicos_valores (TOTAL ENG.),
-- servicos_custos (TOTAL MO) e quantitativos (aba QUANTITATIVO do estudo de viabilidade).
--
-- Quem vê o quê (docs/permissoes/QUEM-PODE-O-QUE.md):
--   frentes, servicos, dependências .. sócio; auxiliar e cliente das obras liberadas a eles
--   orcamentos, servicos_valores ..... sócio; cliente da obra dele (é o valor ENG. que ele paga)
--   servicos_custos (MO) ............. só sócio. Nunca o cliente, nunca o auxiliar
--   quantitativos .................... só sócio (por enquanto)
--   gravar, mudar e apagar ........... só sócio
--
-- Diferenças do PRD, de propósito:
--   - responsavel_id é texto: os contratados ainda moram nos dados de exemplo (como diarios_equipe.contratado_id).
--   - duracao_dias chega preenchida (5 dias úteis, um serviço depois do outro): a sócia ajusta no Cronograma.
--   - orcamentos.arquivo pode ficar vazio: o Storage ainda não existe.
--   - reimportar é permitido enquanto a obra não tem nenhum lançamento de diário (o PRD recusava sempre).
--   - quantitativos é tabela nova (o PRD não tinha).
--
-- diarios_execucoes.servico_id e fotos.servico_id continuam texto (guardam o id do serviço).
--
-- DESFAZER (apaga as tabelas novas e tudo o que estiver nelas):
--   drop function if exists public.importar_orcamento(uuid, text, numeric, jsonb, jsonb);
--   drop table if exists public.quantitativos, public.servicos_custos, public.servicos_valores,
--     public.orcamentos, public.servicos_dependencias, public.servicos, public.frentes cascade;
--   drop function if exists public.dependencia_sem_ciclo();

begin;

-- ---------- frentes ----------
create table public.frentes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  nome text not null check (btrim(nome) <> ''),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint frentes_id_obra unique (id, obra_id),
  constraint frentes_nome_unico unique (obra_id, nome)
);
create index frentes_obra_idx on public.frentes (obra_id);

-- ---------- servicos ----------
-- Unidades: as mesmas de UNIDADES em src/lib/lancamentos.js, mais "%" do item percentual.
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  frente_id uuid not null,
  numero_item text,
  nome text not null check (btrim(nome) <> ''),
  unidade text not null check (unidade in ('m²', 'm', 'ml', 'm³', 'un', 'vb', 'kg', '%')),
  tipo text not null default 'Normal' check (tipo in ('Normal', 'Percentual')),
  percentual numeric(6,3),
  forma_medicao text not null default 'Percentual' check (forma_medicao in ('Quantidade', 'Percentual')),
  quantidade_prevista numeric(14,3) not null default 100 check (quantidade_prevista > 0),
  observacao text,
  aditivo boolean not null default false,
  duracao_dias integer check (duracao_dias >= 1),
  responsavel_id text,
  meta_diaria_manual numeric(14,3),
  concluido_em date,
  created_at timestamptz not null default now(),
  constraint servicos_id_obra unique (id, obra_id),
  constraint servicos_frente foreign key (frente_id, obra_id) references public.frentes(id, obra_id) on delete restrict,
  constraint servicos_percentual_tem_valor check (tipo <> 'Percentual' or percentual is not null)
);
create index servicos_obra_idx on public.servicos (obra_id);
create index servicos_frente_idx on public.servicos (frente_id);

-- ---------- servicos_dependencias ----------
create table public.servicos_dependencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  servico_id uuid not null,
  depende_de_id uuid not null,
  created_at timestamptz not null default now(),
  constraint dependencias_uma_vez unique (servico_id, depende_de_id),
  constraint dependencias_nao_de_si check (servico_id <> depende_de_id),
  constraint dependencias_servico foreign key (servico_id, obra_id) references public.servicos(id, obra_id) on delete cascade,
  constraint dependencias_anterior foreign key (depende_de_id, obra_id) references public.servicos(id, obra_id) on delete restrict
);
create index dependencias_obra_idx on public.servicos_dependencias (obra_id);
create index dependencias_anterior_idx on public.servicos_dependencias (depende_de_id);

-- O banco recusa a dependência que fecha um ciclo (A espera B, que espera A).
create or replace function public.dependencia_sem_ciclo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    with recursive cadeia(id) as (
      select new.depende_de_id
      union
      select d.depende_de_id from public.servicos_dependencias d join cadeia c on d.servico_id = c.id
    )
    select 1 from cadeia where id = new.servico_id
  ) then
    raise exception 'Esta dependência fecha um ciclo no cronograma: um serviço acabaria esperando por ele mesmo.';
  end if;
  return new;
end;
$$;
create trigger dependencias_sem_ciclo before insert or update on public.servicos_dependencias
  for each row execute function public.dependencia_sem_ciclo();

-- ---------- orcamentos ----------
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null unique references public.obras(id) on delete restrict,
  titulo text not null,
  arquivo text,
  total_cliente numeric(14,2) not null check (total_cliente >= 0),
  qtd_etapas integer not null,
  qtd_itens integer not null,
  importado_por uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- servicos_valores (TOTAL ENG.: sócio e cliente) ----------
create table public.servicos_valores (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  servico_id uuid not null unique,
  valor_cliente numeric(14,2) not null check (valor_cliente >= 0),
  created_at timestamptz not null default now(),
  constraint valores_servico foreign key (servico_id, obra_id) references public.servicos(id, obra_id) on delete cascade
);
create index valores_obra_idx on public.servicos_valores (obra_id);

-- ---------- servicos_custos (TOTAL MO: só sócio) ----------
create table public.servicos_custos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null,
  servico_id uuid not null unique,
  custo_mo numeric(14,2) not null check (custo_mo >= 0),
  created_at timestamptz not null default now(),
  constraint custos_servico foreign key (servico_id, obra_id) references public.servicos(id, obra_id) on delete cascade
);
create index custos_mo_obra_idx on public.servicos_custos (obra_id);

-- ---------- quantitativos (aba QUANTITATIVO: só sócio) ----------
create table public.quantitativos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  ordem integer not null,
  comodo text not null,
  descricao text not null,
  quantidade numeric(14,3),
  unidade text,
  texto text,
  created_at timestamptz not null default now()
);
create index quantitativos_obra_idx on public.quantitativos (obra_id);

-- ---------- RLS e liberação (só para quem fez login; nunca anon, nunca grant all) ----------
alter table public.frentes enable row level security;
alter table public.servicos enable row level security;
alter table public.servicos_dependencias enable row level security;
alter table public.orcamentos enable row level security;
alter table public.servicos_valores enable row level security;
alter table public.servicos_custos enable row level security;
alter table public.quantitativos enable row level security;

revoke all on public.frentes, public.servicos, public.servicos_dependencias, public.orcamentos,
  public.servicos_valores, public.servicos_custos, public.quantitativos from anon;
grant select, insert, update, delete on public.frentes to authenticated;
grant select, insert, update, delete on public.servicos to authenticated;
grant select, insert, update, delete on public.servicos_dependencias to authenticated;
grant select, insert, update, delete on public.orcamentos to authenticated;
grant select, insert, update, delete on public.servicos_valores to authenticated;
grant select, insert, update, delete on public.servicos_custos to authenticated;
grant select, insert, update, delete on public.quantitativos to authenticated;

-- Cronograma: cada um vê o das obras dele; só sócio grava.
create policy frentes_ver on public.frentes for select to authenticated using (obra_id in (select public.minhas_obras()));
create policy frentes_gravar on public.frentes for insert to authenticated with check ((select public.sou_socio()));
create policy frentes_mudar on public.frentes for update to authenticated using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy frentes_apagar on public.frentes for delete to authenticated using ((select public.sou_socio()));

create policy servicos_ver on public.servicos for select to authenticated using (obra_id in (select public.minhas_obras()));
create policy servicos_gravar on public.servicos for insert to authenticated with check ((select public.sou_socio()));
create policy servicos_mudar on public.servicos for update to authenticated using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy servicos_apagar on public.servicos for delete to authenticated using ((select public.sou_socio()));

create policy dependencias_ver on public.servicos_dependencias for select to authenticated using (obra_id in (select public.minhas_obras()));
create policy dependencias_gravar on public.servicos_dependencias for insert to authenticated with check ((select public.sou_socio()));
create policy dependencias_mudar on public.servicos_dependencias for update to authenticated using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy dependencias_apagar on public.servicos_dependencias for delete to authenticated using ((select public.sou_socio()));

-- Valor ao cliente (ENG.) e o orçamento: sócio e o cliente da obra. O auxiliar nunca.
create policy orcamentos_ver on public.orcamentos for select to authenticated
  using ((select public.sou_socio()) or ((select public.meu_perfil()) = 'cliente' and obra_id in (select public.minhas_obras())));
create policy orcamentos_gravar on public.orcamentos for insert to authenticated with check ((select public.sou_socio()));
create policy orcamentos_mudar on public.orcamentos for update to authenticated using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy orcamentos_apagar on public.orcamentos for delete to authenticated using ((select public.sou_socio()));

create policy valores_ver on public.servicos_valores for select to authenticated
  using ((select public.sou_socio()) or ((select public.meu_perfil()) = 'cliente' and obra_id in (select public.minhas_obras())));
create policy valores_gravar on public.servicos_valores for insert to authenticated with check ((select public.sou_socio()));
create policy valores_mudar on public.servicos_valores for update to authenticated using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy valores_apagar on public.servicos_valores for delete to authenticated using ((select public.sou_socio()));

-- Custo de mão de obra (MO) e quantitativo: só sócio, em tudo.
create policy custos_mo_socio on public.servicos_custos for all to authenticated
  using ((select public.sou_socio())) with check ((select public.sou_socio()));
create policy quantitativos_socio on public.quantitativos for all to authenticated
  using ((select public.sou_socio())) with check ((select public.sou_socio()));

-- ---------- Importar o estudo de viabilidade: tudo ou nada ----------
-- Roda com a permissão de quem chama (security invoker): as regras acima valem; só sócio consegue.
-- p_etapas: [{ numero, nome, itens: [{ numero_item, nome, unidade, tipo, percentual, total_mo, total_eng, obs }] }]
-- p_quantitativo: [{ comodo, descricao, quantidade, unidade, texto }]
create or replace function public.importar_orcamento(p_obra uuid, p_titulo text, p_total numeric, p_etapas jsonb, p_quantitativo jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  etapa jsonb;
  item jsonb;
  v_frente uuid;
  v_servico uuid;
  v_anterior uuid := null;
  v_itens integer := 0;
  v_soma numeric := 0;
  v_ordem integer := 0;
begin
  if not (select public.sou_socio()) then
    raise exception 'Só sócio importa o orçamento.';
  end if;
  if not exists (select 1 from public.obras where id = p_obra) then
    raise exception 'Obra não encontrada.';
  end if;
  if exists (select 1 from public.diarios_execucoes where obra_id = p_obra) then
    raise exception 'Esta obra já tem serviços lançados nos diários: importar de novo apagaria esse histórico. Nada foi salvo.';
  end if;

  select coalesce(sum((i ->> 'total_eng')::numeric), 0) into v_soma
    from jsonb_array_elements(p_etapas) e, jsonb_array_elements(e -> 'itens') i;
  if abs(v_soma - p_total) > 0.05 then
    raise exception 'A soma dos serviços não bate com o total da planilha. Nada foi salvo.';
  end if;

  -- Obra sem diário: o orçamento anterior (se houver) sai inteiro.
  delete from public.servicos_dependencias where obra_id = p_obra;
  delete from public.servicos where obra_id = p_obra;
  delete from public.frentes where obra_id = p_obra;
  delete from public.orcamentos where obra_id = p_obra;
  delete from public.quantitativos where obra_id = p_obra;

  for etapa in select * from jsonb_array_elements(p_etapas) loop
    insert into public.frentes (obra_id, nome, ordem)
      values (p_obra, btrim(etapa ->> 'nome'), (etapa ->> 'numero')::integer)
      returning id into v_frente;
    for item in select * from jsonb_array_elements(etapa -> 'itens') loop
      insert into public.servicos (obra_id, frente_id, numero_item, nome, unidade, tipo, percentual,
                                   forma_medicao, quantidade_prevista, observacao, duracao_dias)
        values (p_obra, v_frente, item ->> 'numero_item', btrim(item ->> 'nome'), item ->> 'unidade',
                item ->> 'tipo', nullif(item ->> 'percentual', '')::numeric,
                'Percentual', 100, nullif(btrim(coalesce(item ->> 'obs', '')), ''),
                case when item ->> 'tipo' = 'Normal' then 5 end)
        returning id into v_servico;
      insert into public.servicos_valores (obra_id, servico_id, valor_cliente) values (p_obra, v_servico, (item ->> 'total_eng')::numeric);
      insert into public.servicos_custos (obra_id, servico_id, custo_mo) values (p_obra, v_servico, (item ->> 'total_mo')::numeric);
      -- Cada serviço Normal começa depois do anterior; a sócia ajusta no Cronograma.
      if item ->> 'tipo' = 'Normal' then
        if v_anterior is not null then
          insert into public.servicos_dependencias (obra_id, servico_id, depende_de_id) values (p_obra, v_servico, v_anterior);
        end if;
        v_anterior := v_servico;
      end if;
      v_itens := v_itens + 1;
    end loop;
  end loop;

  insert into public.orcamentos (obra_id, titulo, total_cliente, qtd_etapas, qtd_itens)
    values (p_obra, coalesce(nullif(btrim(p_titulo), ''), 'Orçamento importado'), p_total, jsonb_array_length(p_etapas), v_itens);

  for item in select * from jsonb_array_elements(coalesce(p_quantitativo, '[]'::jsonb)) loop
    v_ordem := v_ordem + 1;
    insert into public.quantitativos (obra_id, ordem, comodo, descricao, quantidade, unidade, texto)
      values (p_obra, v_ordem, coalesce(nullif(btrim(item ->> 'comodo'), ''), 'Geral'), btrim(item ->> 'descricao'),
              nullif(item ->> 'quantidade', '')::numeric, nullif(item ->> 'unidade', ''), nullif(item ->> 'texto', ''));
  end loop;

  return jsonb_build_object('qtd_itens', v_itens, 'qtd_quantitativo', v_ordem);
end;
$$;
revoke execute on function public.importar_orcamento(uuid, text, numeric, jsonb, jsonb) from public, anon;
grant execute on function public.importar_orcamento(uuid, text, numeric, jsonb, jsonb) to authenticated;

commit;
