/**
 * scripts/seed_patient_intake_data.cjs
 * Seeds real PostgreSQL 18 data for Patient Intake & Quick Booking audit.
 */

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@127.0.0.1:5432/dental_crm",
  });
  await client.connect();

  console.log("Connected to PostgreSQL 18 (dental_crm)");

  const orgId = "00000000-0000-0000-0000-000000000001";
  const userId = "00000000-0000-0000-0000-000000000002";
  const clinicId = "00000000-0000-0000-0000-000000000003";

  // 1. Ensure Organization
  await client.query(
    `INSERT INTO organizations (id, name, created_at, updated_at)
     VALUES ($1, 'Стоматология ДЕНТЕ Премиум', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [orgId]
  );
  console.log(`Ensured org: ${orgId}`);

  // 2. Ensure Clinic
  await client.query(
    `INSERT INTO clinics (id, organization_id, name, created_at)
     VALUES ($1, $2, 'Главный корпус', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [clinicId, orgId]
  );
  console.log(`Ensured clinic: ${clinicId}`);

  // 3. Ensure User
  await client.query(
    `INSERT INTO users (id, organization_id, full_name, email, role, is_active)
     VALUES ($1, $2, 'Д-р Воронов Алексей Владимирович', 'clinic@example.com', 'doctor', true)
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, full_name = 'Д-р Воронов Алексей Владимирович', email = 'clinic@example.com', role = 'doctor', is_active = true`,
    [userId, orgId]
  );
  console.log(`Ensured user: ${userId}`);

  // 4. Ensure Chair
  const chairId = "01a10c1e-5801-79e3-b5df-974cec094037";
  await client.query(
    `INSERT INTO chairs (id, organization_id, clinic_id, name, is_active)
     VALUES ($1, $2, $3, 'Кресло 1 (Терапия)', true)
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, clinic_id = $3, name = 'Кресло 1 (Терапия)', is_active = true`,
    [chairId, orgId, clinicId]
  );
  console.log(`Ensured chair: ${chairId}`);

  // 5. Ensure Patient 1 (Ковалёв Роман Станиславович)
  const pat1Id = "01a10cc5-ae2c-7217-a513-993c1a953877";
  await client.query(
    `INSERT INTO patients (id, organization_id, full_name, phone, birth_date, status, created_at, updated_at)
     VALUES ($1, $2, 'Ковалёв Роман Станиславович', '+7 (999) 888-77-66', '1988-04-12', 'active', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, full_name = 'Ковалёв Роман Станиславович', phone = '+7 (999) 888-77-66', status = 'active'`,
    [pat1Id, orgId]
  );
  console.log(`Seeded Patient 1: Ковалёв Роман (+7 999 888-77-66)`);

  // 6. Ensure Patient 2 (Смирнова Елена Сергеевна)
  const pat2Id = "01a10cc5-e5ed-7dcf-afcf-732cdf86d9cf";
  await client.query(
    `INSERT INTO patients (id, organization_id, full_name, phone, birth_date, status, created_at, updated_at)
     VALUES ($1, $2, 'Смирнова Елена Сергеевна', '+7 (916) 123-45-67', '1992-08-25', 'active', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, full_name = 'Смирнова Елена Сергеевна', phone = '+7 (916) 123-45-67', status = 'active'`,
    [pat2Id, orgId]
  );
  console.log(`Seeded Patient 2: Смирнова Елена (+7 916 123-45-67)`);

  // Dates
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // 7. Seed today's 10:00 appointment for conflict testing
  const todayApptId = "01a10cc7-1000-7000-8000-000000000001";
  const todayStart = new Date(`${todayStr}T10:00:00`).toISOString();
  const todayEnd = new Date(`${todayStr}T11:00:00`).toISOString();
  await client.query(
    `INSERT INTO appointments (id, organization_id, patient_id, doctor_user_id, chair_id, starts_at, ends_at, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', 'Плановый терапевтический приём')
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, starts_at = $6, ends_at = $7, status = 'confirmed'`,
    [todayApptId, orgId, pat1Id, userId, chairId, todayStart, todayEnd]
  );
  console.log(`Seeded today's appointment: ${todayStart} - ${todayEnd}`);

  // 8. Seed tomorrow's appointments for Reminders Modal
  const tomAppt1Id = "01a10cc7-0000-7000-8000-000000000002";
  const tom1Start = new Date(`${tomorrowStr}T10:00:00`).toISOString();
  const tom1End = new Date(`${tomorrowStr}T10:45:00`).toISOString();
  await client.query(
    `INSERT INTO appointments (id, organization_id, patient_id, doctor_user_id, chair_id, starts_at, ends_at, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned', 'Лечение кариеса 2.6')
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, starts_at = $6, ends_at = $7, status = 'planned'`,
    [tomAppt1Id, orgId, pat1Id, userId, chairId, tom1Start, tom1End]
  );

  const tomAppt2Id = "01a10cc7-0000-7000-8000-000000000003";
  const tom2Start = new Date(`${tomorrowStr}T12:00:00`).toISOString();
  const tom2End = new Date(`${tomorrowStr}T12:45:00`).toISOString();
  await client.query(
    `INSERT INTO appointments (id, organization_id, patient_id, doctor_user_id, chair_id, starts_at, ends_at, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned', 'Профгигиена полости рта')
     ON CONFLICT (id) DO UPDATE SET organization_id = $2, starts_at = $6, ends_at = $7, status = 'planned'`,
    [tomAppt2Id, orgId, pat2Id, userId, chairId, tom2Start, tom2End]
  );
  console.log(`Seeded tomorrow's appointments: ${tom1Start}, ${tom2Start}`);

  await client.end();
  console.log("Seeding completed successfully!");
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
