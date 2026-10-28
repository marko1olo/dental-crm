import { describe, expect, it, vi } from "vitest";
import {
	dispatchSterileVoiceActions,
	insertTextIntoActiveInput,
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

	it("insertTextIntoActiveInput inserts text into active textarea with event dispatch", () => {
		const originalDoc = globalThis.document;
		let inputFired = false;
		let changeFired = false;

		const mockTextarea: any = {
			tagName: "TEXTAREA",
			value: "Ранее запломбирован.",
			selectionStart: 20,
			selectionEnd: 20,
			setSelectionRange(start: number, end: number) {
				this.selectionStart = start;
				this.selectionEnd = end;
			},
			dispatchEvent(e: any) {
				if (e.type === "input") inputFired = true;
				if (e.type === "change") changeFired = true;
				return true;
			},
		};

		globalThis.document = {
			activeElement: mockTextarea,
		} as any;

		try {
			const success = insertTextIntoActiveInput("Жалобы на боли от горячего.");
			expect(success).toBe(true);
			expect(mockTextarea.value).toBe("Ранее запломбирован. Жалобы на боли от горячего.");
			expect(inputFired).toBe(true);
			expect(changeFired).toBe(true);
		} finally {
			globalThis.document = originalDoc;
		}
	});

	it("insertTextIntoActiveInput returns false when no input is focused", () => {
		const originalDoc = globalThis.document;
		globalThis.document = {
			activeElement: { tagName: "BUTTON" },
		} as any;

		try {
			const success = insertTextIntoActiveInput("Тестовый текст");
			expect(success).toBe(false);
		} finally {
			globalThis.document = originalDoc;
		}
	});

	it("dispatchSterileVoiceActions dispatches dente-odontogram-update and dente-apply-soap-protocol events", () => {
		const originalWindow = globalThis.window;
		let odontogramDetail: any = null;
		let soapDetail: any = null;

		const listeners: Record<string, ((e: any) => void)[]> = {};
		const mockWindow: any = {
			addEventListener(evt: string, fn: any) {
				listeners[evt] = listeners[evt] || [];
				listeners[evt].push(fn);
			},
			removeEventListener(evt: string, fn: any) {
				if (listeners[evt]) {
					listeners[evt] = listeners[evt].filter((f) => f !== fn);
				}
			},
			dispatchEvent(e: any) {
				const list = listeners[e.type] || [];
				for (const fn of list) fn(e);
				return true;
			},
		};

		globalThis.window = mockWindow;

		try {
			mockWindow.addEventListener("dente-odontogram-update", (e: any) => {
				odontogramDetail = e.detail;
			});
			mockWindow.addEventListener("dente-apply-soap-protocol", (e: any) => {
				soapDetail = e.detail;
			});

			const parseResult = parseVoiceChairsideCommand(
				"Зуб 46 кариес жевательная. Жалобы на боль от сладкого. Анестезия ультракаин 1 карпул"
			);
			const dispatched = dispatchSterileVoiceActions(parseResult);

			expect(dispatched).toBe(true);
			expect(odontogramDetail).not.toBeNull();
			expect(odontogramDetail.states).toHaveLength(1);
			expect(odontogramDetail.states[0].toothNumber).toBe(46);
			expect(odontogramDetail.states[0].state).toBe("Caries");

			expect(soapDetail).not.toBeNull();
			expect(soapDetail.complaint).toContain("боль от сладкого");
			expect(soapDetail.treatmentPlan).toContain("Анестезия");
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
