/**
 * autonomousTrackerRoutes.ts — Standalone Trojan API for Dental Lab & Courier Tracker («Лаба в кармане»).
 *
 * Provides standalone REST endpoints accessible via Telegram Bot, Web App, or QR scanning:
 * - 152-ФЗ compliant patient de-identification.
 * - Role-enforced stage transitions (Doctor / Tech / Courier / Admin).
 * - Tray slot assignment (Лоток №3).
 * - Real-time SLA risk monitoring & Telegram notification formatting.
 */

import { z } from "zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	createAutonomousLabOrder,
	advanceLabOrderStage,
	evaluateLabSlaRisk,
	generateLabQrPayload,
	verifyLabQrPayload,
	formatLabTelegramAlert,
	anonymizePatientForExternalLab,
	labActorRoleSchema,
	autonomousLabStageSchema,
	type AutonomousLabOrder,
} from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";

// In-memory registry for autonomous orders (tenant-scoped)
const autonomousOrdersStore = new Map<string, AutonomousLabOrder>();

const createOrderBodySchema = z.object({
	branchName: z.string().optional(),
	patientFullName: z.string().min(2),
	doctorName: z.string().min(2),
	doctorTelegramChatId: z.string().optional(),
	labName: z.string().min(2),
	labTelegramChatId: z.string().optional(),
	teethFdi: z.array(z.number().int().min(11).max(85)).min(1),
	constructionType: z.enum([
		"single_crown",
		"bridge",
		"veneer",
		"inlay_onlay",
		"all_on_4_6",
		"all_on_arch",
		"implant_abutment",
		"clasp_denture",
		"aligner_nightguard",
		"aligners_nightguard",
		"endocrown",
		"custom",
	]),
	material: z.enum([
		"zirconia_multilayer",
		"emax_lithium_disilicate",
		"pfm_cocr",
		"pmma_temporary",
		"titanium_custom_abutment",
		"peek_biohpp",
		"biocompatible_3d_resin",
		"other",
	]),
	vitaShade: z.enum([
		"A1", "A2", "A3", "A3.5", "A4",
		"B1", "B2", "B3", "B4",
		"C1", "C2", "C3", "C4",
		"D2", "D3", "D4",
		"BL1", "BL2", "BL3", "BL4",
	]),
	shadeNotes: z.string().optional(),
	impressionType: z.enum([
		"a_silicone", "c_silicone", "polyether", "hydrocolloid", "alginate",
		"digital_scan", "digital_scan_stl_ply", "pvs_silicone", "other",
	]),
	boxCount: z.number().int().min(1).default(1),
	digitalScanKey: z.string().optional(),
	patientAppointmentAt: z.string().datetime(),
	requiredDeliveryDeadlineAt: z.string().datetime().optional(),
	clinicTrayNumber: z.string().default("Лоток №1"),
});

const scanAdvanceBodySchema = z.object({
	qrPayload: z.string().min(10),
	nextStage: autonomousLabStageSchema,
	actorRole: labActorRoleSchema,
	actorName: z.string().min(2),
	notes: z.string().optional(),
	photoProofUrl: z.string().url().optional(),
	assignedTray: z.string().optional(),
});

const defectBodySchema = z.object({
	reportedByRole: labActorRoleSchema,
	reportedByName: z.string().min(2),
	reasonCategory: z.enum([
		"unclear_margin", "bubble_distortion", "shade_ambiguity",
		"scan_occlusion_gap", "ceramic_chipping", "fit_loose_tight", "other",
	]),
	description: z.string().min(5),
	proofPhotoUrl: z.string().url().optional(),
});

