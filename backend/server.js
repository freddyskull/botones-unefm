import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'botones_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// ─── Utilidad: parsear CSV simple con comillas ────────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim() !== '');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
    return obj;
  }).filter(row => Object.values(row).some(v => v));
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── Limpiar cédula: quitar puntos, espacios, comas ──────────────────────────
function cleanCedula(raw) {
  return (raw || '').replace(/[\s.,]/g, '').trim();
}

// ─── Seed: importar CSV a la BD (solo una vez, ignora duplicados) ─────────────
async function seedFromCSV() {
  // Importar confirmaciones (censo-asistencia.csv)
  const asistPath = path.join(__dirname, 'censo-asistencia.csv');
  if (fs.existsSync(asistPath)) {
    const rows = parseCSV(fs.readFileSync(asistPath, 'utf-8'));
    console.log(`[seed] Importando ${rows.length} registros de censo-asistencia.csv...`);
    for (const row of rows) {
      const cedula = cleanCedula(row['cedula']);
      if (!cedula) continue;
      await pool.query(
        `INSERT INTO confirmaciones (nombre, cedula, dependencia, boton, fecha_confirmacion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cedula) DO NOTHING`,
        [
          row['nombre'] || '',
          cedula,
          row['dependencia'] || '',
          row['boton'] || '',
          row['created_at'] ? new Date(row['created_at']) : new Date(),
        ]
      );
    }
    console.log('[seed] censo-asistencia.csv importado.');
  }

  // Importar solicitudes (solicitud-boton.csv)
  const solPath = path.join(__dirname, 'solicitud-boton.csv');
  if (fs.existsSync(solPath)) {
    const rows = parseCSV(fs.readFileSync(solPath, 'utf-8'));
    console.log(`[seed] Importando ${rows.length} registros de solicitud-boton.csv...`);
    for (const row of rows) {
      const cedula = cleanCedula(row['cedula']);
      if (!cedula) continue;
      await pool.query(
        `INSERT INTO solicitudes (nombre, apellido, cedula, email, telefono, descripcion, fecha_creacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (cedula) DO NOTHING`,
        [
          row['nombre'] || '',
          row['apellido'] || '',
          cedula,
          row['email'] || '',
          row['telefono'] || '',
          row['descripcion'] || '',
          row['created_at'] ? new Date(row['created_at']) : new Date(),
        ]
      );
    }
    console.log('[seed] solicitud-boton.csv importado.');
  }
}

// ─── Inicializar BD + seed ────────────────────────────────────────────────────
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        cedula VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla solicitudes verificada/creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS confirmaciones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        cedula VARCHAR(20) NOT NULL UNIQUE,
        dependencia VARCHAR(255),
        boton VARCHAR(100),
        fecha_confirmacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla confirmaciones verificada/creada');

    // Migración: añadir UNIQUE en cedula si no existe
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'solicitudes_cedula_key'
        ) THEN
          ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_cedula_key UNIQUE (cedula);
        END IF;
      END $$;
    `).catch(() => {}); // ignorar si ya existe

    // Seed desde CSV
    await seedFromCSV();
  } catch (err) {
    console.error('Error al inicializar la DB:', err);
  }
};

initDb();

// ─── POST /api/solicitudes ────────────────────────────────────────────────────
app.post('/api/solicitudes', async (req, res) => {
  const { nombre, apellido, cedula, email, telefono, descripcion } = req.body;
  const cedulaLimpia = cleanCedula(cedula);

  if (!nombre || !apellido || !cedulaLimpia || !email || !telefono || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si ya existe un reclamo con esa cédula
    const exists = await pool.query('SELECT id FROM solicitudes WHERE cedula = $1', [cedulaLimpia]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una solicitud registrada con esa cédula.' });
    }

    const result = await pool.query(
      'INSERT INTO solicitudes (nombre, apellido, cedula, email, telefono, descripcion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, cedulaLimpia, email, telefono, descripcion]
    );
    res.status(201).json({ message: 'Solicitud guardada con éxito', data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar la solicitud:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/confirmaciones ─────────────────────────────────────────────────
app.post('/api/confirmaciones', async (req, res) => {
  const { nombre, cedula, dependencia, boton } = req.body;
  const cedulaLimpia = cleanCedula(cedula);

  if (!nombre || !cedulaLimpia) {
    return res.status(400).json({ error: 'Nombre y cédula son campos obligatorios' });
  }

  try {
    // Verificar si ya está censado
    const exists = await pool.query('SELECT id FROM confirmaciones WHERE cedula = $1', [cedulaLimpia]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Esta cédula ya fue registrada como asistente.' });
    }

    const result = await pool.query(
      'INSERT INTO confirmaciones (nombre, cedula, dependencia, boton) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, cedulaLimpia, dependencia, boton]
    );
    res.status(201).json({ message: 'Asistencia confirmada con éxito', data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar la confirmación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/solicitudes ─────────────────────────────────────────────────────
app.get('/api/solicitudes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM solicitudes ORDER BY fecha_creacion DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener solicitudes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/solicitudes/:cedula ─────────────────────────────────────────────
app.get('/api/solicitudes/:cedula', async (req, res) => {
  const cedulaLimpia = cleanCedula(req.params.cedula);
  try {
    const result = await pool.query('SELECT id FROM solicitudes WHERE cedula = $1', [cedulaLimpia]);
    if (result.rows.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('Error al verificar solicitud:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/confirmaciones ──────────────────────────────────────────────────
app.get('/api/confirmaciones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM confirmaciones ORDER BY fecha_confirmacion DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener confirmaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /api/confirmaciones/:cedula ──────────────────────────────────────────
app.get('/api/confirmaciones/:cedula', async (req, res) => {
  const cedulaLimpia = cleanCedula(req.params.cedula);
  try {
    const result = await pool.query('SELECT id FROM confirmaciones WHERE cedula = $1', [cedulaLimpia]);
    if (result.rows.length > 0) {
      res.json({ confirmed: true });
    } else {
      res.json({ confirmed: false });
    }
  } catch (err) {
    console.error('Error al verificar confirmación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.send('OK'));

app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
