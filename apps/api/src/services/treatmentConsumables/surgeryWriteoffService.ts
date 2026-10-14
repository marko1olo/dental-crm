/**
 * surgeryWriteoffService.ts — Layer 2: 1-click surgical materials quick write-offs.
 * Supports extractions, dental implants, sinus-lift, and GBR bone grafting with Soft Overdraft (Mandates 8e, 8k, 8n).
 * Guarantees chairside operations never get blocked by inventory delays.
 */

import { and, eq, inArray } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../db/schema.js";
import type { DbExecutor } from "./types.js";

export interface QuickWriteoffSurgeryParams {
	organizationId: string;
	category?: "extraction" | "implant" | "sinus_gbr" | "perio_surgery" | string;
	protocolId?: string;
	operationTitle?: string;
	toothNumber?: string | number;
	visitId?: string | null;
	userId?: string | null;
	notes?: string | null;
	sutureMaterial?: string;
	hemostatics?: string[];
	graft?: string;
	membrane?: string;
	hasPins?: boolean;
	implantBrand?: string;
	materials?: Array<{
		name: string;
		unit?: string;
		quantity?: number;
		isWarehouseCritical?: boolean;
	}>;
}

export interface QuickWriteoffSurgeryResult {
	success: boolean;
	isOverdraft: boolean;
	warning?: string;
	deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}>;
	warnings: string[];
	message: string;
}

interface SurgeryMaterialDefinition {
	patterns: string[];
	defaultName: string;
	category: string;
	unit: string;
	qty: number;
	defaultCost: string;
}

