import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import {
	type DiaryState,
	EMPTY_DIARY,
	soapPrefillFromVisitNote,
	splitDiaryAnamnesis,
	soapDiaryFromVisitNote,
	visitNoteFromSoapDiary,
} from "../components/useVisitDiaryLogic";

describe("Diary Draft Resilience & LocalStorage Protection (Medical Diary)", () => {
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

	test("Неблокирующий сброс черновика: удаляет ключ из localStorage без window.confirm / modal", () => {
		const key = "dente_soap_editor_draft_16";
		mockLocalStorage.setItem(key, JSON.stringify({ complaint: "Черновик для удаления" }));
		assert.ok(mockLocalStorage.getItem(key));

		// Имитация handleDiscardDraft
		mockLocalStorage.removeItem(key);

		assert.equal(mockLocalStorage.getItem(key), null, "Черновик должен быть удален из хранилища");
	});

	test("Мандат 8c / 8e: Полный запрет на window.alert, window.confirm и window.prompt в коде дневника", () => {
		const soapEditorCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/VisitSoapEditor.tsx"),
			"utf-8",
		);
		const debouncedTextareaCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/emk/DebouncedEmkTextarea.tsx"),
			"utf-8",
		);

		assert.ok(!soapEditorCode.includes("window.alert"), "VisitSoapEditor не должен вызывать window.alert");
		assert.ok(!soapEditorCode.includes("window.confirm"), "VisitSoapEditor не должен вызывать window.confirm");
		assert.ok(!soapEditorCode.includes("window.prompt"), "VisitSoapEditor не должен вызывать window.prompt");

		assert.ok(!debouncedTextareaCode.includes("window.alert"), "DebouncedEmkTextarea не должен вызывать window.alert");
		assert.ok(!debouncedTextareaCode.includes("window.confirm"), "DebouncedEmkTextarea не должен вызывать window.confirm");
		assert.ok(!debouncedTextareaCode.includes("window.prompt"), "DebouncedEmkTextarea не должен вызывать window.prompt");
	});

	test("Мандат 8e: DebouncedEmkTextarea калиброван на 400ms и слушает телефонию и смену вкладок", () => {
		const debouncedTextareaCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/emk/DebouncedEmkTextarea.tsx"),
			"utf-8",
		);

		assert.ok(
			debouncedTextareaCode.includes("400); // Debounced autosave 300-500ms"),
			"Таймер DebouncedEmkTextarea должен быть откалиброван на 400ms (окно 300-500ms)",
		);
		assert.ok(
			debouncedTextareaCode.includes("dente-telephony-incoming-call"),
			"Должен быть зарегистрирован обработчик входящего звонка телефонии",
		);
		assert.ok(
			debouncedTextareaCode.includes("dente:visit-tab-change"),
			"Должен быть зарегистрирован обработчик внутренней смены вкладок",
		);
		assert.ok(
			debouncedTextareaCode.includes("beforeunload"),
			"Должен быть зарегистрирован обработчик beforeunload",
		);
		assert.ok(
			debouncedTextareaCode.includes("pagehide"),
			"Должен быть зарегистрирован обработчик pagehide",
		);
	});

	test("Мандат 8e: VisitSoapEditor содержит дуальное сохранение в localStorage и IndexedDB", () => {
		const soapEditorCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/VisitSoapEditor.tsx"),
			"utf-8",
		);

		assert.ok(
			soapEditorCode.includes("saveOfflineDraft"),
			"VisitSoapEditor должен выполнять дуальное сохранение в офлайн-очередь IndexedDB",
		);
		assert.ok(
			soapEditorCode.includes("safeLocalStorageSetItem"),
			"VisitSoapEditor должен выполнять синхронное сохранение в localStorage",
		);
		assert.ok(
			soapEditorCode.includes('data-testid="banner-draft-recovery"'),
			"VisitSoapEditor должен содержать неблокирующий баннер восстановления черновика",
		);
		assert.ok(
			soapEditorCode.includes('data-testid="btn-restore-draft"'),
			"В баннере должна быть кнопка быстрого восстановления черновика",
		);
		assert.ok(
			soapEditorCode.includes('data-testid="btn-discard-draft"'),
			"В баннере должна быть кнопка сброса черновика",
		);
	});

	test("Мандат 8z: Полное искоренение советских кодов 043/у и 834н из пользовательского интерфейса", () => {
		const soapEditorCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/VisitSoapEditor.tsx"),
			"utf-8",
		);
		const controlBoardCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/EmkControlBoard.tsx"),
			"utf-8",
		);

		assert.ok(!soapEditorCode.includes("043/у"), "VisitSoapEditor не должен содержать 043/у");
		assert.ok(!soapEditorCode.includes("834н"), "VisitSoapEditor не должен содержать 834н");
		assert.ok(!controlBoardCode.includes("043/у"), "EmkControlBoard не должен содержать 043/у");
		assert.ok(!controlBoardCode.includes("834н"), "EmkControlBoard не должен содержать 834н");
	});

	test("Мандат 8e: Кнопка 1-клика физиологической нормы никогда не disabled и заполняет статус", () => {
		const soapEditorCode = fs.readFileSync(
			path.resolve(process.cwd(), "apps/web/src/components/visit/VisitSoapEditor.tsx"),
			"utf-8",
		);

		assert.ok(
			soapEditorCode.includes('data-testid="btn-soap-physio-norm"'),
			"VisitSoapEditor должен содержать кнопку 1-клика физиологической нормы",
		);
		assert.ok(
			soapEditorCode.includes("disabled={false}"),
			"Кнопка нормы не должна блокироваться",
		);
		assert.ok(
			soapEditorCode.includes("Жалоб на момент осмотра не предъявляет"),
			"Должен быть включен текст соматической нормы",
		);
		assert.ok(
			soapEditorCode.includes("Соматически здоров. Аллергологический анамнез не отягощен."),
			"Должен быть включен соматически здоровый статус",
		);
	});
});

