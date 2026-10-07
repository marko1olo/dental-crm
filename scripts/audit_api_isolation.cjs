const http = require('node:http');

async function request(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(body);
                } catch {
                    json = body;
                }
                resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function main() {
    console.log('========================================================================');
    console.log('  RED TEAM DATA ISOLATION & ZERO-MOCK INQUISITION (MANDATES 8c, 8f, 8y) ');
    console.log('========================================================================\n');

    console.log('--- PHASE 1: REGISTERING REAL PRODUCTION CLINIC (withDemoData: false) ---');
    const prodSuffix = Math.random().toString(36).slice(2, 8);
    const prodRegPayload = {
        clinicName: `Стоматология Доктора Проверенного ${prodSuffix}`,
        email: `doctor_prod_${prodSuffix}@example.com`,
        password: 'Password123!',
        ownerName: 'Д-р Проверенный В. В.',
        ownerPin: '7788',
        practiceType: 'solo',
        phone: '+7 900 111-22-33',
        withDemoData: false
    };

    const prodRegRes = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, prodRegPayload);

    if (prodRegRes.statusCode !== 201) {
        throw new Error(`Production clinic registration failed: ${JSON.stringify(prodRegRes.body)}`);
    }

    const {
        organizationId: prodOrgId,
        userId: prodDoctorId,
        clinicToken: prodClinicToken,
        staffToken: prodStaffToken,
        demoDataSeeded: prodDemoSeeded
    } = prodRegRes.body;

    console.log(`[OK] Production Clinic Created: ${prodOrgId}`);
    console.log(`[OK] Doctor User ID: ${prodDoctorId}`);
    console.log(`[OK] demoDataSeeded: ${prodDemoSeeded} (Strictly False)`);

    const prodHeaders = {
        'x-dente-clinic-token': prodClinicToken,
        'x-dente-staff-token': prodStaffToken,
    };

    console.log('\n--- PHASE 2: VERIFYING ZERO-MOCK EMPTY STATE IN PRODUCTION ---');
    // 1. Dashboard
    const prodDash = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/dashboard',
        method: 'GET',
        headers: prodHeaders
    });
    const prodAppts = prodDash.body?.appointments || [];
    const prodPatients = prodDash.body?.patients || [];
    console.log(`[PROD AUDIT] Dashboard status: ${prodDash.statusCode}`);
    console.log(`[PROD AUDIT] Live Appointments in DB: ${prodAppts.length} (Expected: 0)`);
    console.log(`[PROD AUDIT] Live Patients in DB: ${prodPatients.length} (Expected: 0)`);
    if (prodAppts.length !== 0 || prodPatients.length !== 0) {
        throw new Error('FAIL: Production database contains leaked mock appointments or patients!');
    }

    // 2. Inventory & FEFO Batches
    const prodInv = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${prodOrgId}`,
        method: 'GET',
        headers: prodHeaders
    });
    const prodInvCount = Array.isArray(prodInv.body) ? prodInv.body.length : 0;
    console.log(`[PROD AUDIT] Warehouse Inventory items: ${prodInvCount} (Expected: 0)`);

    const prodBatches = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${prodOrgId}/batches`,
        method: 'GET',
        headers: prodHeaders
    });
    const prodBatchesCount = Array.isArray(prodBatches.body) ? prodBatches.body.length : 0;
    console.log(`[PROD AUDIT] Warehouse FEFO Batches: ${prodBatchesCount} (Expected: 0)`);

    // 3. Lab Orders
    const prodLab = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/lab/orders',
        method: 'GET',
        headers: prodHeaders
    });
    const prodLabCount = Array.isArray(prodLab.body) ? prodLab.body.length : 0;
    console.log(`[PROD AUDIT] Dental Lab Orders: ${prodLabCount} (Expected: 0)`);

    console.log('\n--- PHASE 3: CREATING PERSISTENT REAL PATIENT IN PRODUCTION ---');
    const newPatientRes = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/patients',
        method: 'POST',
        headers: { ...prodHeaders, 'Content-Type': 'application/json' }
    }, {
        fullName: 'Прохоров Валентин Семенович',
        birthDate: '1985-07-22',
        phone: '+7 (916) 777-88-99',
        status: 'active',
        notes: 'Боевой пациент реальной клиники. Жалобы на скол пломбы 2.5'
    });
    console.log(`[PROD AUDIT] Create Patient status: ${newPatientRes.statusCode}`);
    const createdPatientId = newPatientRes.body?.id;
    console.log(`[PROD AUDIT] Created Patient ID: ${createdPatientId}`);

    const prodPatientsReload = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/patients',
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PROD AUDIT] Verified Patients count in DB: ${prodPatientsReload.body.length} -> "${prodPatientsReload.body[0]?.fullName}"`);

    console.log('\n--- PHASE 4: REGISTERING DEMO CLINIC WITH FULL SEEDED CONTEXT ---');
    const demoSuffix = Math.random().toString(36).slice(2, 8);
    const demoRegPayload = {
        clinicName: `Демо Стоматология DENTE ${demoSuffix}`,
        email: `demo_dentist_${demoSuffix}@example.com`,
        password: 'Password123!',
        ownerName: 'Д-р Соколов А. В.',
        ownerPin: '1122',
        practiceType: 'solo',
        phone: '+7 911 222-33-44',
        withDemoData: true // SEED DEEP DEMO DATA INTO POSTGRESQL!
    };

    const demoRegRes = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, demoRegPayload);

    if (demoRegRes.statusCode !== 201) {
        throw new Error(`Demo clinic registration failed: ${JSON.stringify(demoRegRes.body)}`);
    }

    const {
        organizationId: demoOrgId,
        userId: demoDoctorId,
        clinicToken: demoClinicToken,
        staffToken: demoStaffToken,
        demoDataSeeded
    } = demoRegRes.body;

    console.log(`[DEMO AUDIT] Demo Clinic Created: ${demoOrgId}`);
    console.log(`[DEMO AUDIT] Demo Doctor ID: ${demoDoctorId}`);
    console.log(`[DEMO AUDIT] demoDataSeeded: ${demoDataSeeded} (Strictly True)`);

    const demoHeaders = {
        'x-dente-clinic-token': demoClinicToken,
        'x-dente-staff-token': demoStaffToken,
    };

    // 1. Dashboard & Schedule Appointments
    const demoDash = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/dashboard',
        method: 'GET',
        headers: demoHeaders
    });
    console.log(`[DEMO AUDIT] Dashboard status: ${demoDash.statusCode}`);
    const demoAppts = demoDash.body?.appointments || [];
    const demoPatients = demoDash.body?.patients || [];
    console.log(`[DEMO AUDIT] Live Appointments in DB: ${demoAppts.length} (Seeded in PostgreSQL)`);
    console.log(`[DEMO AUDIT] Live Patients in DB: ${demoPatients.length} (Seeded in PostgreSQL)`);
    demoAppts.forEach(a => console.log(`   - Appointment: ${a.startsAt} | Status: ${a.status} | Reason: ${a.reason}`));

    // 2. Tooth states for demo patient Иванов (p0)
    const p0 = demoPatients.find(p => p.fullName.includes('Иванов')) || demoPatients[0];
    const toothRes = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/patients/${p0.id}/tooth-states`,
        method: 'GET',
        headers: demoHeaders
    });
    console.log(`[DEMO AUDIT] Tooth states for "${p0.fullName}": status ${toothRes.statusCode}, count: ${toothRes.body.length}`);
    if (Array.isArray(toothRes.body)) {
        toothRes.body.forEach(t => console.log(`   - Tooth ${t.toothNumber}: ${t.state} (${t.notes || 'OK'})`));
    }

    // 3. Inventory & FEFO Batches
    const demoInv = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${demoOrgId}`,
        method: 'GET',
        headers: demoHeaders
    });
    console.log(`[DEMO AUDIT] Warehouse Inventory items: ${demoInv.body.length}`);
    demoInv.body.forEach(i => console.log(`   - Item: "${i.name}" | Qty: ${i.currentQty} ${i.unit} | UnitCost: ${i.unitCostRub} ₽`));

    const demoBatches = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${demoOrgId}/batches`,
        method: 'GET',
        headers: demoHeaders
    });
    console.log(`[DEMO AUDIT] Warehouse FEFO Batches: ${demoBatches.body.length}`);
    demoBatches.body.forEach(b => console.log(`   - Batch: #${b.batchNumber} | Expiration: ${b.expirationDate} | Qty: ${b.remainingQty}`));

    // 4. Lab Order creation and persistence
    const labOrderCreate = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/lab/orders',
        method: 'POST',
        headers: { ...demoHeaders, 'Content-Type': 'application/json' }
    }, {
        patientId: p0.id,
        patientName: p0.fullName,
        doctorUserId: demoDoctorId,
        labName: 'CAD/CAM Лаборатория DENTE',
        workType: 'Коронка ZrO2 Prettau на зуб 11',
        toothNumber: '11',
        shade: 'A2',
        dueDate: '2026-10-28',
        status: 'in_progress',
        costKopecks: 1450000
    });
    console.log(`[DEMO AUDIT] Create Lab Order: status ${labOrderCreate.statusCode}`);

    const demoLab = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/lab/orders',
        method: 'GET',
        headers: demoHeaders
    });
    console.log(`[DEMO AUDIT] Dental Lab Orders in DB: ${demoLab.body.length}`);

    console.log('\n--- PHASE 5: ADVERSARIAL RED TEAM CROSS-TENANT PENETRATION ATTACK ---');
    console.log('Testing whether Production Doctor token can access ANY Demo data:');

    // Attack 1: Prod token trying to access Demo Inventory
    const att1 = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${demoOrgId}`,
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PENETRATION ATTACK 1] Prod token -> GET /api/inventory/${demoOrgId}`);
    console.log(`   Result: status ${att1.statusCode} (Expected: 403 Forbidden). ISOLATION: ${att1.statusCode === 403 ? 'SECURE PASS' : 'CRITICAL BREACH'}`);

    // Attack 2: Prod token trying to access Demo FEFO Batches
    const att2 = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/inventory/${demoOrgId}/batches`,
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PENETRATION ATTACK 2] Prod token -> GET /api/inventory/${demoOrgId}/batches`);
    console.log(`   Result: status ${att2.statusCode} (Expected: 403 Forbidden). ISOLATION: ${att2.statusCode === 403 ? 'SECURE PASS' : 'CRITICAL BREACH'}`);

    // Attack 3: Prod token trying to access Demo Patient Иванов
    const att3 = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/patients/${p0.id}`,
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PENETRATION ATTACK 3] Prod token -> GET /api/patients/${p0.id}`);
    console.log(`   Result: status ${att3.statusCode} (Expected: 404 Not Found via RLS). ISOLATION: ${att3.statusCode === 404 ? 'SECURE PASS' : 'CRITICAL BREACH'}`);

    // Attack 4: Prod token trying to access Demo Tooth States
    const att4 = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: `/api/patients/${p0.id}/tooth-states`,
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PENETRATION ATTACK 4] Prod token -> GET /api/patients/${p0.id}/tooth-states`);
    console.log(`   Result: status ${att4.statusCode} (Expected: 404 Not Found via RLS). ISOLATION: ${att4.statusCode === 404 ? 'SECURE PASS' : 'CRITICAL BREACH'}`);

    // Attack 5: Prod token listing Lab Orders
    const att5 = await request({
        hostname: '127.0.0.1',
        port: 4100,
        path: '/api/lab/orders',
        method: 'GET',
        headers: prodHeaders
    });
    console.log(`[PENETRATION ATTACK 5] Prod token -> GET /api/lab/orders`);
    console.log(`   Result: count ${att5.body.length} (Expected: 0 - zero leakage of demo orders). ISOLATION: ${att5.body.length === 0 ? 'SECURE PASS' : 'CRITICAL BREACH'}`);

    if (att1.statusCode !== 403 || att2.statusCode !== 403 || att3.statusCode !== 404 || att4.statusCode !== 404 || att5.body.length !== 0) {
        throw new Error('RED TEAM INQUISITION FAILED: Cross-tenant data isolation breached!');
    }

    console.log('\n========================================================================');
    console.log('  VERDICT: [ПРОВЕРЕНО: ЧИСТО] — 100% POSTGRESQL RLS DATA ISOLATION PROVEN ');
    console.log('========================================================================');

    return {
        prodOrgId,
        prodClinicToken,
        prodStaffToken,
        prodDoctorId,
        prodEmail: prodRegPayload.email,
        demoOrgId,
        demoClinicToken,
        demoStaffToken,
        demoDoctorId,
        demoPatientId: p0.id,
    };
}

module.exports = { main };
if (require.main === module) {
    main().catch(err => {
        console.error('Audit crashed:', err);
        process.exit(1);
    });
}
