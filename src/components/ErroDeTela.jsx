import { Component } from 'react'

// Se uma tela quebrar, o resto do app (menu, topo) continua de pé e a pessoa vê o que fazer.
export class ErroDeTela extends Component {
  constructor(props) {
    super(props)
    this.state = { falhou: false }
  }

  static getDerivedStateFromError() {
    return { falhou: true }
  }

  render() {
    if (!this.state.falhou) return this.props.children
    return (
      <div className="empty" role="alert">
        <h2>Esta tela não abriu</h2>
        <p>Nada do que já estava salvo foi alterado. Abra outra tela pelo menu ou recarregue o app.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar o app</button>
      </div>
    )
  }
}
