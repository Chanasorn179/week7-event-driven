# 📡 Week 7 — Event-Driven Architecture with RabbitMQ

**รายวิชา:** ENGSE207 Software Architecture — Term Project  
**สัปดาห์:** 7 | **ระยะเวลา:** 3 ชั่วโมง | **ระดับความยาก:** ⭐⭐⭐⭐⭐  
**นักศึกษา:** นายชนสรณ์ บุตรถา 67543210025-2 — มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา

> **ต่อยอดจาก:** Week 6 (N-Tier + Redis + Load Balancing) → เพิ่ม Event-Driven Pattern + RabbitMQ + แยก Microservices

---

## 📋 สารบัญ

- [วัตถุประสงค์](#-วัตถุประสงค์)
- [ภาพรวมสถาปัตยกรรม](#-ภาพรวมสถาปัตยกรรม)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [Services](#-services)
- [Event Flow](#-event-flow)
- [การติดตั้งและรัน](#-การติดตั้งและรัน)
- [การทดสอบ](#-การทดสอบ)
- [API Endpoints](#-api-endpoints)
- [Challenges](#-challenges)
- [การส่งงาน](#-การส่งงาน)

---

## 🎯 วัตถุประสงค์

เมื่อจบ Lab นี้ นักศึกษาจะสามารถ:

- อธิบายหลักการ **Event-Driven Architecture** และความแตกต่างจาก Synchronous (Request/Response) ได้
- ตั้งค่า **RabbitMQ** เป็น Message Broker ใน Docker ได้
- Implement **Pub/Sub Pattern** — Publisher (Task Service) ส่ง Event ไปยัง Exchange ได้
- Implement **Consumer Services** (Notification, Audit) ที่รับ Event จาก Queue ได้
- ออกแบบ **Event Contract/Schema** ที่ชัดเจนสำหรับ Services สื่อสารกันได้
- ทดสอบ **Event Flow แบบ End-to-End** และเข้าใจ Asynchronous Communication ได้

---

## 🏗️ ภาพรวมสถาปัตยกรรม

```
                         Browser (Client)
                              │
                         Port 3000
                              ▼
            ┌─────────────────────────────────────┐
            │     API Gateway (Express.js :3000)  │
            │  /api/tasks/*  /api/notifications/* │
            │  /api/audit/*  /api/health          │
            └───────┬──────────────┬──────────────┘
                    │ HTTP         │ HTTP         │ HTTP
                    ▼             ▼              ▼
         ┌──────────────┐ ┌─────────────┐ ┌────────────┐
         │ Task Service │ │Notification │ │   Audit    │
         │   :3001      │ │  Service    │ │  Service   │
         │ CRUD + Pub.  │ │   :3002     │ │   :3003    │
         └──────┬───────┘ └──────┬──────┘ └─────┬──────┘
                │ SQL            │ Subscribe     │ Subscribe
                ▼                └──────┬────────┘
         ┌──────────────┐  ┌────────────▼──────────────────────┐
         │  PostgreSQL  │  │  RabbitMQ (Message Broker)        │
         │  tasks DB    │  │  Exchange: task.events (fanout)   │
         └──────────────┘  │  • notification_queue             │
                           │  • audit_queue                    │
                           │  Management UI: :15672            │
                           └───────────────────────────────────┘
```

---

## 📁 โครงสร้างโปรเจกต์

```
week7-event-driven/
├── api-gateway/            ← Entry point รับ request จาก Client
│   └── src/
├── task-service/           ← CRUD Tasks + Publish Events
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── models/
│       ├── routes/
│       └── events/         ← Publisher logic
├── notification-service/   ← Consumer #1 (รับ Event → แจ้งเตือน)
│   └── src/
├── audit-service/          ← Consumer #2 (รับ Event → บันทึก log)
│   └── src/
├── shared/                 ← Event contracts ใช้ร่วมกัน
│   └── events/
│       ├── eventTypes.js
│       └── rabbitmq.js
├── database/               ← SQL init scripts
├── docs/                   ← Diagrams, screenshots
├── docker-compose.yml
└── .env
```

---

## 🔧 Services

| Service | Port | หน้าที่ |
|---|---|---|
| **API Gateway** | 3000 | รับ Request และ Route ไปยัง Services |
| **Task Service** | 3001 | CRUD Tasks + Publish Events → RabbitMQ |
| **Notification Service** | 3002 | Consume Events → สร้าง Notification |
| **Audit Service** | 3003 | Consume Events → บันทึก Audit Log |
| **PostgreSQL** | 5432 | ฐานข้อมูล Tasks |
| **RabbitMQ** | 5672 / 15672 | Message Broker + Management UI |

---

## 📤 Event Flow

เมื่อนักศึกษาสร้าง Task ใหม่:

```
① POST /api/tasks { title: "ทำ Lab Week 7" }
       │
       ▼
② Task Service:
   • INSERT INTO tasks → สร้างสำเร็จ (id: 8)
   • Publish Event → RabbitMQ
       │
       ▼
③ RabbitMQ Exchange (task.events):
   { type: "TASK_CREATED", data: { id: 8, title: "ทำ Lab Week 7" }, timestamp: "..." }
       │
       ├──────────────────────────┐
       ▼                          ▼
④ notification_queue         ⑤ audit_queue
       │                          │
       ▼                          ▼
  Notification Service:       Audit Service:
  "📧 [TASK_CREATED] ..."     "📝 AUDIT: TASK_CREATED ..."

⏱️ Client ได้ response ตั้งแต่ขั้นตอน ② (ไม่ต้องรอ ④ ⑤)
```

### Events ที่รองรับ

| Action | Event Type | Consumers |
|---|---|---|
| `POST /tasks` | `TASK_CREATED` | Notification ✅ Audit ✅ |
| `PUT /tasks/:id` | `TASK_UPDATED` | Notification ✅ Audit ✅ |
| `PUT /tasks/:id` (→ DONE) | `TASK_COMPLETED` | Notification ✅ Audit ✅ |
| `DELETE /tasks/:id` | `TASK_DELETED` | Notification ✅ Audit ✅ |

---

## 🚀 การติดตั้งและรัน

### Prerequisites

- Docker & Docker Compose
- Node.js 18+

### Clone & Setup

```bash
git clone https://github.com/Chanasorn179/week7-event-driven.git
cd week7-event-driven
```

### สร้างไฟล์ .env

```bash
cat > .env << 'EOF'
# Database
POSTGRES_DB=taskboard_db
POSTGRES_USER=taskboard
POSTGRES_PASSWORD=taskboard123

# RabbitMQ
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Services
TASK_SERVICE_URL=http://task-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3002
AUDIT_SERVICE_URL=http://audit-service:3003
EOF
```

### รัน Docker Compose

```bash
docker compose up -d --build
```

### ตรวจสอบ Services

```bash
docker compose ps
```

ทุก Service ควรมีสถานะ `Up`

### RabbitMQ Management UI

เปิด [http://localhost:15672](http://localhost:15672) แล้ว login ด้วย `guest` / `guest`

---

## 🧪 การทดสอบ

### ทดสอบ Create Task

```bash
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"ทดสอบ Event-Driven","description":"Lab Week 7","priority":"HIGH"}' \
  | python3 -m json.tool
```

### ตรวจสอบ Notifications

```bash
curl -s http://localhost:3000/api/notifications | python3 -m json.tool
```

### ตรวจสอบ Audit Log

```bash
curl -s http://localhost:3000/api/audit | python3 -m json.tool
```

### ทดสอบ Complete Task

```bash
curl -s -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"DONE"}' | python3 -m json.tool
```

### ดู Event Flow จาก Docker Logs

```bash
docker compose logs --tail=30 task-service notification-service audit-service
```

**ผลลัพธ์ที่คาดหวัง:**

```
task-service        | 📤 EVENT PUBLISHED: TASK_CREATED | ID: evt-1708600001-abc123
notification-service| 📨 EVENT RECEIVED: TASK_CREATED
notification-service| 📝 NOTIFICATION: New task "ทดสอบ Event-Driven" has been created
audit-service       | 📨 EVENT RECEIVED: TASK_CREATED
audit-service       | 📝 AUDIT LOG #1: TASK_CREATED | Task #8 "ทดสอบ Event-Driven"
```

### Gateway Health Check

```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
```

---

## 📡 API Endpoints

### Tasks (ผ่าน API Gateway)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `GET` | `/api/tasks` | ดึง Tasks ทั้งหมด |
| `GET` | `/api/tasks/:id` | ดึง Task ตาม ID |
| `POST` | `/api/tasks` | สร้าง Task ใหม่ |
| `PUT` | `/api/tasks/:id` | อัปเดต Task |
| `DELETE` | `/api/tasks/:id` | ลบ Task |

### Notifications & Audit

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `GET` | `/api/notifications` | ดึง Notifications ทั้งหมด |
| `GET` | `/api/audit` | ดึง Audit Log ทั้งหมด |
| `GET` | `/api/health` | ตรวจสอบสถานะทุก Service |

---

## 🏆 Challenges

| ระดับ | Challenge | คำแนะนำ |
|:---:|---|---|
| ⭐ | เพิ่ม Event Type ใหม่ `TASK_PRIORITY_CHANGED` เมื่อเปลี่ยน priority | เพิ่มใน `eventTypes.js` + publisher |
| ⭐⭐ | เพิ่ม Statistics Service ที่นับจำนวน events แต่ละประเภท | สร้าง consumer ใหม่ + queue ใหม่ |
| ⭐⭐⭐ | Implement Dead Letter Queue (DLQ) สำหรับ events ที่ process ไม่สำเร็จ | ศึกษา RabbitMQ DLQ pattern |

---

## 📤 การส่งงาน

```bash
cd week7-event-driven

git add -A
git commit -m "Week 7: Event-Driven Architecture with RabbitMQ

- Task Service publishes events (TASK_CREATED/UPDATED/COMPLETED/DELETED)
- Notification Service consumes events and creates notifications
- Audit Service consumes events and creates audit trail
- API Gateway routes to all services
- RabbitMQ as message broker with fanout exchange
- Docker Compose with 6 services
- Shared event contracts for service communication"

git push origin main
```

### Deliverables Checklist

- [ ] `docker compose up -d --build` ทำงานครบทุก service
- [ ] สร้าง Task แล้ว Notification + Audit Service ได้รับ Event
- [ ] RabbitMQ Management UI แสดง Exchange + Queues ที่ bind
- [ ] API Gateway route ไปทุก service ถูกต้อง
- [ ] Frontend แสดง Task Board + Notifications + Audit Log
- [ ] Docker logs แสดง Event flow (Published → Received → Processed)
- [ ] Git commit พร้อม message อธิบาย

---

## 📊 Week 6 vs Week 7 — เปรียบเทียบ

| หัวข้อ | Week 6 (N-Tier + Redis) | Week 7 (Event-Driven) |
|---|---|---|
| Communication | Synchronous (Request/Response) | Asynchronous (Pub/Sub) |
| Services | 1 App × 3 instances | 4 Services แยกหน้าที่ชัดเจน |
| Coupling | Moderate | Loose (Publisher ไม่รู้ว่าใครรับ) |
| Fault Tolerance | ถ้า DB ล่ม = ทุกอย่างล่ม | ถ้า Notif ล่ม → Task ยังสร้างได้ |
| Complexity | ★★★☆☆ | ★★★★☆ |
| Use Cases | Web app ทั่วไป, CRUD-heavy | ระบบแจ้งเตือน, Logging, Order processing |

---

*ENGSE207 Software Architecture — Term Project Week 7*