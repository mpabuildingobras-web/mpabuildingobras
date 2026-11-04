// Conta criada pelo próprio cliente: não vê nada até um sócio liberar e vincular a obra.
export default function Aguardando({ onSair }) {
  return (
    <div className="acesso">
      <div className="acesso-marca"><span className="acesso-logo">GESTÃO <b>DE OBRA</b></span></div>
      <div className="acesso-cartao estreito">
        <div className="acesso-cartao-topo">Portal do cliente</div>
        <div className="acesso-coluna">
          <h2>Conta criada!</h2>
          <p className="acesso-nota" style={{ textAlign: 'left' }}>
            Seu acesso está aguardando a liberação da engenharia. Assim que a sua obra for vinculada à sua conta,
            você entra com o mesmo e-mail e senha e acompanha avanço, orçamento, pagamentos e fotos.
          </p>
          <button className="acesso-btn principal" onClick={onSair}>Voltar ao início</button>
        </div>
      </div>
    </div>
  )
}
