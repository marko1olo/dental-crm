/**
 * clinicalMarketMaterialsCatalog.test.ts — Тесты единого реестра клинических материалов (до 90% рынка РФ/СНГ)
 *
 * Проверяет:
 * 1. 14 имплантационных систем, ранжированных строго по популярности (Osstem #1, Dentium #2, Straumann #3, Nobel #4...)
 * 2. Костные материалы и мембраны (Bio-Oss, Cerabone, Остеоматрикс...)
 * 3. Эндодонтические файлы, силеры (AH Plus #1), ирриганты и временные вложения (Каласепт, Метапекс)
 * 4. Ортодонтические брекет-системы (Damon, Clarity, Empower, Pitts 21...), дуги, элайнеры (3D Smile, FlexiLigner...) и микровинты (Bio-Ray...)
 * 5. Ортопедические А-силиконы, С-силиконы, цементы (RelyX U200, Fuji, Multilink) и ретракционные нити (Ultrapack)
 * 6. Мандат 8d: 100% отсутствие мультяшных эмодзи
 * 7. Поиск и фильтрация по популярности
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_CLINICAL_MARKET_MATERIALS,
	BONE_GRAFT_MEMBRANES_REGISTRY,
	CLINICAL_MATERIAL_DOMAINS,
	ENDODONTIC_MATERIALS_REGISTRY,
	IMPLANT_SYSTEMS_MARKET_REGISTRY,
	ORTHODONTIC_MATERIALS_REGISTRY,
	PROSTHODONTIC_MATERIALS_REGISTRY,
	findClinicalMaterialById,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
} from "../clinical/clinicalMarketMaterialsCatalog.js";

describe("Clinical Market Materials & Consumables Catalog (90% Market Coverage)", () => {
	it("1. ИМПЛАНТАЦИОННЫЕ СИСТЕМЫ: содержит 14 ключевых систем в порядке убывания популярности", () => {
		assert.ok(IMPLANT_SYSTEMS_MARKET_REGISTRY.length >= 14, "Должно быть не менее 14 систем");
		
		// Проверка топ-4 лидеров
		assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[0]?.brandName, "Osstem", "#1 должен быть Osstem");
		assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[0]?.isMarketLeader, true);
		assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[1]?.brandName, "Dentium", "#2 должен быть Dentium");
		assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[2]?.brandName, "Straumann", "#3 должен быть Straumann");
		assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[3]?.brandName, "Nobel Biocare", "#4 должен быть Nobel Biocare");

		// Проверка остальных систем
		const brandNames = IMPLANT_SYSTEMS_MARKET_REGISTRY.map((i) => i.brandName);
		assert.ok(brandNames.includes("MegaGen"), "MegaGen AnyRidge обязан присутствовать");
		assert.ok(brandNames.includes("Astra Tech"), "Astra Tech обязан присутствовать");
		assert.ok(brandNames.includes("Neobiotech"), "Neobiotech обязан присутствовать");
		assert.ok(brandNames.includes("Hi-Tec"), "Hi-Tec обязан присутствовать");
		assert.ok(brandNames.includes("MIS"), "MIS обязан присутствовать");
		assert.ok(brandNames.includes("Alpha-Bio"), "Alpha-Bio обязан присутствовать");
		assert.ok(brandNames.includes("Anthogyr"), "Anthogyr обязан присутствовать");
		assert.ok(brandNames.includes("Ankylos"), "Ankylos обязан присутствовать");
		assert.ok(brandNames.includes("Medentika"), "Medentika обязан присутствовать");
		assert.ok(brandNames.includes("ИРИС"), "Российская система ИРИС обязана присутствовать");

		// Проверка строго монотонного возрастания marketRank
		for (let i = 0; i < IMPLANT_SYSTEMS_MARKET_REGISTRY.length - 1; i++) {
			const current = IMPLANT_SYSTEMS_MARKET_REGISTRY[i]!;
			const next = IMPLANT_SYSTEMS_MARKET_REGISTRY[i + 1]!;
			assert.ok(current.marketRank <= next.marketRank, "Ранги популярности должны идти строго по возрастанию");
		}
	});

	it("2. КОСТНЫЕ МАТЕРИАЛЫ И МЕМБРАНЫ: содержит золотой стандарт и альтернативы", () => {
		const names = BONE_GRAFT_MEMBRANES_REGISTRY.map((m) => m.nameRu);
		assert.ok(names.some((n) => n.includes("Bio-Oss")), "Bio-Oss обязан быть в реестре");
		assert.ok(names.some((n) => n.includes("Bio-Gide")), "Bio-Gide мембрана обязана быть в реестре");
		assert.ok(names.some((n) => n.includes("Cerabone")), "Cerabone обязан быть в реестре");
		assert.ok(names.some((n) => n.includes("Остеоматрикс")), "Остеоматрикс обязан быть в реестре");
		assert.ok(names.some((n) => n.includes("Коллапол")), "Коллапол обязан быть в реестре");
		assert.ok(names.some((n) => n.includes("Остеодент")), "Остеодент обязан быть в реестре");
		assert.ok(names.some((n) => n.includes("Титановые")), "Титановые сетки и пины обязаны быть в реестре");
	});

	it("3. ЭНДОДОНТИЯ: файлы, силеры, ирригация и временные вложения", () => {
		const files = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_file");
		assert.ok(files.some((f) => f.nameRu.includes("ProTaper")), "ProTaper Gold обязан быть первым");
		assert.ok(files.some((f) => f.nameRu.includes("SOCO")), "SOCO SC Pro обязан присутствовать");
		assert.ok(files.some((f) => f.nameRu.includes("WaveOne")), "WaveOne Gold обязан присутствовать");
		assert.ok(files.some((f) => f.nameRu.includes("Reciproc")), "Reciproc Blue обязан присутствовать");
		assert.ok(files.some((f) => f.nameRu.includes("M-Two")), "M-Two обязан присутствовать");

		const sealers = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_sealer");
		assert.equal(sealers[0]?.brandName, "AH Plus", "AH Plus — топ-1 золотой стандарт");
		assert.ok(sealers.some((s) => s.nameRu.includes("2Seal")), "2Seal обязан присутствовать");
		assert.ok(sealers.some((s) => s.nameRu.includes("Bio-C Sealer") || s.nameRu.includes("TotalFill")), "Биокерамика обязана присутствовать");

		const irr = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_irrigation");
		assert.ok(irr.some((i) => i.nameRu.includes("Гипохлорит")), "NaOCl обязан присутствовать");
		assert.ok(irr.some((i) => i.nameRu.includes("ЭДТА")), "EDTA 17% обязан присутствовать");
		assert.ok(irr.some((i) => i.nameRu.includes("Хлоргексидин")), "Хлоргексидин 2% обязан присутствовать");

		const dress = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_dressing");
		assert.ok(dress.some((d) => d.nameRu.includes("Каласепт")), "Каласепт обязан присутствовать");
		assert.ok(dress.some((d) => d.nameRu.includes("Метапекс")), "Метапекс с йодоформом обязан присутствовать");
		assert.ok(dress.some((d) => d.nameRu.includes("Кальцикур")), "Кальцикур обязан присутствовать");
	});

	it("4. ОРТОДОНТИЯ: брекеты, дуги, элайнеры и микровинты", () => {
		const brackets = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_bracket");
		assert.ok(brackets.some((b) => b.nameRu.includes("Damon Q2")), "Damon Q2 обязан быть лидером");
		assert.ok(brackets.some((b) => b.nameRu.includes("Clarity")), "3M Clarity Advanced обязан присутствовать");
		assert.ok(brackets.some((b) => b.nameRu.includes("Empower")), "Empower обязан присутствовать");
		assert.ok(brackets.some((b) => b.nameRu.includes("Pitts 21")), "Pitts 21 обязан присутствовать");
		assert.ok(brackets.some((b) => b.nameRu.includes("H4")), "H4 обязан присутствовать");

		const aligners = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_aligner");
		assert.ok(aligners.some((a) => a.nameRu.includes("3D Smile")), "3D Smile обязан быть лидером рынка РФ");
		assert.ok(aligners.some((a) => a.nameRu.includes("FlexiLigner")), "FlexiLigner обязан присутствовать");
		assert.ok(aligners.some((a) => a.nameRu.includes("Spark")), "Spark обязан присутствовать");
		assert.ok(aligners.some((a) => a.nameRu.includes("Eurokappa")), "Eurokappa обязан присутствовать");
		assert.ok(aligners.some((a) => a.nameRu.includes("Invisalign")), "Invisalign обязан присутствовать");

		const screws = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_miniscrew");
		assert.ok(screws.some((s) => s.nameRu.includes("Bio-Ray")), "Bio-Ray минивинты обязаны быть");
		assert.ok(screws.some((s) => s.nameRu.includes("VectorTAS")), "VectorTAS обязан быть");
		assert.ok(screws.some((s) => s.nameRu.includes("AbsoAnchor")), "AbsoAnchor обязан быть");
	});

	it("5. ОРТОПЕДИЯ: А-силиконы, С-силиконы, цементы и ретракция", () => {
		const asil = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_a_silicone");
		assert.ok(asil.some((s) => s.nameRu.includes("Express XT") || s.nameRu.includes("Imprint")), "Express XT/Imprint обязан быть");
		assert.ok(asil.some((s) => s.nameRu.includes("Elite HD+")), "Elite HD+ обязан присутствовать");
		assert.ok(asil.some((s) => s.nameRu.includes("Variotime")), "Variotime обязан присутствовать");
		assert.ok(asil.some((s) => s.nameRu.includes("Honigum")), "Honigum обязан присутствовать");

		const csil = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_c_silicone");
		assert.ok(csil.some((s) => s.nameRu.includes("Zetaplus")), "Zetaplus обязан быть лидером С-силиконов");
		assert.ok(csil.some((s) => s.nameRu.includes("Speedex")), "Speedex обязан присутствовать");

		const cements = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_cement_perm");
		assert.ok(cements.some((c) => c.nameRu.includes("RelyX")), "RelyX U200 обязан быть #1");
		assert.ok(cements.some((c) => c.nameRu.includes("Fuji")), "Fuji I/Plus обязан присутствовать");
		assert.ok(cements.some((c) => c.nameRu.includes("Multilink") || c.nameRu.includes("SpeedCEM")), "Multilink обязан присутствовать");
		assert.ok(cements.some((c) => c.nameRu.includes("Panavia")), "Panavia V5 обязана присутствовать");

		const cords = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_retraction");
		assert.ok(cords.some((c) => c.nameRu.includes("Ultrapack")), "Ultrapack #000, #00, #0, #1 обязан быть");
	});

	it("6. МАНДАТ 8d: 100% отсутствие мультяшных эмодзи во всех полях каталогов", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const item of ALL_CLINICAL_MARKET_MATERIALS) {
			assert.ok(!emojiRegex.test(item.nameRu), `Эмодзи найден в nameRu: ${item.nameRu}`);
			assert.ok(!emojiRegex.test(item.descriptionRu), `Эмодзи найден в descriptionRu: ${item.nameRu}`);
			assert.ok(!emojiRegex.test(item.clinicalIndicationsRu), `Эмодзи найден в clinicalIndicationsRu: ${item.nameRu}`);
		}
	});

	it("7. Поиск и функции выборки топа популярных материалов (Мандат 8e Doctor Autonomy)", () => {
		const osstemSearch = searchClinicalMaterials("osstem");
		assert.ok(osstemSearch.length >= 1, "Поиск по osstem должен находить");
		assert.equal(osstemSearch[0]?.id, "implant_osstem");

		const topImplants = getTopPopularMaterials("implant_system", 3);
		assert.equal(topImplants.length, 3);
		assert.equal(topImplants[0]?.brandName, "Osstem");
		assert.equal(topImplants[1]?.brandName, "Dentium");
		assert.equal(topImplants[2]?.brandName, "Straumann");

		const byId = findClinicalMaterialById("bone_bio_oss");
		assert.ok(byId);
		assert.equal(byId?.brandName, "Bio-Oss");
	});
});
