import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import Redis from "ioredis";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment Configuration
const PORT = parseInt(process.env.PORT || "3000", 10);
const DOMAIN = process.env.DOMAIN || "dente.pro";
const JWT_SECRET = process.env.JWT_SECRET || "dente_insecure_jwt_secret_please_set_in_env";
const RELAY_SECRET = process.env.RELAY_SECRET || "";
const REDIS_URL = process.env.REDIS_URL;
const CLOUD_RELAY_URL = process.env.CLOUD_RELAY_URL || "http://cloud-relay:4000";
const DATA_DIR = path.join(__dirname, "data");
const QUEUE_FILE = path.join(DATA_DIR, "pending_bookings.json");

// Ensure persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Clinic Metadata
const CLINIC_INFO = {
  name: process.env.CLINIC_NAME || "Стоматологическая клиника ДЕНТЕ",
  phone: process.env.CLINIC_PHONE || "+7 (495) 123-45-67",
  address: process.env.CLINIC_ADDRESS || "г. Москва, ул. Профсоюзная, д. 45",
  workHours: process.env.CLINIC_WORK_HOURS || "Пн-Вс: 09:00 — 21:00",
  timezone: process.env.CLINIC_TIMEZONE || "Europe/Moscow",
  website: process.env.CLINIC_WEBSITE || `https://${DOMAIN}`,
};

// Initial Doctors Catalog
const DOCTORS = [
  {
    id: "doc-1",
    name: "Барабаш Сергей Владимирович",
    specialty: "Главный врач, стоматолог-ортопед",
    experienceYears: 16,
    avatar: "👨‍⚕️",
    badge: "Ортопедия и виниры"
  },
  {
    id: "doc-2",
    name: "Смирнова Елена Александровна",
    specialty: "Стоматолог-терапевт, эндодонтист",
    experienceYears: 11,
    avatar: "👩‍⚕️",
    badge: "Лечение под микроскопом"
  },
  {
    id: "doc-3",
    name: "Кузнецов Дмитрий Игоревич",
    specialty: "Хирург-имплантолог, ЧЛХ",
    experienceYears: 14,
    avatar: "👨‍⚕️",
    badge: "All-on-4 / Имплантация"
  },
  {
    id: "doc-4",
    name: "Волкова Анна Михайловна",
    specialty: "Стоматолог-ортодонт",
    experienceYears: 9,
    avatar: "👩‍⚕️",
    badge: "Элайнеры и брекеты"
  },
  {
    id: "doc-5",
    name: "Морозова Ольга Сергеевна",
    specialty: "Гигиенист, пародонтолог",
    experienceYears: 8,
    avatar: "👩‍⚕️",
    badge: "Профгигиена и отбеливание"
  }
];

// Initialize Redis Client
let redis = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });
    redis.connect().then(() => {
      console.log("[BookingServer:Redis] Connected to Redis successfully.");
    }).catch((err) => {
      console.warn("[BookingServer:Redis] Warning: Redis connection failed:", err.message);
    });
  } catch (err) {
    console.warn("[BookingServer:Redis] Redis init warning:", err.message);
  }
}

// Queue Helper Functions
function readLocalQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const raw = fs.readFileSync(QUEUE_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[BookingServer] Failed to read local queue:", err.message);
  }
  return [];
}

function writeLocalQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
  } catch (err) {
    console.error("[BookingServer] Failed to write local queue:", err.message);
  }
}

async function enqueueBooking(booking) {
  // 1. Save to Redis queue
  if (redis && redis.status === "ready") {
    try {
      await redis.rpush("dente:booking_queue", JSON.stringify(booking));
    } catch (err) {
      console.warn("[BookingServer:Redis] Failed to push to Redis queue:", err.message);
    }
  }
  // 2. Always persist to disk
  const list = readLocalQueue();
  list.push(booking);
  writeLocalQueue(list);
}

async function getQueuedCount() {
  if (redis && redis.status === "ready") {
    try {
      return await redis.llen("dente:booking_queue");
    } catch {}
  }
  return readLocalQueue().length;
}

// Fastify App Setup
const app = Fastify({
  logger: false,
  trustProxy: true,
});

