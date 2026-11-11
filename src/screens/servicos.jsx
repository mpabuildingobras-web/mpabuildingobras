import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar } from '../components'
import { conflitosDoServico, detectarConflitos, diasCorridos, segundaDaSemana } from '../lib/conflitos'
import { HOJE, buscarBaseGestao, definirPrestadorDoServico, listarContratados } from '../lib/dados'
import { ddmm } from '../lib/formato'
import { montarAlocacoes } from '../lib/gestao'
import { useObra } from '../lib/ObraContext'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

async function carregar() {
  const [b, c] = await Promise.all([buscarBaseGestao(), listarContratados()])
  return { data: { base: b.data, contratados: c.data }, erro: b.erro ?? c.erro }
}

// Quem faz cada serviço desta obra, em que dias, e o alerta quando o prestador está
// em dois lugares ao mesmo tempo. Lê as outras obras só para achar o conflito. Só sócios.
export function Servicos({ goto }) {
  const { obraId, obra } = useObra()
  const estado = useCarregar(carregar)
  const [inicio, setInicio] = useState(segundaDaSemana(HOJE))
  const [aviso, avisar] = useAviso()

  const trocarPrestador = async (servicoId, contratadoId) => {
    const { erro } = await definirPrestadorDoServico(servicoId, contratadoId)
    if (erro) return avisar(erro)
    estado.recarregar()
  }

  const d = estado.data
  const alocacoes = d ? montarAlocacoes(d.base, d.contratados, HOJE) : []
  const conflitos = detectarConflitos(alocacoes, HOJE)
  const daObra = alocacoes.filter((a) => a.obra_id === obraId)
  const conflitosDaObra = conflitos.filter((c) => c.a.obra_id === obraId || c.b.obra_id === obraId)
  const dias = diasCorridos(inicio, 14)
  const avancar = () => setInicio(diasCorridos(inicio, 15)[14])
  const voltar = () => setInicio(duasSemanasAntes(inicio))

  return (
    <>
      <Titulo rotulo={`Serviços de ${obra?.codigo ?? ''}`} titulo="Quem faz o quê e quando" />
      <Carregando estado={estado}>
        {daObra.length === 0 ? (
          <Vazio icone="ferramenta" titulo="Esta obra ainda não tem serviços" texto="Cadastre os serviços no Cronograma e escolha aqui quem faz cada um." botao="Ir para o Cronograma" onBotao={() => goto('cronograma')} />
        ) : (
          <>
            {conflitosDaObra.length > 0 && (
              <div className="section">
                {conflitosDaObra.map((c) => {
                  const entre = c.tipo === 'Entre obras'
                  return (
                    <div key={`${c.a.servico_id}-${c.b.servico_id}`} className={`alerta ${entre ? 'red' : 'amber'}`} role="alert">
                      <strong>{entre ? `${c.prestador} está em duas obras nas mesmas datas` : `${c.prestador} tem dois serviços nas mesmas datas`}</strong>
                      <span>{c.a.obra_codigo}: {c.a.servico}. {c.b.obra_codigo}: {c.b.servico}.</span>
                      <span className="label">De {ddmm(c.de)} a {ddmm(c.ate)}, {c.dias.length} dias úteis</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="section">
              <div className="gantt-tools">
                <div className="seg seg-2" aria-label="Período">
                  <button onClick={voltar} aria-label="Duas semanas antes">‹</button>
                  <button onClick={avancar} aria-label="Duas semanas depois">›</button>
                </div>
                <span className="label">{ddmm(dias[0])} a {ddmm(dias[13])}</span>
                <button className="btn" onClick={() => setInicio(segundaDaSemana(HOJE))}>Hoje</button>
              </div>
              {daObra.map((a) => {
                const dela = conflitosDoServico(conflitos, a.servico_id)
                const diasConflito = new Set(dela.flatMap((c) => c.dias))
                const entre = dela.some((c) => c.tipo === 'Entre obras')
                return (
                  <div key={a.servico_id} className="serv-linha">
                    <div className="serv-linha-topo">
                      <div className="item-title">{a.servico}</div>
                      <span className={`tag ${a.concluido ? 'green' : a.cor === 'red' ? 'red' : 'slate'}`}>{a.situacao}</span>
                    </div>
                    <div className="field" style={{ marginTop: 8 }}>
                      <label className="label" htmlFor={`p-${a.servico_id}`}>Prestador</label>
                      <select id={`p-${a.servico_id}`} value={a.prestador_id ?? ''} onChange={(e) => trocarPrestador(a.servico_id, e.target.value)}>
                        <option value="" disabled>Escolha o prestador</option>
                        {d.contratados.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.funcao})</option>)}
                      </select>
                    </div>
                    {dela.length > 0 && (
                      <div className="tags"><span className={`tag ${entre ? 'solid-red' : 'amber'}`}>{entre ? 'Conflito entre obras' : 'Atenção: mesmas datas'}</span></div>
                    )}
                    <div className="dias-faixa" aria-label={`De ${ddmm(a.inicio)} a ${ddmm(a.termino)}`}>
                      {dias.map((dia) => {
                        const sem = new Date(`${dia}T12:00:00`).getDay()
                        const previsto = dia >= a.inicio && dia <= a.termino && sem % 6 !== 0
                        const classe = [
                          'dia',
                          sem % 6 === 0 ? 'fds' : '',
                          previsto ? 'previsto' : '',
                          previsto && a.concluido ? 'feito' : '',
                          previsto && diasConflito.has(dia) ? (entre ? 'conflito' : 'atencao') : '',
                          dia === HOJE ? 'hoje' : '',
                        ].join(' ')
                        return <span key={dia} className={classe}><i>{DIAS_SEMANA[sem]}</i>{dia.slice(8)}</span>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Carregando>
      {aviso}
    </>
  )
}

// 14 dias antes (mesma conta de calendário, sem fuso).
function duasSemanasAntes(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d - 14)).toISOString().slice(0, 10)
}
