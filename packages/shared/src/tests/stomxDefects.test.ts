import assert from "node:assert";
import { describe, it } from "node:test";
import {
	filterStomxDefectsRequiringTreatment,
	findStomxDefectByAlias,
	findStomxPositionAnomaly,
	getStomxDefectsByCategory,
	isStomxToothHealthy,
	mapCrmToothStateToStomxDefect,
	mapStomxDefectToCrmToothState,
	STOMX_ADULT_TEETH,
	STOMX_ANATOMICAL_SURFACES,
	STOMX_CHILD_TEETH,
	STOMX_DEFECTS_TREE,
	STOMX_POSITION_ANOMALIES,
	STOMX_TOOTH_DEFECTS,
} from "../index.js";

describe("StomX Tooth Defects, Position Anomalies & Dental Anatomy Catalog", () => {
	it("exports complete STOMX_TOOTH_DEFECTS with correct colors, categories and keys", () => {
		assert.ok(STOMX_TOOTH_DEFECTS.length >= 35, "Must contain all catalog defects");

		// 1. Healthy
		const okDefect = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "ok");
		assert.ok(okDefect, "Must contain 'ok' healthy status");
		assert.strictEqual(okDefect.color, "green");
		assert.strictEqual(okDefect.require_treatment, false);
		assert.strictEqual(okDefect.crmToothState, "Healthy");

		// 2. Nosologies requiring treatment
		const caries = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "С");
		assert.ok(caries, "Must contain 'С' (кариес)");
		assert.strictEqual(caries.color, "red");
		assert.strictEqual(caries.require_treatment, true);
		assert.strictEqual(caries.crmToothState, "Caries");

		const pulpitis = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "Р");
		assert.ok(pulpitis, "Must contain 'Р' (пульпит)");
		assert.strictEqual(pulpitis.color, "red");
		assert.strictEqual(pulpitis.crmToothState, "Pulpitis");

		const perio = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "Pt");
		assert.ok(perio, "Must contain 'Pt' (периодонтит)");
		assert.strictEqual(perio.color, "red");
		assert.strictEqual(perio.crmToothState, "Periodontitis");

		const root = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "R");
		assert.ok(root, "Must contain 'R' (корень)");
		assert.strictEqual(root.color, "red");
		assert.strictEqual(root.crmToothState, "Root");

		// 3. Restorations
		const filling = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "П");
		assert.ok(filling, "Must contain 'П' (пломба)");
		assert.strictEqual(filling.color, "yellow");
		assert.strictEqual(filling.crmToothState, "Filled");

		const crown = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "К");
		assert.ok(crown, "Must contain 'К' (коронка)");
		assert.strictEqual(crown.color, "yellow");
		assert.strictEqual(crown.crmToothState, "Crown");

		const implant = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "ИМ");
		assert.ok(implant, "Must contain 'ИМ' (имплантат)");
		assert.strictEqual(implant.color, "yellow");
		assert.strictEqual(implant.crmToothState, "Implant");

		const facet = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "Ф");
		assert.ok(facet, "Must contain 'Ф' (фасетка)");
		assert.strictEqual(facet.color, "yellow");

		const art = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "И");
		assert.ok(art, "Must contain 'И' (искусственный)");
		assert.strictEqual(art.color, "yellow");

		const absent = STOMX_TOOTH_DEFECTS.find((d) => d.alias === "О");
		assert.ok(absent, "Must contain 'О' (отсутствует)");
		assert.strictEqual(absent.crmToothState, "Missing");
	});

	it("exports 10 StomX position anomalies (В, О, Д, М, С, И, Т, Тр, Пр, Рт)", () => {
		assert.strictEqual(STOMX_POSITION_ANOMALIES.length, 10);

		const aliases = STOMX_POSITION_ANOMALIES.map((a) => a.alias);
		assert.deepStrictEqual(aliases, ["В", "О", "Д", "М", "С", "И", "Т", "Тр", "Пр", "Рт"]);

		// Test finding anomalies by code and latin equivalent
		const v = findStomxPositionAnomaly("В");
		assert.ok(v);
		assert.strictEqual(v.name, "вестибулярное");
		assert.strictEqual(v.latinAlias, "V");

		const vLatin = findStomxPositionAnomaly("v");
		assert.ok(vLatin);
		assert.strictEqual(vLatin.alias, "В");

		const t = findStomxPositionAnomaly("Т");
		assert.ok(t);
		assert.strictEqual(t.name, "тортоаномалия");

		const tr = findStomxPositionAnomaly("Тр");
		assert.ok(tr);
		assert.strictEqual(tr.name, "транспозиция");

		const pr = findStomxPositionAnomaly("pr");
		assert.ok(pr);
		assert.strictEqual(pr.alias, "Пр");
	});

	it("finds defects by alias flexibly (cyrillic, latin, synonyms, case-insensitive)", () => {
		// Healthy
		const ok = findStomxDefectByAlias("ok");
		assert.ok(ok);
		assert.strictEqual(ok.alias, "ok");

		const healthy = findStomxDefectByAlias("здоров");
		assert.ok(healthy);
		assert.strictEqual(healthy.alias, "ok");

		// Caries
		const cariesCyr = findStomxDefectByAlias("С");
		assert.ok(cariesCyr);
		assert.strictEqual(cariesCyr.crmToothState, "Caries");

		const cariesLat = findStomxDefectByAlias("c");
		assert.ok(cariesLat);
		assert.strictEqual(cariesLat.crmToothState, "Caries");

		const cariesWord = findStomxDefectByAlias("caries");
		assert.ok(cariesWord);
		assert.strictEqual(cariesWord.crmToothState, "Caries");

		// Pulpitis
		const pulpCyr = findStomxDefectByAlias("Р");
		assert.ok(pulpCyr);
		assert.strictEqual(pulpCyr.crmToothState, "Pulpitis");

		const pulpLat = findStomxDefectByAlias("p");
		assert.ok(pulpLat);
		assert.strictEqual(pulpLat.crmToothState, "Pulpitis");

		// Periodontitis
		const pt = findStomxDefectByAlias("Pt");
		assert.ok(pt);
		assert.strictEqual(pt.crmToothState, "Periodontitis");

		// Parodontitis stages AI..AIII
		const ai = findStomxDefectByAlias("AI");
		assert.ok(ai);
		assert.strictEqual(ai.alias, "AI");
		assert.strictEqual(ai.color, "red");

		const aiii = findStomxDefectByAlias("aiii");
		assert.ok(aiii);
		assert.strictEqual(aiii.alias, "AIII");

		// Restorations
		const pl = findStomxDefectByAlias("pl");
		assert.ok(pl);
		assert.strictEqual(pl.crmToothState, "Filled");

		const crown = findStomxDefectByAlias("crown");
		assert.ok(crown);
		assert.strictEqual(crown.crmToothState, "Crown");

		const implant = findStomxDefectByAlias("implant");
		assert.ok(implant);
		assert.strictEqual(implant.crmToothState, "Implant");

		const facet = findStomxDefectByAlias("фасетка");
		assert.ok(facet);
		assert.strictEqual(facet.alias, "Ф");

		const art = findStomxDefectByAlias("art");
		assert.ok(art);
		assert.strictEqual(art.alias, "И");

		// Gingival recession stages
		const rd1 = findStomxDefectByAlias("Рд1");
		assert.ok(rd1);
		assert.strictEqual(rd1.alias, "Рд1");
		assert.strictEqual(rd1.color, "red");

		const rd4 = findStomxDefectByAlias("рд4");
		assert.ok(rd4);
		assert.strictEqual(rd4.alias, "Рд4");
	});

	it("maps StomX defects to CRM ToothState and vice versa", () => {
		assert.strictEqual(mapStomxDefectToCrmToothState("С"), "Caries");
		assert.strictEqual(mapStomxDefectToCrmToothState("Р"), "Pulpitis");
		assert.strictEqual(mapStomxDefectToCrmToothState("Pt"), "Periodontitis");
		assert.strictEqual(mapStomxDefectToCrmToothState("R"), "Root");
		assert.strictEqual(mapStomxDefectToCrmToothState("П"), "Filled");
		assert.strictEqual(mapStomxDefectToCrmToothState("К"), "Crown");
		assert.strictEqual(mapStomxDefectToCrmToothState("ИМ"), "Implant");
		assert.strictEqual(mapStomxDefectToCrmToothState("О"), "Missing");
		assert.strictEqual(mapStomxDefectToCrmToothState("ok"), "Healthy");
		assert.strictEqual(mapStomxDefectToCrmToothState("Rt"), "Retained");

		const stomxCaries = mapCrmToothStateToStomxDefect("Caries");
		assert.ok(stomxCaries);
		assert.strictEqual(stomxCaries.alias, "С");

		const stomxImplant = mapCrmToothStateToStomxDefect("Implant");
		assert.ok(stomxImplant);
		assert.strictEqual(stomxImplant.alias, "ИМ");
	});

	it("preserves StomX adult (32 teeth) and child (20 teeth) anatomical quadrants", () => {
		assert.strictEqual(STOMX_ADULT_TEETH.length, 32);
		assert.strictEqual(STOMX_CHILD_TEETH.length, 20);

		// Quadrants 1..4 in adult
		const q1Adult = STOMX_ADULT_TEETH.filter((t) => t.quoter === 1);
		const q2Adult = STOMX_ADULT_TEETH.filter((t) => t.quoter === 2);
		const q3Adult = STOMX_ADULT_TEETH.filter((t) => t.quoter === 3);
		const q4Adult = STOMX_ADULT_TEETH.filter((t) => t.quoter === 4);

		assert.strictEqual(q1Adult.length, 8);
		assert.strictEqual(q2Adult.length, 8);
		assert.strictEqual(q3Adult.length, 8);
		assert.strictEqual(q4Adult.length, 8);

		// Quadrants 1..4 in child
		const q1Child = STOMX_CHILD_TEETH.filter((t) => t.quoter === 1);
		assert.strictEqual(q1Child.length, 5);
		assert.deepStrictEqual(
			q1Child.map((t) => t.name),
			["55", "54", "53", "52", "51"],
		);
	});

	it("provides 8 anatomical surfaces (O, M, D, V, L, K, A, I)", () => {
		assert.strictEqual(STOMX_ANATOMICAL_SURFACES.length, 8);
		const codes = STOMX_ANATOMICAL_SURFACES.map((s) => s.code);
		assert.deepStrictEqual(codes, ["O", "M", "D", "V", "L", "K", "A", "I"]);
	});

	it("filters defects requiring treatment and tests tooth health predicate", () => {
		const requiring = filterStomxDefectsRequiringTreatment();
		assert.ok(requiring.length >= 15);
		assert.ok(requiring.every((d) => d.require_treatment === true));

		assert.strictEqual(isStomxToothHealthy([]), true);
		assert.strictEqual(isStomxToothHealthy(["ok"]), true);
		assert.strictEqual(isStomxToothHealthy(["С"]), false);
		assert.strictEqual(isStomxToothHealthy(["Pt", "В"]), false);
	});

	it("preserves hierarchical tree items for parodontitis and recession", () => {
		const perioInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "A");
		assert.ok(perioInTree?.items);
		assert.strictEqual(perioInTree.items.length, 3);
		assert.strictEqual(perioInTree.items[0].alias, "AI");

		const recessionInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "Рд");
		assert.ok(recessionInTree?.items);
		assert.strictEqual(recessionInTree.items.length, 4);
		assert.strictEqual(recessionInTree.items[3].alias, "Рд4");
	});
});
