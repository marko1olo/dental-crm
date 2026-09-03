import {
	assignPatientToothDefectSchema,
	outpatientTemplatesFilterSchema,
	outpatientVerificationStatusSchema,
	toothOrJawCodeSchema,
	updateOutpatientVerificationStatusSchema,
} from "@dental/shared";
import { type SQL, and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinicalTeethCatalog,
	mkbCategories,
	organizations,
	outpatientTemplateCategories,
	outpatientTemplates,
	outpatientVerifications,
	patientToothDefects,
	patients,
	toothDefectsCatalog,
	users,
	visits,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

export async function registerOutpatientV2Routes(app: FastifyInstance): Promise<void> {
	// =========================================================================
	// 1. КАТАЛОГ 55 СУЩНОСТЕЙ ЗУБНОЙ СИСТЕМЫ (Взрослые, детские, челюсти JU/JL, прикус C)
	// =========================================================================
	app.get("/api/catalogs/teeth", async (_request: FastifyRequest, reply: FastifyReply) => {
		const teeth = await db
			.select()
			.from(clinicalTeethCatalog)
			.orderBy(clinicalTeethCatalog.order, clinicalTeethCatalog.id);

		return reply.send({
			count: teeth.length,
			teeth,
		});
	});

	// =========================================================================
	// 2. КАТАЛОГ 91 ДЕФЕКТА ЗУБОВ И ДЕРЕВО ДЕФЕКТОВ
	// =========================================================================
	const getToothDefectsQuerySchema = z.object({
		type: z.enum(["outpatient", "orthodontic", "anomaly"]).optional(),
		key: z.string().optional(),
		activeOnly: z.enum(["true", "false", "1", "0"]).optional(),
	});

	app.get("/api/catalogs/tooth-defects", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = getToothDefectsQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации дефектов",
				details: parsed.error.issues,
			});
		}

		const conditions: SQL[] = [];
		if (parsed.data.type) {
			conditions.push(eq(toothDefectsCatalog.type, parsed.data.type));
		}
		if (parsed.data.key) {
			conditions.push(eq(toothDefectsCatalog.key, parsed.data.key));
		}
		if (parsed.data.activeOnly === "true" || parsed.data.activeOnly === "1") {
			conditions.push(eq(toothDefectsCatalog.isActive, true));
		}

		const defects = await db
			.select()
			.from(toothDefectsCatalog)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(toothDefectsCatalog.order, toothDefectsCatalog.id);

		return reply.send({
			count: defects.length,
			defects,
		});
	});

	app.get("/api/catalogs/tooth-defects/tree", async (_request: FastifyRequest, reply: FastifyReply) => {
		const allDefects = await db
			.select()
			.from(toothDefectsCatalog)
			.where(eq(toothDefectsCatalog.isActive, true))
			.orderBy(toothDefectsCatalog.order, toothDefectsCatalog.id);

		// Группировка в трехуровневое дерево: type -> key -> items
		const tree: Record<string, Record<string, typeof allDefects>> = {
			outpatient: {},
			anomaly: {},
			orthodontic: {},
		};

		for (const defect of allDefects) {
			const type = defect.type || "outpatient";
			const key = defect.key || "common";

			if (!tree[type]) {
				tree[type] = {};
			}
			if (!tree[type][key]) {
				tree[type][key] = [];
			}
			tree[type][key].push(defect);
		}

		return reply.send({
			totalCount: allDefects.length,
			tree,
		});
	});

	// =========================================================================
	// 3. ДЕРЕВО МКБ-10 С БЫСТРЫМ ПОИСКОМ СТОМАТОЛОГИЧЕСКИХ НОЗОЛОГИЙ (K00-K14)
	// =========================================================================
	const getMkbCategoriesQuerySchema = z.object({
		dentalOnly: z.enum(["true", "false", "1", "0"]).optional(),
		search: z.string().optional(),
		parentId: z.string().optional(),
		limit: z.coerce.number().int().min(1).max(2000).default(500),
		offset: z.coerce.number().int().min(0).default(0),
	});

	app.get("/api/catalogs/mkb/categories/tree", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = getMkbCategoriesQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры поиска МКБ-10",
				details: parsed.error.issues,
			});
		}

		const conditions: (SQL | undefined)[] = [];
		const isDentalOnly = parsed.data.dentalOnly === "true" || parsed.data.dentalOnly === "1";

		if (isDentalOnly) {
			conditions.push(
				or(
					eq(mkbCategories.isDentalSpecialty, true),
					eq(mkbCategories.id, "K00-K14"),
					eq(mkbCategories.parentId, "K00-K14"),
					ilike(mkbCategories.code, "K0%"),
					ilike(mkbCategories.code, "K10%"),
					ilike(mkbCategories.code, "K11%"),
					ilike(mkbCategories.code, "K12%"),
					ilike(mkbCategories.code, "K13%"),
					ilike(mkbCategories.code, "K14%"),
				),
			);
		}

		if (parsed.data.parentId !== undefined) {
			conditions.push(eq(mkbCategories.parentId, parsed.data.parentId));
		}

		if (parsed.data.search && parsed.data.search.trim().length > 0) {
			const searchTerm = `%${parsed.data.search.trim()}%`;
			conditions.push(
				or(
					ilike(mkbCategories.code, searchTerm),
					ilike(mkbCategories.name, searchTerm),
				),
			);
		}

		const filtered = conditions.filter((c): c is SQL => c !== undefined);

		const items = await db
			.select()
			.from(mkbCategories)
			.where(filtered.length > 0 ? and(...filtered) : undefined)
			.orderBy(mkbCategories.order, mkbCategories.code)
			.limit(parsed.data.limit)
			.offset(parsed.data.offset);

		return reply.send({
			count: items.length,
			dentalOnly: isDentalOnly,
			items,
		});
	});

	// =========================================================================
	// 4. ШАБЛОНЫ АМБУЛАТОРНОЙ КАРТЫ 043/У (448 ПРОТОКОЛОВ, 33 РУБРИКИ)
	// =========================================================================
	app.get("/api/outpatient/templates", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = outpatientTemplatesFilterSchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации шаблонов 043/у",
				details: parsed.error.issues,
			});
		}

		const conditions: (SQL | undefined)[] = [];
		if (parsed.data.categoryId !== undefined) {
			conditions.push(eq(outpatientTemplates.categoryId, parsed.data.categoryId));
		}
		if (parsed.data.mkbCode) {
			conditions.push(ilike(outpatientTemplates.mkbCode, `%${parsed.data.mkbCode}%`));
		}
		if (parsed.data.search && parsed.data.search.trim().length > 0) {
			const s = `%${parsed.data.search.trim()}%`;
			conditions.push(
				or(
					ilike(outpatientTemplates.name, s),
					sql`(${outpatientTemplates.contentJson}->>'text') ILIKE ${s}`,
				),
			);
		}

		const filtered = conditions.filter((c): c is SQL => c !== undefined);

		// Загружаем рубрики для контекста
		const categories = await db
			.select()
			.from(outpatientTemplateCategories)
			.orderBy(outpatientTemplateCategories.order, outpatientTemplateCategories.id);

		// Загружаем шаблоны
		const templates = await db
			.select({
				id: outpatientTemplates.id,
				categoryId: outpatientTemplates.categoryId,
				categoryName: outpatientTemplateCategories.name,
				categorySpecialty: outpatientTemplateCategories.specialty,
				name: outpatientTemplates.name,
				contentJson: outpatientTemplates.contentJson,
				mkbCode: outpatientTemplates.mkbCode,
				order: outpatientTemplates.order,
			})
			.from(outpatientTemplates)
			.leftJoin(
				outpatientTemplateCategories,
				eq(outpatientTemplates.categoryId, outpatientTemplateCategories.id),
			)
			.where(filtered.length > 0 ? and(...filtered) : undefined)
			.orderBy(outpatientTemplates.order, outpatientTemplates.id)
			.limit(parsed.data.limit)
			.offset(parsed.data.offset);

		return reply.send({
			count: templates.length,
			categories,
			templates,
		});
	});

	// =========================================================================
	// 5. АКТИВНАЯ ОДОНТОГРАММА ПАЦИЕНТА: ДЕФЕКТЫ ЗУБОВ И ЧЕЛЮСТЕЙ
	// =========================================================================
	const getPatientToothDefectsParamsSchema = z.object({
		patientId: z.string().uuid(),
	});

	const getPatientToothDefectsQuerySchema = z.object({
		activeOnly: z.enum(["true", "false", "1", "0"]).optional().default("true"),
		toothCode: toothOrJawCodeSchema.optional(),
	});

	app.get(
		"/api/patients/:patientId/tooth-defects",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = getPatientToothDefectsParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный UUID пациента",
					details: paramsParsed.error.issues,
				});
			}

			const queryParsed = getPatientToothDefectsQuerySchema.safeParse(request.query);
			const activeOnly =
				queryParsed.success &&
				(queryParsed.data.activeOnly === "true" || queryParsed.data.activeOnly === "1");

			const conditions = [
				eq(patientToothDefects.organizationId, orgId),
				eq(patientToothDefects.patientId, paramsParsed.data.patientId),
			];

			if (activeOnly) {
				conditions.push(isNull(patientToothDefects.resolvedAt));
			}

			if (queryParsed.success && queryParsed.data.toothCode) {
				conditions.push(eq(patientToothDefects.toothCode, queryParsed.data.toothCode));
			}

			const defects = await db
				.select({
					id: patientToothDefects.id,
					patientId: patientToothDefects.patientId,
					toothCode: patientToothDefects.toothCode,
					toothNameRu: clinicalTeethCatalog.nameRu,
					toothType: clinicalTeethCatalog.type,
					defectId: patientToothDefects.defectId,
					defectName: toothDefectsCatalog.name,
					defectAlias: toothDefectsCatalog.alias,
					defectType: toothDefectsCatalog.type,
					defectKey: toothDefectsCatalog.key,
					defectColor: toothDefectsCatalog.color,
					visitId: patientToothDefects.visitId,
					diagnosedByDoctorId: patientToothDefects.diagnosedByDoctorId,
					doctorFullName: users.fullName,
					diagnosedAt: patientToothDefects.diagnosedAt,
					resolvedAt: patientToothDefects.resolvedAt,
					comment: patientToothDefects.comment,
				})
				.from(patientToothDefects)
				.innerJoin(
					clinicalTeethCatalog,
					eq(patientToothDefects.toothCode, clinicalTeethCatalog.code),
				)
				.innerJoin(
					toothDefectsCatalog,
					eq(patientToothDefects.defectId, toothDefectsCatalog.id),
				)
				.leftJoin(users, eq(patientToothDefects.diagnosedByDoctorId, users.id))
				.where(and(...conditions))
				.orderBy(desc(patientToothDefects.diagnosedAt));

			return reply.send({
				patientId: paramsParsed.data.patientId,
				count: defects.length,
				defects,
			});
		},
	);

	// =========================================================================
	// 6. НАЗНАЧЕНИЕ ПАТОЛОГИИ / КОНСТРУКЦИИ НА ЗУБ ИЛИ ЧЕЛЮСТЬ (JU, JL, C)
	// =========================================================================
	app.post(
		"/api/patients/:patientId/tooth-defects",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = getPatientToothDefectsParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный UUID пациента",
					details: paramsParsed.error.issues,
				});
			}

			const bodyParsed = assignPatientToothDefectSchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры назначения дефекта",
					details: bodyParsed.error.issues,
				});
			}

			const identity = getRequestIdentity(request);
			const doctorId = bodyParsed.data.diagnosedByDoctorId || identity.userId;

			// Проверяем существование зуба/челюсти
			const [tooth] = await db
				.select()
				.from(clinicalTeethCatalog)
				.where(eq(clinicalTeethCatalog.code, bodyParsed.data.toothCode))
				.limit(1);

			if (!tooth) {
				return reply.code(404).send({
					error: "ToothNotFound",
					message: `Зуб или челюстная сущность с кодом "${bodyParsed.data.toothCode}" не найдена в каталоге 55 сущностей`,
				});
			}

			// Проверяем существование дефекта в каталоге 91 дефектов
			const [defect] = await db
				.select()
				.from(toothDefectsCatalog)
				.where(eq(toothDefectsCatalog.id, bodyParsed.data.defectId))
				.limit(1);

			if (!defect) {
				return reply.code(404).send({
					error: "DefectNotFound",
					message: `Дефект с ID ${bodyParsed.data.defectId} не найден в каталоге 91 дефектов`,
				});
			}

			// Вставляем дефект пациента
			const [inserted] = await db
				.insert(patientToothDefects)
				.values({
					organizationId: orgId,
					patientId: paramsParsed.data.patientId,
					toothCode: bodyParsed.data.toothCode,
					defectId: bodyParsed.data.defectId,
					visitId: bodyParsed.data.visitId || null,
					diagnosedByDoctorId: doctorId || null,
					comment: bodyParsed.data.comment || null,
				})
				.returning();

			return reply.code(201).send({
				success: true,
				defect: {
					...inserted,
					toothNameRu: tooth.nameRu,
					defectName: defect.name,
					defectAlias: defect.alias,
					defectColor: defect.color,
				},
			});
		},
	);

	// =========================================================================
	// 7. СНЯТИЕ / ИЗЛЕЧЕНИЕ / УДАЛЕНИЕ ДЕФЕКТА ЗУБА
	// =========================================================================
	const deleteDefectParamsSchema = z.object({
		patientId: z.string().uuid(),
		id: z.string().uuid(),
	});

	const deleteDefectQuerySchema = z.object({
		resolveOnly: z.enum(["true", "false", "1", "0"]).optional(),
	});

	app.delete(
		"/api/patients/:patientId/tooth-defects/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = deleteDefectParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса",
					details: paramsParsed.error.issues,
				});
			}

			const queryParsed = deleteDefectQuerySchema.safeParse(request.query);
			const resolveOnly =
				queryParsed.success &&
				(queryParsed.data.resolveOnly === "true" || queryParsed.data.resolveOnly === "1");

			const [existing] = await db
				.select()
				.from(patientToothDefects)
				.where(
					and(
						eq(patientToothDefects.id, paramsParsed.data.id),
						eq(patientToothDefects.patientId, paramsParsed.data.patientId),
						eq(patientToothDefects.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "DefectNotFound",
					message: "Дефект не найден в карте пациента",
				});
			}

			if (resolveOnly) {
				// Переводим в статус излеченного (ставим resolvedAt)
				const [updated] = await db
					.update(patientToothDefects)
					.set({
						resolvedAt: new Date(),
					})
					.where(eq(patientToothDefects.id, existing.id))
					.returning();

				return reply.send({
					success: true,
					action: "resolved",
					defect: updated,
				});
			}

			// Физическое удаление ошибочной записи
			await db.delete(patientToothDefects).where(eq(patientToothDefects.id, existing.id));

			return reply.send({
				success: true,
				action: "deleted",
				id: existing.id,
			});
		},
	);

	// =========================================================================
	// 8. ОЧЕРЕДЬ АМБУЛАТОРНЫХ КАРТ НАЧМЕДА / КОНТРОЛЬ КАЧЕСТВА ЭМК
	// =========================================================================
	const getVerifyQueueQuerySchema = z.object({
		status: outpatientVerificationStatusSchema.optional(),
		doctorId: z.string().uuid().optional(),
		patientId: z.string().uuid().optional(),
		limit: z.coerce.number().int().min(1).max(200).default(50),
		offset: z.coerce.number().int().min(0).default(0),
	});

	app.get("/api/outpatient/verify", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = getVerifyQueueQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры очереди начмеда",
				details: parsed.error.issues,
			});
		}

		const conditions = [eq(outpatientVerifications.organizationId, orgId)];

		if (parsed.data.status) {
			conditions.push(eq(outpatientVerifications.status, parsed.data.status));
		}
		if (parsed.data.doctorId) {
			conditions.push(eq(outpatientVerifications.doctorId, parsed.data.doctorId));
		}
		if (parsed.data.patientId) {
			conditions.push(eq(outpatientVerifications.patientId, parsed.data.patientId));
		}

		const queue = await db
			.select({
				id: outpatientVerifications.id,
				visitId: outpatientVerifications.visitId,
				patientId: outpatientVerifications.patientId,
				patientFullName: patients.fullName,
				doctorId: outpatientVerifications.doctorId,
				doctorFullName: users.fullName,
				cmoUserId: outpatientVerifications.cmoUserId,
				status: outpatientVerifications.status,
				rejectionReason: outpatientVerifications.rejectionReason,
				submittedAt: outpatientVerifications.submittedAt,
				verifiedAt: outpatientVerifications.verifiedAt,
				editableDeadline: outpatientVerifications.editableDeadline,
				visitComplaint: visits.complaint,
				visitDiagnosis: visits.diagnosis,
				visitStatus: visits.status,
			})
			.from(outpatientVerifications)
			.innerJoin(patients, eq(outpatientVerifications.patientId, patients.id))
			.innerJoin(users, eq(outpatientVerifications.doctorId, users.id))
			.innerJoin(visits, eq(outpatientVerifications.visitId, visits.id))
			.where(and(...conditions))
			.orderBy(desc(outpatientVerifications.editableDeadline))
			.limit(parsed.data.limit)
			.offset(parsed.data.offset);

		const now = Date.now();
		const itemsWithLockStatus = queue.map((item) => ({
			...item,
			isEditableDeadlineExpired: now > new Date(item.editableDeadline).getTime(),
		}));

		return reply.send({
			count: itemsWithLockStatus.length,
			queue: itemsWithLockStatus,
		});
	});

	// =========================================================================
	// 9. СОГЛАСОВАНИЕ / ВОЗВРАТ НА ДОРАБОТКУ КАРТЫ НАЧМЕДОМ
	// =========================================================================
	const updateVerificationParamsSchema = z.object({
		id: z.string().uuid(),
	});

	app.put(
		"/api/outpatient/verify/:id/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = updateVerificationParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный ID записи верификации",
					details: paramsParsed.error.issues,
				});
			}

			const bodyParsed = updateOutpatientVerificationStatusSchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный статус верификации",
					details: bodyParsed.error.issues,
				});
			}

			if (bodyParsed.data.status === "rejected" && !bodyParsed.data.rejectionReason?.trim()) {
				return reply.code(400).send({
					error: "RejectionReasonRequired",
					message: "При возврате карты на доработку начмед обязан указать причину замечания",
				});
			}

			const identity = getRequestIdentity(request);

			const [existing] = await db
				.select()
				.from(outpatientVerifications)
				.where(
					and(
						eq(outpatientVerifications.id, paramsParsed.data.id),
						eq(outpatientVerifications.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "VerificationNotFound",
					message: "Запись верификации не найдена",
				});
			}

			const isFinished = bodyParsed.data.status === "approved" || bodyParsed.data.status === "rejected";

			const [updated] = await db
				.update(outpatientVerifications)
				.set({
					status: bodyParsed.data.status,
					rejectionReason: bodyParsed.data.rejectionReason || null,
					cmoUserId: identity.userId || null,
					verifiedAt: isFinished ? new Date() : null,
				})
				.where(eq(outpatientVerifications.id, existing.id))
				.returning();

			// Синхронизируем статус контроля качества в таблице visits
			await db
				.update(visits)
				.set({
					qualityControlStatus: bodyParsed.data.status,
				})
				.where(eq(visits.id, existing.visitId));

			return reply.send({
				success: true,
				verification: updated,
			});
		},
	);

	// =========================================================================
	// 10. ПРОВЕРКА 24-ЧАСОВОГО ЗАМКА РЕДАКТИРОВАНИЯ ЭМК ВРАЧОМ
	// =========================================================================
	const checkLockParamsSchema = z.object({
		visitId: z.string().uuid(),
	});

	app.get(
		"/api/outpatient/verify/visit/:visitId/lock-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = checkLockParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный UUID визита",
					details: paramsParsed.error.issues,
				});
			}

			const [verif] = await db
				.select()
				.from(outpatientVerifications)
				.where(
					and(
						eq(outpatientVerifications.visitId, paramsParsed.data.visitId),
						eq(outpatientVerifications.organizationId, orgId),
					),
				)
				.limit(1);

			const identity = getRequestIdentity(request);
			const isDirectorOrCmo =
				identity.role === "owner" ||
				identity.role === "admin" ||
				identity.role === "cmo" ||
				identity.role === "head_doctor" ||
				identity.role === "chief_doctor";

			if (!verif) {
				return reply.send({
					visitId: paramsParsed.data.visitId,
					hasVerificationRecord: false,
					isLocked: false,
					canEdit: true,
					editableDeadline: null,
					status: "draft",
				});
			}

			const now = Date.now();
			const isDeadlineExpired = now > new Date(verif.editableDeadline).getTime();
			const isApproved = verif.status === "approved";
			// Мандат 8e: Запрещены 24-часовые замки намертво. Врач свободно правит дневники с версионным аудитом ("Исправленному верить").
			const isAttendingDoctor =
				Boolean(identity.userId && verif.doctorId && identity.userId === verif.doctorId) ||
				identity.role === "doctor";
			const isLocked = (isDeadlineExpired || isApproved) && !isDirectorOrCmo && !isAttendingDoctor;

			return reply.send({
				visitId: verif.visitId,
				hasVerificationRecord: true,
				isLocked,
				isDeadlineExpired,
				status: verif.status,
				editableDeadline: verif.editableDeadline,
				canEdit: !isLocked,
				rejectionReason: verif.rejectionReason,
			});
		},
	);
}
