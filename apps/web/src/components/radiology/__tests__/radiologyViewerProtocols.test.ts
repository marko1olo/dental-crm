import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	applyRadiologyProtocolToForm043,
	formatRadiologyProtocolStatement,
	RADIOLOGY_STANDARD_PROTOCOLS,
	type RadiologyProtocolPreset,
} from "../radiologyProtocols.js";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

test("Мандат 8e: Все 4 канонических стандарта рентген-протоколов присутствуют с точным текстом", () => {
	assert.equal(
		RADIOLOGY_STANDARD_PROTOCOLS.length,
		4,
		"Должно быть ровно 4 стандартных протокола рентгенодиагностики",
	);

	const norma = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "norma");
	assert.ok(norma, "Протокол 'norma' должен существовать");
	assert.equal(
		norma.text,
		"Рентген-норма: периапикальные ткани без патологических изменений, кортикальная пластинка интактна, периодонтальная щель равномерная, деструкции костной ткани нет",
	);

	const perio = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "periodontitis");
	assert.ok(perio, "Протокол 'periodontitis' должен существовать");
	assert.equal(
		perio.text,
		"Периодонтит (периапикальный очаг): деструкция костной ткани с нечеткими контурами у верхушки корня (разрежение кости), расширение периодонтальной щели",
	);

	const endo = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "endo_control");
	assert.ok(endo, "Протокол 'endo_control' должен существовать");
	assert.equal(
		endo.text,
		"Контроль обтурации каналов: корневой канал запломбирован плотно гомогенно на всем протяжении до физиологического апекса, выведения материала за верхушку нет",
	);

	const resorption = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "resorption");
	assert.ok(resorption, "Протокол 'resorption' должен существовать");
	assert.equal(
		resorption.text,
		"Маргинальная резорбция кости (пародонтит): горизонтальная/вертикальная резорбция межальвеолярных перегородок на 1/3 или 1/2 длины корня",
	);
});

test("formatRadiologyProtocolStatement: корректное форматирование без опций и с зубами/модальностью", () => {
	const norma = RADIOLOGY_STANDARD_PROTOCOLS[0] as RadiologyProtocolPreset;

	// Без опций
	const plain = formatRadiologyProtocolStatement(norma);
	assert.equal(plain, norma.text);

	// С одиночным зубом
	const withTooth = formatRadiologyProtocolStatement(norma, { toothFdi: 36 });
	assert.equal(withTooth, `[область зубов: 36] ${norma.text}`);

	// С несколькими зубами и модальностью
	const full = formatRadiologyProtocolStatement(norma, {
		teethFdi: [16, 17],
		modalityLabel: "Визиограф RVG",
	});
	assert.equal(full, `[Визиограф RVG · область зубов: 16, 17] ${norma.text}`);
});

test("applyRadiologyProtocolToForm043: диспатчит событие dente-apply-soap-protocol и вызывает коллбек", () => {
	const norma = RADIOLOGY_STANDARD_PROTOCOLS[0] as RadiologyProtocolPreset;
	let capturedEventDetail: any = null;
	let capturedCallbackText: string | null = null;

	const originalWindow = globalThis.window;
	const originalCustomEvent = globalThis.CustomEvent;

	// Эмуляция окружения браузера
	const listeners: Record<string, ((e: any) => void)[]> = {};
	(globalThis as any).window = {
		dispatchEvent: (evt: any) => {
			if (evt.type === "dente-apply-soap-protocol") {
				capturedEventDetail = evt.detail;
			}
			return true;
		},
		addEventListener: (type: string, fn: any) => {
			listeners[type] = listeners[type] || [];
			listeners[type]?.push(fn);
		},
		removeEventListener: () => {},
	};

	(globalThis as any).CustomEvent = class {
		type: string;
		detail: any;
		constructor(type: string, init?: any) {
			this.type = type;
			this.detail = init?.detail;
		}
	};

	try {
		const result = applyRadiologyProtocolToForm043({
			protocol: norma,
			options: { toothFdi: "46" },
			onInsertToProtocol: (txt) => {
				capturedCallbackText = txt;
			},
			copyToClipboard: false,
			showNotification: false,
		});

		assert.ok(result.includes("Рентген-норма"));
		assert.ok(result.includes("46"));

		assert.ok(capturedEventDetail, "Событие dente-apply-soap-protocol должно быть отправлено");
		assert.equal(capturedEventDetail.immediate, true);
		assert.equal(capturedEventDetail.mode, "smart_append");
		assert.equal(capturedEventDetail.soap?.statusLocalis, result);

		assert.equal(capturedCallbackText, result, "Коллбек onInsertToProtocol должен получить текст");
	} finally {
		(globalThis as any).window = originalWindow;
		(globalThis as any).CustomEvent = originalCustomEvent;
	}
});

test("DicomViewerModal: 1-клик Норма, опциональный ИИ без зависаний, отсутствие сырых эмодзи", () => {
	const source = readSource("components/imaging/DicomViewerModal.tsx");

	// Проверка кнопки Нормы
	assert.ok(
		source.includes('data-testid="btn-dicom-norma-043"'),
		"DicomViewerModal обязан содержать кнопку 'btn-dicom-norma-043'",
	);
	assert.ok(
		source.includes("handleInsertNormaTo043"),
		"DicomViewerModal обязан иметь функцию handleInsertNormaTo043",
	);

	// Проверка меню протоколов
	assert.ok(
		source.includes('data-testid="btn-dicom-protocols-menu"'),
		"DicomViewerModal обязан содержать меню протоколов 'btn-dicom-protocols-menu'",
	);

	// ИИ строго опционален по отдельной кнопке врача
	assert.ok(
		source.includes('data-testid="btn-dicom-run-ai"'),
		"DicomViewerModal обязан иметь явную кнопку запуска ИИ 'btn-dicom-run-ai'",
	);
	assert.ok(
		source.includes("handleRunAiAnalysis"),
		"ИИ запускается строго по отдельной кнопке врача handleRunAiAnalysis",
	);

	// Запрет на автоматическую перезапись карты роботом
	assert.ok(
		source.includes("btn-dicom-apply-findings") || source.includes("handleApplyFindingsToChart"),
		"Перезапись формулы требует явного подтверждения врача через кнопку внесения находок",
	);

	// Проверка отсутствия сырых эмодзи
	assert.ok(!source.includes("⚡ Норма"), "Сырой эмодзи молнии ⚡ запрещен в кнопке нормы");
});
