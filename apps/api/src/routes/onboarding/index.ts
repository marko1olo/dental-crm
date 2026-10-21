/**
 * apps/api/src/routes/onboarding/index.ts
 *
 * Fast Onboarding & Data Migration Routes.
 * DENTE Dental CRM — Mandates:
 * - Mandate 8e: Doctor Autonomy (Fast start <= 30 sec, skip in 1 click).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (Rapid setup, tenant isolation).
 * - Mandate 8z / 8wy: Zero Mocks — Real PostgreSQL transactions for imports & settings.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	auditEvents,
	chairs,
	clinics,
	organizations,
	patients,
	serviceCatalogItems,
} from "../../db/schema.js";
import {
	importPatientsStream,
	importPricelistStream,
} from "../../services/import/streamingDataImporter.js";

export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/onboarding/status
	 * Returns current onboarding status, scale mode, and setup counts.
	 */
	app.get("/api/onboarding/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "onboarding status");
		if (!context) return;
		const { organizationId } = context;

		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		const [clinic] = await db
			.select()
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		const chairsList = await db
			.select({ id: chairs.id })
			.from(chairs)
			.where(eq(chairs.organizationId, organizationId));

		const servicesList = await db
			.select({ id: serviceCatalogItems.id })
			.from(serviceCatalogItems)
			.where(eq(serviceCatalogItems.organizationId, organizationId));

		const flags =
			(org?.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
		const isCompleted = Boolean(flags.onboardingCompleted);

		return {
			completed: isCompleted,
			mode: (org?.clinicMode as string) || "solo_doctor",
			clinicName: clinic?.name || org?.name || "Стоматологический кабинет",
			phone: clinic?.phone || "",
			timezone: clinic?.timezone || "Europe/Moscow",
			chairsCount: chairsList.length,
			servicesCount: servicesList.length,
		};
	});

	/**
	 * POST /api/onboarding/complete
	 * 1-Click Fast Launch: commits clinic profile, chairs, schedule, and scale preset to PostgreSQL.
	 */
	app.post("/api/onboarding/complete", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "onboarding complete");
		if (!context) return;
		const { organizationId } = context;

		const body = (request.body ?? {}) as {
			profile?: {
				clinicName?: string;
				phone?: string;
				timezone?: string;
				mode?: string;
			};
			chairs?: Array<{
				id?: string;
				name: string;
				specialty?: string;
				isDefault?: boolean;
			}>;
			schedule?: {
				workdayStart?: string;
				workdayEnd?: string;
				workingDays?: number[];
				defaultVisitMinutes?: number;
			};
			preset?: string;
		};

		const clinicName = body.profile?.clinicName?.trim() || "Стоматологический кабинет";
		const phone = body.profile?.phone?.trim() || "";
		const timezone = body.profile?.timezone?.trim() || "Europe/Moscow";
		const mode = body.preset || body.profile?.mode || "solo_doctor";
		const now = new Date();

		await db.transaction(async (tx) => {
			// 1. Update organization & clinic profile
			const [currentOrg] = await tx
				.select()
				.from(organizations)
				.where(eq(organizations.id, organizationId))
				.limit(1);

			const isSolo = mode === "solo_doctor" || mode === "one_chair";
			const existingFlags =
				(currentOrg?.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};

			const updatedFlags = {
				...existingFlags,
				onboardingCompleted: true,
				workspacePreset: mode,
				hasMultipleChairs: (body.chairs?.length ?? 1) > 1,
				hasAssistants: !isSolo,
				hasDentalLab: !isSolo,
				hasPayrollModule: !isSolo,
				hasMarketingModule: !isSolo,
				hasAnalyticsModule: !isSolo,
				hasInventoryModule: true,
			};

			await tx
				.update(organizations)
				.set({
					name: clinicName,
					clinicMode: mode,
					workspaceFeatureFlags: updatedFlags,
					updatedAt: now,
				})
				.where(eq(organizations.id, organizationId));

			let clinicId: string;
			const [existingClinic] = await tx
				.select({ id: clinics.id })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.limit(1);

			if (existingClinic) {
				clinicId = existingClinic.id;
				await tx
					.update(clinics)
					.set({
						name: clinicName,
						phone: phone || null,
						timezone,
					})
					.where(eq(clinics.id, existingClinic.id));
			} else {
				const [insertedClinic] = await tx
					.insert(clinics)
					.values({
						organizationId,
						name: clinicName,
						phone: phone || null,
						timezone,
					})
					.returning({ id: clinics.id });
				clinicId = insertedClinic!.id;
			}

			// 3. Upsert chairs if provided
			if (body.chairs && body.chairs.length > 0) {
				for (let i = 0; i < body.chairs.length; i++) {
					const c = body.chairs[i]!;
					const chairName = c.name?.trim() || `Кресло ${i + 1}`;
					const existingChair = await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(
							and(
								eq(chairs.organizationId, organizationId),
								eq(chairs.name, chairName),
							),
						)
						.limit(1);

					if (existingChair.length === 0) {
						await tx.insert(chairs).values({
							organizationId,
							clinicId,
							name: chairName,
							isActive: true,
						});
					}
				}
			}

			// 4. Audit trail
			await tx.insert(auditEvents).values({
				organizationId,
				entityType: "clinic_profile",
				entityId: organizationId,
				action: "onboarding_completed",
				reason: `Быстрый запуск клиники: профиль «${clinicName}», режим «${mode}».`,
			});
		});

		return {
			success: true,
			completedAt: now.toISOString(),
			mode,
			clinicName,
		};
	});

	/**
	 * POST /api/onboarding/skip
	 * 1-Click Skip: marks onboarding as skipped without blocking doctor.
	 */
	app.post("/api/onboarding/skip", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "onboarding skip");
		if (!context) return;
		const { organizationId } = context;

		const [org] = await db
			.select({ flags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		const existingFlags =
			(org?.flags as Record<string, unknown> | null) ?? {};

		const now = new Date();
		await db
			.update(organizations)
			.set({
				workspaceFeatureFlags: {
					...existingFlags,
					onboardingCompleted: true,
				},
				updatedAt: now,
			})
			.where(eq(organizations.id, organizationId));

		return {
			success: true,
			skippedAt: now.toISOString(),
		};
	});

	/**
	 * POST /api/onboarding/import/upload
	 * Streaming Preview of CSV/Excel Patients or Pricelist.
	 */
	app.post("/api/onboarding/import/upload", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "onboarding import preview");
		if (!context) return;
		const { organizationId } = context;

		const body = (request.body ?? {}) as {
			type?: "patients" | "pricelist";
			fileBase64?: string;
			rawText?: string;
			filename?: string;
		};

		const importType = body.type || "patients";
		const filename = body.filename || (importType === "patients" ? "patients.csv" : "pricelist.csv");

		let bufferOrText: Buffer | string = "";
		if (body.fileBase64) {
			bufferOrText = Buffer.from(body.fileBase64, "base64");
		} else if (body.rawText) {
			bufferOrText = body.rawText;
		} else {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Передайте файл (fileBase64) или текст таблицы (rawText).",
			});
		}

		if (importType === "patients") {
			const result = await importPatientsStream({
				organizationId,
				bufferOrText,
				filename,
				commit: false,
			});
			return result;
		}

		const result = await importPricelistStream({
			organizationId,
			bufferOrText,
			filename,
			commit: false,
		});
		return result;
	});

	/**
	 * POST /api/onboarding/import/commit
	 * Real Execution & Database Transaction: commits parsed data into PostgreSQL!
	 */
	app.post("/api/onboarding/import/commit", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "onboarding import commit");
		if (!context) return;
		const { organizationId } = context;

		const body = (request.body ?? {}) as {
			type?: "patients" | "pricelist";
			fileBase64?: string;
			rawText?: string;
			filename?: string;
		};

		const importType = body.type || "patients";
		const filename = body.filename || (importType === "patients" ? "patients.csv" : "pricelist.csv");

		let bufferOrText: Buffer | string = "";
		if (body.fileBase64) {
			bufferOrText = Buffer.from(body.fileBase64, "base64");
		} else if (body.rawText) {
			bufferOrText = body.rawText;
		} else {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Передайте файл (fileBase64) или текст таблицы (rawText).",
			});
		}

		if (importType === "patients") {
			const result = await importPatientsStream({
				organizationId,
				bufferOrText,
				filename,
				commit: true,
			});
			return result;
		}

		const result = await importPricelistStream({
			organizationId,
			bufferOrText,
			filename,
			commit: true,
		});
		return result;
	});
}
