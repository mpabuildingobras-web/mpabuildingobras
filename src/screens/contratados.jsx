import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import { detectarConflitos } from '../lib/conflitos'
import { HOJE, buscarBaseGestao, listarContratados, salvarContratado } from '../lib/dados'
import { montarAlocacoes } from '../lib/gestao'

async function carregar() {
  const [c, b] = await Promise.all([listarContratados(), buscarBaseGestao()])
  return { data: { contratados: c.data, base: b.data }, erro: c.erro ?? b.erro }
}

// A equipe da empresa: funcionários e prestadores. Só sócios. No diário aparecem só os nomes.
export function Contratados() {
  const estado = useCarregar(carregar)
  const [criando, setCriando] = useState(false)
  const [aviso, avisar] = useAviso()
  const d = estado.data
  const alocacoes = d ? montarAlocacoes(d.base, d.contratados, HOJE) : []
  const conflitos = detectarConflitos(alocacoes, HOJE).filter((c) => c.tipo === 'Entre obras')
  const obrasDe = (id) => [...new Set(alocacoes.filter((a) => a.prestador_id === id && !a.concluido).map((a) => a.obra_codigo))]
  return (
    <>
      <Titulo rotulo="Contratados" titulo="Equipe e prestadores">
        <p>A equipe é da empresa, não de uma obra: a mesma lista vale para todas.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setCriando(!criando)}>{criando ? 'Fechar' : '+ Novo contratado'}</button>
      </Titulo>
      {criando && (
        <div className="section">
          <FormContratado onSalvo={() => { setCriando(false); avisar('Contratado cadastrado.'); estado.recarregar() }} />
        </div>
      )}
      <Carregando estado={estado}>
        {d?.contratados.length === 0 ? (
          <Vazio icone="equipe" titulo="Ninguém cadastrado ainda" texto="Cadastre a equipe e os prestadores para lançar o diário e alocar os serviços." botao="Cadastrar o primeiro" onBotao={() => setCriando(true)} />
        ) : (
          <div className="section">
            {d?.contratados.map((c) => {
              const obras = obrasDe(c.id)
              const emConflito = conflitos.some((x) => x.prestador_id === c.id)
              return (
                <div key={c.id} className="item" style={{ cursor: 'default', gridTemplateColumns: '1fr auto' }}>
                  <span>
                    <span className="item-title">{c.nome}</span>
                    <span className="label item-meta" style={{ display: 'block' }}>{c.funcao}{c.empresa ? `, ${c.empresa}` : ''}</span>
                    <span className="tags">
                      {obras.length === 0 && <span className="tag slate">Sem serviço em aberto</span>}
                      {obras.map((o) => <span key={o} className="tag slate">{o}</span>)}
                      {emConflito && <span className="tag solid-red">Conflito de datas</span>}
                    </span>
                  </span>
                  <span className="tag slate">{c.tipo}</span>
                </div>
              )
            })}
          </div>
        )}
      </Carregando>
      {aviso}
    </>
  )
}

function FormContratado({ onSalvo }) {
  const [d, setD] = useState({ nome: '', funcao: '', empresa: '', tipo: 'Prestador' })
  const [erro, setErro] = useState('')
  const [salvando, rodar] = useOcupado()
  const muda = (c) => (e) => setD({ ...d, [c]: e.target.value })
  const salvar = async (e) => {
    e.preventDefault()
    const { erro: falha } = await salvarContratado(d)
    if (falha) return setErro(falha)
    onSalvo()
  }
  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field"><label className="label" htmlFor="c-n">Nome</label><input id="c-n" value={d.nome} onChange={muda('nome')} /></div>
      <div className="field"><label className="label" htmlFor="c-f">Função</label><input id="c-f" value={d.funcao} onChange={muda('funcao')} placeholder="Ex.: pedreiro" /></div>
      <div className="field"><label className="label" htmlFor="c-e">Empresa (se houver)</label><input id="c-e" value={d.empresa} onChange={muda('empresa')} /></div>
      <div className="field"><label className="label" htmlFor="c-t">Tipo</label>
        <select id="c-t" value={d.tipo} onChange={muda('tipo')}><option>Prestador</option><option>Funcionário</option></select></div>
      {erro && <p className="acesso-erro full">{erro}</p>}
      <button type="submit" className="btn btn-primary full" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
    </form>
  )
}
