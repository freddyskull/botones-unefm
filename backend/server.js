import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuración de la conexión a PostgreSQL
const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'botones_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Inicializar la base de datos
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        cedula VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla solicitudes verificada/creada');
  } catch (err) {
    console.error('Error al inicializar la DB:', err);
  }
};

initDb();

// Ruta para recibir solicitudes
app.post('/api/solicitudes', async (req, res) => {
  const { nombre, apellido, cedula, email, telefono, descripcion } = req.body;

  if (!nombre || !apellido || !cedula || !email || !telefono || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO solicitudes (nombre, apellido, cedula, email, telefono, descripcion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, cedula, email, telefono, descripcion]
    );
    res.status(201).json({ message: 'Solicitud guardada con éxito', data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar la solicitud:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
