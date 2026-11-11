import { useRef, useState } from 'react'
import { Carregando, Icon, Titulo, useAviso, useCarregar, useOcupado } from '../components'
import { HOJE, buscarOrcamento, buscarBaseGestao, listarContratados, salvarObra } from '../lib/dados'
import { diasUteisEntre } from '../lib/cronograma'
import { corDaSituacao, dataBR } from '../lib/formato'
import { montarAlocacoes } from '../lib/gestao'
import { useObra } from '../lib/ObraContext'
import { SITUACOES } from '../lib/obras'
import { reais } from '../lib/orcamento'

// Reduz a foto no navegador antes de guardar (máx. 1200px, qualidade 0.8).
function comprimirFoto(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image()
    img.onerror = () => falha(new Error('Não foi possível abrir esta imagem.'))
    img.onload = () => {
      const escala = Math.min(1, 1200 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      ok(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = URL.createObjectURL(arquivo)
  })
}

// Lista de obras: abrir obra é tela, não SQL (quem abre a próxima é a sócia, sem programador).
export function Obras({ goto }) {
  const { obras, obraId, trocarObra } = useObra()
  const abrir = (id) => { trocarObra(id); goto('fichaObra', {}, id) }
  return (
    <>
      <Titulo rotulo="Obras" titulo="Todas as obras">
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => goto('fichaObra', { nova: true })}>+ Nova obra</button>
      </Titulo>
      <div className="section">
        <div className="obras-grade">
          {obras.map((o) => (
            <button key={o.id} className="panel obra-card" onClick={() => abrir(o.id)}>
              <span className="obra-card-foto">
                {o.foto ? <img src={o.foto} alt="" /> : <Icon nome="obra" tamanho={44} />}
                <span className="obra-card-tags">
                  <span className={`tag ${corDaSituacao(o.situacao)}`}>{o.situacao}</span>
                  {o.id === obraId && <span className="tag slate">Aberta agora</span>}
                </span>
              </span>
              <span className="obra-card-texto">
                <span className="item-title">{o.nome}</span>
                <span className="label">{o.codigo}, {o.cliente_nome}</span>
                <span className="label">{dataBR(o.data_inicio)} a {dataBR(o.data_entrega)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

async function carregarFicha() {
  const [orc, b, c] = await Promise.all([buscarOrcamento(), buscarBaseGestao(), listarContratados()])
  return { data: { orcamento: orc.data, base: b.data, contratados: c.data }, erro: orc.erro ?? b.erro ?? c.erro }
}

const OBRA_VAZIA = {
  nome: '', codigo: '', situacao: 'Em andamento', endereco: '', data_inicio: '', data_entrega: '',
  cliente_nome: '', cliente_telefone: '', cliente_email: '', cliente_documento: '',
  descricao: '', informacoes: '', foto: null, documentos: [],
}

// Ficha da obra: foto, dados do contrato e do cliente, descrição, equipe e documentos. Só sócios.
export function FichaObra({ params, goto }) {
  const { obra, obraId, trocarObra, recarregarObras } = useObra()
  const nova = !!params.nova
  const estado = useCarregar(carregarFicha)
  const [editando, setEditando] = useState(nova)
  const [form, setForm] = useState(nova ? OBRA_VAZIA : obra)
  const [erros, setErros] = useState({})
  const [salvando, rodar] = useOcupado()
  const [aviso, avisar] = useAviso()
  const inputFoto = useRef(null)
  const inputDoc = useRef(null)

  const dados = editando ? form : obra
  const muda = (c) => (e) => setForm({ ...form, [c]: e.target.value })

  // Foto e documentos gravam na hora quando a obra já existe; numa obra nova, junto com o resto.
  const aplicar = async (alteracao) => {
    const novo = { ...(editando ? form : obra), ...alteracao }
    setForm(novo)
    if (nova) return
    const { erro } = await salvarObra({ ...obra, ...alteracao })
    if (erro) return avisar(erro)
    await recarregarObras()
  }

  const escolherFoto = async (e) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try { await aplicar({ foto: await comprimirFoto(arquivo) }) } catch (falha) { avisar(falha.message) }
  }

  const adicionarDocumento = async (e) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    await aplicar({ documentos: [...(dados.documentos ?? []), { id: `doc-${Date.now()}`, nome: arquivo.name }] })
    avisar('Documento listado. O arquivo fica guardado de verdade quando o banco entrar.')
  }

  const salvar = async (e) => {
    e.preventDefault()
    const r = await salvarObra({ ...form, codigo: form.codigo.trim() })
    if (r.erros) { setErros(r.erros); return }
    if (r.erro) return avisar(r.erro)
    setErros({})
    await recarregarObras()
    if (nova) { trocarObra(r.data.id); goto('fichaObra', {}, r.data.id); return }
    setEditando(false)
    avisar('Obra salva.')
  }

  const contrato = estado.data?.orcamento?.itens.reduce((s, i) => s + i.valor, 0)
  const equipe = estado.data && !nova
    ? [...new Set(montarAlocacoes(estado.data.base, estado.data.contratados, HOJE)
      .filter((a) => a.obra_id === obraId && a.prestador).map((a) => a.prestador))]
    : []
  const prazo = dados?.data_inicio && dados?.data_entrega && dados.data_entrega >= dados.data_inicio
    ? `${diasUteisEntre(dados.data_inicio, dados.data_entrega) + 1} dias úteis` : '—'

  const Campo = ({ c, rotulo, tipo = 'text', ...resto }) => (
    <div className="field">
      <label className="label" htmlFor={`o-${c}`}>{rotulo}</label>
      <input id={`o-${c}`} type={tipo} value={form[c] ?? ''} onChange={muda(c)} {...resto} />
      {erros[c] && <span className="acesso-erro">{erros[c]}</span>}
    </div>
  )

  return (
    <>
      <div className="ficha-capa">
        {dados?.foto ? <img src={dados.foto} alt={`Foto de ${dados.nome || 'obra'}`} /> : <Icon nome="obra" tamanho={64} />}
        <button className="btn ficha-capa-btn" onClick={() => inputFoto.current?.click()}>
          <Icon nome="camera" tamanho={20} />{dados?.foto ? 'Trocar foto' : 'Colocar foto'}
        </button>
        <input ref={inputFoto} type="file" accept="image/*" hidden onChange={escolherFoto} aria-label="Foto da obra" />
      </div>

      {editando ? (
        <form onSubmit={(e) => rodar(() => salvar(e))} noValidate>
          <Titulo rotulo={nova ? 'Nova obra' : `Editar ${obra.codigo}`} titulo={nova ? 'Cadastrar obra' : obra.nome} />
          <div className="section">
            <div className="section-head"><span className="label">A obra</span></div>
            <div className="panel form-painel">
              {Campo({ c: 'nome', rotulo: 'Nome da obra' })}
              {Campo({ c: 'codigo', rotulo: 'Código / apelido', placeholder: 'Ex.: AP302' })}
              {Campo({ c: 'endereco', rotulo: 'Endereço' })}
              <div className="field">
                <label className="label" htmlFor="o-situacao">Situação</label>
                <select id="o-situacao" value={form.situacao} onChange={muda('situacao')}>{SITUACOES.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              {Campo({ c: 'data_inicio', rotulo: 'Início', tipo: 'date' })}
              {Campo({ c: 'data_entrega', rotulo: 'Data-meta de entrega', tipo: 'date' })}
            </div>
          </div>
          <div className="section">
            <div className="section-head"><span className="label">Cliente</span></div>
            <div className="panel form-painel">
              {Campo({ c: 'cliente_nome', rotulo: 'Nome do contratante' })}
              {Campo({ c: 'cliente_documento', rotulo: 'CPF ou CNPJ' })}
              {Campo({ c: 'cliente_telefone', rotulo: 'Telefone', tipo: 'tel' })}
              {Campo({ c: 'cliente_email', rotulo: 'E-mail', tipo: 'email' })}
            </div>
          </div>
          <div className="section">
            <div className="section-head"><span className="label">Descrição e informações</span></div>
            <div className="panel form-painel">
              <div className="field full"><label className="label" htmlFor="o-descricao">Descrição da obra</label>
                <textarea id="o-descricao" value={form.descricao ?? ''} onChange={muda('descricao')} placeholder="O que será feito nesta obra" /></div>
              <div className="field full"><label className="label" htmlFor="o-informacoes">Informações importantes</label>
                <textarea id="o-informacoes" value={form.informacoes ?? ''} onChange={muda('informacoes')} placeholder="Horário permitido, regras do condomínio, contatos, chaves…" /></div>
            </div>
          </div>
          <div className="section ficha-acoes">
            <button type="button" className="btn" onClick={() => (nova ? goto('obras') : (setForm(obra), setErros({}), setEditando(false)))}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : nova ? 'Cadastrar obra' : 'Salvar'}</button>
          </div>
        </form>
      ) : (
        <>
          <div className="page-title ficha-titulo">
            <div>
              <h1>{obra.nome}</h1>
              <div className="tags">
                <span className="tag slate">{obra.codigo}</span>
                <span className={`tag ${corDaSituacao(obra.situacao)}`}>{obra.situacao}</span>
              </div>
            </div>
            <button className="btn" onClick={() => { setForm(obra); setEditando(true) }}>Editar</button>
          </div>
          <div className="section">
            <div className="panel ficha-dados">
              <Dado rotulo="Endereço" valor={obra.endereco} largo />
              <Dado rotulo="Contratante" valor={obra.cliente_nome} />
              <Dado rotulo="CPF ou CNPJ" valor={obra.cliente_documento} />
              <Dado rotulo="Telefone" valor={obra.cliente_telefone} />
              <Dado rotulo="E-mail" valor={obra.cliente_email} />
              <Dado rotulo="Contrato" valor={contrato ? reais(contrato) : 'Sem orçamento'} />
              <Dado rotulo="Prazo" valor={prazo} />
              <Dado rotulo="Início" valor={dataBR(obra.data_inicio)} />
              <Dado rotulo="Término" valor={dataBR(obra.data_entrega)} />
            </div>
          </div>
          <div className="section ficha-textos">
            <div className="panel ficha-bloco"><h2>Descrição da obra</h2><p>{obra.descricao || 'Nenhuma descrição ainda.'}</p></div>
            <div className="panel ficha-bloco"><h2>Informações importantes</h2><p>{obra.informacoes || 'Nada anotado ainda.'}</p></div>
          </div>
          <div className="section">
            <div className="panel ficha-bloco">
              <div className="ficha-bloco-topo">
                <h2>Equipe</h2>
                <button className="btn" onClick={() => goto('servicos')}>Alocar</button>
              </div>
              <Carregando estado={estado}>
                {equipe.length === 0 ? <p>Ninguém na equipe desta obra ainda.</p> : (
                  <div className="tags">{equipe.map((n) => <span key={n} className="tag slate">{n}</span>)}</div>
                )}
              </Carregando>
            </div>
          </div>
          <div className="section">
            <div className="panel ficha-bloco">
              <div className="ficha-bloco-topo">
                <h2>Documentos da obra</h2>
                <button className="btn" onClick={() => inputDoc.current?.click()}>Adicionar</button>
                <input ref={inputDoc} type="file" hidden onChange={adicionarDocumento} aria-label="Documento da obra" />
              </div>
              {(obra.documentos ?? []).length === 0 ? <p>Nenhum documento ainda. Coloque aqui as plantas e os documentos que a equipe mais usa.</p> : (
                obra.documentos.map((d) => (
                  <div key={d.id} className="ficha-doc"><Icon nome="orcamento" tamanho={20} /><span>{d.nome}</span></div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {aviso}
    </>
  )
}

function Dado({ rotulo, valor, largo }) {
  return (
    <div className={largo ? 'largo' : ''}>
      <span className="label">{rotulo}</span>
      <strong>{valor || '—'}</strong>
    </div>
  )
}