await app.register(fastifyCors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"]
});

// Serve Static Assets from /public
await app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/static/",
  decorateReply: false
});

// Virtual Host Dispatcher Middleware
app.addHook("onRequest", async (req, reply) => {
  const host = (req.headers.host || "").toLowerCase();
  const urlPath = req.raw.url.split("?")[0];

  // Pass API and Healthcheck requests directly to Fastify router
  if (urlPath.startsWith("/api/") || urlPath === "/health" || urlPath.startsWith("/static/")) {
    return;
  }

  // 1. Booking Domain: booking.yourdomain.com
  if (host.startsWith("booking.")) {
    if (urlPath === "/" || urlPath === "/index.html") {
      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(fs.createReadStream(path.join(__dirname, "public", "booking", "index.html")));
    }
    const assetPath = path.join(__dirname, "public", "booking", urlPath);
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      return reply.sendFile(path.relative(path.join(__dirname, "public"), assetPath), path.join(__dirname, "public"));
    }
  }

  // 2. Patient Cabinet PWA: my.yourdomain.com
  if (host.startsWith("my.")) {
    if (urlPath === "/" || urlPath === "/index.html") {
      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(fs.createReadStream(path.join(__dirname, "public", "patient", "index.html")));
    }
    const assetPath = path.join(__dirname, "public", "patient", urlPath);
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      return reply.sendFile(path.relative(path.join(__dirname, "public"), assetPath), path.join(__dirname, "public"));
    }
  }

  // 3. Dental Lab Portal: lab.yourdomain.com
  if (host.startsWith("lab.")) {
    if (urlPath === "/" || urlPath === "/index.html") {
      reply.header("Content-Type", "text/html; charset=utf-8");
      return reply.send(fs.createReadStream(path.join(__dirname, "public", "lab", "index.html")));
    }
    const assetPath = path.join(__dirname, "public", "lab", urlPath);
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      return reply.sendFile(path.relative(path.join(__dirname, "public"), assetPath), path.join(__dirname, "public"));
    }
  }

  // Fallback landing page if accessing via direct IP or main domain
  if (urlPath === "/" || urlPath === "/index.html") {
    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${CLINIC_INFO.name} — Облачные сервисы</title>
        <style>
          :root { --primary: #0284c7; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --muted: #94a3b8; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .container { max-width: 600px; width: 100%; text-align: center; }
          h1 { font-size: 26px; margin-bottom: 8px; font-weight: 700; }
          p.lead { color: var(--muted); margin-bottom: 32px; font-size: 15px; }
          .grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
          .card { background: var(--card); border: 1px solid #334155; border-radius: 14px; padding: 20px; text-decoration: none; color: inherit; display: flex; align-items: center; gap: 16px; transition: transform 0.15s, border-color 0.15s; }
          .card:hover { transform: translateY(-2px); border-color: var(--primary); }
          .icon { font-size: 32px; width: 48px; text-align: center; }
          .info { text-align: left; }
          .title { font-weight: 600; font-size: 17px; margin-bottom: 4px; }
          .desc { font-size: 13px; color: var(--muted); }
          .status { margin-top: 32px; font-size: 12px; color: #10b981; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; background: rgba(16, 185, 129, 0.1); }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${CLINIC_INFO.name}</h1>
          <p class="lead">Облачный шлюз 24/7 DENTE Dental CRM</p>
          <div class="grid">
            <a class="card" href="https://booking.${DOMAIN}">
              <div class="icon">📅</div>
              <div class="info">
                <div class="title">Онлайн-запись на приём</div>
                <div class="desc">Публичный виджет для сайта клиники и Telegram WebApp</div>
              </div>
            </a>
            <a class="card" href="https://my.${DOMAIN}">
              <div class="icon">📱</div>
              <div class="info">
                <div class="title">Личный кабинет пациента (PWA)</div>
                <div class="desc">Визиты, планы лечения, чеки 54-ФЗ и справки для налоговой</div>
              </div>
            </a>
            <a class="card" href="https://lab.${DOMAIN}">
              <div class="icon">🔬</div>
              <div class="info">
                <div class="title">Портал зуботехнической лаборатории</div>
                <div class="desc">Наряды ЗТЛ, 3D сканы, статусы изготовления коронок</div>
              </div>
            </a>
          </div>
          <div class="status">
            <span class="dot"></span> Сервер работает в штатном режиме 24/7
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// =============================================================================
// API ROUTES
// =============================================================================

// 1. Healthcheck
app.get("/health", async () => {
  const queued = await getQueuedCount();
  const redisHealthy = redis ? redis.status === "ready" : false;
  return {
    status: "ok",
    service: "dente-booking-server",
    uptime: Math.floor(process.uptime()),
    redisConnected: redisHealthy,
    queuedBookingsCount: queued,
    timestamp: new Date().toISOString()
  };
});

// 2. Clinic Info
app.get("/api/booking/clinic", async () => {
  return CLINIC_INFO;
});

// 3. Doctors List
app.get("/api/booking/doctors", async () => {
  return DOCTORS;
});

// 4. Slots Generation (Cached / Fallback Engine)
app.get("/api/booking/slots", async (req, reply) => {
  const { doctorId, date } = req.query;

  if (!date) {
    return reply.status(400).send({ error: "MissingDate", message: "Параметр date обязателен (YYYY-MM-DD)" });
  }

  // Generate realistic 30-minute daytime clinical slots (09:00 - 20:30)
  const slots = [];
  const startHour = 9;
  const endHour = 20;

  for (let hour = startHour; hour <= endHour; hour++) {
    for (const minute of [0, 30]) {
      if (hour === endHour && minute > 30) continue;
      const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Simulate realistic occupied slots deterministically from hash
      const slotHash = (date + timeStr + (doctorId || "")).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const isAvailable = (slotHash % 7) !== 0 && (slotHash % 5) !== 0;

      slots.push({
        time: timeStr,
        available: isAvailable,
        durationMinutes: 30
      });
    }
  }

  return {
    doctorId: doctorId || null,
    date,
    slots
  };
});

// 5. Booking Creation (Online & Night Queue Resilient)
app.post("/api/booking/book", async (req, reply) => {
  const body = req.body || {};
  const { patientName, phone, doctorId, date, time, comment } = body;

  // Validation
  if (!patientName || patientName.trim().length < 2) {
    return reply.status(400).send({ error: "InvalidName", message: "Укажите имя и фамилию пациента" });
  }

  const cleanPhone = (phone || "").replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return reply.status(400).send({ error: "InvalidPhone", message: "Укажите корректный номер телефона РФ (10-11 цифр)" });
  }

  if (!date || !time) {
    return reply.status(400).send({ error: "InvalidSlot", message: "Выберите дату и время приёма" });
  }

  const doctor = DOCTORS.find((d) => d.id === doctorId) || DOCTORS[0];
  const bookingId = `DNT-${date.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const bookingRecord = {
    id: bookingId,
    patientName: patientName.trim(),
    phone: cleanPhone.startsWith("8") ? "7" + cleanPhone.slice(1) : cleanPhone.startsWith("7") ? cleanPhone : "7" + cleanPhone,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date,
    time,
    comment: (comment || "").trim(),
    createdAt: new Date().toISOString(),
    status: "pending_confirmation"
  };

  // Check if clinic is reachable via Cloud Relay
  let forwardedDirectly = false;
  try {
    const relayHealthRes = await fetch(`${CLOUD_RELAY_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (relayHealthRes.ok) {
      const relayHealth = await relayHealthRes.json();
      if (relayHealth.clinicConnected) {
        // Forward directly to clinic via RPC
        const rpcRes = await fetch(`${CLOUD_RELAY_URL}/api/rpc/clinic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RELAY_SECRET}`
          },
          body: JSON.stringify({
            method: "POST",
            path: "/api/public/booking/cloud-intake",
            data: bookingRecord
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (rpcRes.ok) {
          forwardedDirectly = true;
          bookingRecord.status = "confirmed_by_clinic";
        }
      }
    }
  } catch (err) {
    console.log(`[BookingServer] Clinic relay offline or busy (${err.message}). Enqueuing to night queue.`);
  }

  // If clinic is offline, enqueue booking safely
  if (!forwardedDirectly) {
    await enqueueBooking(bookingRecord);
  }

  // Send Telegram Notification to Clinic Admin if configured
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    const message = `🔔 *Новая онлайн-запись в DENTE CRM*\n` +
      `👤 *Пациент:* ${bookingRecord.patientName}\n` +
      `📞 *Телефон:* +${bookingRecord.phone}\n` +
      `👨‍⚕️ *Врач:* ${bookingRecord.doctorName}\n` +
      `📅 *Дата и время:* ${bookingRecord.date} в ${bookingRecord.time}\n` +
      `📝 *Примечание:* ${bookingRecord.comment || "—"}\n` +
      `🔖 *Номер брони:* \`${bookingRecord.id}\`\n` +
      `⚡ *Статус:* ${forwardedDirectly ? "✅ Доставлено в клинику" : "🌙 Поставлено в очередь (клиника офлайн)"}`;

    fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tgChatId,
        text: message,
        parse_mode: "Markdown"
      })
    }).catch((tgErr) => console.warn("[TelegramAlert] Failed to send:", tgErr.message));
  }

  return {
    success: true,
    bookingId: bookingRecord.id,
    status: forwardedDirectly ? "confirmed" : "queued",
    message: forwardedDirectly
      ? `Вы успешно записаны на приём к ${doctor.name} на ${date} в ${time}.`
      : `Ваша заявка №${bookingRecord.id} успешно принята! Клиника подтвердит запись в начале рабочего дня.`
  };
});

