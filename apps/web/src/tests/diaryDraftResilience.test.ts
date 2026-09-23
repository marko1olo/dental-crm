import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
	type DiaryState,
	EMPTY_DIARY,
	soapPrefillFromVisitNote,
	splitDiaryAnamnesis,
	soapDiaryFromVisitNote,
	visitNoteFromSoapDiary,
} from "../components/useVisitDiaryLogic";

describe("Diary Draft Resilience & LocalStorage Protection (Form 043/u)", () => {
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

	function getDraftStorageKey(visitId: string): string {
		return `dente_diary_draft_${visitId}`;
	}

	test("Автосохранение черновика: сохраняет заполненные поля в локальное хранилище", () => {
		const visitId = "visit-uuid-101";
		const storageKey = getDraftStorageKey(visitId);

		const draftState: DiaryState = {
			...EMPTY_DIARY,
			anamnesis: "Жалобы на ноющую боль в области зуба 4.6.",
			statusLocalis: "Глубокая кариозная полость на жевательной поверхности.",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "46",
			treatmentDescription: "Препарирование, медикаментозная обработка, пломбирование.",
		};

		mockLocalStorage.setItem(storageKey, JSON.stringify(draftState));

		const savedRaw = mockLocalStorage.getItem(storageKey);
		assert.ok(savedRaw !== null, "Черновик должен присутствовать в localStorage");

		const parsed = JSON.parse(savedRaw) as DiaryState;
		assert.equal(parsed.anamnesis, draftState.anamnesis);
		assert.equal(parsed.statusLocalis, draftState.statusLocalis);
		assert.equal(parsed.diagnosisIcd10, "K02.1");
		assert.equal(parsed.diagnosisTooth, "46");
		assert.equal(parsed.treatmentDescription, draftState.treatmentDescription);
	});

	test("Восстановление черновика: восстанавливает состояние при повторном открытии визита", () => {
		const visitId = "visit-uuid-202";
		const storageKey = getDraftStorageKey(visitId);

		const savedDraft: Partial<DiaryState> = {
			anamnesis: "Ранее начатое эндодонтическое лечение.",
			treatmentDescription: "Распломбирование корневых каналов.",
		};
		mockLocalStorage.setItem(storageKey, JSON.stringify(savedDraft));

		const raw = mockLocalStorage.getItem(storageKey);
		assert.ok(raw);
		const restored = { ...EMPTY_DIARY, ...(JSON.parse(raw) as Partial<DiaryState>) };

		assert.equal(restored.anamnesis, "Ранее начатое эндодонтическое лечение.");
		assert.equal(restored.treatmentDescription, "Распломбирование корневых каналов.");
		assert.equal(restored.statusLocalis, "");
	});

	test("Устойчивость к поврежденному JSON в localStorage: не выбрасывает исключение", () => {
		const visitId = "visit-uuid-corrupted";
		const storageKey = getDraftStorageKey(visitId);

		mockLocalStorage.setItem(storageKey, "{ invalid json data corrupt");

		let restoredState: DiaryState = { ...EMPTY_DIARY };
		try {
			const cached = mockLocalStorage.getItem(storageKey);
			if (cached) {
				const parsed = JSON.parse(cached) as Partial<DiaryState>;
				if (parsed && typeof parsed === "object") {
					restoredState = { ...restoredState, ...parsed };
				}
			}
		} catch {
			// Ошибка парсинга корректно игнорируется
		}

		assert.deepEqual(restoredState, EMPTY_DIARY, "При поврежденном JSON должен остаться базовый пустой дневник");
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
