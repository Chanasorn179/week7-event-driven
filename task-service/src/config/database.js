const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'taskboard_db',
    user: process.env.POSTGRES_USER || 'taskboard',
    password: process.env.POSTGRES_PASSWORD || 'taskboard123',
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on('connect', () => console.log('✅ Task Service → PostgreSQL connected'));
pool.on('error', (err) => console.error('❌ DB error:', err.message));

const query = async (text, params) => {
    const start = Date.now();
    const result = await pool.query(text, params);
    console.log(`📊 DB: ${Date.now() - start}ms | ${result.rowCount} rows`);
    return result;
};

module.exports = { pool, query };
