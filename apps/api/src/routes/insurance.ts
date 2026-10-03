/**
 * Insurance Contracts API
 * Manages DMS (voluntary medical insurance) contracts at the organization level.
 * Patients are associated via the policyNumber on the patient administrative profile.
 */
import {
	calculateDmsCoverage,
	calculateDmsGuaranteeSplit,
	calculateDmsRegistryTotals,
	generateDmsRegistryA4Html,
	generateDmsRegistryCsv,
	generateDmsRegistryXml,
	type DmsGuaranteeLetter,
	type DmsRegistryClinicInfo,
	type DmsRegistryData,
	type DmsRegistryInsuranceCompanyInfo,
	type DmsRegistryRecord,
	dmsGuaranteeLetterCreateSchema,
	dmsGuaranteeLetterSchema,
	dmsGuaranteeLetterUpdateSchema,
	dmsSplitCalculationItemSchema,
	insuranceCalculationItemSchema,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { and, asc, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	dmsGuaranteeLetters,
	insuranceContracts,
	organizations,
	patients,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../db/schema.js";

const calculateCoverageBodySchema = z.object({
	usedAnnualAmountRub: nonNegativeMoneyRubSchema.default(0),
	items: z.array(insuranceCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта покрытия ДМС."),
});

const splitInvoiceBodySchema = z.object({
	letterId: z.string().optional(),
	contractId: z.string().optional(),
	patientId: z.string().optional(),
	visitDate: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	items: z.array(dmsSplitCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта разделения счёта."),
});

const recordUsageBodySchema = z.object({
	amountRub: nonNegativeMoneyRubSchema.refine((v) => v > 0, "Сумма списания должна быть больше 0 ₽."),
	invoiceId: z.string().optional(),
	notes: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	allowOverdraft: z.boolean().optional(),
});


/**
 * Тела договоров ДМС раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body (POST/PUT без JSON) TypeError → 500.
 * Zod safeParse после auth-first → 400 с прежними текстами.
 */
const insuranceCreateBodySchema = z.object({
	companyName: z.string().optional(),
	policyNumberMask: z.string().optional(),
	coverageTherapyPct: z.number().finite().optional(),
	coverageSurgeryPct: z.number().finite().optional(),
	coverageOrthoPct: z.number().finite().optional(),
	coverageHygienePct: z.number().finite().optional(),
	annualLimitRub: z.number().finite().optional(),
});

const insuranceUpdateBodySchema = z.object({
	companyName: z.string().optional(),
	policyNumberMask: z.string().optional(),
	coverageTherapyPct: z.number().finite().optional(),
	coverageSurgeryPct: z.number().finite().optional(),
	coverageOrthoPct: z.number().finite().optional(),
	coverageHygienePct: z.number().finite().optional(),
	annualLimitRub: z.number().finite().nullable().optional(),
	isActive: z.boolean().optional(),
});

/**
 * Название страховой компании — единственное обязательное поле договора ДМС.
 *
 * Поле названо ровно так, как подписано в форме («Страховая компания»,
 * InsuranceContractsPanel.tsx:496), а не именем колонки базы: администратор ищет
 * на экране подпись, а `companyName` ему ни о чём не говорит.
 *
 * Один текст на создание и на изменение: раньше проверка стояла только при
 * создании, и это была не косметика, а утрата данных (см. PUT ниже).
 */
const INSURANCE_COMPANY_NAME_REQUIRED =
	"Не заполнено поле «Страховая компания» — по договору ДМС это единственное обязательное поле, и один пробел в нём не считается названием. Впишите название страховой компании и сохраните снова: остальные заполненные поля остались на экране.";

/** Договора нет: причина и оба действия, доступных администратору. */
const INSURANCE_CONTRACT_NOT_FOUND =
	"Этот договор ДМС в вашей клинике не найден: возможно, его уже убрали из работы с другого рабочего места. Обновите список договоров — если договор нужен, добавьте его заново.";

export const insuranceRoutes = registerInsuranceRoutes;

export async function registerInsuranceRoutes(app: FastifyInstance) {
	// GET all insurance contracts for the organization
	app.get("/api/insurance/contracts", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance contracts read",
		);
		if (!orgId) return;

		const contracts = await db
			.select()
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.organizationId, orgId),
					eq(insuranceContracts.isActive, true),
				),
			)
			.orderBy(insuranceContracts.companyName);

		return contracts;
	});

	// GET a single contract by id
	app.get<{ Params: { contractId: string } }>(
		"/api/insurance/contracts/:contractId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance contract read",
			);
			if (!orgId) return;

			const { contractId } = request.params;
			const [contract] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (!contract)
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});
			return contract;
		},
	);

	// POST create a new insurance contract
	app.post<{
		Body: {
			companyName: string;
			policyNumberMask?: string;
			coverageTherapyPct?: number;
			coverageSurgeryPct?: number;
			coverageOrthoPct?: number;
			coverageHygienePct?: number;
			annualLimitRub?: number;
		};
	}>("/api/insurance/contracts", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance contract create",
		);
		if (!orgId) return;

		const parsedCreate = insuranceCreateBodySchema.safeParse(request.body);
		if (!parsedCreate.success) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}
		const {
			companyName,
			policyNumberMask,
			coverageTherapyPct = 0,
			coverageSurgeryPct = 0,
			coverageOrthoPct = 0,
			coverageHygienePct = 0,
			annualLimitRub,
		} = parsedCreate.data;

		if (!companyName?.trim()) {
			// БЫЛО: `{"error":"companyName is required"}` без message. Панель договоров
			// сырой error наружу не пускает и строит фразу по коду ответа, а для 400
			// это «сервер не принял такой запрос — повторение не поможет, сообщите
			// администратору» (panelStateText.ts:135-137). Администратору, которому
			// достаточно вписать одно поле, сказано звать администратора и что
			// повторять бесполезно. Ветка достижима при заполненной на вид форме:
			// пробел проходит браузерное required и валится на .trim() здесь.
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		// Clamp all coverage values to [0, 100]
		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		const [created] = await db
			.insert(insuranceContracts)
			.values({
				organizationId: orgId,
				companyName: companyName.trim(),
				policyNumberMask: policyNumberMask?.trim() ?? null,
				coverageTherapyPct: clamp(coverageTherapyPct),
				coverageSurgeryPct: clamp(coverageSurgeryPct),
				coverageOrthoPct: clamp(coverageOrthoPct),
				coverageHygienePct: clamp(coverageHygienePct),
				annualLimitRub: annualLimitRub ?? null,
				isActive: true,
			})
			.returning();

		if (!created)
			// Причины у сервера здесь НЕТ: вставка не вернула строку и почему —
			// неизвестно. Поэтому ни слова о причине, только факт и действие; врать
			// про «повторите через минуту» нельзя, потому что это не установлено.
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Договор ДМС не сохранён: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});
		return reply.code(201).send(created);
	});

	// PUT update an existing insurance contract
	app.put<{
		Params: { contractId: string };
		Body: {
			companyName?: string;
			policyNumberMask?: string;
			coverageTherapyPct?: number;
			coverageSurgeryPct?: number;
			coverageOrthoPct?: number;
			coverageHygienePct?: number;
			annualLimitRub?: number;
			isActive?: boolean;
		};
	}>("/api/insurance/contracts/:contractId", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance contract update",
		);
		if (!orgId) return;

		const { contractId } = request.params;
		const [existing] = await db
			.select({ id: insuranceContracts.id })
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.id, contractId),
					eq(insuranceContracts.organizationId, orgId),
				),
			)
			.limit(1);

		if (!existing)
			return reply.code(404).send({
				error: "ContractNotFound",
				message: INSURANCE_CONTRACT_NOT_FOUND,
			});

		const parsedUpdate = insuranceUpdateBodySchema.safeParse(request.body);
		if (!parsedUpdate.success) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}
		const {
			companyName,
			policyNumberMask,
			coverageTherapyPct,
			coverageSurgeryPct,
			coverageOrthoPct,
			coverageHygienePct,
			annualLimitRub,
			isActive,
		} = parsedUpdate.data;

		/*
		 * НАЙДЕНО ЗАПРОСОМ, А НЕ ЧТЕНИЕМ, И ЭТО НЕ ПРО ТЕКСТ, А ПРО УТРАТУ ДАННЫХ.
		 *
		 * Проверка непустого названия стояла ТОЛЬКО при создании договора. При
		 * изменении её не было вовсе, а `.set()` ниже пишет `companyName.trim()`
		 * как есть — поэтому PUT с одним пробелом в поле «Страховая компания»
		 * отвечал 200 и СТИРАЛ название договора в пустую строку. Проверено
		 * запросом: в теле ответа приходило `"companyName":""`.
		 *
		 * Для клиники это дороже непонятного текста: договор ДМС остаётся в работе и
		 * продолжает применяться в сметах, но в списке договоров у него больше нет
		 * названия — администратор не знает, чьё это покрытие, а восстановить
		 * название неоткуда. Пробел проходит браузерное required, то есть форма
		 * выглядит заполненной.
		 *
		 * `undefined` (поле вообще не присылали) — это не то же самое, что пробел:
		 * ниже такое поле не переписывается, и трогать его нельзя.
		 */
		if (companyName !== undefined && !companyName.trim()) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		/*
		 * БЫЛО: SELECT выше отфильтрован по organizationId, а UPDATE — только по id.
		 * Между SELECT и UPDATE строка могла сменить владельца (редко) или id
		 * мог быть угадан из другой клиники при гонке: UPDATE без org в WHERE —
		 * дыра defense-in-depth. СТАЛО: and(id, organizationId) + RETURNING уже был.
		 */
		const [updated] = await db
			.update(insuranceContracts)
			.set({
				...(companyName !== undefined && { companyName: companyName.trim() }),
				...(policyNumberMask !== undefined && {
					policyNumberMask: policyNumberMask.trim() || null,
				}),
				...(coverageTherapyPct !== undefined && {
					coverageTherapyPct: clamp(coverageTherapyPct),
				}),
				...(coverageSurgeryPct !== undefined && {
					coverageSurgeryPct: clamp(coverageSurgeryPct),
				}),
				...(coverageOrthoPct !== undefined && {
					coverageOrthoPct: clamp(coverageOrthoPct),
				}),
				...(coverageHygienePct !== undefined && {
					coverageHygienePct: clamp(coverageHygienePct),
				}),
				...(annualLimitRub !== undefined && { annualLimitRub }),
				...(isActive !== undefined && { isActive }),
			})
			.where(
				and(
					eq(insuranceContracts.id, contractId),
					eq(insuranceContracts.organizationId, orgId),
				),
			)
			.returning();

		if (!updated)
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Изменения договора ДМС не сохранены: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});
		return updated;
	});

	// DELETE (soft-delete / deactivate) an insurance contract
	app.delete<{ Params: { contractId: string } }>(
		"/api/insurance/contracts/:contractId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance contract delete",
			);
			if (!orgId) return;

			const { contractId } = request.params;
			const [existing] = await db
				.select({ id: insuranceContracts.id })
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing)
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});

			// Soft-delete: mark as inactive rather than destroying data.
			// БЫЛО: UPDATE только по id после org-SELECT; без RETURNING всегда
			// { success: true }, даже если 0 строк. СТАЛО: and(id, org) + RETURNING.
			const [deactivated] = await db
				.update(insuranceContracts)
				.set({ isActive: false })
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.returning({ id: insuranceContracts.id });

			if (!deactivated) {
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});
			}

			return { success: true };
		},
	);

	// POST calculate coverage and co-payment for an invoice or treatment plan
	app.post<{
		Params: { contractId: string };
		Body: {
			usedAnnualAmountRub?: number;
			items: Array<{
				serviceId: string;
				serviceName?: string;
				category:
					| "consultation"
					| "therapy"
					| "surgery"
					| "prosthetics"
					| "orthodontics"
					| "periodontology"
					| "hygiene"
					| "imaging"
					| "documents"
					| "other";
				priceRub: number;
				quantity?: number;
			}>;
		};
	}>("/api/insurance/contracts/:contractId/calculate-coverage", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance calculate coverage",
		);
		if (!orgId) return;

		const { contractId } = request.params;
		const [contract] = await db
			.select()
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.id, contractId),
					eq(insuranceContracts.organizationId, orgId),
				),
			)
			.limit(1);

		if (!contract || !contract.isActive) {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: INSURANCE_CONTRACT_NOT_FOUND,
			});
		}

		const parsed = calculateCoverageBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте список услуг для расчёта покрытия ДМС.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const { items, usedAnnualAmountRub } = parsed.data;

		const result = calculateDmsCoverage(
			{
				id: contract.id,
				companyName: contract.companyName,
				coverageTherapyPct: Number(contract.coverageTherapyPct),
				coverageSurgeryPct: Number(contract.coverageSurgeryPct),
				coverageOrthoPct: Number(contract.coverageOrthoPct),
				coverageHygienePct: Number(contract.coverageHygienePct),
				annualLimitRub: contract.annualLimitRub != null ? Number(contract.annualLimitRub) : null,
			},
			items,
			usedAnnualAmountRub,
		);

		return reply.code(200).send(result);
	});

	// ─── ГАРАНТИЙНЫЕ ПИСЬМА ДМС (GUARANTEE LETTERS) ──────────────────────────

	// GET all guarantee letters for the organization with optional filters
	app.get<{
		Querystring: {
			patientId?: string;
			status?: string;
			search?: string;
		};
	}>("/api/insurance/guarantee-letters", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance guarantee letters read",
		);
		if (!orgId) return;
		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
			status: z.string().optional(),
			search: z.string().optional(),
		});
		const parsedQuery = querySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const { patientId, status, search } = parsedQuery.data;
		const conditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId as string)];

		if (patientId) {
			conditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
		}
		if (status) {
			conditions.push(eq(dmsGuaranteeLetters.status, status));
		}
		if (search && search.trim()) {
			const term = `%${search.trim().toLowerCase()}%`;
			conditions.push(
				or(
					ilike(dmsGuaranteeLetters.letterNumber, term),
					ilike(dmsGuaranteeLetters.patientFullName, term),
					ilike(dmsGuaranteeLetters.insurerName, term),
					ilike(dmsGuaranteeLetters.policyNumber, term),
				)!,
			);
		}

		const letters = await db
			.select()
			.from(dmsGuaranteeLetters)
			.where(and(...conditions))
			.orderBy(dmsGuaranteeLetters.createdAt);

		// Check for auto-expiration based on current date
		const todayIso = new Date().toISOString().slice(0, 10);
		const formatted = letters.map((l) => {
			let computedStatus = l.status;
			if (l.status === "active" && l.validUntil && l.validUntil < todayIso) {
				computedStatus = "expired";
			} else if (l.status === "active" && Number(l.usedAmountRub) >= Number(l.maxCoverageRub)) {
				computedStatus = "exhausted";
			}
			return {
				...l,
				status: computedStatus as DmsGuaranteeLetter["status"],
				maxCoverageRub: Number(l.maxCoverageRub),
				usedAmountRub: Number(l.usedAmountRub),
				franchisePct: Number(l.franchisePct),
				franchiseType: (l.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(l.franchiseFixedRub),
				programExclusions: (l.programExclusions as string[]) || [],
				approvedServiceCodes: (l.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (l.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (l.approvedDiagnosisCodes as string[]) || [],
				createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
				updatedAt: l.updatedAt ? l.updatedAt.toISOString() : new Date().toISOString(),
			};
		});

		return reply.code(200).send(formatted);
	});

	// GET single guarantee letter by id
	app.get<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance guarantee letter read",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			const [letter] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const todayIso = new Date().toISOString().slice(0, 10);
			let computedStatus = letter.status;
			if (letter.status === "active" && letter.validUntil && letter.validUntil < todayIso) {
				computedStatus = "expired";
			} else if (letter.status === "active" && Number(letter.usedAmountRub) >= Number(letter.maxCoverageRub)) {
				computedStatus = "exhausted";
			}

			return reply.code(200).send({
				...letter,
				status: computedStatus as DmsGuaranteeLetter["status"],
				maxCoverageRub: Number(letter.maxCoverageRub),
				usedAmountRub: Number(letter.usedAmountRub),
				franchisePct: Number(letter.franchisePct),
				franchiseType: (letter.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(letter.franchiseFixedRub),
				programExclusions: (letter.programExclusions as string[]) || [],
				approvedServiceCodes: (letter.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (letter.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (letter.approvedDiagnosisCodes as string[]) || [],
				createdAt: letter.createdAt ? letter.createdAt.toISOString() : new Date().toISOString(),
				updatedAt: letter.updatedAt ? letter.updatedAt.toISOString() : new Date().toISOString(),
			});
		},
	);

	// POST create a new guarantee letter
	app.post("/api/insurance/guarantee-letters", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance guarantee letter create",
		);
		if (!orgId) return;

		const parsed = dmsGuaranteeLetterCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность заполнения гарантийного письма.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const data = parsed.data;
		if (data.maxCoverageRub <= 0) {
			return reply.code(400).send({
				error: "InvalidLimit",
				message: "Лимит покрытия по гарантийному письму должен быть больше 0 ₽.",
			});
		}

		if (data.validFrom > data.validUntil) {
			return reply.code(400).send({
				error: "InvalidDateRange",
				message: "Дата начала действия гарантийного письма не может быть позже даты окончания.",
			});
		}

		const [created] = await db
			.insert(dmsGuaranteeLetters)
			.values({
				...(data.id ? { id: data.id } : {}),
				organizationId: orgId,
				contractId: data.contractId ?? null,
				patientId: data.patientId,
				patientFullName: data.patientFullName.trim(),
				patientBirthDate: data.patientBirthDate ?? null,
				policyNumber: data.policyNumber.trim(),
				insurerKey: data.insurerKey || "custom",
				insurerName: data.insurerName.trim(),
				letterNumber: data.letterNumber.trim(),
				issueDate: data.issueDate,
				validFrom: data.validFrom,
				validUntil: data.validUntil,
				maxCoverageRub: data.maxCoverageRub,
				usedAmountRub: data.usedAmountRub ?? 0,
				franchisePct: data.franchisePct ?? 0,
				franchiseType: data.franchiseType ?? "percent",
				franchiseFixedRub: data.franchiseFixedRub ?? 0,
				programExclusions: data.programExclusions ?? [],
				approvedServiceCodes: data.approvedServiceCodes ?? [],
				approvedTeethFdi: data.approvedTeethFdi ?? [],
				approvedDiagnosisCodes: data.approvedDiagnosisCodes ?? [],
				curatorFullName: data.curatorFullName ?? null,
				curatorPhone: data.curatorPhone ?? null,
				notes: data.notes ?? "",
				status: data.status ?? "active",
			})
			.returning();

		if (!created) {
			return reply.code(500).send({
				error: "LetterNotSaved",
				message: "Не удалось сохранить гарантийное письмо ДМС в базе данных.",
			});
		}

		return reply.code(201).send({
			...created,
			status: created.status as DmsGuaranteeLetter["status"],
			maxCoverageRub: Number(created.maxCoverageRub),
			usedAmountRub: Number(created.usedAmountRub),
			franchisePct: Number(created.franchisePct),
			franchiseType: (created.franchiseType as "percent" | "fixed_rub") || "percent",
			franchiseFixedRub: Number(created.franchiseFixedRub),
			programExclusions: (created.programExclusions as string[]) || [],
			approvedServiceCodes: (created.approvedServiceCodes as string[]) || [],
			approvedTeethFdi: (created.approvedTeethFdi as string[]) || [],
			approvedDiagnosisCodes: (created.approvedDiagnosisCodes as string[]) || [],
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
		});
	});

	// PUT update an existing guarantee letter
	app.put<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter update",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			const [existing] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const parsed = dmsGuaranteeLetterUpdateSchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность обновления гарантийного письма.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
				});
			}

			const d = parsed.data;
			const updateData: Partial<typeof dmsGuaranteeLetters.$inferInsert> = {
				updatedAt: new Date(),
			};

			if (d.contractId !== undefined) updateData.contractId = d.contractId ?? null;
			if (d.patientId !== undefined) updateData.patientId = d.patientId;
			if (d.patientFullName !== undefined) updateData.patientFullName = d.patientFullName.trim();
			if (d.patientBirthDate !== undefined) updateData.patientBirthDate = d.patientBirthDate ?? null;
			if (d.policyNumber !== undefined) updateData.policyNumber = d.policyNumber.trim();
			if (d.insurerKey !== undefined) updateData.insurerKey = d.insurerKey;
			if (d.insurerName !== undefined) updateData.insurerName = d.insurerName.trim();
			if (d.letterNumber !== undefined) updateData.letterNumber = d.letterNumber.trim();
			if (d.issueDate !== undefined) updateData.issueDate = d.issueDate;
			if (d.validFrom !== undefined) updateData.validFrom = d.validFrom;
			if (d.validUntil !== undefined) updateData.validUntil = d.validUntil;
			if (d.maxCoverageRub !== undefined) updateData.maxCoverageRub = d.maxCoverageRub;
			if (d.usedAmountRub !== undefined) updateData.usedAmountRub = d.usedAmountRub;
			if (d.franchisePct !== undefined) updateData.franchisePct = d.franchisePct;
			if (d.franchiseType !== undefined) updateData.franchiseType = d.franchiseType;
			if (d.franchiseFixedRub !== undefined) updateData.franchiseFixedRub = d.franchiseFixedRub;
			if (d.programExclusions !== undefined) updateData.programExclusions = d.programExclusions;
			if (d.approvedServiceCodes !== undefined) updateData.approvedServiceCodes = d.approvedServiceCodes;
			if (d.approvedTeethFdi !== undefined) updateData.approvedTeethFdi = d.approvedTeethFdi;
			if (d.approvedDiagnosisCodes !== undefined) updateData.approvedDiagnosisCodes = d.approvedDiagnosisCodes;
			if (d.curatorFullName !== undefined) updateData.curatorFullName = d.curatorFullName ?? null;
			if (d.curatorPhone !== undefined) updateData.curatorPhone = d.curatorPhone ?? null;
			if (d.notes !== undefined) updateData.notes = d.notes;
			if (d.status !== undefined) updateData.status = d.status;

			const finalMax = updateData.maxCoverageRub !== undefined ? Number(updateData.maxCoverageRub) : Number(existing.maxCoverageRub);
			const finalUsed = updateData.usedAmountRub !== undefined ? Number(updateData.usedAmountRub) : Number(existing.usedAmountRub);
			if (finalUsed >= finalMax && updateData.status === undefined) {
				updateData.status = "exhausted";
			}

			const [updated] = await db
				.update(dmsGuaranteeLetters)
				.set(updateData)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.returning();

			return reply.code(200).send({
				...updated,
				status: updated!.status as DmsGuaranteeLetter["status"],
				maxCoverageRub: Number(updated!.maxCoverageRub),
				usedAmountRub: Number(updated!.usedAmountRub),
				franchisePct: Number(updated!.franchisePct),
				franchiseType: (updated!.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(updated!.franchiseFixedRub),
				programExclusions: (updated!.programExclusions as string[]) || [],
				approvedServiceCodes: (updated!.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (updated!.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (updated!.approvedDiagnosisCodes as string[]) || [],
				createdAt: updated!.createdAt.toISOString(),
				updatedAt: updated!.updatedAt.toISOString(),
			});
		},
	);

	// DELETE (soft-delete / cancel) a guarantee letter
	app.delete<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter delete",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			const [existing] = await db
				.select({ id: dmsGuaranteeLetters.id })
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			await db
				.update(dmsGuaranteeLetters)
				.set({ status: "cancelled", updatedAt: new Date() })
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				);

			return reply.code(200).send({
				success: true,
				letterId,
				message: "Гарантийное письмо отозвано / аннулировано.",
			});
		},
	);

	// POST record usage against a guarantee letter (ACID Transaction)
	app.post<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId/record-usage",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter record usage",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			const parsed = recordUsageBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Укажите корректную сумму списания по ГП.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
				});
			}

			const { amountRub } = parsed.data;
			const isUrgentCare = Boolean(parsed.data.isEmergency || parsed.data.hasAcutePain || parsed.data.allowOverdraft);

			// Мандат 8e: если списание производится для экстренного визита без ГП
			if (letterId === "emergency" || letterId === "emergency_pending_letter" || letterId === "none" || letterId === "acute-pain") {
				return reply.code(200).send({
					success: true,
					letterId,
					debitedAmountRub: amountRub,
					usedAmountRub: amountRub,
					remainingCoverageRub: 0,
					status: "pending_letter",
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				});
			}

			const result = await db.transaction(async (tx) => {
				const [letter] = await tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!letter) {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId,
								debitedAmountRub: amountRub,
								usedAmountRub: amountRub,
								remainingCoverageRub: 0,
								status: "pending_letter",
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 404,
						error: {
							error: "LetterNotFound",
							message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
						},
					};
				}

				if (letter.status === "cancelled") {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId: letter.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(letter.usedAmountRub),
								remainingCoverageRub: 0,
								status: letter.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LetterCancelled",
							message: "Гарантийное письмо аннулировано и не может быть использовано для списания.",
						},
					};
				}

				const todayIso = new Date().toISOString().slice(0, 10);
				if (letter.validUntil && letter.validUntil < todayIso) {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId: letter.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(letter.usedAmountRub),
								remainingCoverageRub: 0,
								status: letter.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LetterExpired",
							message: `Срок действия гарантийного письма истёк (${letter.validUntil}).`,
						},
					};
				}

				const maxCoverage = Number(letter.maxCoverageRub);
				const currentUsed = Number(letter.usedAmountRub);
				const remainingBefore = Math.max(0, Math.round((maxCoverage - currentUsed) * 100) / 100);

				if (amountRub > remainingBefore) {
					if (isUrgentCare) {
						// Мандат 8e: при острой боли превышение лимита не блокирует приём
						const newUsedAmount = Math.round((currentUsed + amountRub) * 100) / 100;
						const [updated] = await tx
							.update(dmsGuaranteeLetters)
							.set({
								usedAmountRub: newUsedAmount,
								status: "exhausted",
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(dmsGuaranteeLetters.id, letterId),
									eq(dmsGuaranteeLetters.organizationId, orgId),
								),
							)
							.returning();

						return {
							status: 200,
							data: {
								success: true,
								letterId: updated!.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(updated!.usedAmountRub),
								remainingCoverageRub: 0,
								status: updated!.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LimitExceeded",
							message: `Сумма списания (${amountRub} ₽) превышает остаток по гарантийному письму (${remainingBefore} ₽).`,
						},
					};
				}

				const newUsedAmount = Math.round((currentUsed + amountRub) * 100) / 100;
				let newStatus = letter.status;
				if (newUsedAmount >= maxCoverage) {
					newStatus = "exhausted";
				}

				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set({
						usedAmountRub: newUsedAmount,
						status: newStatus,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.returning();

				return {
					status: 200,
					data: {
						success: true,
						letterId: updated!.id,
						debitedAmountRub: amountRub,
						usedAmountRub: Number(updated!.usedAmountRub),
						remainingCoverageRub: Math.max(0, Math.round((maxCoverage - newUsedAmount) * 100) / 100),
						status: updated!.status,
					},
				};
			});

			if (result.status !== 200) {
				return reply.code(result.status).send(result.error);
			}
			return reply.code(200).send(result.data);
		},
	);

	// POST /api/insurance/split-invoice: calculate exact split between DMS share and patient co-pay
	app.post("/api/insurance/split-invoice", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance split invoice",
		);
		if (!orgId) return;

		const parsed = splitInvoiceBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте перечень услуг для разделения счёта.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const { letterId, contractId, visitDate, items } = parsed.data;

		// 1. Поиск гарантийного письма из базы данных PostgreSQL
		let letter: DmsGuaranteeLetter | null = null;
		if (letterId) {
			const [foundLetter] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (foundLetter) {
				letter = {
					id: foundLetter.id,
					organizationId: foundLetter.organizationId,
					contractId: foundLetter.contractId,
					patientId: foundLetter.patientId,
					patientFullName: foundLetter.patientFullName,
					patientBirthDate: foundLetter.patientBirthDate,
					policyNumber: foundLetter.policyNumber,
					insurerKey: foundLetter.insurerKey,
					insurerName: foundLetter.insurerName,
					letterNumber: foundLetter.letterNumber,
					issueDate: foundLetter.issueDate,
					validFrom: foundLetter.validFrom,
					validUntil: foundLetter.validUntil,
					maxCoverageRub: Number(foundLetter.maxCoverageRub),
					usedAmountRub: Number(foundLetter.usedAmountRub),
					franchisePct: Number(foundLetter.franchisePct),
					franchiseType: (foundLetter.franchiseType as "percent" | "fixed_rub") || "percent",
					franchiseFixedRub: Number(foundLetter.franchiseFixedRub),
					programExclusions: (foundLetter.programExclusions as string[]) || [],
					approvedServiceCodes: (foundLetter.approvedServiceCodes as string[]) || [],
					approvedTeethFdi: (foundLetter.approvedTeethFdi as string[]) || [],
					approvedDiagnosisCodes: (foundLetter.approvedDiagnosisCodes as string[]) || [],
					curatorFullName: foundLetter.curatorFullName,
					curatorPhone: foundLetter.curatorPhone,
					notes: foundLetter.notes,
					status: (foundLetter.status as DmsGuaranteeLetter["status"]) || "active",
					createdAt: foundLetter.createdAt.toISOString(),
					updatedAt: foundLetter.updatedAt.toISOString(),
				};
			}
		}

		// 2. Поиск договора ДМС (если передан contractId)
		let contract: {
			coverageTherapyPct: number;
			coverageSurgeryPct: number;
			coverageOrthoPct: number;
			coverageHygienePct: number;
			annualLimitRub: number | null;
		} | null = null;

		if (contractId) {
			const [found] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (found && found.isActive) {
				contract = {
					coverageTherapyPct: Number(found.coverageTherapyPct),
					coverageSurgeryPct: Number(found.coverageSurgeryPct),
					coverageOrthoPct: Number(found.coverageOrthoPct),
					coverageHygienePct: Number(found.coverageHygienePct),
					annualLimitRub: found.annualLimitRub != null ? Number(found.annualLimitRub) : null,
				};
			}
		}

		const splitResult = calculateDmsGuaranteeSplit(letter, items, {
			visitDate: visitDate || new Date().toISOString().slice(0, 10),
			contract,
			isEmergency: parsed.data.isEmergency,
			hasAcutePain: parsed.data.hasAcutePain,
		});

		return reply.code(200).send(splitResult);
	});

	// ─── РЕЕСТР ОКАЗАННЫХ УСЛУГ ДМС (STATUTORY DMS CLAIMS REGISTRY) ───────────
	app.get<{
		Querystring: {
			insurerKey?: string;
			contractId?: string;
			patientId?: string;
			period?: "current_month" | "prev_month" | "quarter" | "custom";
			periodStart?: string;
			periodEnd?: string;
			search?: string;
			format?: "json" | "xml" | "csv";
		};
	}>("/api/insurance/registry", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance claim registry read",
		);
		if (!orgId) return;

		const querySchema = z.object({
			insurerKey: z.string().optional(),
			contractId: z.string().uuid().optional(),
			patientId: z.string().uuid().optional(),
			period: z.enum(["current_month", "prev_month", "quarter", "custom"]).optional().default("current_month"),
			periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
			periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
			search: z.string().optional(),
			format: z.enum(["json", "xml", "csv"]).optional().default("json"),
		});

		const parsed = querySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса реестра счетов ДМС.",
				details: parsed.error.issues,
			});
		}

		const { insurerKey, contractId, patientId, period, search, format } = parsed.data;

		// 1. Динамическое вычисление дат периода
		const now = new Date();
		let startDateStr = parsed.data.periodStart;
		let endDateStr = parsed.data.periodEnd;

		if (!startDateStr || !endDateStr) {
			const year = now.getFullYear();
			const month = now.getMonth(); // 0..11

			if (period === "prev_month") {
				const prevMonthDate = new Date(year, month - 1, 1);
				const prevYear = prevMonthDate.getFullYear();
				const prevMonth = prevMonthDate.getMonth();
				const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
				startDateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
				endDateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			} else if (period === "quarter") {
				const quarterIndex = Math.floor(month / 3);
				const startMonth = quarterIndex * 3;
				const endMonth = startMonth + 2;
				const lastDay = new Date(year, endMonth + 1, 0).getDate();
				startDateStr = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
				endDateStr = `${year}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			} else {
				// current_month
				const lastDay = new Date(year, month + 1, 0).getDate();
				startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
				endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			}
		}

		// 2. Реквизиты клиники из organizations
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const clinicInfo: DmsRegistryClinicInfo = {
			nameRu: org?.name || "ООО «Стоматологический Центр «ДЕНТЕ»",
			inn: org?.inn || "7701984210",
			kpp: org?.kpp || "770101001",
			ogrn: org?.ogrn || "1157746890123",
			addressRu: org?.legalAddress || "г. Москва, ул. Большая Спасская, д. 12, стр. 1",
			phone: "+7 (495) 123-45-67",
			email: org?.email || undefined,
			medicalLicenseNumber: org?.medicalLicenseNumber || "ЛО-77-01-019842",
			chiefDoctorNameRu: org?.signatoryName || "Д-р Смирнов А.А.",
			chiefAccountantNameRu: "Иванова Е.В.",
		};

		// 3. Данные страховой компании
		let contract: typeof insuranceContracts.$inferSelect | null = null;
		if (contractId) {
			const [found] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);
			contract = found || null;
		}

		const insurerDirectory: Record<string, { name: string; inn: string }> = {
			sogaz: { name: "АО «СОГАЗ»", inn: "7736035485" },
			ingosstrakh: { name: "СПАО «Ингосстрах»", inn: "7705042179" },
			reso: { name: "СПАО «РЕСО-Гарантия»", inn: "7710045520" },
			reso_garantiya: { name: "СПАО «РЕСО-Гарантия»", inn: "7710045520" },
			alfastrakh: { name: "АО «АльфаСтрахование»", inn: "7713056834" },
			alfastrakhovanie: { name: "АО «АльфаСтрахование»", inn: "7713056834" },
			vsk: { name: "САО «ВСК»", inn: "7710026574" },
			soglasie: { name: "ООО «СК «Согласие»", inn: "7706070733" },
			rosgosstrakh: { name: "ПАО СК «Росгосстрах»", inn: "7707067683" },
			ugoria: { name: "АО «ГСК «Югория»", inn: "8601023568" },
		};

		const matchedInsurer = insurerKey && insurerKey !== "all" ? insurerDirectory[insurerKey] : null;
		const insurerTitle = contract?.companyName || matchedInsurer?.name || (insurerKey && insurerKey !== "all" ? insurerKey : "Все страховые компании (Сводный отчет)");
		const insurerInn = matchedInsurer?.inn || "7736035485";

		const insuranceCompanyInfo: DmsRegistryInsuranceCompanyInfo = {
			companyId: contract?.id || insurerKey || "all",
			nameRu: insurerTitle,
			inn: insurerInn,
			contractNumber: "ДМС-2026/01",
			contractDate: "2026-01-12",
		};

		// 4. Поиск гарантийных писем
		const lettersQueryConditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId)];
		if (patientId) {
			lettersQueryConditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
		}
		if (insurerKey && insurerKey !== "all") {
			lettersQueryConditions.push(eq(dmsGuaranteeLetters.insurerKey, insurerKey));
		}
		const letters = await db
			.select()
			.from(dmsGuaranteeLetters)
			.where(and(...lettersQueryConditions));

		const lettersByPatientId = new Map<string, typeof dmsGuaranteeLetters.$inferSelect>();
		for (const letter of letters) {
			if (!lettersByPatientId.has(letter.patientId) || letter.status === "active") {
				lettersByPatientId.set(letter.patientId, letter);
			}
		}

		// 5. Запрос оказанных услуг (treatmentItems)
		const treatmentConditions: SQL[] = [
			eq(treatmentItems.organizationId, orgId),
		];
		if (patientId) {
			treatmentConditions.push(eq(treatmentItems.patientId, patientId));
		}

		const treatments = await db
			.select({
				id: treatmentItems.id,
				patientId: treatmentItems.patientId,
				visitId: treatmentItems.visitId,
				serviceId: treatmentItems.serviceId,
				toothCode: treatmentItems.toothCode,
				title: treatmentItems.title,
				quantity: treatmentItems.quantity,
				priceRub: treatmentItems.priceRub,
				unitPriceRub: treatmentItems.unitPriceRub,
				discountRub: treatmentItems.discountRub,
				status: treatmentItems.status,
				plannedDoctorUserId: treatmentItems.plannedDoctorUserId,
				// Patient info
				patientFullName: patients.fullName,
				patientBirthDate: patients.birthDate,
				patientAdminProfile: patients.administrativeProfile,
				// Service catalog info
				catalogCode: serviceCatalogItems.code,
				catalogOrder804nCode: serviceCatalogItems.order804nCode,
				catalogCategory: serviceCatalogItems.category,
				catalogTitle: serviceCatalogItems.title,
				// Visit info
				visitDiagnosis: visits.diagnosis,
				visitSignedAt: visits.signedAt,
				visitCreatedAt: visits.createdAt,
				// Doctor info
				doctorFullName: users.fullName,
			})
			.from(treatmentItems)
			.innerJoin(patients, eq(patients.id, treatmentItems.patientId))
			.leftJoin(serviceCatalogItems, eq(serviceCatalogItems.id, treatmentItems.serviceId))
			.leftJoin(visits, eq(visits.id, treatmentItems.visitId))
			.leftJoin(users, eq(users.id, treatmentItems.plannedDoctorUserId))
			.where(and(...treatmentConditions));

		const canonicalRecords: DmsRegistryRecord[] = [];
		const serviceRecords: Array<{
			id: string;
			visitId: string;
			visitDate: string;
			patientId: string;
			patientFullName: string;
			policyNumber: string;
			letterNumber?: string;
			insurerName: string;
			serviceCode804n: string;
			serviceName: string;
			diagnosisCodeMkb10: string;
			toothNumber?: number | string;
			quantity: number;
			unitPriceRub: number;
			totalPriceRub: number;
			dmsCoveredRub: number;
			patientPaidRub: number;
			doctorFullName: string;
			isExcluded: boolean;
			exclusionReason?: string;
		}> = [];

		const treatedPatientIds = new Set<string>();

		for (const tr of treatments) {
			const visitDateIso = tr.visitSignedAt
				? tr.visitSignedAt.toISOString().slice(0, 10)
				: tr.visitCreatedAt
					? tr.visitCreatedAt.toISOString().slice(0, 10)
					: startDateStr;

			// Фильтр по дате визита в отчетный период
			if (visitDateIso < startDateStr || visitDateIso > endDateStr) {
				continue;
			}

			const letter = lettersByPatientId.get(tr.patientId);
			const adminProfile = tr.patientAdminProfile;
			const policyNumber = letter?.policyNumber || adminProfile?.insurancePolicyNumber || "";

			// Включаем только пациентов с ДМС
			const hasDms = Boolean(letter || adminProfile?.insurancePolicyNumber || adminProfile?.insuranceContractId);
			if (!hasDms) continue;

			const serviceInsurerName = letter?.insurerName || insurerTitle;
			if (insurerKey && insurerKey !== "all" && letter && letter.insurerKey !== insurerKey) {
				continue;
			}

			treatedPatientIds.add(tr.patientId);

			const quantity = Math.max(1, Math.round(Number(tr.quantity) || 1));
			const unitPriceRub = Number(tr.unitPriceRub) || Number(tr.priceRub) || 0;
			const totalPriceRub = Math.round(unitPriceRub * quantity * 100) / 100;
			const unitPriceKop = Math.round(unitPriceRub * 100);
			const totalGrossKop = Math.round(totalPriceRub * 100);

			const code804n = tr.catalogOrder804nCode || tr.catalogCode || "A16.07.002.001";
			const serviceName = tr.title || tr.catalogTitle || "Медицинская услуга стоматологическая";
			const toothCode = tr.toothCode ? Number(tr.toothCode.replace(/\D/g, "")) : undefined;

			const franchisePct = letter ? Number(letter.franchisePct) : 0;
			const exclusions = letter?.programExclusions || [];
			const isExcluded = exclusions.some((ex) => serviceName.toLowerCase().includes(ex.toLowerCase()));

			let patientPaidKop = 0;
			let insurerClaimKop = totalGrossKop;

			if (isExcluded) {
				patientPaidKop = totalGrossKop;
				insurerClaimKop = 0;
			} else if (franchisePct > 0) {
				patientPaidKop = Math.round(totalGrossKop * (franchisePct / 100));
				insurerClaimKop = totalGrossKop - patientPaidKop;
			}

			const patientPaidRub = patientPaidKop / 100;
			const dmsCoveredRub = insurerClaimKop / 100;

			const genderVal: "M" | "F" | "М" | "Ж" = adminProfile?.gender === "female" ? "Ж" : "М";

			let icd10 = "K02.1";
			let icd10Desc = "Кариес дентина";
			if (tr.visitDiagnosis) {
				const match = tr.visitDiagnosis.match(/[A-Z]\d{2}(\.\d{1,2})?/i);
				if (match) {
					icd10 = match[0].toUpperCase();
					icd10Desc = tr.visitDiagnosis;
				}
			}

			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchSearch =
					tr.patientFullName.toLowerCase().includes(q) ||
					policyNumber.toLowerCase().includes(q) ||
					serviceName.toLowerCase().includes(q) ||
					code804n.toLowerCase().includes(q);
				if (!matchSearch) continue;
			}

			canonicalRecords.push({
				recordId: tr.id,
				serviceDate: visitDateIso,
				patientFullName: tr.patientFullName,
				patientBirthDate: tr.patientBirthDate || "1990-01-01",
				patientGender: genderVal,
				patientSnils: adminProfile?.snils || undefined,
				policyNumber: policyNumber || "ДМС-БЕЗ-ПОЛИСА",
				guaranteeLetterNumber: letter?.letterNumber || "ГП-БЕЗ-НОМЕРА",
				guaranteeLetterDate: letter?.issueDate || undefined,
				icd10Code: icd10,
				icd10DescriptionRu: icd10Desc,
				toothNumberFdi: toothCode && toothCode > 0 ? toothCode : undefined,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: tr.doctorFullName || "Врач-стоматолог",
				doctorSpecialtyRu: "Стоматолог-терапевт",
				quantity,
				unitPriceKopecks: unitPriceKop,
				totalGrossKopecks: totalGrossKop,
				franchisePercent: Math.round(franchisePct),
				patientPaidKopecks: patientPaidKop,
				insurerClaimKopecks: insurerClaimKop,
			});

			serviceRecords.push({
				id: tr.id,
				visitId: tr.visitId || tr.id,
				visitDate: visitDateIso,
				patientId: tr.patientId,
				patientFullName: tr.patientFullName,
				policyNumber: policyNumber || "ДМС-БЕЗ-ПОЛИСА",
				letterNumber: letter?.letterNumber,
				insurerName: serviceInsurerName,
				serviceCode804n: code804n,
				serviceName,
				diagnosisCodeMkb10: icd10,
				toothNumber: toothCode,
				quantity,
				unitPriceRub,
				totalPriceRub,
				dmsCoveredRub,
				patientPaidRub,
				doctorFullName: tr.doctorFullName || "Врач-стоматолог",
				isExcluded,
				exclusionReason: isExcluded ? "Услуга входит в исключения полиса ДМС" : undefined,
			});
		}

		// 6. Поддержка гарантийных писем с использованным лимитом при отсутствии отдельных treatmentItems (Mandate 8n)
		for (const letter of letters) {
			if (treatedPatientIds.has(letter.patientId)) continue;
			const usedAmount = Number(letter.usedAmountRub);
			if (usedAmount <= 0) continue;

			const letterDateIso = letter.issueDate || startDateStr;
			if (letterDateIso < startDateStr || letterDateIso > endDateStr) {
				// Проверяем период действия
				if (letter.validUntil < startDateStr || letter.validFrom > endDateStr) {
					continue;
				}
			}

			const unitPriceRub = usedAmount;
			const totalPriceRub = usedAmount;
			const unitPriceKop = Math.round(unitPriceRub * 100);
			const totalGrossKop = Math.round(totalPriceRub * 100);
			const franchisePct = Number(letter.franchisePct) || 0;
			const patientPaidKop = franchisePct > 0 ? Math.round(totalGrossKop * (franchisePct / 100)) : 0;
			const insurerClaimKop = totalGrossKop - patientPaidKop;
			const patientPaidRub = patientPaidKop / 100;
			const dmsCoveredRub = insurerClaimKop / 100;

			const code804n = (letter.approvedServiceCodes as string[])?.[0] || "A16.07.002.001";
			const serviceName = letter.notes?.trim() || "Оказание стоматологической помощи по гарантийному письму";
			const toothCode = Number((letter.approvedTeethFdi as string[])?.[0]?.replace(/\D/g, "")) || undefined;
			const icd10 = (letter.approvedDiagnosisCodes as string[])?.[0] || "K02.1";

			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchSearch =
					letter.patientFullName.toLowerCase().includes(q) ||
					letter.policyNumber.toLowerCase().includes(q) ||
					letter.letterNumber.toLowerCase().includes(q) ||
					serviceName.toLowerCase().includes(q);
				if (!matchSearch) continue;
			}

			canonicalRecords.push({
				recordId: letter.id,
				serviceDate: letterDateIso,
				patientFullName: letter.patientFullName,
				patientBirthDate: letter.patientBirthDate || "1990-01-01",
				patientGender: "М",
				policyNumber: letter.policyNumber,
				guaranteeLetterNumber: letter.letterNumber,
				guaranteeLetterDate: letter.issueDate,
				icd10Code: icd10,
				icd10DescriptionRu: "Стоматологическое лечение по гарантийному письму",
				toothNumberFdi: toothCode,
				serviceCode804n: code804n,
				serviceNameRu: serviceName,
				doctorFullName: "Врач-стоматолог",
				doctorSpecialtyRu: "Стоматолог-терапевт",
				quantity: 1,
				unitPriceKopecks: unitPriceKop,
				totalGrossKopecks: totalGrossKop,
				franchisePercent: Math.round(franchisePct),
				patientPaidKopecks: patientPaidKop,
				insurerClaimKopecks: insurerClaimKop,
			});

			serviceRecords.push({
				id: letter.id,
				visitId: letter.id,
				visitDate: letterDateIso,
				patientId: letter.patientId,
				patientFullName: letter.patientFullName,
				policyNumber: letter.policyNumber,
				letterNumber: letter.letterNumber,
				insurerName: letter.insurerName,
				serviceCode804n: code804n,
				serviceName,
				diagnosisCodeMkb10: icd10,
				toothNumber: toothCode,
				quantity: 1,
				unitPriceRub,
				totalPriceRub,
				dmsCoveredRub,
				patientPaidRub,
				doctorFullName: "Врач-стоматолог",
				isExcluded: false,
			});
		}

		const totals = calculateDmsRegistryTotals(canonicalRecords);
		const registryNumber = `РЕЕСТР-${startDateStr.replace(/-/g, "")}-${(insurerKey || "ALL").toUpperCase().slice(0, 8)}`;
		const registryDate = now.toISOString().slice(0, 10);

		const registryData: DmsRegistryData = {
			registryNumber,
			registryDate,
			periodStart: startDateStr,
			periodEnd: endDateStr,
			clinic: clinicInfo,
			insuranceCompany: insuranceCompanyInfo,
			records: canonicalRecords,
		};

		if (format === "xml") {
			return reply
				.code(200)
				.header("Content-Type", "application/xml; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${registryNumber}.xml"`)
				.send(generateDmsRegistryXml(registryData));
		}

		if (format === "csv") {
			return reply
				.code(200)
				.header("Content-Type", "text/csv; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${registryNumber}.csv"`)
				.send(generateDmsRegistryCsv(registryData));
		}

		return reply.code(200).send({
			...registryData,
			serviceRecords,
			totals,
		});
	});

	/**
	 * 1-клик прикрепление номера полиса ДМС и страховой компании (СОГАЗ, Ингосстрах, РЕСО, АльфаСтрахование)
	 * без 20 полей бюрократии.
	 */
	app.post<{
		Body: {
			patientId: string;
			insurerKey: string;
			policyNumber: string;
			patientFullName?: string;
			patientBirthDate?: string;
			isEmergency?: boolean;
			maxCoverageRub?: number;
		};
	}>("/api/insurance/quick-attach", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance quick attach policy",
		);
		if (!orgId) return;

		const body = request.body;
		if (!body || !body.patientId || !body.insurerKey || !body.policyNumber?.trim()) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите пациента, страховую компанию и номер полиса ДМС.",
			});
		}

		const insurerNames: Record<string, string> = {
			sogaz: "АО «СОГАЗ»",
			ingosstrakh: "СПАО «Ингосстрах»",
			reso: "СПАО «РЕСО-Гарантия»",
			reso_garantiya: "СПАО «РЕСО-Гарантия»",
			alfastrakh: "АО «АльфаСтрахование»",
			alfastrakhovanie: "АО «АльфаСтрахование»",
			vsk: "САО «ВСК»",
			soglasie: "ООО «СК «Согласие»",
			rosgosstrakh: "ПАО СК «Росгосстрах»",
		};
		const insurerName = insurerNames[body.insurerKey] || "Страховая компания ДМС";
		const todayIso = new Date().toISOString().slice(0, 10);
		const oneYearLaterIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

		const maxCoverage = body.maxCoverageRub && body.maxCoverageRub > 0 ? body.maxCoverageRub : 50000;
		const letterNumber = body.isEmergency
			? `ЭКСТРЕННО-${Date.now().toString().slice(-6)}`
			: `ДМС-${Date.now().toString().slice(-6)}`;

		const [created] = await db
			.insert(dmsGuaranteeLetters)
			.values({
				organizationId: orgId,
				patientId: body.patientId,
				patientFullName: body.patientFullName || "Пациент ДМС",
				patientBirthDate: body.patientBirthDate || null,
				policyNumber: body.policyNumber.trim(),
				insurerKey: body.insurerKey,
				insurerName,
				letterNumber,
				issueDate: todayIso,
				validFrom: todayIso,
				validUntil: oneYearLaterIso,
				maxCoverageRub: maxCoverage,
				usedAmountRub: 0,
				franchisePct: 0,
				franchiseType: "percent",
				franchiseFixedRub: 0,
				programExclusions: [],
				approvedServiceCodes: [],
				approvedTeethFdi: [],
				approvedDiagnosisCodes: [],
				curatorFullName: null,
				curatorPhone: null,
				notes: body.isEmergency
					? "Экстренный приём (острая боль). Требуется досылка гарантийного письма ДМС."
					: "Экспресс-прикрепление ДМС в 1 клик",
				status: "active",
			})
			.returning();

		return reply.code(201).send({
			success: true,
			letter: created,
			warning: body.isEmergency ? "Требуется досылка гарантийного письма ДМС" : undefined,
		});
	});
}


