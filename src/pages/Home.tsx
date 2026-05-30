import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { LayoutContextType, Person } from '../components/Layout';

export default function Home() {
  const { data, loading, error } = useOutletContext<LayoutContextType>();
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Person | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [censusStatus, setCensusStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const checkConfirmation = async () => {
      if (result) {
        // First check local storage for instant feedback
        const localConfirmed = localStorage.getItem(`confirmed_${result.cedula}`);
        if (localConfirmed) {
          setCensusStatus('success');
        } else {
          setCensusStatus('idle');
        }

        // Then verify with backend to be sure
        try {
          const response = await fetch(`${API_URL}/api/confirmaciones/${result.cedula}`);
          if (response.ok) {
            const data = await response.json();
            if (data.confirmed) {
              localStorage.setItem(`confirmed_${result.cedula}`, 'true');
              setCensusStatus('success');
            }
          }
        } catch (err) {
          console.error("Error checking confirmation status", err);
        }
      }
    };

    checkConfirmation();
  }, [result]);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setResult(null);
    setSearchError('');
    setCensusStatus('idle');

    setTimeout(() => {
      const cleanSearch = searchTerm.replace(/\D/g, '');
      const found = data.find(p => p.cedula === cleanSearch);

      if (found) {
        setResult(found);
      } else {
        const foundPartial = data.find(p => p.cedula.includes(cleanSearch) && cleanSearch.length > 5);
        if (foundPartial) {
          setResult(foundPartial);
        } else {
          setSearchError(`La cédula ${searchTerm} no fue encontrada en el listado oficial.`);
        }
      }
      setSearching(false);
    }, 600);
  };

  const handleCensusSubmit = async (person: Person) => {
    setCensusStatus('submitting');
    try {
      const response = await fetch(`${API_URL}/api/confirmaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: person.nombre,
          cedula: person.cedula,
          dependencia: person.dependencia,
          boton: person.boton,
        }),
      });
      if (response.ok) {
        localStorage.setItem(`confirmed_${person.cedula}`, 'true');
        setCensusStatus('success');
      } else if (response.status === 409) {
        // Ya estaba registrado previamente
        localStorage.setItem(`confirmed_${person.cedula}`, 'true');
        setCensusStatus('success');
      } else {
        throw new Error('Error al confirmar asistencia');
      }
    } catch (err) {
      console.error(err);
      setCensusStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-xl text-center">
        <div className="loader" style={{ borderTopColor: '#003366' }}></div>
        <p className="mt-4">Preparando sistema...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-xl">
      {error && <div className="error-msg">{error}</div>}

      {!error && (
        <>
          <h1 className='text-2xl font-bold'>Consulta de Botones</h1>
          <p className="subtitle">Listado de Reconocimientos {new Date().getFullYear()}</p>

          <div className="search-box">
            <label htmlFor="cedula" className="block text-sm font-bold text-[#003366] mb-2">Cédula de Identidad</label>
            <input
              id="cedula"
              type="text"
              placeholder="Ingrese su número de cédula"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] focus:ring-4 focus:ring-blue-50 transition-all h-14 mb-4 text-center md:text-left bg-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="w-full bg-[#003366] text-white font-bold py-4 rounded-lg mt-4 hover:bg-[#004a8f] transition-colors disabled:bg-slate-300 flex justify-center items-center uppercase tracking-wider"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? <div className="loader"></div> : 'Verificar'}
            </button>
            {data.length > 0 && !searching && !result && (
              <p className="text-[10px] text-gray-400 mt-2">
                Sistema listo ({data.length} personas cargadas)
              </p>
            )}
          </div>

          {searchError && <div className="error-msg">{searchError}</div>}

          {result && (
            <div className="result-card">
              <div className="result-header">
                <h3>Información del Beneficiario</h3>
              </div>
              <div className="result-body">
                <p><span className="label">Nombre:</span> {result.nombre}</p>
                <p><span className="label">Cédula:</span> {result.cedula}</p>
                <p><span className="label">Dependencia:</span> {result.dependencia}</p>
                <p>
                  <span className="label">Reconocimiento:</span>
                  <span className="badge">Botón {result.boton} Años</span>
                </p>
              </div>
              <div className="result-footer p-3 md:p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                {censusStatus === 'success' ? (
                  <div className="flex items-center justify-center text-green-600 font-bold py-2 bg-green-50 rounded-lg border border-green-200">
                    <i className="fas fa-check-circle mr-2"></i> Asistencia Confirmada
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] text-gray-500 mb-3 text-center">
                      Haga clic abajo para confirmar que asistirá al evento y recibir su botón.
                    </p>
                    <button
                      onClick={() => handleCensusSubmit(result)}
                      disabled={censusStatus === 'submitting'}
                      className="w-full bg-[#cc9900] hover:bg-[#b38600] text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center uppercase text-sm tracking-wide shadow-md"
                    >
                      {censusStatus === 'submitting' ? <div className="loader small"></div> : (
                        <>
                          <i className="fas fa-medal mr-2"></i> Confirmar Asistencia
                        </>
                      )}
                    </button>
                    {censusStatus === 'error' && (
                      <p className="text-red-500 text-[10px] mt-2 text-center">Error al confirmar. Intente de nuevo.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
