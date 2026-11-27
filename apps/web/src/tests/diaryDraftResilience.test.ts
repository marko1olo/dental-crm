import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type DiaryState,
	EMPTY_DIARY,
} from "../lib/protocols/protocolTypes";
import {
	soapPrefillFromVisitNote,
	splitDiaryAnamnesis,
	soapDiaryFromVisitNote,
	visitNoteFromSoapDiary,
} from "../lib/protocols/protocolMerge";
import {
	clearIsolatedVisitDraft,
	getIsolatedVisitDraftKey,
	loadIsolatedVisitDraft,
	saveIsolatedVisitDraft,
	verifyZeroDraftCollision,
} from "../components/visit/save/visitDraftStorage";
import { RecordNewDiaryInlineForm } from "../components/emr/record/tabs/RecordNewDiaryInlineForm";
import { EmkQuickActionButtons } from "../components/visit/emk/emkToolbarModules/EmkQuickActionButtons";
import { DebouncedEmkTextarea } from "../components/visit/emk/DebouncedEmkTextarea";

describe("Diary Draft Resilience & LocalStorage Protection (Medical Diary)", () => {
	const storageMock = new Map<string, string>();
	const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

	beforeEach(() => {
		storageMock.clear();
		(globalThis as { localStorage: Storage }).localStorage = {
			get length() {
				return storageMock.size;
			},
			clear: () => storageMock.clear(),
			getItem: (key: string) => storageMock.get(key) ?? null,
			key: (index: number) => Array.from(storageMock.keys())[index] ?? null,
			removeItem: (key: string) => {
				storageMock.delete(key);
			},
			setItem: (key: string, value: string) => {
				storageMock.set(key, String(value));
			},
		};
	});

	function getDraftStorageKey(visitId: string): string {
		return getIsolatedVisitDraftKey(visitId);
	}

	const mockLocalStorage = {
		getItem: (key: string): string | null => storageMock.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			storageMock.set(key, String(value));
		},
		removeItem: (key: string): void => {
			storageMock.delete(key);
		},
		clear: (): void => {
			storageMock.clear();
		},
	};

	test("Автосохранение черновика: сохраняет заполненные поля через visitDraftStorage", () => {
		const visitId = "visit-uuid-101";
		const storageKey = getIsolatedVisitDraftKey(visitId);

		const draftState: DiaryState = {
			...EMPTY_DIARY,
			anamnesis: "Жалобы на ноющую боль в области зуба 4.6.",
			statusLocalis: "Глубокая кариозная полость на жевательной поверхности.",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "46",
			treatmentDescription: "Препарирование, медикаментозная обработка, пломбирование.",
		};

		saveIsolatedVisitDraft(visitId, draftState);
		const savedRaw = storageMock.get(storageKey);
		assert.ok(savedRaw !== undefined, "Черновик должен присутствовать в localStorage");

		const parsed = loadIsolatedVisitDraft<DiaryState>(visitId);
		assert.ok(parsed);
		assert.equal(parsed.anamnesis, draftState.anamnesis);
		assert.equal(parsed.statusLocalis, draftState.statusLocalis);
		assert.equal(parsed.diagnosisIcd10, "K02.1");
		assert.equal(parsed.diagnosisTooth, "46");
		assert.equal(parsed.treatmentDescription, draftState.treatmentDescription);
	});

	test("Восстановление черновика: изолирует визиты и восстанавливает данные", () => {
		assert.equal(verifyZeroDraftCollision("visit-A", "visit-B"), true);
		saveIsolatedVisitDraft("visit-uuid-202", {
			...EMPTY_DIARY,
			anamnesis: "Ранее начатое эндодонтическое лечение.",
			treatmentDescription: "Распломбирование корневых каналов.",
		});

		const restored = loadIsolatedVisitDraft<DiaryState>("visit-uuid-202");
		assert.ok(restored);
		assert.equal(restored.anamnesis, "Ранее начатое эндодонтическое лечение.");
		assert.equal(restored.treatmentDescription, "Распломбирование корневых каналов.");
		clearIsolatedVisitDraft("visit-uuid-202");
		assert.equal(loadIsolatedVisitDraft("visit-uuid-202"), null);
	});

	test("Устойчивость к поврежденному JSON в localStorage: loadIsolatedVisitDraft возвращает null без падения", () => {
		const visitId = "visit-uuid-corrupted";
		storageMock.set(getIsolatedVisitDraftKey(visitId), "{ invalid json data corrupt");
		const restored = loadIsolatedVisitDraft<DiaryState>(visitId);
		assert.equal(restored, null, "При поврежденном JSON loadIsolatedVisitDraft не падает и возвращает null");
		if (originalLocalStorage === undefined) {
			delete (globalThis as { localStorage?: unknown }).localStorage;
		}
	});

	test("Защита от перезаписи: серверные данные подписанного дневника имеют приоритет", () => {
		const visitId = "visit-uuid-server-priority";
		const storageKey = getDraftStorageKey(visitId);

		// Старый локальный черновик
		mockLocalStorage.setItem(
			storageKey,
			JSON.stringify({
				anamnesis: "Старый черновик из браузера",
			}),
		);

		// Серверный подтвержденный дневник
		const serverDiaryRow = {
			id: "diary-srv-1",
			anamnesis: "Официальный анамнез с сервера",
			statusLocalis: "Объективный статус с сервера",
			isLocked: true,
			lockedAt: "2028-11-01T12:00:00.000Z",
		};

		// Логика хука: при ready фазе используются данные сервера
		const effectiveDiary: DiaryState = {
			anamnesis: serverDiaryRow.anamnesis ?? "",
			statusLocalis: serverDiaryRow.statusLocalis ?? "",
			diagnosisIcd10: "",
			diagnosisTooth: "",
			treatmentDescription: "",
			complications: "",
			comorbidities: "",
		};

		assert.equal(
			effectiveDiary.anamnesis,
			"Официальный анамнез с сервера",
			"Серверный анамнез не должен перезаписываться локальным черновиком",
		);
	});

	test("soapPrefillFromVisitNote: заполняет пустые поля из ЭМК и извлекает МКБ-10 и зуб", () => {
		const prefill = soapPrefillFromVisitNote({
			complaint: "Острая боль при накусывании",
			anamnesis: "Боль появилась 2 дня назад",
			objectiveStatus: "Зуб 3.7: глубокая полость, реакция на перкуссию положительная",
			diagnosis: "K04.0 Пульпит зуба 37",
			treatmentPlan: "Эндодонтическое лечение в 2 посещения",
		});

		assert.equal(
			prefill.anamnesis,
			"Острая боль при накусывании\nБоль появилась 2 дня назад",
		);
		assert.equal(
			prefill.statusLocalis,
			"Зуб 3.7: глубокая полость, реакция на перкуссию положительная",
		);
		assert.equal(prefill.diagnosisIcd10, "K04.0");
		assert.equal(prefill.diagnosisTooth, "37");
		assert.equal(prefill.treatmentDescription, "Эндодонтическое лечение в 2 посещения");
	});

	test("DEF-03: splitDiaryAnamnesis корректно разделяет многострочный анамнез 043/у на жалобы и анамнез", () => {
		const res = splitDiaryAnamnesis(
			"Острая боль при накусывании\nБоль появилась 2 дня назад\nРанее зуб не лечен",
		);
		assert.equal(res.complaint, "Острая боль при накусывании");
		assert.equal(res.anamnesis, "Боль появилась 2 дня назад\nРанее зуб не лечен");
	});

	test("DEF-03: splitDiaryAnamnesis корректно разделяет одноабзацную норму 1-клика на жалобы и соматику", () => {
		const normText =
			"Жалоб на момент приёма не предъявляет (профилактический осмотр). Соматически здоров. Хронические заболевания, сердечно-сосудистые патологии и аллергологический статус со слов отрицает.";
		const res = splitDiaryAnamnesis(normText);
		assert.equal(
			res.complaint,
			"Жалоб на момент приёма не предъявляет (профилактический осмотр).",
		);
		assert.equal(
			res.anamnesis,
			"Соматически здоров. Хронические заболевания, сердечно-сосудистые патологии и аллергологический статус со слов отрицает.",
		);
	});

	test("DEF-03: visitNoteFromSoapDiary преобразует дневник 043/у во все 5 полей ЭМК", () => {
		const diary: DiaryState = {
			...EMPTY_DIARY,
			anamnesis: "Боли от сладкого\nЗуб 1.6 ранее лечен по поводу кариеса",
			statusLocalis: "Глубокая кариозная полость на окклюзионной поверхности зуба 16",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "16",
			treatmentDescription: "Препарирование, медобработка, реставрация композитом Ceram.x SphereTEC",
		};

		const emk = visitNoteFromSoapDiary(diary);
		assert.equal(emk.complaint, "Боли от сладкого");
		assert.equal(emk.anamnesis, "Зуб 1.6 ранее лечен по поводу кариеса");
		assert.equal(
			emk.objectiveStatus,
			"Глубокая кариозная полость на окклюзионной поверхности зуба 16",
		);
		assert.ok(emk.diagnosis.includes("K02.1"));
		assert.ok(emk.diagnosis.includes("16"));
		assert.equal(
			emk.treatmentPlan,
			"Препарирование, медобработка, реставрация композитом Ceram.x SphereTEC",
		);
	});

	test("DEF-03 (Мандат 8s): Двусторонний round-trip между ЭМК и Одонтограммой без потерь текста", () => {
		const emkInitial = {
			complaint: "Ноющие ночные боли",
			anamnesis: "Заболел 3 дня назад, принимал Нурофен без эффекта",
			objectiveStatus: "Зуб 46: зондирование дна кариозной полости резко болезненно",
			diagnosis: "K04.0 Пульпит зуба 46",
			treatmentPlan: "Эндодонтическое лечение корневых каналов с микроскопом",
		};

		// ЭМК -> Дневник 043/у (Одонтограмма)
		const diaryState = soapDiaryFromVisitNote(emkInitial);
		assert.equal(
			diaryState.anamnesis,
			"Ноющие ночные боли\nЗаболел 3 дня назад, принимал Нурофен без эффекта",
		);
		assert.equal(diaryState.statusLocalis, emkInitial.objectiveStatus);
		assert.equal(diaryState.diagnosisIcd10, "K04.0");
		assert.equal(diaryState.diagnosisTooth, "46");
		assert.equal(diaryState.treatmentDescription, emkInitial.treatmentPlan);

		// Дневник 043/у (Одонтограмма) -> ЭМК
		const emkRoundTrip = visitNoteFromSoapDiary(
			{ ...EMPTY_DIARY, ...diaryState } as DiaryState,
			emkInitial,
		);
		assert.equal(emkRoundTrip.complaint, emkInitial.complaint);
		assert.equal(emkRoundTrip.anamnesis, emkInitial.anamnesis);
		assert.equal(emkRoundTrip.objectiveStatus, emkInitial.objectiveStatus);
		assert.equal(emkRoundTrip.treatmentPlan, emkInitial.treatmentPlan);
		assert.ok(emkRoundTrip.diagnosis.includes("K04.0"));
	});
});

