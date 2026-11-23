// Conta que ainda não foi liberada (pendente) ou que perdeu o acesso (bloqueada): não vê nada.
export default function Aguardando({ bloqueado, onSair }) {
  return (
    <div className="acesso">
      <div className="acesso-marca"><img className="acesso-logo-img" src="/logo-mpa.webp" alt="MPA Building, Gestão de Obras" /></div>
      <div className="acesso-cartao estreito">
        <div className="acesso-cartao-topo">{bloqueado ? 'Acesso encerrado' : 'Aguardando liberação'}</div>
        <div className="acesso-coluna">
          <h2>{bloqueado ? 'Seu acesso foi encerrado' : 'Quase lá!'}</h2>
          <p className="acesso-nota" style={{ textAlign: 'left' }}>
            {bloqueado
              ? 'Esta conta não tem mais acesso ao app. Se isso for um engano, fale com um dos sócios da MPA Building.'
              : 'Sua conta existe, mas ainda está aguardando a liberação de um dos sócios. Assim que a sua obra for liberada, entre de novo com o mesmo e-mail e senha.'}
          </p>
          <button className="acesso-btn principal" onClick={onSair}>Sair</button>
        </div>
      </div>
    </div>
  )
}