// 6. Patient Portal Auth: OTP Request
app.post("/api/portal/auth/request-otp", async (req, reply) => {
  const { phone } = req.body || {};
  const clean = (phone || "").replace(/\D/g, "");
  if (clean.length < 10) {
    return reply.status(400).send({ error: "InvalidPhone", message: "Укажите номер телефона" });
  }

  // Generate 4-digit OTP code (default 1234 in staging/dev if SMS gateway not set)
  const otpCode = process.env.SMS_GATEWAY_API_KEY ? String(Math.floor(1000 + Math.random() * 9000)) : "1234";

  if (redis && redis.status === "ready") {
    await redis.setex(`dente:otp:${clean}`, 300, otpCode);
  }

  console.log(`[Portal:Auth] OTP for +${clean}: ${otpCode}`);

  return {
    success: true,
    message: "Код подтверждения отправлен по SMS",
    expiresInSeconds: 300,
    devCodeHint: process.env.SMS_GATEWAY_API_KEY ? undefined : "1234"
  };
});

// 7. Patient Portal Auth: OTP Verify
app.post("/api/portal/auth/verify-otp", async (req, reply) => {
  const { phone, code } = req.body || {};
  const clean = (phone || "").replace(/\D/g, "");

  let valid = false;
  if (redis && redis.status === "ready") {
    const saved = await redis.get(`dente:otp:${clean}`);
    if (saved && saved === String(code).trim()) {
      valid = true;
      await redis.del(`dente:otp:${clean}`);
    }
  }

  // Fallback dev code "1234"
  if (!process.env.SMS_GATEWAY_API_KEY && String(code).trim() === "1234") {
    valid = true;
  }

  if (!valid) {
    return reply.status(400).send({ error: "InvalidCode", message: "Неверный или просроченный код из SMS" });
  }

  // Generate JWT token
  const token = jwt.sign(
    { phone: clean, role: "patient" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return {
    success: true,
    token,
    patient: {
      phone: `+${clean}`,
      name: "Пациент Клиники"
    }
  };
});

// 8. Patient Portal Mock/Cached Clinical Data
app.get("/api/portal/data", async (req) => {
  return {
    patient: {
      name: "Смирнова Екатерина Васильевна",
      birthDate: "1988-04-12",
      cardNumber: "043-у/2026-118",
      balanceRub: 12500,
      cashbackRub: 1800
    },
    upcomingAppointments: [
      {
        id: "app-101",
        date: "2026-10-02",
        time: "15:00",
        doctorName: "Барабаш Сергей Владимирович",
        specialty: "Стоматолог-ортопед",
        cabinet: "Кабинет №1 (Главный)",
        procedure: "Фиксация безметалловой коронки E.max",
        status: "confirmed"
      }
    ],
    treatmentPlans: [
      {
        id: "plan-54",
        title: "Комплексная санация и ортопедия",
        status: "active",
        totalAmountRub: 148000,
        paidAmountRub: 98000,
        stages: [
          { name: "Профгигиена AirFlow и снятие зубных отложений", completed: true },
          { name: "Лечение кариеса 1.6, 2.5 под микроскопом", completed: true },
          { name: "Установка коронки E.max на зуб 1.6", completed: false }
        ]
      }
    ],
    invoices: [
      {
        id: "inv-2026-89",
        date: "2026-09-18",
        amountRub: 14500,
        paid: true,
        receiptUrl: "#",
        taxDeductionEligible: true
      }
    ]
  };
});

// 9. Dental Lab Orders Endpoint
app.get("/api/lab/orders", async () => {
  return {
    orders: [
      {
        id: "ZTL-2026-441",
        doctorName: "Барабаш С.В.",
        patientCode: "С-8812",
        teeth: "1.6, 1.7",
        type: "Циркониевая коронка Prettau",
        color: "A2",
        deadline: "2026-10-01",
        status: "modeling",
        statusLabel: "3D Моделирование (Exocad)"
      },
      {
        id: "ZTL-2026-442",
        doctorName: "Кузнецов Д.И.",
        patientCode: "К-4519",
        teeth: "3.6",
        type: "Индивидуальный титановый абатмент",
        color: "—",
        deadline: "2026-09-29",
        status: "milling",
        statusLabel: "Фрезеровка на станке"
      },
      {
        id: "ZTL-2026-443",
        doctorName: "Барабаш С.В.",
        patientCode: "В-3120",
        teeth: "2.1, 2.2",
        type: "Виниры E.max на огнеупоре",
        color: "BL2",
        deadline: "2026-10-04",
        status: "layering",
        statusLabel: "Нанесение керамики"
      }
    ]
  };
});

app.patch("/api/lab/orders/:id", async (req, reply) => {
  const { id } = req.params;
  const { status } = req.body || {};

  return {
    success: true,
    orderId: id,
    newStatus: status || "completed",
    updatedAt: new Date().toISOString()
  };
});

// =============================================================================
// BACKGROUND QUEUE FLUSHER (SYNC WORKER)
// =============================================================================
// Runs every 30 seconds: checks if clinic is online via Cloud Relay,
// and flushes pending bookings into clinic CRM database!
setInterval(async () => {
  const pending = readLocalQueue();
  if (pending.length === 0) return;

  try {
    const healthRes = await fetch(`${CLOUD_RELAY_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!healthRes.ok) return;

    const health = await healthRes.json();
    if (!health.clinicConnected) return;

    console.log(`[QueueFlusher] Clinic online! Flushing ${pending.length} pending bookings...`);
    const remaining = [];

    for (const item of pending) {
      try {
        const res = await fetch(`${CLOUD_RELAY_URL}/api/rpc/clinic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RELAY_SECRET}`
          },
          body: JSON.stringify({
            method: "POST",
            path: "/api/public/booking/cloud-intake",
            data: item
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
          remaining.push(item);
        } else {
          console.log(`[QueueFlusher] Successfully synced booking ${item.id} to clinic.`);
        }
      } catch (flushErr) {
        remaining.push(item);
      }
    }

    writeLocalQueue(remaining);

    if (redis && redis.status === "ready") {
      await redis.del("dente:booking_queue");
      if (remaining.length > 0) {
        await redis.rpush("dente:booking_queue", ...remaining.map((r) => JSON.stringify(r)));
      }
    }
  } catch (err) {
    // Ignore background polling errors
  }
}, 30000);

// Start Server
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("[BookingServer] Fatal startup error:", err);
    process.exit(1);
  }
  console.log(`[DENTE Booking & PWA Server] Listening on ${address}`);
  console.log(`[DENTE Booking & PWA Server] Base domain configured: ${DOMAIN}`);
});
