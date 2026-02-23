const taskService = require('../services/taskService');

class TaskController {
    async getAll(req, res, next) {
        try { const tasks = await taskService.getAllTasks(); res.json({ success: true, data: tasks, count: tasks.length }); }
        catch (e) { next(e); }
    }
    async getById(req, res, next) {
        try { const task = await taskService.getTaskById(parseInt(req.params.id)); res.json({ success: true, data: task }); }
        catch (e) { next(e); }
    }
    async create(req, res, next) {
        try { const task = await taskService.createTask(req.body); res.status(201).json({ success: true, data: task }); }
        catch (e) { next(e); }
    }
    async update(req, res, next) {
        try { const task = await taskService.updateTask(parseInt(req.params.id), req.body); res.json({ success: true, data: task }); }
        catch (e) { next(e); }
    }
    async delete(req, res, next) {
        try { await taskService.deleteTask(parseInt(req.params.id)); res.json({ success: true, message: 'Deleted' }); }
        catch (e) { next(e); }
    }
    async stats(req, res, next) {
        try { const s = await taskService.getStatistics(); res.json({ success: true, data: s }); }
        catch (e) { next(e); }
    }
}
module.exports = new TaskController();
