/**
 * surgeryMaterialBuilder.ts — Layer 1: Assembles surgical material lists for extractions, implants, and sinus-lift.
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";

export interface BuildSurgeryMaterialsOptions {
	category?: string;
	protocolId?: string;
	sutureMaterial?: string;
	hemostatics?: string[];
	graft?: string;
	membrane?: string;
	hasPins?: boolean;
	implantBrand?: string;
	materials?: Array<{ name: string; unit?: string; quantity?: number }>;
}

export function buildSurgeryMaterials(opts: BuildSurgeryMaterialsOptions): UnifiedStockItemDefinition[] {
	if (Array.isArray(opts.materials) && opts.materials.length > 0) {
		return opts.materials.map((m) => ({
			patterns: [m.name.toLowerCase()],
			defaultName: m.name,
			category: "Хирургические материалы",
			unit: m.unit || "шт.",
			qty: Number(m.quantity) > 0 ? Number(m.quantity) : 1,
			defaultCost: "250.00",
		}));
	}

	const list: UnifiedStockItemDefinition[] = [];
	const cat = opts.category || "extraction";
	const isComplex = cat === "sinus_gbr" || opts.protocolId?.includes("complex") || opts.protocolId?.includes("atypical");

	// Anesthetic
	list.push({
		patterns: ["артикаин", "ультракаин", "анестетик"],
		defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)",
		category: "Анестетики",
		unit: "карп.",
		qty: isComplex ? 2 : 1,
		defaultCost: "120.00",
	});

	// Sutures
	const suture = (opts.sutureMaterial || (cat === "implant" ? "Пролен 4-0" : cat === "sinus_gbr" ? "ПГА 4-0" : "Викрил 4-0")).toLowerCase();
	if (suture.includes("викрил") || suture.includes("vicryl")) {
		list.push({ patterns: ["викрил"], defaultName: "Шовный материал Викрил 4-0 с атравматической иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "250.00" });
	} else if (suture.includes("пролен") || suture.includes("prolene")) {
		list.push({ patterns: ["пролен"], defaultName: "Шовный материал Prolene 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "350.00" });
	} else {
		list.push({ patterns: ["пга", "pga"], defaultName: "Шовный материал рассасывающийся ПГА 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" });
	}

	// Hemostatics
	if (opts.hemostatics && opts.hemostatics.length > 0) {
		for (const h of opts.hemostatics) {
			const low = h.toLowerCase();
			if (low.includes("sponge") || low.includes("губка") || low.includes("альвостаз")) {
				list.push({ patterns: ["губка гемостатическая", "альвостаз"], defaultName: "Губка гемостатическая коллагеновая Альвостаз", category: "Хирургические материалы", unit: "шт.", qty: 1, defaultCost: "110.00" });
			} else {
				list.push({ patterns: ["альвожил", "alvogyl"], defaultName: "Антисептический компресс Альвожил (паста/губка)", category: "Хирургические материалы", unit: "доза", qty: 1, defaultCost: "280.00" });
			}
		}
	} else if (cat === "extraction") {
		list.push({ patterns: ["альвожил"], defaultName: "Антисептический компресс Альвожил (паста/губка)", category: "Хирургические материалы", unit: "доза", qty: 1, defaultCost: "280.00" });
		list.push({ patterns: ["марлевые тампоны"], defaultName: "Марлевые тампоны стерильные для лунки", category: "Перевязочные средства", unit: "шт.", qty: 2, defaultCost: "15.00" });
	}

	// Bone graft & Membranes
	if (cat === "sinus_gbr" || opts.graft || opts.membrane) {
		list.push({ patterns: ["bio-oss", "био-осс"], defaultName: "Остеопластический костный материал Geistlich Bio-Oss 0.5 г", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "12500.00" });
		list.push({ patterns: ["bio-gide", "био-гайд"], defaultName: "Мембрана коллагеновая резорбируемая Geistlich Bio-Gide 25x25 мм", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "14500.00" });
		if (opts.hasPins) {
			list.push({ patterns: ["пины"], defaultName: "Пины титановые для фиксации мембран (комплект 2 шт)", category: "Костная пластика", unit: "компл.", qty: 1, defaultCost: "1200.00" });
		}
	}

	// Dental implant
	if (cat === "implant") {
		list.push({ patterns: ["имплантат", "implant"], defaultName: `Дентальный имплантат титановый ${opts.implantBrand || "Dentium"}`, category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "14000.00" });
		list.push({ patterns: ["формировател", "винт-заглушк"], defaultName: "Формирователь десны / винт-заглушка", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "2500.00" });
	}

	return list;
}
