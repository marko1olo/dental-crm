const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
});

async function seed() {
  const orgId = "01a00000-0000-0000-0000-000000000000";
  const patientId = "01a00000-0000-0000-0000-000000000001";
  const now = new Date();

  console.log("Seeding imaging studies for demo organization and patient...");

  // 1. Delete existing demo imaging studies if any
  await pool.query("DELETE FROM imaging_annotations WHERE organization_id = $1", [orgId]);
  await pool.query("DELETE FROM imaging_studies WHERE organization_id = $1", [orgId]);

  // 2. Insert 2D RVG study
  const rvgId = "01a00000-0000-0000-0000-000000000036";
  await pool.query(`
    INSERT INTO imaging_studies (
      id, organization_id, patient_id, kind, title, tooth_code, region,
      captured_at, source_kind, source_name, status, storage_path, ai_summary,
      binding_status, binding_confidence
    ) VALUES (
      $1, $2, $3, 'periapical', $4, '36', '36 нижний левый моляр',
      $5, 'sensor_bridge', 'Vatech EzSensor HD', 'available',
      'radiology/sample_rvg_tooth36_periapical.jpg',
      'Периапикальный очаг разрежения костной ткани в области верхушки дистального корня 36 зуба. Кариес дентина K02.1.',
      'auto_bound', 100
    )
  `, [rvgId, orgId, patientId, "Прицельный RVG снимок зуба 36", now]);

  // 3. Insert 3D CBCT study
  const cbctId = "01a00000-0000-0000-0000-000000000037";
  await pool.query(`
    INSERT INTO imaging_studies (
      id, organization_id, patient_id, kind, title, tooth_code, region,
      captured_at, source_kind, source_name, status, storage_path, ai_summary,
      binding_status, binding_confidence
    ) VALUES (
      $1, $2, $3, 'cbct', $4, '36', '36-37 область имплантации',
      $5, 'dicom_file', 'Planmeca ProMax 3D Mid', 'available',
      'studies/demo_cbct',
      'Толщина кортикальной пластинки 1.8 мм. Доступная высота кости до нижнечелюстного канала: 14.2 мм.',
      'auto_bound', 100
    )
  `, [cbctId, orgId, patientId, "КЛКТ 3D челюстно-лицевой области (Romexis)", now]);

  // 4. Insert ruler measurement annotation
  await pool.query(`
    INSERT INTO imaging_annotations (
      organization_id, study_id, patient_id, tooth_code,
      annotation_type, coordinates, measurements, notes
    ) VALUES (
      $1, $2, $3, '36',
      'distance',
      $4, $5, $6
    )
  `, [
    orgId,
    rvgId,
    patientId,
    JSON.stringify({ startX: 180, startY: 150, endX: 230, endY: 340 }),
    JSON.stringify({ lengthMm: 19.5, distanceMm: 19.5 }),
    "Рабочая длина дистального корня: 19.5 мм (WL)",
  ]);

  console.log("Successfully seeded demo RVG and CBCT studies and annotations in PostgreSQL 18!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
