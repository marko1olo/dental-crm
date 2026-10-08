/**
 * Policy & Contract Management Routes.
 * Layer 1: Handlers for DMS contracts and quick policy attachment.
 */
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts } from "../../db/schema.js";
import {
	INSURANCE_COMPANY_NAME_REQUIRED,
	INSURANCE_CONTRACT_NOT_FOUND,
	insuranceCreateBodySchema,
	insuranceUpdateBodySchema,
} from "./schemas.js";
import type {
	ContractCreateBody,
	ContractParams,
	ContractUpdateBody,
	QuickAttachBody,
} from "./types.js";

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function registerPolicyManagementRoutes(app: FastifyInstance): void {
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
	app.get<{ Params: ContractParams }>(
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
	app.post<{ Body: ContractCreateBody }>(
		"/api/insurance/contracts",
		async (request, reply) => {
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
		},
	);

	// PUT update an existing insurance contract
	app.put<{
		Params: ContractParams;
		Body: ContractUpdateBody;
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
	app.delete<{ Params: ContractParams }>(
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

	/**
	 * 1-клик прикрепление номера полиса ДМС и страховой компании (СОГАЗ, Ингосстрах, РЕСО, АльфаСтрахование)
	 * без 20 полей бюрократии.
	 */
	app.post<{ Body: QuickAttachBody }>(
		"/api/insurance/quick-attach",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance quick attach policy",
			);
			if (!orgId) return;

			const body = request.body;
			if (
				!body ||
				!body.patientId ||
				!body.insurerKey ||
				!body.policyNumber?.trim()
			) {
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
			const insurerName =
				insurerNames[body.insurerKey] || "Страховая компания ДМС";
			const todayIso = new Date().toISOString().slice(0, 10);
			const oneYearLaterIso = new Date(Date.now() + 365 * 86400000)
				.toISOString()
				.slice(0, 10);

			const maxCoverage =
				body.maxCoverageRub && body.maxCoverageRub > 0
					? body.maxCoverageRub
					: 50000;
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
				warning: body.isEmergency
					? "Требуется досылка гарантийного письма ДМС"
					: undefined,
			});
		},
	);
}
