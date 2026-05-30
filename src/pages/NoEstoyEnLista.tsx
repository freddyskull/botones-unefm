import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function NoEstoyEnLista() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'duplicate'>('idle');
  const [cedula, setCedula] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  const checkCedula = async (value: string) => {
    if (!value || value.length < 5) return;
    try {
      const response = await fetch(`${API_URL}/api/solicitudes/${value}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setFormStatus('duplicate');
        } else if (formStatus === 'duplicate') {
          setFormStatus('idle');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCedula(e.target.value);
    if (formStatus === 'duplicate') setFormStatus('idle');
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formStatus === 'duplicate') return;
    setFormStatus('submitting');

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);

    try {
      const response = await fetch(`${API_URL}/api/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setFormStatus('success');
      } else if (response.status === 409) {
        setFormStatus('duplicate');
      } else {
        throw new Error('Error al enviar solicitud');
      }
    } catch (err) {
      console.error(err);
      setFormStatus('error');
    }
  };

  return (
    <div className="container max-w-xl">
      <div className="form-container">
        <h1 className='text-2xl font-bold'>Solicitud de Revisión</h1>
        {formStatus === 'success' ? (
          <div className="bg-green-50 border border-green-200 text-green-800 p-6 md:p-8 rounded-lg text-center">
            <div className="text-3xl md:text-4xl mb-4">✅</div>
            <h2 className="text-lg md:text-xl font-bold mb-2">¡Solicitud Enviada!</h2>
            <p>Su caso ha sido registrado en nuestra base de datos. Pronto nos comunicaremos con usted.</p>
            <Link to="/" className="search-btn mt-6 w-full inline-block text-center uppercase font-bold py-3 rounded-lg text-sm transition-all shadow-md">
              Volver al Inicio
            </Link>
          </div>
        ) : (
          <>
            <p className="subtitle">Si considera que debería estar en la lista, complete este formulario.</p>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                  <input type="text" name="nombre" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12 bg-slate-200" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Apellido</label>
                  <input type="text" name="apellido" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12 bg-slate-200" placeholder="Tu apellido" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cédula</label>
                <input 
                  type="text" 
                  name="cedula" 
                  required 
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12 bg-slate-200" 
                  placeholder="Ej: 12345678" 
                  value={cedula}
                  onChange={handleCedulaChange}
                  onBlur={() => checkCedula(cedula)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input type="email" name="email" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12 bg-slate-200" placeholder="usuario@correo.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                  <input type="tel" name="telefono" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12 bg-slate-200" placeholder="0412-0000000" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción del Caso</label>
                <textarea
                  name="descripcion"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all bg-slate-200"
                  placeholder="Explique por qué considera que merece el botón..."
                ></textarea>
              </div>

              {formStatus === 'error' && (
                <p className="text-red-500 text-sm font-semibold">❌ Hubo un error al enviar. Por favor intente más tarde.</p>
              )}
              {formStatus === 'duplicate' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                  ⚠️ <strong>Ya existe una solicitud registrada con esa cédula.</strong> Su caso ya fue recibido anteriormente y está siendo procesado.
                </div>
              )}

              <button
                type="submit"
                disabled={formStatus === 'submitting' || formStatus === 'duplicate'}
                className="w-full bg-[#003366] text-white font-bold py-4 rounded-lg mt-4 hover:bg-[#004a8f] transition-colors disabled:bg-slate-300 flex justify-center items-center uppercase tracking-wider"
              >
                {formStatus === 'submitting' ? <div className="loader"></div> : 'Enviar Solicitud'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
