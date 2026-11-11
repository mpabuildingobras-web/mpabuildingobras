// Gera o supabase-seed.sql (raiz) a partir do src/lib/mockData.js: o banco nasce com os
// mesmos dados de exemplo que o app mostrava. Rode de novo se o mock mudar.
//   node scripts/gerar-seed.mjs
import { writeFileSync } from 'node:fs'
import * as mock from '../src/lib/mockData.js'

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v === null || v === undefined ? 'null' : String(v))
// Id do mock ('d01', 'e03', 'p4') vira um uuid fixo, sempre o mesmo: rodar o seed de novo não duplica.
const hex = (s) => [...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padStart(12, '0').slice(-12)
const uuidDiario = (id) => `dd000000-0000-4000-8000-${hex(id)}`
const uuidFoto = (id) => `ff000000-0000-4000-8000-${hex(id)}`

const idsObras = mock.obras.map((o) => q(o.id)).join(', ')
const linhas = []
linhas.push(`-- Carga inicial (seed) das duas obras de exemplo. GERADO por scripts/gerar-seed.mjs a partir
-- de src/lib/mockData.js: não edite à mão, mude o mock e gere de novo.
-- Pode rodar quantas vezes quiser: ATENÇÃO, ele apaga e recria os diários dessas duas obras
-- (e só delas). Dados de exemplo, todos fictícios.
begin;

delete from public.diarios where obra_id in (${idsObras});
`)

for (const o of mock.obras) {
  linhas.push(`insert into public.obras (id, codigo, nome, cliente_nome, endereco, data_inicio, data_entrega, situacao, descricao, informacoes, foto, documentos)
values (${q(o.id)}, ${q(o.codigo)}, ${q(o.nome)}, ${q(o.cliente_nome)}, ${q(o.endereco)}, ${q(o.data_inicio)}, ${q(o.data_entrega)}, ${q(o.situacao)}, ${q(o.descricao)}, ${q(o.informacoes)}, ${q(o.foto)}, ${q(JSON.stringify(o.documentos ?? []))}::jsonb)
on conflict (id) do update set codigo = excluded.codigo, nome = excluded.nome, cliente_nome = excluded.cliente_nome, endereco = excluded.endereco,
  data_inicio = excluded.data_inicio, data_entrega = excluded.data_entrega, situacao = excluded.situacao, descricao = excluded.descricao,
  informacoes = excluded.informacoes, foto = excluded.foto, documentos = excluded.documentos;
insert into public.obras_clientes (obra_id, telefone, email, documento)
values (${q(o.id)}, ${q(o.cliente_telefone)}, ${q(o.cliente_email)}, ${q(o.cliente_documento)})
on conflict (obra_id) do update set telefone = excluded.telefone, email = excluded.email, documento = excluded.documento;
`)
}

const valores = (lista) => lista.join(',\n') + ';\n'

linhas.push('insert into public.diarios (id, obra_id, data, clima_manha, clima_tarde, qtd_pessoas, ocorrencias, status, comentario_devolucao, enviado_por, enviado_em) values')
linhas.push(valores(mock.diarios.map((d) => {
  const enviadoEm = d.enviado_as ? q(`${d.data} ${d.enviado_as.replace('h', ':')}:00-03`) : 'null'
  return `(${q(uuidDiario(d.id))}, ${q(d.obra_id)}, ${q(d.data)}, ${q(d.clima_manha)}, ${q(d.clima_tarde)}, ${n(d.qtd_pessoas)}, ${q(d.ocorrencias)}, ${q(d.status)}, ${q(d.comentario_devolucao)}, ${q(d.enviado_por)}, ${enviadoEm})`
})))

const obraDo = (diarioId) => mock.diarios.find((d) => d.id === diarioId).obra_id
const equipe = mock.diarios.flatMap((d) => (d.equipe ?? []).map((cid, i) =>
  `(${q(d.obra_id)}, ${q(uuidDiario(d.id))}, ${q(cid)}, ${q(d.atividades?.[cid])}, ${i})`))
linhas.push('insert into public.diarios_equipe (obra_id, diario_id, contratado_id, atividade, ordem) values')
linhas.push(valores(equipe))

linhas.push('insert into public.diarios_execucoes (obra_id, diario_id, servico_id, quantidade, qtd_pessoas, descricao) values')
linhas.push(valores(mock.execucoes.map((e) =>
  `(${q(obraDo(e.diario_id))}, ${q(uuidDiario(e.diario_id))}, ${q(e.servico_id)}, ${n(e.quantidade)}, ${n(e.qtd_pessoas)}, ${q(e.descricao)})`)))

linhas.push('insert into public.fotos (id, obra_id, diario_id, servico_id, url, legenda) values')
linhas.push(valores(mock.fotos.map((f) =>
  `(${q(uuidFoto(f.id))}, ${q(obraDo(f.diario_id))}, ${q(uuidDiario(f.diario_id))}, ${q(f.servico_id)}, ${q(f.url)}, ${q(f.legenda)})`)))

linhas.push('commit;\n')
writeFileSync(new URL('../supabase-seed.sql', import.meta.url), linhas.join('\n'))
console.log(`supabase-seed.sql: ${mock.obras.length} obras, ${mock.diarios.length} diários, ${equipe.length} pessoas na equipe, ${mock.execucoes.length} lançamentos, ${mock.fotos.length} fotos.`)
