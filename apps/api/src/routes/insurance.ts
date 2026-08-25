/**
 * Insurance Contracts API
 * Manages DMS (voluntary medical insurance) contracts at the organization level.
 * Patients are associated via the policyNumber on the patient administrative profile.
 */
import {
	calculateDmsCoverage,
	calculateDmsGuaranteeSplit,
	dmsGuaranteeLetterCreateSchema,
	dmsGuaranteeLetterSchema,
	dmsGuaranteeLetterUpdateSchema,
	dmsSplitCalculationItemSchema,
	type DmsGuaranteeLetter,
	insuranceCalculationItemSchema,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { insuranceContracts } from "../db/schema.js";

const calculateCoverageBodySchema = z.object({
	usedAnnualAmountRub: nonNegativeMoneyRubSchema.default(0),
	items: z.array(insuranceCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта покрытия ДМС."),
});

const splitInvoiceBodySchema = z.object({
	letterId: z.string().optional(),
	contractId: z.string().optional(),
	patientId: z.string().optional(),
	visitDate: z.string().optional(),
	items: z.array(dmsSplitCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта разделения счёта."),
});

const recordUsageBodySchema = z.object({
	amountRub: nonNegativeMoneyRubSchema.refine((v) => v > 0, "Сумма списания должна быть больше 0 ₽."),
	invoiceId: z.string().optional(),
	notes: z.string().optional(),
});

// Изолированное хранилище гарантийных писем в памяти (организационный скоуп)
const guaranteeLettersByOrg = new Map<string, DmsGuaranteeLetter[]>();

function getOrgGuaranteeLetters(orgId: string): DmsGuaranteeLetter[] {
	let list = guaranteeLettersByOrg.get(orgId);
	if (!list) {
		list = [
			{
				id: "letter-demo-01",
				organizationId: orgId,
				patientId: "pat-demo-1",
				patientFullName: "Иванов Иван Иванович",
				policyNumber: "77-ДМС-987654",
				insurerKey: "sogaz",
				insurerName: "АО «СОГАЗ»",
				letterNumber: "ГП-2026/8412",
				issueDate: "2026-08-01",
				validFrom: "2026-08-01",
				validUntil: "2026-09-30",
				maxCoverageRub: 50000,
				usedAmountRub: 12500,
				franchisePct: 0,
				franchiseType: "percent",
				franchiseFixedRub: 0,
				programExclusions: ["orthodontics", "implantology", "whitening", "veneers"],
				approvedServiceCodes: [
					"A16.07.002.001",
					"A16.07.002.002",
					"A16.07.030.001",
					"A16.07.008.001",
					"B01.003.004.001",
				],
				approvedTeethFdi: ["16", "17", "26", "46"],
				approvedDiagnosisCodes: ["K02.1", "K04.0"],
				curatorFullName: "Иванова Елена (Врач-эксперт)",
				curatorPhone: "8 (800) 333-08-88 доб. 142",
				notes: "Согласовано лечение кариеса и эндодонтия по острой боли.",
				status: "active",
				createdAt: new Date().toISOString(),
			},
		];
		guaranteeLettersByOrg.set(orgId, list);
	}
	return list;
}

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

		const { patientId, status, search } = request.query;
		const allLetters = getOrgGuaranteeLetters(orgId);

		let filtered = allLetters.filter((l) => {
			if (patientId && l.patientId !== patientId) return false;
			if (status && l.status !== status) return false;
			if (search && search.trim()) {
				const q = search.trim().toLowerCase();
				const matchNum = l.letterNumber.toLowerCase().includes(q);
				const matchPat = l.patientFullName.toLowerCase().includes(q);
				const matchIns = l.insurerName.toLowerCase().includes(q);
				const matchPol = l.policyNumber.toLowerCase().includes(q);
				if (!matchNum && !matchPat && !matchIns && !matchPol) return false;
			}
			return true;
		});

		// Check for auto-expiration based on current date
		const todayIso = new Date().toISOString().slice(0, 10);
		filtered = filtered.map((l) => {
			if (l.status === "active" && l.validUntil && l.validUntil < todayIso) {
				return { ...l, status: "expired" as const };
			}
			if (l.status === "active" && l.usedAmountRub >= l.maxCoverageRub) {
				return { ...l, status: "exhausted" as const };
			}
			return l;
		});

		return reply.code(200).send(filtered);
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
			const letter = getOrgGuaranteeLetters(orgId).find((l) => l.id === letterId);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			return reply.code(200).send(letter);
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

		const letters = getOrgGuaranteeLetters(orgId);
		const newLetter: DmsGuaranteeLetter = {
			id: data.id || `letter-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
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
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		letters.unshift(newLetter);
		return reply.code(201).send(newLetter);
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
			const letters = getOrgGuaranteeLetters(orgId);
			const existingIndex = letters.findIndex((l) => l.id === letterId);

			if (existingIndex === -1) {
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

			const existing = letters[existingIndex]!;
			const cleanUpdates = Object.fromEntries(
				Object.entries(parsed.data).filter(([_, v]) => v !== undefined),
			);

			const updatedLetter: DmsGuaranteeLetter = {
				...existing,
				...cleanUpdates,
				status: (cleanUpdates.status as DmsGuaranteeLetter["status"]) ?? existing.status,
				id: existing.id,
				organizationId: orgId,
				updatedAt: new Date().toISOString(),
			} as DmsGuaranteeLetter;

			// Auto status check on limit exhaustion
			if (
				updatedLetter.status === "active" &&
				updatedLetter.usedAmountRub >= updatedLetter.maxCoverageRub
			) {
				updatedLetter.status = "exhausted";
			}

			letters[existingIndex] = updatedLetter;
			return reply.code(200).send(updatedLetter);
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
			const letters = getOrgGuaranteeLetters(orgId);
			const letter = letters.find((l) => l.id === letterId);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			letter.status = "cancelled";
			letter.updatedAt = new Date().toISOString();

			return reply.code(200).send({
				success: true,
				letterId,
				message: "Гарантийное письмо отозвано / аннулировано.",
			});
		},
	);

	// POST record usage against a guarantee letter
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
			const letters = getOrgGuaranteeLetters(orgId);
			const letter = letters.find((l) => l.id === letterId);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const parsed = recordUsageBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Укажите корректную сумму списания по ГП.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
				});
			}

			const { amountRub } = parsed.data;
			const remainingBefore = Math.max(0, letter.maxCoverageRub - letter.usedAmountRub);

			if (amountRub > remainingBefore) {
				return reply.code(400).send({
					error: "LimitExceeded",
					message: `Сумма списания (${amountRub} ₽) превышает остаток по гарантийному письму (${remainingBefore} ₽).`,
				});
			}

			const newUsedAmount = Math.round((letter.usedAmountRub + amountRub) * 100) / 100;
			letter.usedAmountRub = newUsedAmount;
			if (letter.usedAmountRub >= letter.maxCoverageRub) {
				letter.status = "exhausted";
			}
			letter.updatedAt = new Date().toISOString();

			return reply.code(200).send({
				success: true,
				letterId: letter.id,
				debitedAmountRub: amountRub,
				usedAmountRub: letter.usedAmountRub,
				remainingCoverageRub: Math.max(0, letter.maxCoverageRub - letter.usedAmountRub),
				status: letter.status,
			});
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

		// 1. Поиск гарантийного письма
		let letter: DmsGuaranteeLetter | null = null;
		if (letterId) {
			letter = getOrgGuaranteeLetters(orgId).find((l) => l.id === letterId) ?? null;
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
		});

		return reply.code(200).send(splitResult);
	});
}

