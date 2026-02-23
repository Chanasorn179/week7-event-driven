const API = '/api';

async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    return res.json();
}

async function loadTasks() {
    try {
        const data = await api('/tasks');
        const tasks = data.data || [];
        ['todo', 'in_progress', 'done'].forEach(status => {
            const container = document.querySelector(`#${status} .tasks`);
            container.innerHTML = tasks.filter(t => t.status === status.toUpperCase()).map(t => `
                <div class="task-card priority-${t.priority}">
                    <strong>${t.title}</strong>
                    <div class="meta"><span>${t.priority}</span><span>#${t.id}</span></div>
                    <div class="task-actions">
                        ${t.status !== 'DONE' ? `<button onclick="moveTask(${t.id},'${t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'}')">➡️</button>` : ''}
                        ${t.status !== 'IN_PROGRESS' ? `<button onclick="deleteTask(${t.id})">🗑️</button>` : ''}
                    </div>
                </div>
            `).join('');
        });
        const s = (await api('/tasks/stats')).data;
        document.getElementById('stats-panel').innerHTML = `
            <div class="stat-card"><div class="number">${s.total}</div>Total</div>
            <div class="stat-card"><div class="number">${s.byStatus.TODO}</div>TODO</div>
            <div class="stat-card"><div class="number">${s.byStatus.IN_PROGRESS}</div>In Progress</div>
            <div class="stat-card"><div class="number">${s.byStatus.DONE}</div>Done</div>
            <div class="stat-card"><div class="number">${s.completionRate}%</div>Completion</div>`;
    } catch (e) { console.error('Load error:', e); }
}

async function loadNotifications() {
    try {
        const data = await api('/notifications');
        document.getElementById('notif-badge').textContent = `🔔 ${data.unread || 0}`;
        document.getElementById('notifications-list').innerHTML = (data.data || []).slice(0, 20).map(n => `
            <div class="log-entry">${n.icon} <strong>${n.title}</strong>: ${n.message}<br><span class="time">${n.timestamp}</span></div>
        `).join('') || '<div class="log-entry">No notifications yet...</div>';
    } catch (e) { console.error('Notif error:', e); }
}

async function loadAudit() {
    try {
        const data = await api('/audit');
        document.getElementById('audit-badge').textContent = `📋 ${data.count || 0}`;
        document.getElementById('audit-list').innerHTML = (data.data || []).slice(0, 20).map(a => `
            <div class="log-entry"><strong>${a.eventType}</strong> — Task #${a.entityId} "${a.data.title}"<br><span class="time">${a.timestamp}</span></div>
        `).join('') || '<div class="log-entry">No audit logs yet...</div>';
    } catch (e) { console.error('Audit error:', e); }
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/tasks', { method: 'POST', body: JSON.stringify({ title: document.getElementById('title').value, priority: document.getElementById('priority').value }) });
    document.getElementById('title').value = '';
    await refreshAll();
});

async function moveTask(id, status) {
    await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await refreshAll();
}

async function deleteTask(id) {
    if (!confirm('ลบ Task นี้?')) return;
    await api(`/tasks/${id}`, { method: 'DELETE' });
    await refreshAll();
}

async function refreshAll() {
    await loadTasks();
    // รอ 500ms ให้ events ประมวลผลเสร็จ แล้วโหลด notifications/audit
    setTimeout(async () => {
        await loadNotifications();
        await loadAudit();
    }, 500);
}

// Initial load
refreshAll();
// Auto-refresh every 5 seconds
setInterval(async () => { await loadNotifications(); await loadAudit(); }, 5000);
