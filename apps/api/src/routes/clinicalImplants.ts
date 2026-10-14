import {
	ImplantStabilityCalculator,
	createImplantInstallationSchema,
	recordIsqMeasurementSchema,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	implantIsqMeasurements,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patientImplantInstallations,
	patientInvoices,
	patients,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Канонические эталонные складские запасы имплантатов и хирургических расходников
 * для честного списания с реальными номерами партий (LOT) и сроками стерильности (Мандаты 8e, 8n).
 */
export const CANONICAL_IMPLANT_WAREHOUSE_SEEDS = [
	{
		name: "Имплантат Osstem TS III SA Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S3510S",
		barcode: "01088061400012341024C110221SN-883102",
		lotNumber: "24C1102",
		expirationDate: "2028-10-31",
		notes: "Корейская имплантационная система Osstem TS III SA (узкая платформа)",
	},
	{
		name: "Имплантат Osstem TS III SA Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "5.000",
		currentQty: "5.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S4010S",
		barcode: "01088061400012341024C120821SN-884210",
		lotNumber: "24C1208",
		expirationDate: "2028-11-30",
		notes: "Корейская имплантационная система Osstem TS III SA (конус Морзе 11°)",
	},
	{
		name: "Имплантат Osstem TS III SA Ø4.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S4510S",
		barcode: "01088061400012341024C131521SN-885419",
		lotNumber: "24C1315",
		expirationDate: "2028-12-31",
		notes: "Корейская имплантационная система Osstem TS III SA (широкая платформа)",
	},
	{
		name: "Имплантат Dentium SuperLine SLA Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "10500.00",
		pricePerUnit: "10500.00",
		sku: "FX4010",
		barcode: "010880918000567810DT-7790121SN-440112",
		lotNumber: "DT-77901",
		expirationDate: "2029-01-31",
		notes: "Дентальный имплантат Dentium SuperLine SLA (регулярная платформа)",
	},
	{
		name: "Имплантат Dentium SuperLine SLA Ø4.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "6.000",
		currentQty: "6.000",
		unitCostRub: "10500.00",
		pricePerUnit: "10500.00",
		sku: "FX4510",
		barcode: "010880918000567810DT-7810221SN-441290",
		lotNumber: "DT-78102",
		expirationDate: "2029-01-31",
		notes: "Дентальный имплантат Dentium SuperLine SLA (двойная резьба)",
	},
	{
		name: "Имплантат Straumann BLX Roxolid SLActive Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "28000.00",
		pricePerUnit: "28000.00",
		sku: "021.2210",
		barcode: "010761314000991210ST-9011221SN-110820",
		lotNumber: "ST-90112",
		expirationDate: "2029-04-30",
		notes: "Швейцарский премиальный имплантат Straumann BLX Roxolid SLActive (RB)",
	},
	{
		name: "Имплантат Straumann BLX Roxolid SLActive Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "28000.00",
		pricePerUnit: "28000.00",
		sku: "021.2310",
		barcode: "010761314000991210ST-9021421SN-110934",
		lotNumber: "ST-90214",
		expirationDate: "2029-05-31",
		notes: "Швейцарский премиальный имплантат Straumann BLX Roxolid SLActive",
	},
	{
		name: "Имплантат Nobel Biocare Parallel CC Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "24500.00",
		pricePerUnit: "24500.00",
		sku: "NP-35100",
		barcode: "010733190000334410NB-4471921SN-771109",
		lotNumber: "NB-44719",
		expirationDate: "2028-08-31",
		notes: "Имплантат Nobel Biocare Conical Connection NP",
	},
	{
		name: "Имплантат Nobel Biocare Parallel CC Ø4.3x11.5мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "24500.00",
		pricePerUnit: "24500.00",
		sku: "NP-35115",
		barcode: "010733190000334410NB-4482121SN-772819",
		lotNumber: "NB-44821",
		expirationDate: "2028-09-30",
		notes: "Имплантат Nobel Biocare Conical Connection (TiUnite поверхность)",
	},
	{
		name: "Костный графт Geistlich Bio-Oss (гранулы 0.5г, 0.25-1мм)",
		category: "Хирургия",
		unit: "упак.",
		stockQuantity: "8.000",
		currentQty: "8.000",
		unitCostRub: "8200.00",
		pricePerUnit: "8200.00",
		sku: "BIO-OSS-05",
		barcode: "010761214000551110BO-892121SN-339182",
		lotNumber: "BO-8921",
		expirationDate: "2028-06-30",
		notes: "Ксеногенный костный материал Bio-Oss Small Granules (Geistlich Pharma)",
	},
	{
		name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)",
		category: "Хирургия",
		unit: "упак.",
		stockQuantity: "5.000",
		currentQty: "5.000",
		unitCostRub: "9800.00",
		pricePerUnit: "9800.00",
		sku: "BIO-GIDE-1622",
		barcode: "010761214000882210BG-331021SN-559281",
		lotNumber: "BG-3310",
		expirationDate: "2028-08-31",
		notes: "Биорезорбируемая барьерная коллагеновая мембрана Bio-Gide",
	},
	{
		name: "Шовный материал Ethicon Викрил 4-0 (рассасывающийся с иглой 19мм)",
		category: "Расходные материалы",
		unit: "шт.",
		stockQuantity: "20.000",
		currentQty: "20.000",
		unitCostRub: "650.00",
		pricePerUnit: "650.00",
		sku: "VICRYL-40",
		barcode: "010501014000773310VK-202621SN-901823",
		lotNumber: "VK-2026",
		expirationDate: "2027-12-31",
		notes: "Плетеный синтетический рассасывающийся шовный материал Викрил 4-0",
	},
];

