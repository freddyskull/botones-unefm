import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NoEstoyEnLista from './pages/NoEstoyEnLista';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

// Variable de control para el modo mantenimiento
const IS_MAINTENANCE = true;

function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 text-white text-center relative overflow-hidden bg-[#f9f9f9]">
      {/* Orbes decorativos flotantes de fondo */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-[#ffcc00] opacity-10 filter blur-[60px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#004a8f] opacity-20 filter blur-[80px] animate-pulse pointer-events-none"></div>

      {/* Tarjeta glassmorphic central */}
      <div className="relative z-10 bg-white border border-white/10 shadow-2xl rounded-3xl p-8 md:p-12 max-w-xl w-full transition-all duration-500 hover:scale-[1.01]">

        {/* Caja de íconos animados */}
        <div className="relative inline-block mb-6">
          {/* Engranaje izquierdo */}
          <i className="fas fa-cog absolute -top-3 -left-6 text-2xl text-slate-600 animate-spin" style={{ animationDuration: '6s' }}></i>
          {/* Engranaje derecho */}
          <i className="fas fa-cog absolute -bottom-2 -right-6 text-3xl text-slate-600 animate-spin" style={{ animationDuration: '9s', animationDirection: 'reverse' }}></i>
          {/* Ícono central de herramientas */}
          <i className="fas fa-tools text-5xl md:text-6xl text-[#003366] drop-shadow-[0_0_15px_rgba(255,204,0,0.5)]"></i>
        </div>

        {/* Logo */}
        <img src="/logo.webp" alt="UNEFM Logo" className="h-16 md:h-20 mx-auto mb-6 drop-shadow-lg hover:scale-105 transition-transform duration-300" />

        {/* Título principal */}
        <h1 className="text-2xl md:text-3.5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-white to-[#ffcc00] bg-clip-text text-slate-600 uppercase">
          Sistema en Mantenimiento
        </h1>

        {/* Mensaje descriptivo */}
        <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-8">
          Estamos actualizando la base de datos oficial para los Reconocimientos y Botones de Antigüedad {new Date().getFullYear()} de la Universidad Nacional Experimental Francisco de Miranda.
          <br /><br />
          El sistema volverá a estar disponible muy pronto. Agradecemos su valiosa comprensión.
        </p>

        {/* Barra de progreso animada */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-6 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full w-1/2 animate-pulse"></div>
        </div>

        {/* Meta información */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-slate-600 pt-6 border-t border-slate-500">
          <div className="flex items-center gap-2">
            <i className="fas fa-calendar-alt text-blue-600"></i>
            <span>Evento de Entrega Próximamente</span>
          </div>
          <div className="hidden sm:block text-slate-300">|</div>
          <div className="flex items-center gap-2">
            <i className="fas fa-shield-alt text-blue-600"></i>
            <span>Actualización Segura</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-8 text-xs text-white/40 z-10">
        © {new Date().getFullYear()} Universidad Nacional Experimental Francisco de Miranda
      </footer>
    </div>
  );
}

function App() {
  if (IS_MAINTENANCE && window.location.pathname !== '/admin-datos-registro') {
    return <MaintenancePage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="no-estoy-en-lista" element={<NoEstoyEnLista />} />
          <Route path="admin-datos-registro" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
