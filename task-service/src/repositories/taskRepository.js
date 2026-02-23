const { query } = require('../config/database');
const Task = require('../models/Task');

class TaskRepository {
    async findAll() {
        const sql = `SELECT * FROM tasks ORDER BY CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, created_at DESC`;
        const result = await query(sql);
        return result.rows.map(row => new Task(row));
    }
    async findById(id) {
        const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
        return result.rows.length > 0 ? new Task(result.rows[0]) : null;
    }
    async create(data) {
        const sql = `INSERT INTO tasks (title, description, status, priority) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await query(sql, [data.title, data.description || '', data.status || 'TODO', data.priority || 'MEDIUM']);
        return new Task(result.rows[0]);
    }
    async update(id, data) {
        const sql = `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description), status=COALESCE($3,status), priority=COALESCE($4,priority), updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`;
        const result = await query(sql, [data.title, data.description, data.status, data.priority, id]);
        return result.rows.length > 0 ? new Task(result.rows[0]) : null;
    }
    async delete(id) {
        const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
        return result.rowCount > 0;
    }
    async countByStatus() {
        const result = await query('SELECT status, COUNT(*)::int as count FROM tasks GROUP BY status');
        return result.rows.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, { TODO: 0, IN_PROGRESS: 0, DONE: 0 });
    }
}
module.exports = new TaskRepository();
