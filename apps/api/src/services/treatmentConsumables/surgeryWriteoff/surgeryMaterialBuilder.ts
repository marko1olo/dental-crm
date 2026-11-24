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

	// Sutures: простое щипцовое удаление не требует наложения швов
	const sutureOption = opts.sutureMaterial?.toLowerCase() || "";
	const isSutureExcluded = sutureOption === "none" || sutureOption.includes("без швов") || sutureOption.includes("без ушивания");
	const isPreservation = opts.protocolId?.includes("preservation") || opts.protocolId?.includes("конус");
	const shouldDeductSuture =
		!isSutureExcluded &&
		(Boolean(opts.sutureMaterial) ||
			cat === "implant" ||
			cat === "sinus_gbr" ||
			cat === "perio_surgery" ||
			isComplex ||
			isPreservation ||
			opts.hemostatics?.some((h) => h.toLowerCase().includes("suture") || h.toLowerCase().includes("шов")));

	if (shouldDeductSuture) {
		const suture = (opts.sutureMaterial || (cat === "implant" ? "Пролен 4-0" : cat === "sinus_gbr" ? "ПГА 4-0" : cat === "perio_surgery" ? "Пролен 6-0" : "Викрил 4-0")).toLowerCase();
		if (suture.includes("пролен") || suture.includes("prolene")) {
			const isMicro = suture.includes("6-0") || suture.includes("7-0");
			const defaultName = isMicro
				? "Шовный материал Prolene 6-0 с микрохирургической иглой"
				: "Шовный материал Prolene 4-0 с иглой";
			const defaultCost = isMicro ? "450.00" : "350.00";
			list.push({ patterns: ["пролен", "prolene"], defaultName, category: "Шовный материал", unit: "шт.", qty: 1, defaultCost });
		} else if (suture.includes("викрил") || suture.includes("vicryl")) {
			list.push({ patterns: ["викрил", "vicryl"], defaultName: "Шовный материал Викрил 4-0 с атравматической иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "250.00" });
		} else {
			list.push({ patterns: ["пга", "pga"], defaultName: "Шовный материал рассасывающийся ПГА 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" });
		}
	}

	// Hemostatics & Socket Management: дифференцированное списание губки, конуса Parasorb, Альвожиля и тампонов
	const isAlveolitis = opts.protocolId?.includes("alveolit") || (opts.category === "emergency" && opts.protocolId?.includes("alveolit"));

	if (opts.hemostatics && opts.hemostatics.length > 0) {
		for (const h of opts.hemostatics) {
			const low = h.toLowerCase();
			if (low.includes("cone") || low.includes("конус") || low.includes("parasorb")) {
				list.push({
					patterns: ["коллагеновый конус", "parasorb", "конус"],
					defaultName: "Коллагеновый конус Parasorb Cone",
					category: "Хирургические материалы",
					unit: "шт.",
					qty: 1,
					defaultCost: "1600.00",
				});
			} else if (low.includes("sponge") || low.includes("губка") || low.includes("альвостаз") || low.includes("гемогубка")) {
				list.push({
					patterns: ["губка гемостатическая", "альвостаз"],
					defaultName: "Губка гемостатическая коллагеновая Альвостаз",
					category: "Хирургические материалы",
					unit: "доза",
					qty: 1,
					defaultCost: "110.00",
				});
			} else if (low.includes("tampon") || low.includes("тампон") || low.includes("шарик") || low.includes("марл")) {
				list.push({
					patterns: ["марлевые тампоны", "тампон"],
					defaultName: "Марлевые тампоны стерильные для лунки",
					category: "Перевязочные средства",
					unit: "шт.",
					qty: 2,
					defaultCost: "15.00",
				});
			} else if (low.includes("альвожил") || low.includes("alvogyl") || low.includes("паста")) {
				list.push({
					patterns: ["альвожил", "alvogyl"],
					defaultName: "Антисептический компресс Альвожил (паста/губка)",
					category: "Хирургические материалы",
					unit: "доза",
					qty: 1,
					defaultCost: "280.00",
				});
			}
		}
	} else if (isPreservation) {
		list.push({
			patterns: ["коллагеновый конус", "parasorb", "конус"],
			defaultName: "Коллагеновый конус Parasorb Cone",
			category: "Хирургические материалы",
			unit: "шт.",
			qty: 1,
			defaultCost: "1600.00",
		});
		list.push({
			patterns: ["марлевые тампоны", "тампон"],
			defaultName: "Марлевые тампоны стерильные для лунки",
			category: "Перевязочные средства",
			unit: "шт.",
			qty: 2,
			defaultCost: "15.00",
		});
	} else if (isAlveolitis) {
		list.push({
			patterns: ["альвожил", "alvogyl"],
			defaultName: "Антисептический компресс Альвожил (паста/губка)",
			category: "Хирургические материалы",
			unit: "доза",
			qty: 1,
			defaultCost: "280.00",
		});
		list.push({
			patterns: ["марлевые тампоны", "тампон"],
			defaultName: "Марлевые тампоны стерильные для лунки",
			category: "Перевязочные средства",
			unit: "шт.",
			qty: 2,
			defaultCost: "15.00",
		});
	} else if (cat === "extraction") {
		list.push({
			patterns: ["губка гемостатическая", "альвостаз"],
			defaultName: "Губка гемостатическая коллагеновая Альвостаз",
			category: "Хирургические материалы",
			unit: "доза",
			qty: 1,
			defaultCost: "110.00",
		});
		list.push({
			patterns: ["марлевые тампоны", "тампон"],
			defaultName: "Марлевые тампоны стерильные для лунки",
			category: "Перевязочные средства",
			unit: "шт.",
			qty: 2,
			defaultCost: "15.00",
		});
	}

	// Bone graft (учитываем реальный выбор врача: Cerabone, SureOss, Аутокость, Bio-Oss)
	const isClosedSinus = opts.protocolId === "surgery_sinus_lift_closed";
	const graftLower = opts.graft?.toLowerCase() || "";
	const isGraftExcluded = graftLower === "none" || graftLower.includes("без графта");

	if ((cat === "sinus_gbr" || opts.graft) && !isGraftExcluded) {
		if (graftLower.includes("cerabone") || graftLower.includes("церабон")) {
			list.push({
				patterns: ["cerabone", "церабон"],
				defaultName: "Костный графт Botiss Cerabone гранулят 0.5 г",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "7800.00",
			});
		} else if (graftLower.includes("sureoss") || graftLower.includes("шуросс") || graftLower.includes("аллографт")) {
			list.push({
				patterns: ["sureoss", "шуросс", "аллографт"],
				defaultName: "Костный аллографт SureOss HansBiomed 0.5 см³",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "8900.00",
			});
		} else if (graftLower.includes("аутокость") || graftLower.includes("autograft") || graftLower.includes("скребок")) {
			list.push({
				patterns: ["костный скребок", "аутокость", "safescraper", "micross"],
				defaultName: "Одноразовый костный скребок для забора аутокости",
				category: "Хирургические инструменты",
				unit: "шт.",
				qty: 1,
				defaultCost: "3200.00",
			});
		} else {
			list.push({
				patterns: ["bio-oss", "био-осс"],
				defaultName: "Остеопластический костный материал Geistlich Bio-Oss 0.5 г",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "12500.00",
			});
		}
	}

	// Barrier membranes (SEV-2: если «Без мембраны», 'none' или закрытый синус без мембраны — НЕ списывать Bio-Gide 25 за 14 500 ₽)
	const membraneLower = opts.membrane?.toLowerCase() || "";
	const isMembraneExcluded =
		membraneLower === "none" ||
		membraneLower.includes("без мембраны") ||
		(isClosedSinus && !opts.membrane);

	const shouldDeductMembrane =
		!isMembraneExcluded && (Boolean(opts.membrane) || (cat === "sinus_gbr" && !isClosedSinus));

	if (shouldDeductMembrane) {
		if (membraneLower.includes("jason") || membraneLower.includes("джейсон")) {
			list.push({
				patterns: ["jason", "джейсон"],
				defaultName: "Мембрана коллагеновая перикардиальная Botiss Jason 15x20 мм",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "11200.00",
			});
		} else if (membraneLower.includes("cytoplast") || membraneLower.includes("цитопласт") || membraneLower.includes("ptfe")) {
			list.push({
				patterns: ["cytoplast", "цитопласт", "ptfe"],
				defaultName: "Мембрана нерезорбируемая PTFE Osteogenics Cytoplast TXT-200",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "9500.00",
			});
		} else {
			list.push({
				patterns: ["bio-gide", "био-гайд"],
				defaultName: "Мембрана коллагеновая резорбируемая Geistlich Bio-Gide 25x25 мм",
				category: "Костная пластика",
				unit: "шт.",
				qty: 1,
				defaultCost: "14500.00",
			});
		}

		if (opts.hasPins) {
			list.push({
				patterns: ["пины"],
				defaultName: "Пины титановые для фиксации мембран (комплект 2 шт)",
				category: "Костная пластика",
				unit: "компл.",
				qty: 1,
				defaultCost: "1200.00",
			});
		}
	}

	// Perio surgery & Mucogingival soft tissue instruments
	if (cat === "perio_surgery") {
		const isSoftTissueGraft =
			opts.protocolId?.includes("ctg") ||
			opts.protocolId?.includes("fgg") ||
			opts.protocolId?.includes("caf") ||
			opts.protocolId?.includes("mucogingival") ||
			opts.protocolId?.includes("recession");

		if (isSoftTissueGraft) {
			list.push({
				patterns: ["лезвие 15c", "скальпель 15c"],
				defaultName: "Лезвие скальпеля стерильное микрохирургическое #15C",
				category: "Хирургические инструменты",
				unit: "шт.",
				qty: 1,
				defaultCost: "150.00",
			});
		}
	}

	// Emergency surgery (периостотомия с дренажом)
	if (cat === "emergency") {
		list.push({
			patterns: ["дренаж", "выпускник"],
			defaultName: "Резиновый ленточный выпускник стерильный",
			category: "Хирургические материалы",
			unit: "шт.",
			qty: 1,
			defaultCost: "90.00",
		});
	}

	// Dental implant
	if (cat === "implant") {
		list.push({ patterns: ["имплантат", "implant"], defaultName: `Дентальный имплантат титановый ${opts.implantBrand || "Dentium"}`, category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "14000.00" });
		list.push({ patterns: ["формировател", "винт-заглушк"], defaultName: "Формирователь десны / винт-заглушка", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "2500.00" });
	}

	return list;
}
