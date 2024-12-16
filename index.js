const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(bodyParser.json());


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'joyas',
    password: 'karlos100',
    port: 5432,
});


app.use((req, res, next) => {
    console.log(`Ruta consultada: ${req.method} ${req.path} - ${new Date().toLocaleString()}`);
    next();
});

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});


app.get('/joyas', async (req, res) => {
    try {
        const { limits = 10, page = 1, order_by = 'id_ASC' } = req.query;

        const [columna, direccion] = order_by.split('_');
        const columnasValidas = ['id', 'nombre', 'precio', 'categoria', 'stock'];
        const direccionesValidas = ['ASC', 'DESC'];

        if (!columnasValidas.includes(columna) || !direccionesValidas.includes(direccion)) {
            return res.status(400).json({ error: 'Parámetro order_by inválido' });
        }

        const offset = (page - 1) * limits;

        const query = `
            SELECT * FROM inventario
            ORDER BY ${columna} ${direccion}
            LIMIT $1 OFFSET $2
        `;
        const values = [limits, offset];
        const { rows } = await pool.query(query, values);

        const hateoas = rows.map(joya => ({
            nombre: joya.nombre,
            precio: joya.precio,
            categoria: joya.categoria,
            stock: joya.stock,
            links: {
                self: `/joyas/${joya.id}`
            }
        }));

        res.json({ joyas: hateoas });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las joyas' });
    }
});

app.get('/joyas/filtros', async (req, res) => {
    try {
        const { precio_min, precio_max, categoria, metal } = req.query;

        let query = 'SELECT * FROM inventario WHERE 1=1';
        const values = [];

        if (precio_min) {
            values.push(precio_min);
            query += ` AND precio >= $${values.length}`;
        }

        if (precio_max) {
            values.push(precio_max);
            query += ` AND precio <= $${values.length}`;
        }

        if (categoria) {
            values.push(categoria);
            query += ` AND categoria = $${values.length}`;
        }

        if (metal) {
            values.push(metal);
            query += ` AND metal = $${values.length}`;
        }

        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron joyas con los filtros proporcionados.' });
        }

        res.json({ joyas: rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al filtrar las joyas' });
    }
});


app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
