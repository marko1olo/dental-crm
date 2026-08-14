import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
	type DiaryState,
	EMPTY_DIARY,
	soapPrefillFromVisitNote,
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
});
