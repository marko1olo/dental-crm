import { useCallback, useEffect, useRef, useState } from "react";
import { operatorReadableErrorDetail } from "../AppHelpers";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
	requestFailureCause,
} from "../lib/panelStateText";
import { useVisitStore } from "../store/visitStore";
import { useAppLogic } from "../useAppLogic";
import { showToast } from "./GlobalToast";

export interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}

export const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
	complications: "",
	comorbidities: "",
};

/**
 * Код МКБ-10 из текста диагноза ЭМК.
 * В visitNoteForm.diagnosis лежит свободный текст («Кариес 36»), а в дневнике
 * 043/у поле A — код. Подставляем код только когда он явно есть в строке;
 * произвольный текст в diagnosisIcd10 не кладём.
 */
function icd10CodeFromDiagnosisText(diagnosis: string): string {
	const trimmed = diagnosis.trim();
	if (!trimmed) return "";
	const exact = trimmed.match(/^([A-TV-Z]\d{2}(?:\.\d{1,4})?)$/i);
	const exactCode = exact?.[1];
	if (exactCode) return exactCode.toUpperCase();
	const leading = trimmed.match(/^([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/i);
	const leadingCode = leading?.[1];
	if (leadingCode) return leadingCode.toUpperCase();
	const embedded = trimmed.match(/\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/i);
	const embeddedCode = embedded?.[1];
	return embeddedCode ? embeddedCode.toUpperCase() : "";
}

/** Зуб по FDI (постоянные 11–48) из текста диагноза ЭМК, если указан. */
function fdiToothFromText(text: string): string {
	const m = text.trim().match(/\b([1-4][1-8])\b/);
	const tooth = m?.[1];
	return tooth ?? "";
}


/**
 * SOAP-поля дневника 043/у из формы ЭМК приёма (visits / visitNoteForm).
 *
 * Два хранилища: visits.complaint|anamnesis|… (ЭМК) и visit_diaries.* (SOAP).
 * Когда дневника ещё нет, врач уже мог заполнить ЭМК — без prefill он
 * перепечатывает то же самое в S/O/A/P. Возвращаем только непустые поля.
 */
export function soapPrefillFromVisitNote(form: {
	complaint?: string | null;
	anamnesis?: string | null;
	objectiveStatus?: string | null;
	diagnosis?: string | null;
	treatmentPlan?: string | null;
}): Partial<DiaryState> {
	const complaint = (form.complaint ?? "").trim();
	const anamnesis = (form.anamnesis ?? "").trim();
	const sParts: string[] = [];
	if (complaint) sParts.push(complaint);
	if (anamnesis && anamnesis !== complaint) sParts.push(anamnesis);

	const out: Partial<DiaryState> = {};
	if (sParts.length > 0) out.anamnesis = sParts.join("\n");

	const objective = (form.objectiveStatus ?? "").trim();
	if (objective) out.statusLocalis = objective;

	const plan = (form.treatmentPlan ?? "").trim();
	if (plan) out.treatmentDescription = plan;

	const diagnosis = (form.diagnosis ?? "").trim();
	const icd = icd10CodeFromDiagnosisText(diagnosis);
	if (icd) out.diagnosisIcd10 = icd;
	const tooth = fdiToothFromText(diagnosis);
	if (tooth) out.diagnosisTooth = tooth;

	return out;
}

/**
 * Состояние чтения дневника. Ровно одно из четырёх, и «пусто» с «не прочитано»
 * не сливаются ни при каких условиях.
 *
 * ЧТО БЫЛО СЛОМАНО. Чтение выглядело так: `fetch(...).then(r => r.json())`, без
 * проверки `r.ok`. Ошибочный ответ (500 из базы, 403/503 от гейта клинического
 * чтения в accessGuard.ts, 403 OrgRequired) — это тоже корректный JSON вида
 * `{error, message}`, он разбирался без исключения, поля `diary` в нём нет,
 * условие `if (diaryData.diary)` не выполнялось, и хук оставался с EMPTY_DIARY.
 * Врач видел уже сохранённый дневник как ПУСТОЙ и полностью редактируемый: ни
 * спиннера, ни ошибки, визуально неотличимо от нового приёма. Вместе с текстом
 * терялись isLocked/lockedAt/diaryHash, поэтому ПОДПИСАННАЯ запись выглядела
 * неподписанной и открытой к правке.
 */
export type DiaryLoadState =
	/** Ответа ещё нет. Утверждать «дневник пуст» в этот момент нельзя. */
	| { readonly phase: "loading" }
	/** Сервер ответил, что дневника у приёма нет. Это честная пустота: новый приём. */
	| { readonly phase: "empty" }
	/** Дневник прочитан и разложен в поля. */
	| { readonly phase: "ready" }
	/** Прочитать не удалось. `status` — код ответа, null — до сервера не дошли. */
	| { readonly phase: "failed"; readonly status: number | null };

/** Как называется содержимое этой панели в текстах состояний. */
const DIARY_SUBJECT: PanelSubject = {
	// Целая согласованная строка: слова «не загружены» больше не дописывает общий
	// модуль, поэтому число и род называет тот, кто знает существительное. Тот же
	// оборот стоит в двух запретах сохранения ниже («Записи приёма не прочитаны»),
	// поэтому здесь взято «не загружены» — иначе одна и та же фраза прозвучала бы
	// в заголовке и сразу под ним.
	notLoadedTitle: "Записи приёма не загружены",
	accusative: "записи приёма",
	emptyTitle: "Дневник приёма ещё не заполнен",
	emptyHint:
		"Заполните разделы S, O, A, P и нажмите «Сохранить черновик» — дальше запись сохраняется сама каждые 30 секунд.",
	failureConsequence:
		"Не считайте дневник пустым: он не прочитан. Не набирайте заново — обновите страницу. Пока запись не прочитана, сохранение и подписание отключены, чтобы не записать пустые поля поверх сохранённого текста.",
};

/** Объект из тела ответа или null. Массив и скаляр объектом не считаются. */
function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		// Текст исключения английский, наружу он не идёт ни при каких условиях.
		return null;
	}
}