export async function quickWriteoffSurgery(
	tx: DbExecutor,
	params: QuickWriteoffSurgeryParams,
): Promise<QuickWriteoffSurgeryResult> {
	const {
		organizationId,
		category = "extraction",
		protocolId,
		operationTitle,
		toothNumber,
		visitId = null,
		userId = null,
		notes = null,
		sutureMaterial,
		hemostatics = [],
		graft,
		membrane,
		hasPins,
		materials,
	} = params;

	const targetMaterials: SurgeryMaterialDefinition[] = [];

	// 1. If explicit materials array is provided, use them directly
	if (Array.isArray(materials) && materials.length > 0) {
		for (const m of materials) {
			targetMaterials.push({
				patterns: [m.name.toLowerCase()],
				defaultName: m.name,
				category: "Хирургические материалы",
				unit: m.unit || "шт.",
				qty: Number(m.quantity) > 0 ? Number(m.quantity) : 1,
				defaultCost: "250.00",
			});
		}
	} else {
		// 2. Dynamic surgical specification assembly based on clinical protocol

		// Anesthetic (base for all surgeries)
		targetMaterials.push({
			patterns: ["артикаин", "ультракаин", "анестетик"],
			defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)",
			category: "Анестетики",
			unit: "карп.",
			qty: category === "sinus_gbr" || protocolId?.includes("complex") || protocolId?.includes("atypical") ? 2 : 1,
			defaultCost: "120.00",
		});

		// Sutures
		const sutureName = sutureMaterial || (category === "implant" ? "Пролен 4-0" : category === "sinus_gbr" ? "ПГА 4-0" : "Викрил 4-0");
		if (sutureName.includes("Викрил") || sutureName.toLowerCase().includes("vicryl")) {
			targetMaterials.push({
				patterns: ["викрил", "vicryl"],
				defaultName: "Шовный материал Викрил 4-0 с атравматической иглой",
				category: "Шовный материал",
				unit: "шт.",
				qty: 1,
				defaultCost: "250.00",
			});
		} else if (sutureName.includes("Монофиламент") || sutureName.toLowerCase().includes("monofilament")) {
			targetMaterials.push({
				patterns: ["монофиламент", "ptfe"],
				defaultName: "Шовный материал монофиламентный PTFE / Пролен 5-0",
				category: "Шовный материал",
				unit: "шт.",
				qty: 1,
				defaultCost: "340.00",
			});
		} else if (sutureName.includes("Шелк") || sutureName.toLowerCase().includes("silk")) {
			targetMaterials.push({
				patterns: ["шелк", "silk"],
				defaultName: "Шовный материал шелк плетеный 3-0 с иглой",
				category: "Шовный материал",
				unit: "шт.",
				qty: 1,
				defaultCost: "190.00",
			});
		} else if (sutureName.includes("Пролен") || sutureName.toLowerCase().includes("prolene")) {
			targetMaterials.push({
				patterns: ["пролен", "prolene"],
				defaultName: "Шовный материал Prolene 4-0 с иглой",
				category: "Шовный материал",
				unit: "шт.",
				qty: 1,
				defaultCost: "350.00",
			});
		} else {
			targetMaterials.push({
				patterns: ["пга", "полигликолид", "pga"],
				defaultName: "Шовный материал рассасывающийся ПГА 4-0 с иглой",
				category: "Шовный материал",
				unit: "шт.",
				qty: 1,
				defaultCost: "220.00",
			});
		}

		// Hemostatics
		if (hemostatics.length > 0) {
			for (const h of hemostatics) {
				const low = h.toLowerCase();
				if (low.includes("alvogyl") || low.includes("альвожил") || low.includes("альвожиль")) {
					targetMaterials.push({
						patterns: ["альвожил", "alvogyl", "альвожиль"],
						defaultName: "Антисептический компресс Альвожил (паста/губка)",
						category: "Хирургические материалы",
						unit: "доза",
						qty: 1,
						defaultCost: "280.00",
					});
				} else if (low.includes("sponge") || low.includes("губка") || low.includes("альвостаз")) {
					targetMaterials.push({
						patterns: ["губка гемостатическая", "коллагеновая губка", "альвостаз"],
						defaultName: "Губка гемостатическая коллагеновая Альвостаз",
						category: "Хирургические материалы",
						unit: "шт.",
						qty: 1,
						defaultCost: "110.00",
					});
				} else if (low.includes("spongostan") || low.includes("спонгостан")) {
					targetMaterials.push({
						patterns: ["спонгостан", "spongostan"],
						defaultName: "Гемостатическая губка Спонгостан (Spongostan Dental)",
						category: "Хирургические материалы",
						unit: "шт.",
						qty: 1,
						defaultCost: "160.00",
					});
				} else if (low.includes("tampon") || low.includes("тампон")) {
					targetMaterials.push({
						patterns: ["марлевые тампоны", "тампон марлевый"],
						defaultName: "Марлевые тампоны стерильные для лунки",
						category: "Перевязочные средства",
						unit: "шт.",
						qty: 2,
						defaultCost: "15.00",
					});
				}
			}
		} else if (category === "extraction") {
			// Default extraction hemostasis
			targetMaterials.push({
				patterns: ["альвожил", "alvogyl"],
				defaultName: "Антисептический компресс Альвожил (паста/губка)",
				category: "Хирургические материалы",
				unit: "доза",
				qty: 1,
				defaultCost: "280.00",
			});
			targetMaterials.push({
				patterns: ["марлевые тампоны"],
				defaultName: "Марлевые тампоны стерильные для лунки",
				category: "Перевязочные средства",
				unit: "шт.",
				qty: 2,
				defaultCost: "15.00",
			});
		}

		// Bone graft & Membranes (sinus_gbr or complex bone surgery)
		if (category === "sinus_gbr" || graft || membrane) {
			const graftStr = (graft || "Bio-Oss 0.5 г").toLowerCase();
			if (graftStr.includes("cerabone") || graftStr.includes("церабон")) {
				targetMaterials.push({
					patterns: ["cerabone", "церабон"],
					defaultName: "Остеопластический графт Cerabone 0.5 г",
					category: "Костная пластика",
					unit: "шт.",
					qty: 1,
					defaultCost: "11800.00",
				});
			} else if (graftStr.includes("sureoss") || graftStr.includes("шуреосс")) {
				targetMaterials.push({
					patterns: ["sureoss", "шуреосс"],
					defaultName: "Остеопластический аллографт SureOss 0.5 см3",
					category: "Костная пластика",
					unit: "шт.",
					qty: 1,
					defaultCost: "9500.00",
				});
			} else {
				targetMaterials.push({
					patterns: ["bio-oss", "био-осс"],
					defaultName: "Остеопластический костный материал Geistlich Bio-Oss 0.5 г",
					category: "Костная пластика",
					unit: "шт.",
					qty: 1,
					defaultCost: "12500.00",
				});
			}

			// Barrier membrane
			const membStr = (membrane || "Bio-Gide 25x25 мм").toLowerCase();
			if (!membStr.includes("без мембраны")) {
				if (membStr.includes("jason")) {
					targetMaterials.push({
						patterns: ["jason"],
						defaultName: "Барьерная мембрана Jason нативная перикардиальная",
						category: "Костная пластика",
						unit: "шт.",
						qty: 1,
						defaultCost: "13500.00",
					});
				} else if (membStr.includes("cytoplast")) {
					targetMaterials.push({
						patterns: ["cytoplast"],
						defaultName: "Мембрана нерезорбируемая титаново-усиленная Cytoplast d-PTFE",
						category: "Костная пластика",
						unit: "шт.",
						qty: 1,
						defaultCost: "16000.00",
					});
				} else {
					targetMaterials.push({
						patterns: ["bio-gide", "био-гайд"],
						defaultName: "Мембрана коллагеновая резорбируемая Geistlich Bio-Gide 25x25 мм",
						category: "Костная пластика",
						unit: "шт.",
						qty: 1,
						defaultCost: "14500.00",
					});
				}
			}

			// Titanium pins
			if (hasPins) {
				targetMaterials.push({
					patterns: ["пины", "пин титановый", "titanium pin"],
					defaultName: "Пины титановые для фиксации мембран (комплект 2 шт)",
					category: "Костная пластика",
					unit: "компл.",
					qty: 1,
					defaultCost: "1200.00",
				});
			}
		}

		// Dental implant
		if (category === "implant") {
			targetMaterials.push({
				patterns: ["имплантат", "implant", "дентальный"],
				defaultName: `Дентальный имплантат титановый ${params.implantBrand || "Dentium"}`,
				category: "Имплантология",
				unit: "шт.",
				qty: 1,
				defaultCost: "14000.00",
			});
			targetMaterials.push({
				patterns: ["формировател", "винт-заглушк"],
				defaultName: "Формирователь десны / винт-заглушка",
				category: "Имплантология",
				unit: "шт.",
				qty: 1,
				defaultCost: "2500.00",
			});
		}
	}

	// 3. Find or auto-create inventory items in DB
	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolvedItems: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
	}> = [];

	for (const def of targetMaterials) {
		let matched = allOrgItems.find((inv) =>
			def.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
		);

		if (!matched) {
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: def.defaultName,
					category: def.category,
					unit: def.unit,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "5",
					unitCostRub: def.defaultCost,
				})
				.returning();
			if (created) {
				matched = created;
				allOrgItems.push(created);
			}
		}

		if (matched) {
			resolvedItems.push({ item: matched, qty: def.qty });
		}
	}

	// 4. Lock rows FOR UPDATE in sorted order (deadlock-free)
	const sortedIds = resolvedItems.map((r) => r.item.id).sort();
	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const lockedMap = new Map(lockedRows.map((r) => [r.id, r]));
	const deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}> = [];
	const warnings: string[] = [];
	const txRows: Array<typeof inventoryTransactions.$inferInsert> = [];

	const opTitle = operationTitle || (
		category === "extraction"
			? "Удаление зуба"
			: category === "sinus_gbr"
				? "Синус-лифтинг и НКР"
				: category === "implant"
					? "Дентальная имплантация"
					: "Хирургическая операция"
	);
	const toothSuffix = toothNumber ? ` (зуб FDI #${toothNumber})` : "";

	for (const target of resolvedItems) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - target.qty).toFixed(4));
		const isOverdraft = newStock < 0;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		txRows.push({
			organizationId,
			visitId: visitId ?? null,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "surgery_quick_writeoff",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию у кресла, требуется оприходование («${opTitle}»${toothSuffix}: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes || `Списание материалов операции «${opTitle}»${toothSuffix} (1 клик, без комиссии)`),
		});

		if (isOverdraft) {
			warnings.push(
				`Позиция «${inv.name}»: списано под операцию у кресла, требуется оприходование (остаток: ${newStock} ${inv.unit ?? "ед."}).`,
			);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit ?? "шт.",
			remainingStock: newStock,
			isOverdraft,
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	const anyOverdraft = deductedItems.some((i) => i.isOverdraft);
	return {
		success: true,
		isOverdraft: anyOverdraft,
		...(anyOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems,
		warnings,
		message: anyOverdraft
			? `Списано ${deductedItems.length} поз. под операцию «${opTitle}»${toothSuffix} в мягкий овердрафт склада без комиссии и блокировки врача.`
			: `Материалы операции «${opTitle}»${toothSuffix} (${deductedItems.length} поз.) успешно списаны со склада.`,
	};
}
