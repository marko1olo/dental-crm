import { describe, expect, it } from "vitest";
import {
	mapSurfaceKeywords,
	mapVoiceStatusToToothState,
	parseVoiceChairsideCommand,
} from "../voiceChairsideSterileEngine";

describe("voiceChairsideSterileEngine", () => {
	it("maps Russian spoken dental states to canonical ToothState enum", () => {
		expect(mapVoiceStatusToToothState("кариес эмали")).toBe("Caries");
		expect(mapVoiceStatusToToothState("острый пульпит")).toBe("Pulpitis");
		expect(mapVoiceStatusToToothState("хронический периодонтит")).toBe("Periodontitis");
		expect(mapVoiceStatusToToothState("световая пломба")).toBe("Filled");
		expect(mapVoiceStatusToToothState("циркониевая коронка")).toBe("Crown");
		expect(mapVoiceStatusToToothState("дентальный имплант")).toBe("Implant");
		expect(mapVoiceStatusToToothState("удален по ортодонтическим показаниям")).toBe("Missing");
		expect(mapVoiceStatusToToothState("интактный зуб норма")).toBe("Healthy");
	});

	it("extracts dental anatomical surface codes from spoken keywords", () => {
		expect(mapSurfaceKeywords("жевательная поверхность")).toEqual(["O"]);
		expect(mapSurfaceKeywords("окклюзионно медиальная")).toEqual(["O", "M"]);
		expect(mapSurfaceKeywords("дистально вестибулярная щечная")).toEqual(["D", "V"]);
		expect(mapSurfaceKeywords("небная поверхность")).toEqual(["L"]);
	});

	it("parses single tooth caries voice command with surface", () => {
		const res = parseVoiceChairsideCommand("Зуб сорок шесть кариес жевательная поверхность");
		expect(res.hasActions).toBe(true);
		expect(res.teethActions.length).toBe(1);
		const firstTooth = res.teethActions[0];
		expect(firstTooth).toBeDefined();
		expect(firstTooth?.toothNumber).toBe(46);
		expect(firstTooth?.state).toBe("Caries");
		expect(firstTooth?.surfaces).toContain("O");
	});

	it("parses tooth extraction / missing state", () => {
		const res = parseVoiceChairsideCommand("Зуб 38 удален");
		expect(res.hasActions).toBe(true);
		expect(res.teethActions.length).toBe(1);
		const firstTooth = res.teethActions[0];
		expect(firstTooth).toBeDefined();
		expect(firstTooth?.toothNumber).toBe(38);
		expect(firstTooth?.state).toBe("Missing");
	});

	it("parses anesthesia dosage and cartridges", () => {
		const res = parseVoiceChairsideCommand("Анестезия ультракаин один карпул");
		expect(res.hasActions).toBe(true);
		expect(res.anesthesiaAction).not.toBeNull();
		expect(res.anesthesiaAction?.cartridges).toBe(1);
		expect(res.diaryActions.some((d) => d.section === "anesthesia")).toBe(true);
	});

	it("parses patient complaints into SOAP subjective section", () => {
		const res = parseVoiceChairsideCommand("Жалобы на самопроизвольные ночные боли внизу справа");
		expect(res.hasActions).toBe(true);
		expect(res.diaryActions.some((d) => d.section === "complaints")).toBe(true);
	});

	it("handles empty or irrelevant strings gracefully", () => {
		const res = parseVoiceChairsideCommand("  ");
		expect(res.hasActions).toBe(false);
		expect(res.teethActions).toHaveLength(0);
		expect(res.anesthesiaAction).toBeNull();
	});
});
