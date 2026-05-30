import { useState, useEffect } from 'react';

// "botones159753" codificado para no estar en texto plano simple
// Usamos btoa("secret-salt-botones159753")
const HASHED_PASSWORD = 'c2VjcmV0LXNhbHQtYm90b25lczE1OTc1Mw==';
const SALT = 'secret-salt-';

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (btoa(SALT + password) === HASHED_PASSWORD) {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full max-w-sm">
        <h2 className="text-xl font-bold text-[#003366] mb-4 text-center">Acceso Administrativo</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Ingrese contraseña"
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#003366]"
          />
          {error && <p className="text-red-500 text-xs text-center">Contraseña incorrecta</p>}
          <button type="submit" className="bg-[#003366] text-white py-2 rounded-lg font-semibold">Entrar</button>
        </form>
      </div>
    </div>
  );
}

interface Solicitud {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  descripcion: string;
  fecha_creacion: string;
}

interface Confirmacion {
  id: number;
  nombre: string;
  cedula: string;
  dependencia: string;
  boton: string;
  fecha_confirmacion: string;
}

const PAGE_SIZE = 15;

// ─── Exportar a CSV compatible con Excel (UTF-8 BOM) ─────────────────────────
function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const csvContent = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Pagination({
  total,
  page,
  pageSize,
  onChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push('...');
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
      pages.push(i);
    }
    if (page < totalPages - 3) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
      <span className="text-xs text-slate-400">
        Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded text-sm text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 py-1 text-sm text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-[#003366] text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded text-sm text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'asistentes' | 'reclamos'>('asistentes');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [confirmaciones, setConfirmaciones] = useState<Confirmacion[]>([]);
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Paginación independiente por tab
  const [pageAsistentes, setPageAsistentes] = useState(1);
  const [pageReclamos, setPageReclamos] = useState(1);

  // Búsqueda
  const [searchAsist, setSearchAsist] = useState('');
  const [searchReclamos, setSearchReclamos] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resSol, resConf] = await Promise.all([
          fetch('/api/solicitudes'),
          fetch('/api/confirmaciones'),
        ]);
        if (!resSol.ok || !resConf.ok) throw new Error('Error al obtener los datos');
        setSolicitudes(await resSol.json());
        setConfirmaciones(await resConf.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="loader" style={{ borderTopColor: '#003366' }} />
        <p className="text-slate-500 text-sm">Cargando base de datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center">
        <div className="error-msg">❌ {error}</div>
      </div>
    );
  }

  const toggleClaim = (id: number) => setExpandedClaim(expandedClaim === id ? null : id);

  // Filtros de búsqueda
  const filteredAsistentes = confirmaciones.filter(c =>
    `${c.nombre} ${c.cedula} ${c.dependencia}`.toLowerCase().includes(searchAsist.toLowerCase())
  );
  const filteredSolicitudes = solicitudes.filter(s =>
    `${s.nombre} ${s.apellido} ${s.cedula} ${s.email}`.toLowerCase().includes(searchReclamos.toLowerCase())
  );

  // Paginación
  const pagedAsistentes = filteredAsistentes.slice((pageAsistentes - 1) * PAGE_SIZE, pageAsistentes * PAGE_SIZE);
  const pagedSolicitudes = filteredSolicitudes.slice((pageReclamos - 1) * PAGE_SIZE, pageReclamos * PAGE_SIZE);

  // Reset página al buscar
  const handleSearchAsist = (v: string) => { setSearchAsist(v); setPageAsistentes(1); };
  const handleSearchReclamos = (v: string) => { setSearchReclamos(v); setPageReclamos(1); };

  return (
    <div className="container">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#003366] mb-1">Panel de Administración</h1>
        <p className="text-slate-500 text-sm mb-6">Base de Datos del Acto Académico</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-200 mb-6">
        <button
          className={`flex-1 py-3 font-semibold text-sm transition-all border-b-[3px] ${
            activeTab === 'asistentes'
              ? 'text-[#003366] border-[#003366] bg-slate-50'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          onClick={() => setActiveTab('asistentes')}
        >
          🎓 Asistentes Confirmados ({confirmaciones.length})
        </button>
        <button
          className={`flex-1 py-3 font-semibold text-sm transition-all border-b-[3px] ${
            activeTab === 'reclamos'
              ? 'text-[#003366] border-[#003366] bg-slate-50'
              : 'text-slate-400 border-transparent hover:text-slate-600'
          }`}
          onClick={() => setActiveTab('reclamos')}
        >
          ⚠️ Reclamos / Solicitudes ({solicitudes.length})
        </button>
      </div>

      {/* ── TAB ASISTENTES ── */}
      {activeTab === 'asistentes' && (
        <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Buscador + Exportar */}
          <div className="px-4 py-3 border-b border-slate-100 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o dependencia..."
              value={searchAsist}
              onChange={e => handleSearchAsist(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-colors bg-slate-200!"
            />
            <button
              onClick={() =>
                exportToCSV(
                  `asistentes_${new Date().toISOString().split('T')[0]}.csv`,
                  ['#', 'Nombre', 'Cédula', 'Dependencia', 'Botón', 'Fecha Confirmación'],
                  filteredAsistentes.map((c, i) => [
                    String(i + 1),
                    c.nombre,
                    c.cedula,
                    c.dependencia || 'N/A',
                    `Botón ${c.boton} Años`,
                    new Date(c.fecha_confirmacion).toLocaleString('es-VE'),
                  ])
                )
              }
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              ⬇️ Descargar Excel
            </button>
          </div>

          {filteredAsistentes.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-base">
              {searchAsist ? 'No se encontraron resultados.' : 'No hay asistentes confirmados todavía.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-xs">
                      <th className="px-4 py-3 font-bold border-b border-slate-200">#</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Nombre</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Cédula</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Dependencia</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Botón</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Fecha Confirmación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAsistentes.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs border-b border-slate-100">
                          {(pageAsistentes - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">{c.nombre}</td>
                        <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{c.cedula}</td>
                        <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{c.dependencia || 'N/A'}</td>
                        <td className="px-4 py-3 border-b border-slate-100">
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-200">
                            Botón {c.boton} Años
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 border-b border-slate-100">
                          {new Date(c.fecha_confirmacion).toLocaleString('es-VE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={filteredAsistentes.length}
                page={pageAsistentes}
                pageSize={PAGE_SIZE}
                onChange={setPageAsistentes}
              />
            </>
          )}
        </div>
      )}

      {/* ── TAB RECLAMOS ── */}
      {activeTab === 'reclamos' && (
        <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Buscador + Exportar */}
          <div className="px-4 py-3 border-b border-slate-100 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o email..."
              value={searchReclamos}
              onChange={e => handleSearchReclamos(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#003366] transition-colors bg-slate-200!"
            />
            <button
              onClick={() =>
                exportToCSV(
                  `reclamos_${new Date().toISOString().split('T')[0]}.csv`,
                  ['#', 'Nombre', 'Apellido', 'Cédula', 'Email', 'Teléfono', 'Descripción', 'Fecha Envío'],
                  filteredSolicitudes.map((s, i) => [
                    String(i + 1),
                    s.nombre,
                    s.apellido,
                    s.cedula,
                    s.email,
                    s.telefono,
                    s.descripcion,
                    new Date(s.fecha_creacion).toLocaleString('es-VE'),
                  ])
                )
              }
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              ⬇️ Descargar Excel
            </button>
          </div>

          {filteredSolicitudes.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-base">
              {searchReclamos ? 'No se encontraron resultados.' : 'No se han registrado reclamos o solicitudes.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-xs">
                      <th className="px-4 py-3 font-bold border-b border-slate-200">#</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Nombre Completo</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Cédula</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Email</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Teléfono</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Fecha Envío</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSolicitudes.map((s, idx) => (
                      <>
                        <tr
                          key={`row-${s.id}`}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => toggleClaim(s.id)}
                        >
                          <td className="px-4 py-3 text-slate-400 text-xs border-b border-slate-100">
                            {(pageReclamos - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">
                            <span className="mr-1 text-slate-400 text-xs">{expandedClaim === s.id ? '▼' : '▶'}</span>
                            {s.nombre} {s.apellido}
                          </td>
                          <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{s.cedula}</td>
                          <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{s.email}</td>
                          <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{s.telefono}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 border-b border-slate-100">
                            {new Date(s.fecha_creacion).toLocaleString('es-VE')}
                          </td>
                        </tr>

                        {expandedClaim === s.id && (
                          <tr key={`details-${s.id}`}>
                            <td colSpan={6} className="bg-slate-50 px-0 py-0">
                              <div className="border-l-4 border-[#003366] mx-4 my-3 p-4 rounded-r-lg bg-white shadow-inner">
                                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mb-3">
                                  <div><span className="font-bold text-slate-800">Nombre:</span> {s.nombre} {s.apellido}</div>
                                  <div><span className="font-bold text-slate-800">Cédula:</span> {s.cedula}</div>
                                  <div><span className="font-bold text-slate-800">Email:</span> {s.email}</div>
                                  <div><span className="font-bold text-slate-800">Teléfono:</span> {s.telefono}</div>
                                </div>
                                <p className="text-xs font-bold text-slate-700 mb-1">Descripción / Reclamo:</p>
                                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                  {s.descripcion}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={filteredSolicitudes.length}
                page={pageReclamos}
                pageSize={PAGE_SIZE}
                onChange={setPageReclamos}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