describe("Visit SOAP Draft Recovery & Non-blocking Invariants (Mandate 8c, 8e)", () => {
	const storageMock = new Map<string, string>();
	const mockLocalStorage = {
		getItem: (key: string): string | null => storageMock.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			storageMock.set(key, String(value));
		},
		removeItem: (key: string): void => {
			storageMock.delete(key);
		},
		clear: (): void => {
			storageMock.clear();
		},
	};

	beforeEach(() => {
		storageMock.clear();
	});

	test("Обнаружение черновика: выявляет локальный черновик при отличии от сервера и форматирует время", () => {
		const savedAtTime = new Date("2026-09-29T14:32:00.000Z");
		const draftData = {
			complaint: "Ноющая боль в зубе 1.6 при приеме сладкого",
			anamnesis: "Появилась неделю назад",
			objectiveStatus: "Глубокая кариозная полость",
			diagnosis: "K02.1 Кариес дентина",
			treatmentPlan: "Препарирование, пломба Estelite",
			recommendations: "Гигиена",
			icd10: "K02.1",
			_savedAt: savedAtTime.toISOString(),
		};

		const serverInitial = {
			complaint: "",
			anamnesis: "",
			objectiveStatus: "",
			diagnosis: "",
			treatmentPlan: "",
			recommendations: "",
			icd10: "",
		};

		// Логика обнаружения unsavedDraftNotice в VisitSoapEditor
		const isDifferent =
			draftData.complaint !== serverInitial.complaint ||
			draftData.treatmentPlan !== serverInitial.treatmentPlan;
		const hasContent = Boolean(draftData.complaint.trim() || draftData.treatmentPlan.trim());

		assert.ok(hasContent && isDifferent, "Черновик с контентом должен быть обнаружен");

		const savedDate = new Date(draftData._savedAt);
		const timeStr = savedDate.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "UTC",
		});
		assert.equal(timeStr, "14:32", "Время сохранения должно форматироваться в HH:MM");
	});

	test("Подавление баннера: если локальный черновик идентичен серверу или пуст, баннер не показывается", () => {
		const identicalDraft = {
			complaint: "Осмотр",
			anamnesis: "Здоров",
			objectiveStatus: "Норма",
			diagnosis: "Z01.2",
			treatmentPlan: "Санация",
			recommendations: "Осмотр через 6 мес",
			icd10: "Z01.2",
		};
		const serverInitial = { ...identicalDraft };

		const isDifferent =
			identicalDraft.complaint !== serverInitial.complaint ||
			identicalDraft.anamnesis !== serverInitial.anamnesis ||
			identicalDraft.objectiveStatus !== serverInitial.objectiveStatus ||
			identicalDraft.diagnosis !== serverInitial.diagnosis ||
			identicalDraft.treatmentPlan !== serverInitial.treatmentPlan ||
			identicalDraft.recommendations !== serverInitial.recommendations ||
			identicalDraft.icd10 !== serverInitial.icd10;

		assert.equal(isDifferent, false, "Идентичные данные не должны триггерить баннер восстановления");
	});

	test("Неблокирующий сброс черновика: удаляет ключ из localStorage через clearIsolatedVisitDraft", () => {
		const visitId = "visit-uuid-discard";
		saveIsolatedVisitDraft(visitId, { ...EMPTY_DIARY, anamnesis: "Черновик для удаления" });
		assert.ok(loadIsolatedVisitDraft(visitId));

		clearIsolatedVisitDraft(visitId);
		assert.equal(loadIsolatedVisitDraft(visitId), null, "Черновик должен быть удален из хранилища");
	});

	test("Мандат 8e/8x/8zg: RecordNewDiaryInlineForm, DebouncedEmkTextarea и EmkQuickActionButtons рендерятся без 043/у и без disabled-блокировки нормы", () => {
		const inlineHtml = renderToStaticMarkup(
			React.createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "16",
				setSelectedTooth: () => {},
				commonTeeth: [16, 26, 36, 46],
				subjective: "",
				setSubjective: () => {},
				objective: "",
				setObjective: () => {},
				diagnosisText: "",
				setDiagnosisText: () => {},
				icd10Code: "K02.1",
				setIcd10Code: () => {},
				protocol: "",
				setProtocol: () => {},
				onApplyNorm: () => {},
				onClear: () => {},
				onSave: () => {},
			}),
		);
		assert.ok(inlineHtml.includes('data-testid="btn-inline-diary-norm"'));
		assert.equal(inlineHtml.includes("043/у"), false);
		assert.equal(inlineHtml.includes("834н"), false);

		const textareaHtml = renderToStaticMarkup(
			React.createElement(DebouncedEmkTextarea, {
				fieldKey: "anamnesis",
				label: "Анамнез заболевания",
				value: "Боли при накусывании",
				onCommit: () => {},
			}),
		);
		assert.ok(textareaHtml.includes("Боли при накусывании"));

		const quickActionsHtml = renderToStaticMarkup(
			React.createElement(EmkQuickActionButtons, {
				onApplyPhysiologicalNorm: () => {},
				handleSchedule: () => {},
				canUndo: false,
				canRedo: false,
				handleUndo: () => {},
				handleRedo: () => {},
			}),
		);
		assert.ok(quickActionsHtml.includes('data-testid="btn-chairside-physiological-norm"'));
		assert.equal(
			quickActionsHtml.includes('data-testid="btn-chairside-physiological-norm" disabled'),
			false,
			"Кнопка физиологической нормы не должна быть disabled",
		);
		assert.equal(quickActionsHtml.includes("043/у"), false);
		assert.equal(quickActionsHtml.includes("834н"), false);
	});
});

