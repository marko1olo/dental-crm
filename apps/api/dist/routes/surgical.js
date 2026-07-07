import { db } from '../db/client.js';
import { drillProtocols, doctorCommissions, schedulerReservations } from '../db/schema.js';
import { eq, and, isNull, lte } from 'drizzle-orm';
function classifyMisch(avgHU) {
    if (avgHU > 1250)
        return 'D1';
    if (avgHU >= 850)
        return 'D2';
    if (avgHU >= 350)
        return 'D3';
    return 'D4';
}
function avgArr(arr) {
    return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}
function extractHUZones(samples) {
    if (samples.length === 0)
        return { corticalHU: 0, cancellousHU: 0, apicalHU: 0 };
    const n = samples.length;
    const k = Math.max(1, Math.round(n * 0.2));
    return {
        corticalHU: avgArr(samples.slice(0, k)),
        cancellousHU: avgArr(samples.slice(k, n - k).length > 0 ? samples.slice(k, n - k) : samples),
        apicalHU: avgArr(samples.slice(n - k)),
    };
}
export default async function registerSurgicalRoutes(fastify) {
    // POST /api/surgical/drill-protocol/save
    fastify.post('/api/surgical/drill-protocol/save', async (req, reply) => {
        const body = req.body;
        if (!body.patientId || !body.organizationId || !body.huSamples?.length) {
            return reply.code(400).send({ error: 'patientId, organizationId, huSamples required' });
        }
        const zones = extractHUZones(body.huSamples);
        const avgHU = (zones.corticalHU + zones.cancellousHU + zones.apicalHU) / 3;
        const mischClass = classifyMisch(avgHU);
        // Generate steps (simplified mirror of frontend logic — single source of truth would be shared pkg)
        const steps = buildDrillSteps(mischClass, body.implantSystem, body.implantDiameterMm, body.implantLengthMm);
        const [protocol] = await db.insert(drillProtocols).values({
            organizationId: body.organizationId,
            patientId: body.patientId,
            treatmentPlanId: body.treatmentPlanId ?? null,
            toothFdi: body.toothFdi,
            implantSystem: body.implantSystem,
            implantDiameterMm: body.implantDiameterMm,
            implantLengthMm: body.implantLengthMm,
            mischClass,
            avgHuCortical: zones.corticalHU,
            avgHuCancellous: zones.cancellousHU,
            avgHuApical: zones.apicalHU,
            protocolJson: JSON.stringify(steps),
            angulationDeg: body.angulationDeg ?? null,
            ctStudyInstanceUid: body.ctStudyInstanceUid ?? null,
            status: 'draft',
        }).returning();
        return reply.send({ success: true, protocol });
    });
    // GET /api/surgical/drill-protocol/:id
    fastify.get('/api/surgical/drill-protocol/:id', async (req, reply) => {
        const { id } = req.params;
        const [protocol] = await db.select().from(drillProtocols).where(eq(drillProtocols.id, id)).limit(1);
        if (!protocol)
            return reply.code(404).send({ error: 'Not found' });
        return reply.send({ protocol: { ...protocol, steps: JSON.parse(protocol.protocolJson) } });
    });
    // GET /api/surgical/drill-protocols?patientId=&toothFdi=
    fastify.get('/api/surgical/drill-protocols', async (req, reply) => {
        const { patientId, toothFdi } = req.query;
        let rows;
        if (patientId && toothFdi) {
            rows = await db.select().from(drillProtocols).where(and(eq(drillProtocols.patientId, patientId), eq(drillProtocols.toothFdi, parseInt(toothFdi))));
        }
        else if (patientId) {
            rows = await db.select().from(drillProtocols).where(eq(drillProtocols.patientId, patientId));
        }
        else if (toothFdi) {
            rows = await db.select().from(drillProtocols).where(eq(drillProtocols.toothFdi, parseInt(toothFdi)));
        }
        else {
            rows = await db.select().from(drillProtocols);
        }
        return reply.send({ protocols: rows.map(r => ({ ...r, steps: JSON.parse(r.protocolJson) })) });
    });
    // POST /api/surgical/drill-protocol/:id/confirm
    fastify.post('/api/surgical/drill-protocol/:id/confirm', async (req, reply) => {
        const { id } = req.params;
        const [updated] = await db.update(drillProtocols).set({ status: 'confirmed' }).where(eq(drillProtocols.id, id)).returning();
        if (!updated)
            return reply.code(404).send({ error: 'Not found' });
        return reply.send({ success: true, protocol: updated });
    });
    // GET /api/commissions?organizationId=
    fastify.get('/api/commissions', async (req, reply) => {
        const { organizationId } = req.query;
        if (!organizationId)
            return reply.code(400).send({ error: 'organizationId required' });
        const rows = await db.select().from(doctorCommissions)
            .where(and(eq(doctorCommissions.organizationId, organizationId), eq(doctorCommissions.isActive, true)));
        return reply.send({ commissions: rows });
    });
    // POST /api/commissions
    fastify.post('/api/commissions', async (req, reply) => {
        const body = req.body;
        if (!body.organizationId || !body.userId || !body.specialty || !body.serviceCategory) {
            return reply.code(400).send({ error: 'organizationId, userId, specialty, serviceCategory required' });
        }
        const [row] = await db.insert(doctorCommissions).values({
            organizationId: body.organizationId,
            userId: body.userId,
            specialty: body.specialty,
            serviceCategory: body.serviceCategory,
            commissionPct: body.commissionPct,
            materialCostDeductionPct: body.materialCostDeductionPct ?? 100,
        }).returning();
        return reply.code(201).send({ commission: row });
    });
    // POST /api/commissions/calculate
    fastify.post('/api/commissions/calculate', async (req, reply) => {
        const body = req.body;
        const [config] = await db.select().from(doctorCommissions)
            .where(and(eq(doctorCommissions.organizationId, body.organizationId), eq(doctorCommissions.userId, body.userId), eq(doctorCommissions.serviceCategory, body.serviceCategory), eq(doctorCommissions.isActive, true))).limit(1);
        if (!config)
            return reply.code(404).send({ error: 'Commission config not found for this doctor+category' });
        const deductedMaterial = body.materialCostRub * (config.materialCostDeductionPct / 100);
        const baseForCommission = Math.max(0, body.totalRevenue - deductedMaterial);
        const doctorEarnings = baseForCommission * (config.commissionPct / 100);
        const clinicMargin = body.totalRevenue - doctorEarnings - body.materialCostRub;
        return reply.send({
            totalRevenue: body.totalRevenue,
            materialCostRub: body.materialCostRub,
            deductedMaterial,
            baseForCommission,
            commissionPct: config.commissionPct,
            doctorEarnings: Math.round(doctorEarnings),
            clinicMargin: Math.round(clinicMargin),
            clinicMarginPct: body.totalRevenue > 0 ? Math.round((clinicMargin / body.totalRevenue) * 100) : 0,
        });
    });
    // --- Scheduler Reservations ---
    // POST /api/scheduler/reserve
    fastify.post('/api/scheduler/reserve', async (req, reply) => {
        const body = req.body;
        if (!body.organizationId || !body.patientId) {
            return reply.code(400).send({ error: 'organizationId, patientId required' });
        }
        // Calculate recall due date for surgical phase (phase 2)
        let recallDueAt = null;
        if (body.phase === 2) {
            const months = body.jawLocation === 'upper' ? 5 : 3; // upper=5m avg, lower=3m
            recallDueAt = new Date();
            recallDueAt.setMonth(recallDueAt.getMonth() + months);
        }
        const [reservation] = await db.insert(schedulerReservations).values({
            organizationId: body.organizationId,
            patientId: body.patientId,
            treatmentPlanId: body.treatmentPlanId ?? null,
            phase: body.phase,
            durationMinutes: body.durationMinutes,
            jawLocation: body.jawLocation ?? null,
            recallDueAt,
            notes: body.notes ?? null,
            status: 'draft',
        }).returning();
        return reply.code(201).send({ reservation });
    });
    // GET /api/scheduler/reservations?organizationId=&phase=
    fastify.get('/api/scheduler/reservations', async (req, reply) => {
        const { organizationId, phase } = req.query;
        if (!organizationId)
            return reply.code(400).send({ error: 'organizationId required' });
        const conditions = [eq(schedulerReservations.organizationId, organizationId)];
        if (phase)
            conditions.push(eq(schedulerReservations.phase, parseInt(phase)));
        const rows = await db.select().from(schedulerReservations).where(and(...conditions));
        return reply.send({ reservations: rows });
    });
    // GET /api/scheduler/recall-due — returns reservations with overdue recall (no prosthetics booked)
    fastify.get('/api/scheduler/recall-due', async (req, reply) => {
        const { organizationId } = req.query;
        if (!organizationId)
            return reply.code(400).send({ error: 'organizationId required' });
        const now = new Date();
        const overdue = await db.select().from(schedulerReservations).where(and(eq(schedulerReservations.organizationId, organizationId), eq(schedulerReservations.phase, 2), lte(schedulerReservations.recallDueAt, now), isNull(schedulerReservations.recallTriggeredAt)));
        return reply.send({ overdueRecalls: overdue });
    });
    // POST /api/scheduler/recall-trigger/:id
    fastify.post('/api/scheduler/recall-trigger/:id', async (req, reply) => {
        const { id } = req.params;
        const [updated] = await db.update(schedulerReservations)
            .set({ recallTriggeredAt: new Date(), status: 'patient_notified' })
            .where(eq(schedulerReservations.id, id)).returning();
        if (!updated)
            return reply.code(404).send({ error: 'Not found' });
        return reply.send({ success: true, reservation: updated });
    });
}
// --- Minimal server-side drill steps mirror ---
function buildDrillSteps(misch, system, diameter, length) {
    const steps = [
        { step: 1, drillType: 'Pilot Drill', diameterMm: 2.0, depthMm: length, rpmRange: '800–1000 RPM', torqueNcm: '45 Ncm', irrigation: true, note: 'Физраствор обязателен' }
    ];
    if (misch === 'D1') {
        steps.push({ step: 2, drillType: 'Cortical Drill', diameterMm: 2.8, depthMm: Math.min(4, length * 0.3), rpmRange: '400–600 RPM', torqueNcm: '40 Ncm', irrigation: true });
        steps.push({ step: 3, drillType: `Profile ${diameter - 0.5}mm`, diameterMm: diameter - 0.5, depthMm: length, rpmRange: '500–700 RPM', torqueNcm: '45 Ncm', irrigation: true });
        steps.push({ step: 4, drillType: 'Cortical Tap', diameterMm: diameter, depthMm: 3, rpmRange: '15–20 RPM', torqueNcm: '50 Ncm', irrigation: true });
        steps.push({ step: 5, drillType: `Final ${diameter}mm`, diameterMm: diameter, depthMm: length, rpmRange: '500 RPM', torqueNcm: '45 Ncm', irrigation: true });
    }
    else if (misch === 'D2') {
        steps.push({ step: 2, drillType: 'Twist 2.8mm', diameterMm: 2.8, depthMm: length, rpmRange: '800–1000 RPM', torqueNcm: '45 Ncm', irrigation: true });
        steps.push({ step: 3, drillType: `Profile ${diameter - 0.2}mm`, diameterMm: diameter - 0.2, depthMm: length, rpmRange: '700–900 RPM', torqueNcm: '45 Ncm', irrigation: true });
        steps.push({ step: 4, drillType: `Final ${diameter}mm`, diameterMm: diameter, depthMm: length, rpmRange: '800 RPM', torqueNcm: '45 Ncm', irrigation: true });
    }
    else if (misch === 'D3') {
        steps.push({ step: 2, drillType: 'Twist 2.8mm', diameterMm: 2.8, depthMm: length, rpmRange: '1000–1200 RPM', torqueNcm: '35 Ncm', irrigation: true });
        steps.push({ step: 3, drillType: `Final ${diameter}mm`, diameterMm: diameter, depthMm: length, rpmRange: '1000 RPM', torqueNcm: '35 Ncm', irrigation: true });
    }
    else {
        const eff = Math.max(2.0, diameter - 1.5);
        steps.push({ step: 2, drillType: 'Twist 2.0mm', diameterMm: 2.0, depthMm: length, rpmRange: '1200 RPM', torqueNcm: '25 Ncm', irrigation: false, note: `Underdrill D4: max primary stability` });
        steps.push({ step: 3, drillType: `Under-profile ${eff}mm`, diameterMm: eff, depthMm: length, rpmRange: '1000 RPM', torqueNcm: '30 Ncm', irrigation: false });
    }
    return steps;
}