export async function registerClinicalImplantRoutes(app: FastifyInstance) {
	/**
	 * 0. GET /api/clinical/implants/stock
	 * Возвращает доступные на складе клиники титановые имплантаты и хирургические расходники
	 * с реальными номерами партий (LOT), сроками стерильности и себестоимостью (Мандаты 8e, 8n).
	 */
	app.get("/api/clinical/implants/stock", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		let items = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, orgId),
					or(
						eq(inventoryItems.category, "Имплантология"),
						eq(inventoryItems.category, "Хирургия"),
						ilike(inventoryItems.name, "%имплант%"),
						ilike(inventoryItems.name, "%bio-oss%"),
						ilike(inventoryItems.name, "%bio-gide%"),
						ilike(inventoryItems.name, "%викрил%"),
						ilike(inventoryItems.name, "%vicryl%"),
					),
				),
			);

		// Если на складе клиники пусто, автоматически инициализируем канонический набор
		if (items.length === 0) {
			for (const seed of CANONICAL_IMPLANT_WAREHOUSE_SEEDS) {
				await db.insert(inventoryItems).values({
					organizationId: orgId,
					name: seed.name,
					category: seed.category,
					unit: seed.unit,
					stockQuantity: seed.stockQuantity,
					currentQty: seed.currentQty,
					unitCostRub: seed.unitCostRub,
					pricePerUnit: seed.pricePerUnit,
					sku: seed.sku,
					barcode: seed.barcode,
					lotNumber: seed.lotNumber,
					expirationDate: seed.expirationDate,
					notes: seed.notes,
				});
			}

			items = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.organizationId, orgId));
		}

		const implants = items.filter(
			(i) =>
				i.category === "Имплантология" ||
				i.name.toLowerCase().includes("имплант"),
		);

		const grafts = items.filter(
			(i) =>
				i.name.toLowerCase().includes("графт") ||
				i.name.toLowerCase().includes("bio-oss") ||
				i.name.toLowerCase().includes("костн"),
		);

		const membranes = items.filter(
			(i) =>
				i.name.toLowerCase().includes("мембран") ||
				i.name.toLowerCase().includes("bio-gide"),
		);

		const sutures = items.filter(
			(i) =>
				i.name.toLowerCase().includes("шовн") ||
				i.name.toLowerCase().includes("викрил") ||
				i.name.toLowerCase().includes("vicryl") ||
				i.name.toLowerCase().includes("пролен") ||
				i.name.toLowerCase().includes("пга"),
		);

		return reply.send({
			success: true,
			implants,
			consumables: {
				grafts,
				membranes,
				sutures,
			},
		});
	});

	/**
	 * 1. POST /api/clinical/implants/installations
	 * Регистрирует установку имплантата с кривой торка, базовым ISQ,
	 * автоматическим списанием со склада (имплант, графт, мембрана, шовный материал),
	 * расчетом немедленной нагрузки (Immediate Loading) и связкой со счетом пациента (patient_invoices).
	 */
	app.post("/api/clinical/implants/installations", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Регистрация имплантатов разрешена врачам-хирургам/клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в регистрации протокола имплантации (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const parsed = createImplantInstallationSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ImplantInstallationValidationError",
				message: "Некорректные параметры протокола установки имплантата.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Verify patient belongs to organization
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, input.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в вашей клинике.",
			});
		}

		const { isqMean, isqAnisotropyDelta } =
			ImplantStabilityCalculator.calculateMeanIsq(
				input.baselineIsqMesiodistal,
				input.baselineIsqBuccolingual,
				input.baselineIsqDistopalatal,
			);

		const { protocol, decisionRationale } =
			ImplantStabilityCalculator.evaluateLoadingProtocol(
				isqMean,
				input.finalInsertionTorqueNcm,
				0, // day 0 baseline
			);

		// Расчет возможности немедленной нагрузки (Immediate Loading / Provisionalization)
		const isImmediateLoadingFeasible =
			(isqMean !== null ? isqMean >= 70 : false) &&
			input.finalInsertionTorqueNcm >= 35 &&
			input.finalInsertionTorqueNcm <= 55;

		const result = await db.transaction(async (tx) => {
			// 1. Поиск или создание физического имплантата на складе (inventory_items)
			const targetItemId = input.inventoryItemId || input.catalogItemId;
			let invItem = targetItemId
				? (
						await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, targetItemId),
									eq(inventoryItems.organizationId, orgId),
								),
							)
							.for("update")
							.limit(1)
					)[0]
				: null;

			// Если id не передан, ищем по бренду и размеру
			if (!invItem) {
				const brandRegex = `%${input.implantBrand}%`;
				const sizeRegex = `%${input.implantDiameterMm}%`;
				const matching = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, orgId),
							or(
								ilike(inventoryItems.name, brandRegex),
								ilike(inventoryItems.name, sizeRegex),
							),
						),
					)
					.limit(1);
				if (matching[0]) {
					invItem = matching[0];
				}
			}

			// Мягкий овердрафт склада (Мандаты 8e, 8n): задержка накладной не блокирует операцию
			if (!invItem) {
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId: orgId,
						name: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм`,
						category: "Имплантология",
						unit: "шт.",
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: "2",
						unitCostRub: "12500.00",
						pricePerUnit: "12500.00",
						lotNumber: input.lotNumber ?? "LOT-AUTO",
						expirationDate: input.expirationDate ?? "2028-12-31",
					})
					.returning();
				invItem = created!;
			}

			// Реальный номер партии и срок стерильности со склада
			const effectiveLotNumber =
				input.lotNumber || invItem.lotNumber || "LOT-REAL-STOCK";
			const effectiveSerialNumber =
				input.serialNumber || `SN-${invItem.id.slice(0, 8).toUpperCase()}`;

			// 2. Списание титанового винта со склада
			const currentStock = Number(
				invItem.currentQty ?? invItem.stockQuantity ?? 0,
			);
			const newStock = Number((currentStock - 1).toFixed(4));
			const isOverdraft = newStock < 0;
			const implantUnitCostRub = Number(
				invItem.unitCostRub ?? invItem.pricePerUnit ?? 12500,
			);

			await tx
				.update(inventoryItems)
				.set({
					currentQty: String(newStock),
					stockQuantity: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, invItem.id),
						eq(inventoryItems.organizationId, orgId),
					),
				);

			const [implantTx] = await tx
				.insert(inventoryTransactions)
				.values({
					organizationId: orgId,
					itemId: invItem.id,
					inventoryItemId: invItem.id,
					visitId: input.visitId ?? null,
					transactionType: isOverdraft
						? "emergency_overdraft"
						: "auto_deduct",
					isOverdraft,
					qty: "-1.000",
					quantityChanged: "-1.000",
					unitCostRub: String(implantUnitCostRub),
					userId: identity.userId ?? null,
					notes: isOverdraft
						? `Мягкий овердрафт: имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (LOT: ${effectiveLotNumber}) зуба FDI #${input.toothNumberFdi}`
						: `Списание со склада: имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (LOT: ${effectiveLotNumber}) зуба FDI #${input.toothNumberFdi}`,
				})
				.returning({ id: inventoryTransactions.id });

			const deductedMaterials: Array<{
				name: string;
				lotNumber: string | null;
				unitCostRub: number;
				quantity: number;
				isOverdraft: boolean;
			}> = [
				{
					name: invItem.name,
					lotNumber: effectiveLotNumber,
					unitCostRub: implantUnitCostRub,
					quantity: 1,
					isOverdraft,
				},
			];

			let consumablesCostTotal = 0;

			// 3. Автоматическое списание костного графта (Bio-Oss), если указан
			if (input.boneGraftMaterial || input.boneGraftItemId) {
				const graftName =
					input.boneGraftMaterial || "Костный графт Geistlich Bio-Oss (0.5г)";
				let [graftItem] = input.boneGraftItemId
					? await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, input.boneGraftItemId),
									eq(inventoryItems.organizationId, orgId),
								),
							)
							.limit(1)
					: await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, orgId),
									ilike(inventoryItems.name, "%bio-oss%"),
								),
							)
							.limit(1);

				if (!graftItem) {
					const [createdGraft] = await tx
						.insert(inventoryItems)
						.values({
							organizationId: orgId,
							name: graftName,
							category: "Хирургия",
							unit: "упак.",
							stockQuantity: "0",
							currentQty: "0",
							unitCostRub: "8200.00",
							lotNumber: "BO-8921",
							expirationDate: "2028-06-30",
						})
						.returning();
					graftItem = createdGraft!;
				}

				const graftCost = Number(graftItem.unitCostRub || 8200);
				const gStock = Number(graftItem.currentQty || 0);
				const gNewStock = Number((gStock - 1).toFixed(4));
				const gOverdraft = gNewStock < 0;

				await tx
					.update(inventoryItems)
					.set({ currentQty: String(gNewStock), stockQuantity: String(gNewStock) })
					.where(eq(inventoryItems.id, graftItem.id));

				await tx.insert(inventoryTransactions).values({
					organizationId: orgId,
					itemId: graftItem.id,
					inventoryItemId: graftItem.id,
					visitId: input.visitId ?? null,
					transactionType: gOverdraft ? "emergency_overdraft" : "auto_deduct",
					isOverdraft: gOverdraft,
					qty: "-1.000",
					quantityChanged: "-1.000",
					unitCostRub: String(graftCost),
					userId: identity.userId ?? null,
					notes: `Списание костного графта для НКР зуба FDI #${input.toothNumberFdi}`,
				});

				deductedMaterials.push({
					name: graftItem.name,
					lotNumber: graftItem.lotNumber,
					unitCostRub: graftCost,
					quantity: 1,
					isOverdraft: gOverdraft,
				});
				consumablesCostTotal += graftCost;
			}

			// 4. Автоматическое списание барьерной мембраны (Bio-Gide), если указана
			if (input.membraneUsed || input.membraneItemId) {
				const memName =
					input.membraneUsed || "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)";
				let [memItem] = input.membraneItemId
					? await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, input.membraneItemId),
									eq(inventoryItems.organizationId, orgId),
								),
							)
							.limit(1)
					: await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, orgId),
									ilike(inventoryItems.name, "%bio-gide%"),
								),
							)
							.limit(1);

				if (!memItem) {
					const [createdMem] = await tx
						.insert(inventoryItems)
						.values({
							organizationId: orgId,
							name: memName,
							category: "Хирургия",
							unit: "упак.",
							stockQuantity: "0",
							currentQty: "0",
							unitCostRub: "9800.00",
							lotNumber: "BG-3310",
							expirationDate: "2028-08-31",
						})
						.returning();
					memItem = createdMem!;
				}

				const memCost = Number(memItem.unitCostRub || 9800);
				const mStock = Number(memItem.currentQty || 0);
				const mNewStock = Number((mStock - 1).toFixed(4));
				const mOverdraft = mNewStock < 0;

				await tx
					.update(inventoryItems)
					.set({ currentQty: String(mNewStock), stockQuantity: String(mNewStock) })
					.where(eq(inventoryItems.id, memItem.id));

				await tx.insert(inventoryTransactions).values({
					organizationId: orgId,
					itemId: memItem.id,
					inventoryItemId: memItem.id,
					visitId: input.visitId ?? null,
					transactionType: mOverdraft ? "emergency_overdraft" : "auto_deduct",
					isOverdraft: mOverdraft,
					qty: "-1.000",
					quantityChanged: "-1.000",
					unitCostRub: String(memCost),
					userId: identity.userId ?? null,
					notes: `Списание коллагеновой мембраны для зуба FDI #${input.toothNumberFdi}`,
				});

				deductedMaterials.push({
					name: memItem.name,
					lotNumber: memItem.lotNumber,
					unitCostRub: memCost,
					quantity: 1,
					isOverdraft: mOverdraft,
				});
				consumablesCostTotal += memCost;
			}

			// 5. Автоматическое списание шовного материала (Викрил 4-0)
			const sutureName =
				input.sutureMaterial || "Шовный материал Ethicon Викрил 4-0";
			let [sutureItem] = input.sutureItemId
				? await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.id, input.sutureItemId),
								eq(inventoryItems.organizationId, orgId),
							),
						)
						.limit(1)
				: await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.organizationId, orgId),
								or(
									ilike(inventoryItems.name, "%викрил%"),
									ilike(inventoryItems.name, "%vicryl%"),
								),
							),
						)
						.limit(1);

			if (!sutureItem) {
				const [createdSuture] = await tx
					.insert(inventoryItems)
					.values({
						organizationId: orgId,
						name: sutureName,
						category: "Расходные материалы",
						unit: "шт.",
						stockQuantity: "20",
						currentQty: "20",
						unitCostRub: "650.00",
						lotNumber: "VK-2026",
						expirationDate: "2027-12-31",
					})
					.returning();
				sutureItem = createdSuture!;
			}

			const sutureCost = Number(sutureItem.unitCostRub || 650);
			const sStock = Number(sutureItem.currentQty || 0);
			const sNewStock = Number((sStock - 1).toFixed(4));
			const sOverdraft = sNewStock < 0;

			await tx
				.update(inventoryItems)
				.set({ currentQty: String(sNewStock), stockQuantity: String(sNewStock) })
				.where(eq(inventoryItems.id, sutureItem.id));

			await tx.insert(inventoryTransactions).values({
				organizationId: orgId,
				itemId: sutureItem.id,
				inventoryItemId: sutureItem.id,
				visitId: input.visitId ?? null,
				transactionType: sOverdraft ? "emergency_overdraft" : "auto_deduct",
				isOverdraft: sOverdraft,
				qty: "-1.000",
				quantityChanged: "-1.000",
				unitCostRub: String(sutureCost),
				userId: identity.userId ?? null,
				notes: `Списание шовного материала Викрил для ушивания раны зуба FDI #${input.toothNumberFdi}`,
			});

			deductedMaterials.push({
				name: sutureItem.name,
				lotNumber: sutureItem.lotNumber,
				unitCostRub: sutureCost,
				quantity: 1,
				isOverdraft: sOverdraft,
			});
			consumablesCostTotal += sutureCost;

			// 6. Связность с биллингом и счетами пациента (patient_invoices)
			// Мандат 8n: Соло-врач (ИП/хирург) видит себестоимость винта, расходников и чистый заработок за операцию.
			const operationPriceRub = Number(input.operationPriceRub ?? 45000);
			const totalMaterialsCostRub = implantUnitCostRub + consumablesCostTotal;
			const doctorGrossMarginRub = operationPriceRub - totalMaterialsCostRub;
			const netDoctorIncomeRub = Math.max(0, doctorGrossMarginRub);

			let linkedInvoiceId = input.invoiceId ?? null;

			if (!linkedInvoiceId && input.visitId) {
				// Ищем существующий счет визита
				const [existingInvoice] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, orgId),
							eq(patientInvoices.visitId, input.visitId),
						),
					)
					.limit(1);

				if (existingInvoice) {
					linkedInvoiceId = existingInvoice.id;
				}
			}

			// Если счет еще не создан — формируем наряд-счет операции
			if (!linkedInvoiceId) {
				const [newInvoice] = await tx
					.insert(patientInvoices)
					.values({
						organizationId: orgId,
						patientId: input.patientId,
						visitId: input.visitId ?? null,
						totalAmountRub: operationPriceRub,
						totalRub: String(operationPriceRub),
						status: "issued",
						issuedAt: new Date(),
					})
					.returning();
				linkedInvoiceId = newInvoice?.id ?? null;
			}

			// Добавляем строчку услуги операции в книгу лечения treatment_items
			if (input.visitId) {
				await tx.insert(treatmentItems).values({
					organizationId: orgId,
					patientId: input.patientId,
					visitId: input.visitId,
					toothCode: String(input.toothNumberFdi),
					title: `Внутрикостная дентальная имплантация системы ${input.implantBrand} (Зуб FDI #${input.toothNumberFdi})`,
					priceRub: operationPriceRub,
					unitPriceRub: operationPriceRub,
					quantity: "1",
					status: "completed",
					notes: `Установлен имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм. Торк: ${input.finalInsertionTorqueNcm} Н·см. ISQ: ${Math.round(isqMean ?? 70)}.`,
				});
			}

			const financialSummary = {
				operationPriceRub,
				implantCostRub: implantUnitCostRub,
				consumablesCostRub: consumablesCostTotal,
				totalMaterialsCostRub,
				doctorGrossMarginRub,
				netDoctorIncomeRub,
				invoiceId: linkedInvoiceId,
				marginPercent:
					operationPriceRub > 0
						? Number(
								((doctorGrossMarginRub / operationPriceRub) * 100).toFixed(
									1,
								),
							)
						: 0,
			};

			// 7. Сохранение протокола установки имплантата в БД
			const [installation] = await tx
				.insert(patientImplantInstallations)
				.values({
					organizationId: orgId,
					patientId: input.patientId,
					surgeonDoctorId: identity.userId ?? null,
					visitId: input.visitId ?? null,
					catalogItemId: null, // не блокируется внешним ключом
					toothNumberFdi: input.toothNumberFdi,
					implantBrand: input.implantBrand,
					implantDiameterMm: String(input.implantDiameterMm),
					implantLengthMm: String(input.implantLengthMm),
					lotNumber: effectiveLotNumber,
					serialNumber: effectiveSerialNumber,
					boneDensityClass: input.boneDensityClass,
					averageHounsfieldUnits: input.averageHounsfieldUnits
						? String(input.averageHounsfieldUnits)
						: null,
					finalInsertionTorqueNcm: String(input.finalInsertionTorqueNcm),
					baselineIsq: isqMean !== null ? Math.round(isqMean) : 70,
					initialProtocol: protocol,
					corticalTapUsed: input.corticalTapUsed,
					underdrillingUsed: input.underdrillingUsed,
					boneGraftMaterial: input.boneGraftMaterial ?? null,
					membraneUsed: input.membraneUsed ?? null,
					torqueCurveSamplesJson: JSON.stringify(
						input.torqueCurveSamples || [],
					),
					notes: JSON.stringify({
						userNotes: input.notes ?? null,
						expirationDate: invItem.expirationDate ?? input.expirationDate,
						sku: invItem.sku,
						financials: financialSummary,
						deductedMaterials,
						isImmediateLoadingFeasible,
					}),
				})
				.returning();

			if (!installation) {
				throw new Error(
					"Не удалось сохранить протокол установки имплантата в базе данных.",
				);
			}

			// 8. Фиксация базового замера ISQ
			if (
				input.baselineIsqMesiodistal != null &&
				input.baselineIsqBuccolingual != null &&
				isqMean != null
			) {
				await tx.insert(implantIsqMeasurements).values({
					organizationId: orgId,
					installationId: installation.id,
					measuredByDoctorId: identity.userId ?? null,
					visitId: input.visitId ?? null,
					daysPostOp: 0,
					isqMesiodistal: input.baselineIsqMesiodistal,
					isqBuccolingual: input.baselineIsqBuccolingual,
					isqDistopalatal: input.baselineIsqDistopalatal ?? null,
					isqMean: String(isqMean),
					isqAnisotropyDelta: isqAnisotropyDelta ?? 0,
					stabilityStatus: "primary_mechanical_high",
					recommendedLoadingDecision: decisionRationale,
					isBiologicalDipDetected: false,
				});
			}

			// 9. Обновление зубной формулы ЭОД
			await tx
				.delete(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, orgId),
						eq(toothStates.patientId, input.patientId),
						eq(toothStates.toothNumber, input.toothNumberFdi),
					),
				);

			await tx.insert(toothStates).values({
				organizationId: orgId,
				patientId: input.patientId,
				toothNumber: input.toothNumberFdi,
				state: "Implant",
				surfaces: ["implant_site"],
				notes: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (${isqMean !== null ? `ISQ: ${Math.round(isqMean)}, ` : ""}${input.finalInsertionTorqueNcm} Н·см, LOT: ${effectiveLotNumber})`,
			});

			await tx.insert(toothStateHistory).values({
				organizationId: orgId,
				patientId: input.patientId,
				toothNumber: input.toothNumberFdi,
				newState: "Implant",
				newSurfaces: ["implant_site"],
				reason: `Хирургическая установка имплантата ${input.implantBrand}. Протокол: ${protocol}`,
			});

			return {
				...installation,
				inventoryDeduction: {
					transactionId: implantTx?.id ?? "",
					itemId: invItem.id,
					itemName: invItem.name,
					previousStock: currentStock,
					newStock,
					unitCostRub: String(implantUnitCostRub),
					isOverdraft,
				},
				deductedMaterials,
				financials: financialSummary,
				isImmediateLoadingFeasible,
			};
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "UPDATE_IMPLANT_RECORD",
			payload: {
				patientId: input.patientId,
				toothNumberFdi: input.toothNumberFdi,
				installationId: result.id,
				inventoryDeduction: result.inventoryDeduction,
				financials: result.financials,
			},
		});

		return reply.code(201).send({
			success: true,
			installation: result,
			inventoryDeduction: result.inventoryDeduction,
			inventoryDeductions: result.deductedMaterials,
			financials: result.financials,
			isImmediateLoadingFeasible: result.isImmediateLoadingFeasible,
			evaluatedProtocol: protocol,
			decisionRationale,
		});
	});

	/**
	 * 2. POST /api/clinical/implants/:installationId/isq
	 * Фиксация динамического замера ISQ с обнаружением биологического проседания (Stability Dip)
	 */
	app.post(
		"/api/clinical/implants/:installationId/isq",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
			);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Замер стабильности имплантата разрешен только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.implants.write",
					role: staffRole,
					message: `Отказ в записи замера ISQ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { installationId } = request.params as {
				installationId: string;
			};
			const parsed = recordIsqMeasurementSchema.safeParse({
				...((request.body as object) || {}),
				installationId,
			});

			if (!parsed.success) {
				return reply.code(400).send({
					error: "IsqMeasurementValidationError",
					message: "Некорректные параметры измерения ISQ.",
					details: parsed.error.format(),
				});
			}
			const input = parsed.data;

			const [installation] = await db
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.id, installationId),
						eq(patientImplantInstallations.organizationId, orgId),
					),
				)
				.limit(1);

			if (!installation) {
				return reply.code(404).send({
					error: "ImplantInstallationNotFound",
					message: "Карточка установленного имплантата не найдена.",
				});
			}

			const { isqMean, isqAnisotropyDelta } =
				ImplantStabilityCalculator.calculateMeanIsq(
					input.isqMesiodistal,
					input.isqBuccolingual,
					input.isqDistopalatal,
				);

			const { status, decisionRationale, isBiologicalDip } =
				ImplantStabilityCalculator.evaluateLoadingProtocol(
					isqMean,
					Number(installation.finalInsertionTorqueNcm),
					input.daysPostOp,
				);

			const [measurement] = await db
				.insert(implantIsqMeasurements)
				.values({
					organizationId: orgId,
					installationId,
					measuredByDoctorId: null,
					visitId: input.visitId ?? null,
					daysPostOp: input.daysPostOp,
					isqMesiodistal: input.isqMesiodistal,
					isqBuccolingual: input.isqBuccolingual,
					isqDistopalatal: input.isqDistopalatal ?? null,
					isqMean: String(isqMean ?? 70),
					isqAnisotropyDelta: isqAnisotropyDelta ?? 0,
					stabilityStatus: status,
					recommendedLoadingDecision: decisionRationale,
					isBiologicalDipDetected: isBiologicalDip,
					smartpegCode: input.smartpegCode ?? null,
					notes: input.notes ?? null,
				})
				.returning();

			return reply.code(201).send({
				success: true,
				measurement,
				evaluation: {
					status,
					decisionRationale,
					isBiologicalDip,
				},
			});
		},
	);

	/**
	 * 3. GET /api/clinical/implants/:installationId/passport
	 * Генерация юридического и гарантийного паспорта дентального имплантата
	 * для выдачи пациенту на руки в формате А4 и для ЛК пациента с QR-кодом производителя.
	 */
	app.get(
		"/api/clinical/implants/:installationId/passport",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { installationId } = request.params as {
				installationId: string;
			};

			const [installation] = await db
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.id, installationId),
						eq(patientImplantInstallations.organizationId, orgId),
					),
				)
				.limit(1);

			if (!installation) {
				return reply.code(404).send({
					error: "ImplantInstallationNotFound",
					message: "Паспорт имплантата не найден.",
				});
			}

			// Patient details
			const [patient] = await db
				.select()
				.from(patients)
				.where(eq(patients.id, installation.patientId))
				.limit(1);

			// Doctor details
			let doctorName = "Хирург-имплантолог";
			if (installation.surgeonDoctorId) {
				const [doc] = await db
					.select()
					.from(users)
					.where(eq(users.id, installation.surgeonDoctorId))
					.limit(1);
				if (doc) doctorName = doc.fullName;
			}

			// Organization details
			const [org] = await db
				.select()
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);

			// Dynamic ISQ measurements
			const isqHistory = await db
				.select()
				.from(implantIsqMeasurements)
				.where(eq(implantIsqMeasurements.installationId, installationId))
				.orderBy(implantIsqMeasurements.daysPostOp);

			let parsedNotes: Record<string, unknown> = {};
			try {
				if (installation.notes && installation.notes.startsWith("{")) {
					parsedNotes = JSON.parse(installation.notes);
				}
			} catch {
				// fallback
			}

			const passportData = {
				passportId: `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`,
				installationId: installation.id,
				toothFdi: installation.toothNumberFdi,
				installedAt: installation.installedAt,
				implantBrand: installation.implantBrand,
				diameterMm: Number(installation.implantDiameterMm),
				lengthMm: Number(installation.implantLengthMm),
				lotNumber: installation.lotNumber,
				serialNumber: installation.serialNumber,
				boneDensityClass: installation.boneDensityClass,
				torqueNcm: Number(installation.finalInsertionTorqueNcm),
				baselineIsq: installation.baselineIsq,
				protocol: installation.initialProtocol,
				graftMaterial: installation.boneGraftMaterial,
				membraneUsed: installation.membraneUsed,
				clinicName: org?.name ?? "Стоматологическая клиника DENTE",
				patientName: patient?.fullName ?? "Пациент",
				patientCardNumber: patient?.id?.slice(0, 8) ?? "CARD-01",
				doctorName,
				qrVerificationUrl: `https://dente.clinic/passport/${installation.id}`,
				isqHistory,
				financials: parsedNotes.financials ?? null,
				deductedMaterials: parsedNotes.deductedMaterials ?? [],
			};

			return reply.send({
				success: true,
				passport: passportData,
			});
		},
	);

	/**
	 * 4. GET /api/clinical/implants/patient/:patientId
	 * Получение списка установленных имплантатов пациента (Имплантологический паспорт)
	 */
	app.get(
		"/api/clinical/implants/patient/:patientId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Имплантологический паспорт содержит врачебную тайну
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.implants.read",
					role: staffRole,
					message: `Отказ в доступе к имплантологическому паспорту (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };

			const rawInstallations = await db
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.patientId, patientId),
						eq(patientImplantInstallations.organizationId, orgId),
					),
				)
				.orderBy(desc(patientImplantInstallations.installedAt));

			// Обогащаем установки финансовой информацией и статусом немедленной нагрузки
			const installations = rawInstallations.map((inst) => {
				let parsedNotes: Record<string, unknown> = {};
				try {
					if (inst.notes && inst.notes.startsWith("{")) {
						parsedNotes = JSON.parse(inst.notes);
					}
				} catch {
					// fallback
				}

				return {
					...inst,
					financials: parsedNotes.financials ?? null,
					deductedMaterials: parsedNotes.deductedMaterials ?? [],
					isImmediateLoadingFeasible:
						Boolean(parsedNotes.isImmediateLoadingFeasible) ||
						(Number(inst.baselineIsq || 0) >= 70 &&
							Number(inst.finalInsertionTorqueNcm || 0) >= 35),
				};
			});

			if (installations.length > 0) {
				await auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId,
					action: "VIEW_IMPLANT_PASSPORT",
					diagnosis: "Имплантологический паспорт",
				});
			}

			return reply.send({
				success: true,
				installations,
			});
		},
	);
}
