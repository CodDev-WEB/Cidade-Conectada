import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RotaProtegida } from './components/RotaProtegida'
import { AuthProvider } from './contexts/AuthContext'
import { Cadastro } from './pages/Cadastro'
import { DenunciaDetalhe } from './pages/DenunciaDetalhe'
import { Entrar } from './pages/Entrar'
import { Mapa } from './pages/Mapa'
import { MinhasDenuncias } from './pages/MinhasDenuncias'
import { NovaDenuncia } from './pages/NovaDenuncia'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Mapa />} />
            <Route path="entrar" element={<Entrar />} />
            <Route path="cadastro" element={<Cadastro />} />
            <Route path="denuncias/:id" element={<DenunciaDetalhe />} />
            <Route path="nova-denuncia" element={<RotaProtegida><NovaDenuncia /></RotaProtegida>} />
            <Route path="minhas-denuncias" element={<RotaProtegida><MinhasDenuncias /></RotaProtegida>} />
            <Route path="*" element={<div className="pagina centro">Página não encontrada.</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
