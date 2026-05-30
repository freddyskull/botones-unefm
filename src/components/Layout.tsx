import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

declare global {
  interface Window {
    XLSX: any;
  }
}

export interface Person {
  cedula: string;
  nombre: string;
  dependencia: string;
  boton: string;
}

export interface LayoutContextType {
  data: Person[];
  loading: boolean;
  error: string;
  setData: React.Dispatch<React.SetStateAction<Person[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function Layout() {
  const [data, setData] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="app-wrapper">
      <div className="top-bar">
        <div className="top-bar-info">
          <span>CALLE NORTE, ENTRA AV. MANAURE Y CALLE TOLEDO | LUNES A VIERNES 8:00 AM - 12:00 PM</span>
        </div>
        <div className="social-icons">
          <a href="https://www.instagram.com/unefmoficial/" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
          <a href="https://x.com/DidaUNEFMofici1" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
        </div>
      </div>

      <header className="header">
        <div className="logo-container">
          <img src="/logo.webp" alt="UNEFM Logo" className="logo-img" />
        </div>

        <nav className="nav-menu-simple">
          <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} end>
            Inicio
          </NavLink>
          <NavLink to="/no-estoy-en-lista" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            No estoy en la lista
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Outlet context={{ data, loading, error, setData, setLoading, setError }} />
      </main>

      <footer>
        © {new Date().getFullYear()} Universidad Nacional Experimental Francisco de Miranda
        <br />
        <span className="text-[11px] opacity-60">
          {data.length > 0 ? `${data.length} registros cargados correctamente` : 'Cargando registros...'}
        </span>
      </footer>
    </div>
  );
}
