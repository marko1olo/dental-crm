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
import { readDenteClinicToken } from "../lib/safeLocalStorage";

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
		setLastSavedAt(null);
		setRevisionCount(0);
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
	}, [visitId]);

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
	const doSave = useCallback(
		async (silent = false) => {
			if (isLocked) return;
			if (!activeDoctor) {
				if (!silent) showToast("Выберите врача для приема", "error");
				return;
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
				return;
			}
			if (loadState.phase === "failed") {
				if (!silent) {
					showToast(
						`Черновик не сохранён: ${requestFailureCause(loadState.status)}. Записи приёма не прочитаны, поэтому сохранять поверх них нельзя — обновите страницу; набранный текст останется на экране, скопируйте его перед обновлением.`,
						"error",
						14000,
					);
				}
				return;
			}
			setIsSaving(true);
			try {
				const clinicToken = readDenteClinicToken() || null;
				const res = await fetch(`/api/visits/${visitId}/draft/autosave`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"x-dente-clinic-token": clinicToken || "",
					},
					body: JSON.stringify({
						patientId,
						doctorId: activeDoctor.id,
						instrumentTrayBarcode: trayBarcode || null,
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
					// Код ответа и тело — разработчику в консоль, человеку — причина
					// словами. Прежнее «Ошибка сохранения дневника» не говорило ни
					// почему, ни что делать, а тихое автосохранение молчало вовсе.
					console.error(`[diary autosave] ${res.status} ${rawBody.slice(0, 300)}`);
					const message = `${actionFailureToast("Черновик дневника не сохранён", res.status)} Набранный текст остался на экране.`;
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
					return;
				}
				const data = jsonObjectOrNull(rawBody);
				const savedDiary = data?.diary;
				const savedId =
					savedDiary && typeof savedDiary === "object"
						? (savedDiary as Record<string, unknown>).id
						: undefined;
				if (typeof savedId === "string" && savedId) setDiaryId(savedId);
				autosaveFailureReportedRef.current = false;
				setLastSavedAt(new Date());
				if (!silent) showToast("Черновик сохранен", "success");
			} catch (err) {
				// До сервера не дошли: сеть или выключенный сервер клиники.
				console.error("[diary autosave] запрос не выполнен", err);
				const message = `${actionFailureToast("Черновик дневника не сохранён", null)} Набранный текст остался на экране.`;
				if (!silent) {
					showToast(message, "error", 10000);
				} else if (!autosaveFailureReportedRef.current) {
					autosaveFailureReportedRef.current = true;
					showToast(message, "error", 14000);
				}
			} finally {
				setIsSaving(false);
			}
		},
		[activeDoctor, diary, isLocked, loadState, patientId, trayBarcode, visitId],
	);

	// ── Autosave
	useEffect(() => {
		if (autosaveRef.current) clearInterval(autosaveRef.current);
		autosaveRef.current = setInterval(() => {
			doSave(true);
		}, 30000);
		return () => clearInterval(autosaveRef.current!);
	}, [doSave]);

	// ── Lock (Sign & Seal)
	const doLock = async (certThumbprint: string, pkcs7Signature: string) => {
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

		await doSave(true);

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
		if (!diaryId) {
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
			const res = await fetch(`/api/diaries/${diaryId}/lock`, {
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
				setLockedAt(new Date().toISOString());
				setDiaryHash(typeof json?.hash === "string" ? json.hash : null);
				showToast("Дневник подписан и заблокирован (ЭЦП врача).", "success");
			} else if (res.status === 409) {
				setIsLocked(true);
				showToast("Дневник уже был подписан ранее.", "info");
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
		isLocked,
		lockedAt,
		diaryHash,
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
		icdRef,
	};
}
