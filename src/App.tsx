import { useState, useEffect } from 'react'
import './App.css'

declare global {
  interface Window {
    XLSX: any;
  }
}

interface Person {
  cedula: string;
  nombre: string;
  dependencia: string;
  boton: string;
}

function App() {
  const [data, setData] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'search' | 'form'>('search');

  useEffect(() => {
    const loadExcel = async () => {
      try {
        const response = await fetch('/botones.xls');
        if (!response.ok) throw new Error('No se pudo cargar el archivo');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });

        let allData: Person[] = [];

        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          const rows: any[][] = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rows.length < 1) return;

          let headerRowIndex = rows.findIndex(row => {
            const matches = row.filter((cell: any) =>
              ['cedula', 'ci', 'nombre', 'apellido', 'boton', 'anos', 'años', 'dependencia'].some(key =>
                String(cell).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(key)
              )
            );
            return matches.length >= 2;
          });

          if (headerRowIndex === -1) headerRowIndex = 0;

          const headers = rows[headerRowIndex];
          const dataRows = rows.slice(headerRowIndex + 1);

          const normalizedSheetData: Person[] = dataRows.map((row: any[]) => {
            const getValByHeader = (keys: string[]) => {
              let colIndex = headers.findIndex((h: any) =>
                keys.some(key => String(h).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === key.toLowerCase())
              );
              if (colIndex === -1) {
                colIndex = headers.findIndex((h: any) =>
                  keys.some(key => String(h).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(key))
                );
              }
              return colIndex !== -1 ? String(row[colIndex] || '').trim() : '';
            };

            const cleanId = (val: string) => {
              if (!val) return '';
              const base = val.split('.')[0];
              return base.replace(/\D/g, '');
            };

            const rawCedula = getValByHeader(['cedula', 'ci', 'identificacion', 'documento', 'id', 'nro', 'v-']);
            let finalCedula = cleanId(rawCedula);
            if (!finalCedula) {
              const firstNumericColIndex = row.findIndex(cell => cell && !isNaN(Number(cell)) && String(cell).length > 5);
              if (firstNumericColIndex !== -1) finalCedula = cleanId(String(row[firstNumericColIndex]));
            }

            return {
              cedula: finalCedula,
              nombre: getValByHeader(['nombre', 'empleado', 'persona', 'beneficiario', 'nombre completo', 'apellidos y nombres', 'nombres y apellidos', 'nombre y apellido']),
              dependencia: getValByHeader(['dependencia', 'departamento', 'area', 'unidad', 'adscripcion', 'lugar', 'gerencia', 'ubicacion']),
              boton: getValByHeader(['boton', 'anos', 'años', 'tiempo', 'periodo', 'antiguedad', 'servicio', 'clase'])
            };
          });

          allData = [...allData, ...normalizedSheetData];
        });

        const validData = allData.filter(p => p.cedula !== '' && p.nombre !== '');
        setData(validData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Error al cargar la base de datos.');
        setLoading(false);
      }
    };

    const checkXLSX = setInterval(() => {
      if (window.XLSX) {
        clearInterval(checkXLSX);
        loadExcel();
      }
    }, 100);
    return () => clearInterval(checkXLSX);
  }, []);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setResult(null);
    setError('');

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
          setError(`La cédula ${searchTerm} no fue encontrada en el listado oficial.`);
        }
      }
      setSearching(false);
    }, 600);
  };

  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const encode = (data: any) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({ "form-name": "solicitud-boton", ...data })
      });
      setFormStatus('success');
    } catch (err) {
      console.error(err);
      setFormStatus('error');
    }
  };

  return (
    <div className="app-wrapper">
      <div className="top-bar">
        <div className="top-bar-info">
          <span>CALLE NORTE, ENTRA AV. MANAURE Y CALLE TOLEDO | LUNES A VIERNES 8:00 AM - 12:00 PM</span>
        </div>
        <div className="social-icons">
          <a href="https://www.instagram.com/unefmoficial/" target='_blank'><i className="fab fa-instagram"></i></a>
          <a href="https://x.com/DidaUNEFMofici1" target='_blank'><i className="fab fa-twitter"></i></a>
        </div>
      </div>

      <header className="header">
        <div className="logo-container">
          <img src="/logo.webp" alt="UNEFM Logo" className="logo-img" />
        </div>

        <nav className="nav-menu-simple">
          <button
            className={`nav-btn ${view === 'search' ? 'active' : ''}`}
            onClick={() => { setView('search'); setFormStatus('idle'); }}
          >
            Inicio
          </button>
          <button
            className={`nav-btn ${view === 'form' ? 'active' : ''}`}
            onClick={() => setView('form')}
          >
            No estoy en la lista
          </button>
        </nav>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="container text-center">
            <div className="loader" style={{ borderTopColor: '#003366' }}></div>
            <p className="mt-4">Preparando sistema...</p>
          </div>
        ) : (
          <div className="container">
            {view === 'search' ? (
              <>
                <h1>Consulta de Botones</h1>
                <p className="subtitle">Listado de Reconocimientos {new Date().getFullYear()}</p>

                <div className="search-box">
                  <label htmlFor="cedula" className="block text-sm font-bold text-[#003366] mb-2">Cédula de Identidad</label>
                  <input
                    id="cedula"
                    type="text"
                    placeholder="Ingrese su número de cédula"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] focus:ring-4 focus:ring-blue-50 transition-all h-14 mb-4"
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

                {error && <div className="error-msg">{error}</div>}

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
                  </div>
                )}
              </>
            ) : (
              <div className="form-container">
                <h1>Solicitud de Revisión</h1>
                {formStatus === 'success' ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-lg text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h2 className="text-xl font-bold mb-2">¡Solicitud Enviada!</h2>
                    <p>Su caso ha sido registrado en nuestra base de datos. Pronto nos comunicaremos con usted.</p>
                    <button onClick={() => setView('search')} className="search-btn mt-6 w-full">Volver al Inicio</button>
                  </div>
                ) : (
                  <>
                    <p className="subtitle">Si considera que debería estar en la lista, complete este formulario.</p>

                    <form
                      name="solicitud-boton"
                      method="POST"
                      data-netlify="true"
                      onSubmit={handleFormSubmit}
                      className="space-y-4 text-left"
                    >
                      <input type="hidden" name="form-name" value="solicitud-boton" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                          <input type="text" name="nombre" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12" placeholder="Tu nombre" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Apellido</label>
                          <input type="text" name="apellido" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12" placeholder="Tu apellido" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cédula</label>
                        <input type="text" name="cedula" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12" placeholder="Ej: 12345678" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                          <input type="email" name="email" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12" placeholder="usuario@correo.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                          <input type="tel" name="telefono" required className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all h-12" placeholder="0412-0000000" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descripción del Caso</label>
                        <textarea
                          name="descripcion"
                          rows={4}
                          required
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-all"
                          placeholder="Explique por qué considera que merece el botón..."
                        ></textarea>
                      </div>

                      {formStatus === 'error' && (
                        <p className="text-red-500 text-sm font-semibold">❌ Hubo un error al enviar. Por favor intente más tarde.</p>
                      )}

                      <button
                        type="submit"
                        disabled={formStatus === 'submitting'}
                        className="w-full bg-[#003366] text-white font-bold py-4 rounded-lg mt-4 hover:bg-[#004a8f] transition-colors disabled:bg-slate-300 flex justify-center items-center uppercase tracking-wider"
                      >
                        {formStatus === 'submitting' ? <div className="loader"></div> : 'Enviar Solicitud'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer>
        © {new Date().getFullYear()} Universidad Nacional Experimental Francisco de Miranda
        <br />
        <span className="text-[11px] opacity-60">
          {data.length > 0 ? `${data.length} registros cargados correctamente` : 'Cargando registros...'}
        </span>
      </footer>
    </div>
  )
}

export default App
