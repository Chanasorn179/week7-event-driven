// src/services/taskService.js
// Business Logic + Publish Events เมื่อ data เปลี่ยน!

const taskRepository = require('../repositories/taskRepository');
const Task = require('../models/Task');
const { publishEvent } = require('../events/publisher');
const { EVENT_TYPES } = require('../../shared/events/eventTypes');

class TaskService {

    async getAllTasks() {
        const tasks = await taskRepository.findAll();
        return tasks.map(t => t.toJSON());
    }

    async getTaskById(id) {
        const task = await taskRepository.findById(id);
        if (!task) { const e = new Error('Task not found'); e.statusCode = 404; throw e; }
        return task.toJSON();
    }

    // ⭐ สร้าง Task + Publish TASK_CREATED Event
    async createTask(data) {
        const validation = Task.validate(data);
        if (!validation.isValid) {
            const e = new Error(validation.errors.join(', ')); e.statusCode = 400; throw e;
        }

        const task = await taskRepository.create(data);
        const taskJson = task.toJSON();

        // 📤 Publish Event!
        await publishEvent(EVENT_TYPES.TASK_CREATED, taskJson);

        return taskJson;
    }

    // ⭐ อัพเดท Task + Publish TASK_UPDATED / TASK_COMPLETED Event
    async updateTask(id, data) {
        const existing = await taskRepository.findById(id);
        if (!existing) { const e = new Error('Task not found'); e.statusCode = 404; throw e; }

        const task = await taskRepository.update(id, data);
        const taskJson = task.toJSON();

        // ตรวจว่าเปลี่ยน status เป็น DONE หรือไม่
        if (data.status === 'DONE' && existing.status !== 'DONE') {
            // 📤 Publish TASK_COMPLETED Event (พิเศษ!)
            await publishEvent(EVENT_TYPES.TASK_COMPLETED, {
                ...taskJson,
                previousStatus: existing.status
            });
        } else {
            // 📤 Publish TASK_UPDATED Event
            await publishEvent(EVENT_TYPES.TASK_UPDATED, {
                ...taskJson,
                changes: data
            });
        }

        return taskJson;
    }

    // ⭐ ลบ Task + Publish TASK_DELETED Event
    async deleteTask(id) {
        const existing = await taskRepository.findById(id);
        if (!existing) { const e = new Error('Task not found'); e.statusCode = 404; throw e; }

        if (existing.status === 'IN_PROGRESS') {
            const e = new Error('Cannot delete in-progress task'); e.statusCode = 400; throw e;
        }

        await taskRepository.delete(id);

        // 📤 Publish TASK_DELETED Event
        await publishEvent(EVENT_TYPES.TASK_DELETED, existing.toJSON());

        return true;
    }

    async getStatistics() {
        const counts = await taskRepository.countByStatus();
        const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
        return { total, byStatus: counts, completionRate: total > 0 ? Math.round((counts.DONE / total) * 100) : 0 };
    }
}

module.exports = new TaskService();
