import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar } from '../components'
import { buscarOrcamento, carregarCronograma } from '../lib/dados'
import { calcularCascata, statusQueContam } from '../lib/cronograma'
import { dataBR } from '../lib/formato'
import { HOJE } from '../lib/mockData'
import { porcento, reais, resumirOrcamento } from '../lib/orcamento'

// Busca o orçamento e o executado de cada item na visão de quem está olhando.
export async function carregarResumoOrcamento(perfil) {
  const [orc, cr] = await Promise.all([buscarOrcamento(), carregarCronograma()])
  if (orc.erro || cr.erro) return { data: null, erro: orc.erro ?? cr.erro }
  if (!orc.data) return { data: { orcamento: null, obra: cr.data.obra }, erro: null }
  const { obra, servicos, execucoes } = cr.data
  const c = calcularCascata({ servicos, execucoes, obra, hoje: HOJE, contam: statusQueContam(perfil) })
  const fracoes = new Map(c.linhas.map((l) => [l.id, l.pct]))
  return { data: { orcamento: orc.data, obra, resumo: resumirOrcamento(orc.data.itens, fracoes), cascata: c }, erro: null }
}

export function Orcamento({ perfil }) {
  const estado = useCarregar(() => carregarResumoOrcamento(perfil))
  const [aviso, avisar] = useAviso()
  const socio = perfil === 'socio'
  const importar = () => avisar('A importação da planilha .xlsx entra na Fase 1, junto com o banco.')
  return (
    <Carregando estado={estado}>
      {estado.data && !estado.data.orcamento && (
        <>
          <Titulo rotulo="Orçamento do cliente" titulo={`Orçamento de ${estado.data.obra.codigo}`} />
          <Vazio icone="orcamento"
            titulo={socio ? 'Esta obra ainda não tem orçamento' : 'O orçamento da sua obra ainda não foi publicado'}
            texto={socio ? 'Suba a planilha no seu modelo (aba ORÇAMENTO) e o sistema monta as etapas e os serviços.' : 'Assim que a engenheira publicar, você acompanha aqui cada etapa.'}
            botao={socio ? 'Importar planilha' : null} onBotao={importar} />
        </>
      )}
      {estado.data?.orcamento && <Conteudo dados={estado.data} socio={socio} importar={importar} />}
      {aviso}
    </Carregando>
  )
}

function Conteudo({ dados, socio, importar }) {
  const { orcamento, resumo } = dados
  const [aberta, setAberta] = useState(null)
  return (
    <>
      <Titulo rotulo={orcamento.importado_em ? `Importado em ${dataBR(orcamento.importado_em)}` : 'Cadastrado no Cronograma'} titulo={orcamento.titulo}>
        <p>{socio
          ? 'Você vê o custo de mão de obra e a margem. Conta também o diário que está aguardando aprovação.'
          : 'O valor do orçamento e o que já foi executado, conferido nos diários aprovados.'}</p>
      </Titulo>
      <div className="section">
        {socio && <button className="btn btn-outline-acao" onClick={importar}>Baixar planilha original</button>}
        <div className="stats">
          <div className="stat"><div className="n num money">{reais(resumo.total)}</div><span className="label">Valor do contrato</span></div>
          <div className="stat"><div className="n num money c-acao">{reais(resumo.executado)}</div><span className="label">Executado</span></div>
          <div className="stat">
            {socio ? (
              <><div className="n num money">{reais(resumo.margem)}</div><span className="label">Margem prevista</span><span className="sub c-acao">custo MO {reais(resumo.custoMo)}</span></>
            ) : (
              <><div className="n num money">{reais(resumo.saldo)}</div><span className="label">Saldo a executar</span></>
            )}
          </div>
        </div>
        <div className="panel orc-geral">
          <div className="orc-geral-top"><span className="label">Avanço da obra pelo valor</span><b className="num">{porcento(resumo.fracao)}</b></div>
          <div className="bar big"><i style={{ width: `${resumo.fracao * 100}%` }}></i></div>
        </div>
      </div>
      <div className="section">
        <div className="section-head">
          <span className="label">Etapas, na ordem da planilha</span>
          <span className="label">Toque para ver os itens</span>
        </div>
        {resumo.etapas.map((e) => {
          const p = e.fracao
          const aberto = aberta === e.frente
          return (
            <div key={e.frente} className={`etapa${aberto ? ' open' : ''}`}>
              <button aria-expanded={aberto} onClick={() => setAberta(aberto ? null : e.frente)}>
                <span className="etapa-n">{e.numero}</span>
                <span className="etapa-nome">{e.frente}</span>
                <span className={`etapa-pct num ${p >= 1 ? 'c-green' : ''}`}>{porcento(p)}</span>
                <span className="etapa-vals">
                  <span className="label">Orçado {reais(e.valor)}</span>
                  <span className="label">Executado {reais(e.executado)}</span>
                  {socio && <span className="label margem">Margem {reais(e.valor - e.custo_mo)}</span>}
                </span>
                <span className={`bar ${p >= 1 ? 'done' : ''}`}><i style={{ width: `${Math.min(p, 1) * 100}%` }}></i></span>
              </button>
              <div className="etapa-itens">
                {e.itens.map((i) => (
                  <div key={i.id} className="it">
                    <span className="it-nome"><span className="label">{i.numero_item}</span> {i.nome}</span>
                    <b className="num">{porcento(i.fracao)}</b>
                    <span className="label">{reais(i.valor)} ({i.unidade}){socio && `, custo MO ${reais(i.custo_mo)}`}</span>
                    <span className="label">{reais(i.executado)}</span>
                    {i.obs && <span className="it-obs">{i.obs}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
