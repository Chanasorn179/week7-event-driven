CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, description, status, priority) VALUES
    ('ออกแบบ Database Schema', 'สร้าง ER Diagram', 'DONE', 'HIGH'),
    ('สร้าง REST API', 'CRUD endpoints', 'IN_PROGRESS', 'HIGH'),
    ('สร้าง Frontend UI', 'Kanban board', 'TODO', 'MEDIUM'),
    ('เขียน Unit Tests', 'Coverage > 80%', 'TODO', 'LOW'),
    ('Setup RabbitMQ', 'Event-Driven Pattern', 'TODO', 'HIGH');