export function useVisitDiaryLogic(visitId: string, patientId: string) {
	const { activeDoctor } = useAppLogic();
	const [diary, setDiary] = useState<DiaryState>(EMPTY_DIARY);
	const [diaryId, setDiaryId] = useState<string | null>(null);
	const [isLocked, setIsLocked] = useState(false);
	const [lockedAt, setLockedAt] = useState<string | null>(null);
	const [diaryHash, setDiaryHash] = useState<string | null>(null);
	/**
	 * Есть ли в БД оттиск УКЭП (crypto_signature_pkcs7).
	 * БЫЛО: клиент смотрел только isLocked+diaryHash. После admin-revise
	 * PKCS#7 обнуляется, hash меняется — печать 043/у всё равно рисовала
	 * «ЭЦП (SHA-256)» как будто подпись на месте. hasCryptoSignature=false
	 * до повторного /lock с телом pkcs7.
	 */
	const [hasCryptoSignature, setHasCryptoSignature] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [showScanner, setShowScanner] = useState(false);
	const [trayBarcode, setTrayBarcode] = useState<string | null>(null);
	const [showIcdDropdown, setShowIcdDropdown] = useState(false);
	const [icdSearch, setIcdSearch] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [revisionCount, setRevisionCount] = useState(0);
	const [loadState, setLoadState] = useState<DiaryLoadState>({ phase: "loading" });
	/**
	 * Счётчик принудительного перечитывания. PanelLoadFailure требует onRetry —
	 * без отдельного токена повтор был бы только через смену visitId (её нет).
	 */
	const [reloadToken, setReloadToken] = useState(0);
	/** Режим правки уже подписанного дневника (только admin на API). */
	const [isRevising, setIsRevising] = useState(false);
	const [revisionReason, setRevisionReason] = useState("");
	const [isRevisingBusy, setIsRevisingBusy] = useState(false);
	/**
	 * Снимок полей на входе в режим правки.
	 * БЫЛО: cancelRevise только снимал isRevising — правки в textarea оставались
	 * на экране. После «Отмена» UI показывал изменённый текст как будто это
	 * подписанное содержимое 043/у, хотя в БД прежняя версия. Печать 043/у
	 * с экрана тоже уходила с неотменённой правкой.
	 */
	const [reviseSnapshot, setReviseSnapshot] = useState<DiaryState | null>(null);


	/**
	 * Заголовки с админским секретом клинической сессии.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Три адреса дневника закрыты охраной `accessGuard.ts`:
	 * чтение дневника и его ревизий — `requireClinicalReadAccess`, подписание
	 * (POST /api/diaries/:id/lock) — `requireClinicalMutationAccess`. Без
	 * заголовка `x-dente-admin-secret` охрана отвечает 403. Все три запроса шли
	 * голым `fetch` без заголовков, и на ЭТОЙ машине это не видно: в корневом
	 * .env секрет закомментирован, зато включены лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS. Лазейки действуют только
	 * пока NODE_ENV !== "production", то есть у заказчика их нет.
	 *
	 * ЧТО ЭТО ЗНАЧИЛО У ЗАКАЗЧИКА. Чтение отвечало 403, дневник уходил в
	 * состояние `failed` — врач видел «Записи приёма не загружены» вместо
	 * основной медицинской записи, а сохранение и подписание при этом
	 * запрещены (см. doSave/doLock). Подписание отвечало 403 и на своём
	 * запросе: приём было НЕЧЕМ ЗАКРЫТЬ, дневник оставался несданным
	 * документом. Ревизии молчали, и пометка «⚠ Ревизий: N» в форме 043/у
	 * пропадала.
	 *
	 * ТОЛЬКО ИЗ КОНТЕКСТА. Одноимённый `auth` экспортирует ещё и
	 * `AppHelpers.tsx`, но там функции подставляют секрет лишь тогда, когда его
	 * передали вторым аргументом. С ним код собирается, проверка заголовков
	 * замолкает, а в клинике остаётся тот же 403. Здесь `auth` берётся из
	 * `useAppLogicContext()`, где он приходит из `useAuthLogic` вместе с
	 * `clinicalAdminSecretSession`. Соседний `useAppLogic()` строкой выше для
	 * этого не годится: он поднимает ВТОРОЙ экземпляр общего хука, со своим
	 * пустым состоянием секрета.
	 *
	 * ЧЕРЕЗ ref, А НЕ ЧЕРЕЗ ЗАВИСИМОСТЬ. `useAuthLogic` возвращает новый объект
	 * на каждый рендер провайдера. Эффект чтения ниже первым делом ставит
	 * `setDiary(EMPTY_DIARY)`, поэтому `auth` в его зависимостях стирал бы
	 * набранный врачом текст на каждом рендере. ref делает это структурно
	 * невозможным.
	 */
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const authRef = useRef(auth);
	authRef.current = auth;

	const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const icdRef = useRef<HTMLDivElement>(null);
	/**
	 * Об отказе тихого автосохранения говорим один раз до следующей удачи.
	 * Каждые 30 секунд показывать одно и то же сообщение нельзя — врач начнёт
	 * закрывать его не читая. Молчать тоже нельзя: в интерфейсе написано
	 * «Автосохранение каждые 30 сек», и если оно не работает, врач узнаёт об
	 * этом только потеряв текст.
	 */
	const autosaveFailureReportedRef = useRef(false);

	// ── Cleanup & load on visitId change
	useEffect(() => {
		let alive = true;

		setDiary(EMPTY_DIARY);
		setIcdSearch("");
		setShowPreview(false);
		setIsLocked(false);
		setDiaryId(null);
		setLockedAt(null);
		setDiaryHash(null);
		setHasCryptoSignature(false);
		setLastSavedAt(null);
		setRevisionCount(0);
		/*
		 * Лоток обязан сбрасываться при смене приёма.
		 *
		 * БЫЛО: trayBarcode жил в state между visitId. Загрузка нового дневника
		 * ставила barcode только если instrumentTrayBarcode truthy — иначе
		 * оставался штрихкод ПРОШЛОГО приёма. Автосохранение/подпись писали
		 * чужой лоток в visit_diaries и /api/sterilization/link: в 043/у и
		 * журнале стерилизации оказывалась чужая упаковка.
		 */
		setTrayBarcode(null);
		setIsRevising(false);
		setRevisionReason("");
		setIsRevisingBusy(false);
		setReviseSnapshot(null);
		setLoadState({ phase: "loading" });
		autosaveFailureReportedRef.current = false;


		/** Отказ чтения: состояние + сообщение человеку с подсказкой что делать. */
		const reportLoadFailure = (status: number | null) => {
			if (!alive) return;
			setLoadState({ phase: "failed", status });
			const text = panelStateText(DIARY_SUBJECT, { phase: "failed", status });
			// 14 секунд вместо обычных 4: это предупреждение о потере записи,
			// его надо успеть прочитать целиком.
			showToast(`${text.title} ${text.hint}`, "error", 14000);
		};

		const loadDiary = async () => {
			let status: number | null = null;
			/* Секрет берётся на момент запроса, а не на момент рендера эффекта. */
			const headerSource = authRef.current;
			try {
				const response = await fetch(`/api/diaries/visit/${visitId}`, {
					headers:
						headerSource && typeof headerSource.denteClinicalReadHeaders === "function"
							? headerSource.denteClinicalReadHeaders()
							: {},
				});
				status = response.status;
				// Тело читается один раз строкой: на пустом теле res.json() бросает
				// исключение с английским текстом, и прежний catch превращал это в
				// то же ложное «дневник пуст».
				const rawBody = await response.text();
				if (!response.ok) {
					console.error(`[diary load] ${status} ${rawBody.slice(0, 300)}`);
					reportLoadFailure(status);
					return;
				}
				const payload = jsonObjectOrNull(rawBody);
				if (!payload) {
					// Успешный статус с нечитаемым или пустым телом — испорченный
					// ответ, а не отсутствие дневника.
					console.error(`[diary load] ${status}: тело ответа не разобрано`);
					reportLoadFailure(status);
					return;
				}
				if (!alive) return;
				const diaryRow = payload.diary;
				// Сервер отвечает { diary: null }, когда дневника у приёма ещё нет
				// (routes/diary.ts). Это единственная честная пустота.
				if (!diaryRow || typeof diaryRow !== "object") {
					setLoadState({ phase: "empty" });
					return;
				}
				const d = diaryRow as Record<string, any>;
				setDiary({
					anamnesis: d.anamnesis ?? "",
					statusLocalis: d.statusLocalis ?? "",
					diagnosisIcd10: d.diagnosisIcd10 ?? "",
					diagnosisTooth: d.diagnosisTooth ?? "",
					treatmentDescription: d.treatmentDescription ?? "",
					complications: d.complications ?? "",
					comorbidities: d.comorbidities ?? "",
				});
				if (d.instrumentTrayBarcode) setTrayBarcode(d.instrumentTrayBarcode);
				setIsLocked(d.isLocked ?? false);
				setDiaryId(d.id ?? null);
				setLockedAt(d.lockedAt ?? null);
				setDiaryHash(d.diaryHash ?? null);
				setHasCryptoSignature(
					typeof d.cryptoSignaturePkcs7 === "string" &&
						d.cryptoSignaturePkcs7.length > 0,
				);
				if (d.diagnosisIcd10) setIcdSearch(d.diagnosisIcd10);
				setLoadState({ phase: "ready" });
				if (typeof d.id === "string" && d.id) {
					// Ревизии — отдельный запрос, и его отказ не отменяет того, что
					// сам дневник прочитан. Проверка ok здесь нужна, потому что
					// тело ошибки тоже разбирается, а `rd.revisions` в нём нет:
					// ревизий становилось «0», и пометка «⚠ Ревизий: N» в форме
					// 043/у пропадала у дневника, который правили после подписи.
					try {
						const revisionsResponse = await fetch(`/api/diaries/${d.id}/revisions`, {
							headers:
								headerSource && typeof headerSource.denteClinicalReadHeaders === "function"
									? headerSource.denteClinicalReadHeaders()
									: {},
						});
						const revisionsBody = await revisionsResponse.text();
						if (!revisionsResponse.ok) {
							console.error(
								`[diary revisions] ${revisionsResponse.status} ${revisionsBody.slice(0, 200)}`,
							);
							return;
						}
						const revisionsPayload = jsonObjectOrNull(revisionsBody);
						const revisions = revisionsPayload?.revisions;
						if (alive && Array.isArray(revisions)) setRevisionCount(revisions.length);
					} catch (revisionsError) {
						console.error("[diary revisions] запрос не выполнен", revisionsError);
					}
				}
			} catch (error) {
				// Сюда попадает обрыв сети и выключенный сервер клиники: тогда status
				// так и остаётся null, и текст скажет «сервер не ответил». Если ответ
				// уже пришёл, а порвалось чтение тела, код сохраняется — сообщение
				// будет про непонятный ответ, а не про отсутствие сети.
				console.error("[diary load] запрос не выполнен", error);
				reportLoadFailure(status);
			}
		};

		void loadDiary();

		return () => {
			alive = false;
			setDiary(EMPTY_DIARY);
			setIcdSearch("");
			setShowPreview(false);
			if (autosaveRef.current) clearInterval(autosaveRef.current);
			useVisitStore.getState().setDraft(null);
		};
	}, [visitId, reloadToken]);

	/** Повторное чтение с сервера (кнопка в PanelLoadFailure). */
	const reloadDiary = useCallback(() => {
		setReloadToken((token) => token + 1);
	}, []);

	/*
	 * Prefill SOAP из ЭМК, только когда дневника на сервере ещё нет.
	 *
	 * БЫЛО: load phase "empty" оставлял EMPTY_DIARY, хотя visits.complaint /
	 * anamnesis / objectiveStatus / treatmentPlan (visitNoteForm) уже заполнены
	 * в том же приёме. Врач перепечатывал анамнез в S, осмотр в O, план в P.
	 *
	 * Только empty — ready/loading/failed не трогаем. Только пустые поля
	 * дневника — набранный текст не затираем. Источник: visitNoteForm в store
	 * (тот же, что ЭМК); если форма ещё пуста — поля activeVisit со сводки.
	 * Чужой приём (activeVisit.id !== visitId) не подмешиваем.
	 */
	const visitNoteForm = useVisitStore((s) => s.visitNoteForm);
	const activeVisit = appLogic?.dashboard?.activeVisit ?? null;

	useEffect(() => {
		if (loadState.phase !== "empty") return;
		const openVisitId =
			activeVisit && typeof activeVisit === "object" && "id" in activeVisit
				? (activeVisit as { id?: unknown }).id
				: undefined;
		if (typeof openVisitId === "string" && openVisitId && openVisitId !== visitId) {
			return;
		}

		const formFromStore = visitNoteForm ?? {};
		const visitRow =
			activeVisit && typeof activeVisit === "object"
				? (activeVisit as Record<string, unknown>)
				: null;
		const pick = (key: "complaint" | "anamnesis" | "objectiveStatus" | "diagnosis" | "treatmentPlan") => {
			const fromForm = formFromStore[key];
			if (typeof fromForm === "string" && fromForm.trim()) return fromForm;
			const fromVisit = visitRow?.[key];
			return typeof fromVisit === "string" ? fromVisit : "";
		};
		const prefill = soapPrefillFromVisitNote({
			complaint: pick("complaint"),
			anamnesis: pick("anamnesis"),
			objectiveStatus: pick("objectiveStatus"),
			diagnosis: pick("diagnosis"),
			treatmentPlan: pick("treatmentPlan"),
		});
		if (Object.keys(prefill).length === 0) return;

		setDiary((prev) => {
			let changed = false;
			const next: DiaryState = { ...prev };
			(Object.keys(prefill) as Array<keyof DiaryState>).forEach((key) => {
				const incoming = prefill[key];
				if (typeof incoming !== "string" || !incoming) return;
				if ((prev[key] ?? "").trim()) return;
				next[key] = incoming;
				changed = true;
			});
			return changed ? next : prev;
		});
		if (prefill.diagnosisIcd10) {
			setIcdSearch((current) => (current.trim() ? current : prefill.diagnosisIcd10 ?? current));
		}
	}, [
		loadState.phase,
		visitId,
		visitNoteForm,
		activeVisit,
	]);

	// ── Resize textareas

	useEffect(() => {
		const autoResize = (el: HTMLTextAreaElement) => {
			el.style.height = "auto";
			el.style.height = el.scrollHeight + "px";
		};
		document
			.querySelectorAll<HTMLTextAreaElement>(".auto-resize-ta")
			.forEach(autoResize);
	}, [diary, isLocked]);

	// ── Click outside ICD dropdown
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (icdRef.current && !icdRef.current.contains(e.target as Node)) {
				setShowIcdDropdown(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// ── Save
	/**
	 * Сохраняет черновик дневника на сервер.
	 * @returns { id, hash } при успехе (hash — отпечаток для КриптоПро до /lock), иначе null.
	 */
	const doSave = useCallback(
		async (
			silent = false,
		): Promise<{ id: string; hash: string | null } | null> => {
			if (isLocked) {
				return diaryId ? { id: diaryId, hash: diaryHash } : null;
			}

			if (!activeDoctor) {
				if (!silent) showToast("Выберите врача для приема", "error");
				return null;
			}
			/*
			 * Пока дневник не прочитан, сохранять нельзя.
			 *
			 * ПОЧЕМУ. Сервер (POST /api/diaries) перезаписывает клинические поля,
			 * которые ПРИСУТСТВУЮТ в запросе, включая пустую строку — так сделано
			 * специально, чтобы врач мог удалить ошибочный текст. А эта форма всегда
			 * отправляет все семь полей. Значит сохранение из состояния «прочитать не
			 * удалось» отправило бы пустые поля поверх сохранённого анамнеза. Текст,
			 * который врач успел набрать, остаётся на экране — он не теряется.
			 */
			if (loadState.phase === "loading") {
				if (!silent) {
					showToast(
						"Дневник приёма ещё читается с сервера. Подождите пару секунд и сохраните снова — набранный текст останется на экране.",
						"info",
						8000,
					);
				}
				return null;
			}
			if (loadState.phase === "failed") {
				if (!silent) {
					showToast(
						`Черновик не сохранён: ${requestFailureCause(loadState.status)}. Записи приёма не прочитаны, поэтому сохранять поверх них нельзя — обновите страницу; набранный текст останется на экране, скопируйте его перед обновлением.`,
						"error",
						14000,
					);
				}
				return null;
			}
			setIsSaving(true);
			try {
				/*
				 * БЫЛО: PUT /api/visits/:id/draft/autosave с полями дневника 043/у.
				 * Тот маршрут — снимок ЭМК (transcript + visitNoteDraft), схема другая.
				 * Тело дневника там всегда ValidationError, id дневника не возвращался,
				 * doLock видел diaryId=null и отказывался подписывать. Клинические поля
				 * в visit_diaries не писались — «Сохранить черновик» не попадало в дневник.
				 *
				 * Сейчас: POST /api/diaries (draft) — тот же контракт, что load/lock,
				 * с clinical mutation headers и message-first toast (json.message).
				 */
				const headerSource = authRef.current;
				const res = await fetch("/api/diaries", {
					method: "POST",
					headers:
						headerSource && typeof headerSource.denteClinicalMutationHeaders === "function"
							? headerSource.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
					body: JSON.stringify({
						visitId,
						patientId,
						status: "draft",
						instrumentTrayBarcode: trayBarcode || undefined,
						anamnesis: diary.anamnesis,
						statusLocalis: diary.statusLocalis,
						diagnosisIcd10: diary.diagnosisIcd10,
						diagnosisTooth: diary.diagnosisTooth,
						treatmentDescription: diary.treatmentDescription,
						complications: diary.complications,
						comorbidities: diary.comorbidities,
					}),
				});
				const rawBody = await res.text();
				if (!res.ok) {
					// Код и сырое тело — в консоль. Врачу — русское message с сервера,
					// иначе status-only fallback. ValidationError от Zod guard доходит.
					console.error(`[diary save] ${res.status} ${rawBody.slice(0, 300)}`);
					const payload = jsonObjectOrNull(rawBody);
					const serverDetail = operatorReadableErrorDetail(
						typeof payload?.message === "string"
							? payload.message
							: typeof payload?.error === "string"
								? payload.error
								: null,
					);
					const message = `${
						serverDetail ??
						actionFailureToast("Черновик дневника не сохранён", res.status)
					} Набранный текст остался на экране.`;
					if (!silent) {
						showToast(message, "error", 10000);
					} else if (!autosaveFailureReportedRef.current) {
						autosaveFailureReportedRef.current = true;
						showToast(
							`${message} Автосохранение не работает — сохраняйте вручную и не закрывайте приём, пока не появится отметка времени.`,
							"error",
							14000,
						);
					}
					return null;
				}
				// Успех POST /api/diaries: { success, id, hash } — не { diary: { id } }.
				const data = jsonObjectOrNull(rawBody);
				const savedId = typeof data?.id === "string" ? data.id : undefined;
				if (savedId) setDiaryId(savedId);
				/*
				 * Отпечаток черновика с сервера. БЫЛО: doSave игнорировал data.hash
				 * (он всегда был null). CryptoProSigner требует diaryHash для УКЭП —
				 * без него вкладка «КриптоПро» навсегда «недоступна». Сервер теперь
				 * считает и отдаёт hash при draft; кладём в state до открытия окна.
				 */
				if (typeof data?.hash === "string" && data.hash) {
					setDiaryHash(data.hash);
				}
				// После первого сохранения пустой приём перестаёт быть «empty»:
				// подпись и повторное чтение опираются на ready + diaryId.
				if (loadState.phase === "empty") {
					setLoadState({ phase: "ready" });
				}

				autosaveFailureReportedRef.current = false;
				setLastSavedAt(new Date());
				if (!silent) showToast("Черновик сохранен", "success");
				const resolvedId = savedId ?? diaryId;
				if (!resolvedId) return null;
				const resolvedHash =
					typeof data?.hash === "string" && data.hash
						? data.hash
						: diaryHash;
				return { id: resolvedId, hash: resolvedHash };
			} catch (err) {
				// До сервера не дошли: сеть или выключенный сервер клиники.
				console.error("[diary save] запрос не выполнен", err);
				const message = `${actionFailureToast("Черновик дневника не сохранён", null)} Набранный текст остался на экране.`;
				if (!silent) {
					showToast(message, "error", 10000);
				} else if (!autosaveFailureReportedRef.current) {
					autosaveFailureReportedRef.current = true;
					showToast(message, "error", 14000);
				}
				return null;
			} finally {
				setIsSaving(false);
			}
		},
		[activeDoctor, diary, diaryHash, diaryId, isLocked, loadState, patientId, trayBarcode, visitId],
	);

	// ── Autosave
	useEffect(() => {
		if (autosaveRef.current) clearInterval(autosaveRef.current);
		// В режиме ревизии автосохранение молчит: черновик POST /api/diaries
		// для подписанного дневника не подходит — только POST …/revise.
		if (isLocked || isRevising) return;
		autosaveRef.current = setInterval(() => {
			void doSave(true);
		}, 30000);
		return () => {
			if (autosaveRef.current) clearInterval(autosaveRef.current);
		};
	}, [doSave, isLocked, isRevising]);

	/**
	 * Правка уже подписанного дневника (admin-only на API).
	 *
	 * БЫЛО: POST /api/diaries/:id/revise существовал (сохраняет прежний текст
	 * в visit_diary_revisions и обновляет поля), GET …/revisions уже читался
	 * для счётчика — но кнопки «Исправить» на экране не было. Администратор
	 * не мог исправить опечатку в подписанной 043/у без SQL.
	 *
	 * Поля остаются locked на экране, пока isRevising=false. В режиме ревизии
	 * поля открываются; отправка идёт на /revise с reason; дневник остаётся
	 * подписанным (isLocked true), hash и revisionCount обновляются.
	 */
	const beginRevise = useCallback(() => {
		if (!isLocked || !diaryId) {
			showToast(
				"Исправлять можно только уже подписанный дневник. Сначала сохраните и подпишите запись.",
				"info",
				10000,
			);
			return;
		}
		/*
		 * Снимок до правок: cancelRevise восстановит ровно эти поля.
		 * Без снимка «Отмена» оставляла набранный текст на экране подписанной 043/у.
		 */
		setReviseSnapshot({ ...diary });
		setIsRevising(true);
		setRevisionReason("");
	}, [diary, diaryId, isLocked]);

	const cancelRevise = useCallback(() => {
		/*
		 * БЫЛО: только isRevising=false. Поля diary уже изменены в textarea —
		 * после отмены UI и печать 043/у показывали неотменённую правку как
		 * подписанный текст, хотя сервер не принимал revise.
		 */
		if (reviseSnapshot) {
			setDiary(reviseSnapshot);
		}
		setReviseSnapshot(null);
		setIsRevising(false);
		setRevisionReason("");
	}, [reviseSnapshot]);

	const doRevise = useCallback(async () => {
		if (!diaryId) {
			showToast(
				"Дневник ещё не сохранён на сервере — исправлять нечего. Обновите страницу.",
				"error",
				12000,
			);
			return;
		}
		if (!isLocked) {
			showToast("Дневник не подписан — просто отредактируйте и сохраните черновик.", "info", 8000);
			return;
		}
		const reason = revisionReason.trim();
		if (reason.length < 3) {
			showToast(
				"Укажите причину правки (не короче трёх символов) — она нужна для истории дневника.",
				"error",
				10000,
			);
			return;
		}
		setIsRevisingBusy(true);
		try {
			const headerSource = authRef.current;
			const res = await fetch(`/api/diaries/${diaryId}/revise`, {
				method: "POST",
				headers:
					headerSource && typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify({
					anamnesis: diary.anamnesis,
					statusLocalis: diary.statusLocalis,
					diagnosisIcd10: diary.diagnosisIcd10,
					diagnosisTooth: diary.diagnosisTooth,
					treatmentDescription: diary.treatmentDescription,
					/*
					 * complications/comorbidities — поля visit_diaries и UI 043/у.
					 * БЫЛО: doRevise их не слал; API revise тоже игнорировал.
					 * Админ правил «Осложнения»/«Сопутствующие» в режиме Исправить —
					 * после сохранения оставался старый текст в подписанной 043/у.
					 */
					complications: diary.complications,
					comorbidities: diary.comorbidities,
					revisionReason: reason,
				}),
			});
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);
			if (res.ok) {
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				/*
				 * После revise сервер обнуляет PKCS#7. Без сброса флага печать
				 * 043/у продолжала бы штамп «ЭЦП» при пустом crypto_signature_pkcs7.
				 */
				if (json?.cryptoSignatureAttached === true) {
					setHasCryptoSignature(true);
				} else {
					setHasCryptoSignature(false);
				}
				if (typeof json?.revisionCount === "number") {
					setRevisionCount(json.revisionCount);
				} else {
					setRevisionCount((n) => n + 1);
				}
				setIsRevising(false);
				setRevisionReason("");
				setReviseSnapshot(null);
				setLastSavedAt(new Date());
				// Дневник остаётся подписанным: API не снимает isLocked.
				setIsLocked(true);
				showToast(
					`Правка сохранена. Прежний текст остался в истории (ревизий: ${
						typeof json?.revisionCount === "number" ? json.revisionCount : "…"
					}).`,
					"success",
					10000,
				);
				return;
			}
			console.error(`[diary revise] ${res.status} ${rawBody.slice(0, 300)}`);
			const detail = operatorReadableErrorDetail(
				typeof json?.message === "string" ? json.message : null,
			);
			// 403 OnlyAdminsCanRevise — сервер уже отдаёт полный RU текст.
			showToast(
				detail ??
					(res.status === 403
						? "Исправить подписанный дневник может только администратор клиники. Позовите администратора."
						: `Правка не сохранена: ${requestFailureCause(res.status)}. Набранный текст остался на экране.`),
				"error",
				14000,
			);
		} catch (error) {
			console.error("[diary revise] запрос не выполнен", error);
			showToast(
				`Правка не сохранена: ${requestFailureCause(null)}. Набранный текст остался на экране.`,
				"error",
				12000,
			);
		} finally {
			setIsRevisingBusy(false);
		}
	}, [diary, diaryId, isLocked, revisionReason]);

	// ── Lock (Sign & Seal)

	const doLock = async (
		certThumbprint: string,
		pkcs7Signature: string,
		/** Crypto-path: draft already saved+signed - skip second doSave. */
		alreadySavedId?: string | null,
	) => {
		if (!activeDoctor) {
			showToast("Сначала выберите врача для приема!", "error");
			return;
		}
		// Подписывать непрочитанную запись нельзя по той же причине, что и
		// сохранять: на сервере может лежать уже подписанный дневник, а на экране
		// пустые поля.
		if (loadState.phase !== "ready" && loadState.phase !== "empty") {
			showToast(
				loadState.phase === "loading"
					? "Дневник приёма ещё читается с сервера — подождите пару секунд и повторите подписание."
					: `Подписать нельзя: ${requestFailureCause(loadState.status)}. Записи приёма не прочитаны — обновите страницу и убедитесь, что видите свой текст, прежде чем подписывать.`,
				"error",
				14000,
			);
			return;
		}

		// doSave returns {id,hash}; setState not yet visible in this closure.
		// Crypto-path: alreadySavedId means draft was saved before PKCS7 -
		// a second save after sign would change hash and break ECP integrity.
		let savedDiaryId: string | null = alreadySavedId ?? null;
		if (!savedDiaryId) {
			const savedDraft = await doSave(true);
			savedDiaryId = savedDraft?.id ?? null;
		}

		if (trayBarcode) {
			try {
				const linkRes = await fetch("/api/sterilization/link", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ visitId, barcode: trayBarcode }),
				});
				if (!linkRes.ok) {
					// БЫЛО: на экран печаталось поле `error` из ответа, а сервер отдаёт
					// там машинный код по-английски («Invalid or failed sterilization
					// barcode», routes/sterilization.ts). Врач у кресла читал латиницу
					// вместо указания что делать. Русское `message`, если сервер его
					// пришлёт, показываем как есть — но код не показываем никогда.
					const rawBody = await linkRes.text();
					console.error(`[sterilization link] ${linkRes.status} ${rawBody.slice(0, 300)}`);
					const payload = jsonObjectOrNull(rawBody);
					const detail = operatorReadableErrorDetail(
						typeof payload?.message === "string" ? payload.message : null,
					);
					showToast(
						detail ??
							(linkRes.status === 400
								? `Лоток ${trayBarcode} не подтверждён журналом стерилизации: такого штрихкода нет или цикл не пройден. Проверьте штрихкод на упаковке или отсканируйте другой лоток.`
								: `Штрихкод лотка не проверен: ${requestFailureCause(linkRes.status)}.`),
						"error",
						12000,
					);
					return;
				}
			} catch (e) {
				console.error("[sterilization link] запрос не выполнен", e);
				showToast(
					`Штрихкод лотка не проверен: ${requestFailureCause(null)}. Дневник не подписан.`,
					"error",
					12000,
				);
				return;
			}
		}

		/*
		 * БЫЛО: `const target = diaryId ?? visitId`. Маршрут /lock ищет дневник по
		 * ЕГО идентификатору (visitDiaries.id), а не по идентификатору приёма,
		 * поэтому подстановка visitId давала гарантированный 404, и врач видел на
		 * экране «Ошибка: NotFound» — латиницей и без объяснения. Теперь причина
		 * называется словами: подписывать нечего, пока дневник не сохранён.
		 */
		const lockTargetId = savedDiaryId ?? diaryId;
		if (!lockTargetId) {
			showToast(
				"Дневник ещё не сохранён на сервере, поэтому подписывать нечего. Нажмите «Сохранить черновик», дождитесь отметки времени сохранения и повторите подписание.",
				"error",
				14000,
			);
			return;
		}
		try {
			/*
			 * Подписание — запись, поэтому заголовки мутации. Без них охрана
			 * requireClinicalMutationAccess отвечает 403, и приём остаётся
			 * незакрытым: подписать дневник в клинике было нечем.
			 */
			const headerSource = authRef.current;
			const res = await fetch(`/api/diaries/${lockTargetId}/lock`, {
				method: "POST",
				headers:
					headerSource && typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify({ pkcs7Signature }),
			});
			// Тело читается строкой: у отказа оно может быть пустым, и прежний
			// res.json() бросал исключение до проверки res.ok — отказ подписания
			// показывался как «Ошибка сети при подписании».
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);
			if (res.ok) {
				setIsLocked(true);
				/*
				 * Дата подписи — с сервера (lockedAt в ответе /lock), не new Date()
				 * на клиенте. БЫЛО: клиентские часы. Печать 043/у и штамп ЭЦП
				 * брали время ПК врача; при сдвиге часов или печати с другого
				 * рабочего места дата в форме расходилась с locked_at в БД.
				 */
				setLockedAt(
					typeof json?.lockedAt === "string" && json.lockedAt
						? json.lockedAt
						: new Date().toISOString(),
				);
				setDiaryHash(typeof json?.hash === "string" ? json.hash : null);
				/*
				 * Оттиск УКЭП: true если сервер подтвердил PKCS#7 / re-attach,
				 * иначе — если мы сами отправили непустой pkcs7Signature
				 * (первый lock). PIN:<…> тоже пишется в crypto_signature_pkcs7.
				 */
				if (json?.cryptoSignatureAttached === true) {
					setHasCryptoSignature(true);
				} else if (
					typeof pkcs7Signature === "string" &&
					pkcs7Signature.length > 0
				) {
					setHasCryptoSignature(true);
				} else if (json?.cryptoSignatureAttached === false) {
					setHasCryptoSignature(false);
				}
				showToast(
					json?.reattached
						? "Оттиск УКЭП прикреплён к отредактированному дневнику."
						: "Дневник подписан и заблокирован (ЭЦП врача).",
					"success",
				);
			} else if (res.status === 409) {
				setIsLocked(true);
				// 409 AlreadyLocked: hash + lockedAt с сервера — печать 043/у
				// не остаётся без даты подписи и без штампа ЭЦП.
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				if (typeof json?.lockedAt === "string" && json.lockedAt) {
					setLockedAt(json.lockedAt);
				}
				if (typeof json?.cryptoSignatureAttached === "boolean") {
					setHasCryptoSignature(json.cryptoSignatureAttached);
				}
				showToast(
					typeof json?.message === "string" && json.message
						? json.message
						: "Дневник уже был подписан ранее.",
					"info",
					12000,
				);
			} else {


				console.error(`[diary lock] ${res.status} ${rawBody.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(
					typeof json?.message === "string" ? json.message : null,
				);
				showToast(
					detail ?? `Дневник не подписан: ${requestFailureCause(res.status)}.`,
					"error",
					12000,
				);
			}
		} catch (error) {
			console.error("[diary lock] запрос не выполнен", error);
			showToast(
				`Дневник не подписан: ${requestFailureCause(null)}. Набранный текст остался на экране.`,
				"error",
				12000,
			);
		}
	};

	return {
		diary,
		setDiary,
		diaryId,
		/**
		 * Состояние чтения для разметки: три отдельных состояния вместо одной
		 * пустой формы. Готовый текст лежит в `loadStateText`, чтобы формулировка
		 * не расходилась с остальными панелями.
		 */
		loadState,
		loadStateText:
			loadState.phase === "ready"
				? null
				: panelStateText(
						DIARY_SUBJECT,
						loadState.phase === "failed"
							? { phase: "failed", status: loadState.status }
							: { phase: loadState.phase },
					),
		diarySubject: DIARY_SUBJECT,
		reloadDiary,
		isLocked,
		lockedAt,
		diaryHash,
		hasCryptoSignature,
		lastSavedAt,
		revisionCount,
		isSaving,
		showScanner,
		setShowScanner,
		trayBarcode,
		setTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		doLock,
		isRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		beginRevise,
		cancelRevise,
		doRevise,
		icdRef,
	};
}