export async function registerAutonomousTrackerRoutes(app: FastifyInstance) {
	/**
	 * POST /api/clinical/dental-lab/autonomous/orders
	 * Создание наряда с 152-ФЗ деперсонализацией и генерацией QR-кода на коробку.
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return reply;

		const parsed = createOrderBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры наряда в лабораторию.",
				details: parsed.error.issues,
			});
		}

		const order = createAutonomousLabOrder({
			organizationId: orgId,
			...parsed.data,
		});

		autonomousOrdersStore.set(order.orderRef, order);

		const qrPayload = generateLabQrPayload(order.orderRef, order.qrSecretKey);
		const doctorTelegramAlert = formatLabTelegramAlert(order, "doctor");

		return reply.code(201).send({
			order,
			qrPayload,
			doctorTelegramAlert,
			trayLabelText: `${order.orderRef} | ${order.clinicTrayNumber} | ${order.patientToken.tokenizedInitials}`,
		});
	});

	/**
	 * GET /api/clinical/dental-lab/autonomous/orders/:ref
	 * Получение статуса наряда по короткому номеру с защитой ПДн.
	 */
	app.get("/api/clinical/dental-lab/autonomous/orders/:ref", async (request: FastifyRequest<{ Params: { ref: string } }>, reply: FastifyReply) => {
		const { ref } = request.params;
		const order = autonomousOrdersStore.get(ref);

		if (!order) {
			return reply.code(404).send({
				error: "NotFound",
				message: `Заказ-наряд #${ref} не найден в реестре.`,
			});
		}

		// Обновляем текущий SLA статус в реальном времени
		const currentSlaRisk = evaluateLabSlaRisk(order, new Date());
		return reply.send({
			...order,
			slaRiskLevel: currentSlaRisk,
		});
	});

	/**
	 * POST /api/clinical/dental-lab/autonomous/orders/:ref/scan
	 * 1-клик переход этапа при физическом сканировании QR-кода на коробке / лотке.
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders/:ref/scan", async (
		request: FastifyRequest<{ Params: { ref: string } }>,
		reply: FastifyReply,
	) => {
		const { ref } = request.params;
		const order = autonomousOrdersStore.get(ref);

		if (!order) {
			return reply.code(404).send({
				error: "NotFound",
				message: `Заказ-наряд #${ref} не найден.`,
			});
		}

		const parsed = scanAdvanceBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сканирования QR-кода.",
				details: parsed.error.issues,
			});
		}

		const { qrPayload, nextStage, actorRole, actorName, notes, photoProofUrl, assignedTray } = parsed.data;

		// Проверка подлинности QR-кода
		const isQrValid = verifyLabQrPayload(qrPayload, ref, order.qrSecretKey);
		if (!isQrValid) {
			return reply.code(403).send({
				error: "InvalidQrCode",
				message: "QR-код недействителен, подделан или срок действия стикера истек.",
			});
		}

		try {
			const updatedOrder = advanceLabOrderStage(order, nextStage, actorRole, actorName, {
				notes,
				photoProofUrl,
				assignedTray,
			});

			autonomousOrdersStore.set(ref, updatedOrder);

			// Формируем пуш врачу и лаборатории
			const doctorAlert = formatLabTelegramAlert(updatedOrder, "doctor");
			const techAlert = formatLabTelegramAlert(updatedOrder, "technician");

			return reply.send({
				success: true,
				updatedOrder,
				alerts: {
					doctorTelegramText: doctorAlert,
					technicianTelegramText: techAlert,
				},
			});
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			return reply.code(422).send({
				error: "InvalidStageTransition",
				message: errorMsg,
			});
		}
	});

	/**
	 * POST /api/clinical/dental-lab/autonomous/orders/:ref/defect
	 * Регистрация брака или дефекта оттиска/модели (Stop-the-Line).
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders/:ref/defect", async (
		request: FastifyRequest<{ Params: { ref: string } }>,
		reply: FastifyReply,
	) => {
		const { ref } = request.params;
		const order = autonomousOrdersStore.get(ref);

		if (!order) {
			return reply.code(404).send({
				error: "NotFound",
				message: `Заказ-наряд #${ref} не найден.`,
			});
		}

		const parsed = defectBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные данные отчета о дефекте.",
				details: parsed.error.issues,
			});
		}

		const defect = {
			reportedAt: new Date().toISOString(),
			...parsed.data,
			isBlocking: true,
		};

		// Переводим в rework_flagged
		try {
			const updatedOrder = advanceLabOrderStage(order, "rework_flagged", parsed.data.reportedByRole, parsed.data.reportedByName, {
				notes: `ДЕФЕКТ: ${defect.description}`,
				photoProofUrl: defect.proofPhotoUrl,
			});
			updatedOrder.activeDefect = defect;
			autonomousOrdersStore.set(ref, updatedOrder);

			return reply.send({
				success: true,
				updatedOrder,
				alertDoctorTelegram: `🚨 ТРЕВОГА ПО ЗТЛ #${ref}: Работа остановлена из-за дефекта (${defect.reasonCategory}). Доктор ${order.doctorName}, проверьте фото!`,
			});
		} catch (err: unknown) {
			return reply.code(422).send({
				error: "TransitionFailed",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	});

	/**
	 * GET /api/clinical/dental-lab/autonomous/sla-alerts
	 * Сторож SLA: список нарядов с критическим риском (<24h до приёма пациента).
	 */
	app.get("/api/clinical/dental-lab/autonomous/sla-alerts", async (_request: FastifyRequest, reply: FastifyReply) => {
		const now = new Date();
		const criticalOrders: AutonomousLabOrder[] = [];

		for (const order of autonomousOrdersStore.values()) {
			const risk = evaluateLabSlaRisk(order, now);
			if (risk === "critical_under_24h" || risk === "breached_overdue") {
				criticalOrders.push({ ...order, slaRiskLevel: risk });
			}
		}

		return reply.send({
			checkedAt: now.toISOString(),
			criticalOrdersCount: criticalOrders.length,
			criticalOrders,
		});
	});

	/**
	 * POST /api/clinical/dental-lab/autonomous/anonymize-preview
	 * Тестовый эндпоинт деперсонализации по 152-ФЗ.
	 */
	app.post("/api/clinical/dental-lab/autonomous/anonymize-preview", async (request: FastifyRequest, reply: FastifyReply) => {
		const body = request.body as { fullName?: string };
		if (!body?.fullName) {
			return reply.code(400).send({ error: "Missing fullName" });
		}
		const result = anonymizePatientForExternalLab(body.fullName);
		return reply.send(result);
	});
}
