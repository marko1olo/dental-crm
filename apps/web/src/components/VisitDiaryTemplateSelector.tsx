import { Clipboard, Download, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { actionFailureToast } from "../lib/panelStateText";
import { logger } from "../utils/logger";
import { showToast } from "./GlobalToast";

export interface Template {
	id: string;
	title: string;
	category?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
	/** Встроенный протокол — DELETE /api/templates/:id отвечает 403 CannotDeleteBuiltIn. */
	isBuiltIn?: boolean;
}

export const CANONICAL_SOAP_TEMPLATES: Record<
	"caries" | "pulpitis" | "periodontitis" | "hygiene",
	Template
> = {
	caries: {
		id: "canonical_caries_k021",
		title: "Кариес дентина K02.1",
		category: "Терапия",
		defaultIcd10: "K02.1",
		prefilledAnamnesis:
			"Соматически здоров. Аллергоанамнез не отягощен. Вредных привычек нет. Зуб ранее не лечен / пломбирован более 2 лет назад. Жалобы на кратковременные боли от холодного/сладкого, быстро проходящие после устранения раздражителя.",
		prefilledObjective:
			"Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Регионарные лимфоузлы не увеличены, безболезненны. Кариозная полость средней глубины в пределах дентина. Зондирование эмалево-дентинной границы слабо чувствительно, дно и стенки плотные. Перкуссия безболезненна. Термопроба положительна, быстропроходящая. ЭОД 6–8 мкА.",
		prefilledTreatment:
			"Инфильтрационная анестезия (Артикаин 4% с эпинефрином 1:100 000 — 1.7 мл). Препарирование кариозной полости, полная некрэктомия. Изоляция коффердамом. Медикаментозная обработка 2% хлоргексидином. Тотальное травление 37% ортофосфорной кислотой (эмаль 20 сек, дентин 10 сек). Нанесение адгезивной системы (OptiBond FL), полимеризация 20 сек. Послойная реставрация нанокомпозитом светового отверждения (Estelite Sigma Quick) с моделированием анатомической формы бугров и фиссур. Шлифовка, полировка пастами до сухого блеска. Контроль окклюзии.",
		isBuiltIn: true,
	},
	pulpitis: {
		id: "canonical_pulpitis_k040",
		title: "Острый пульпит K04.0",
		category: "Терапия",
		defaultIcd10: "K04.0",
		prefilledAnamnesis:
			"Соматически здоров. Аллергоанамнез не отягощен. Вредных привычек нет. Самопроизвольные приступообразные ночные боли с иррадиацией по ходу ветвей тройничного нерва в течение последних 1–2 дней. Прием анальгетиков с неполным кратковременным эффектом.",
		prefilledObjective:
			"Слизистая оболочка полости рта бледно-розовая, влажная. Регионарные лимфоузлы не увеличены. Глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки рога пульпы резко болезненно, пульпа кровоточит. Перкуссия слабочувствительна. Термопроба резко положительна, длительная (более 1–2 мин). ЭОД 35–45 мкА.",
		prefilledTreatment:
			"Проводниковая/инфильтрационная анестезия (Артикаин 4% с эпинефрином 1:100 000 — 1.7 мл). Раскрытие полости зуба, создание прямого эндодонтического доступа. Коффердам. Витальная экстирпация пульпы. Определение рабочей длины корневых каналов апекслокатором. Механическая обработка каналов машинными Ni-Ti инструментами (ProTaper) под контролем эндомотора. Обильная ирригация NaOCl 3% с УЗ-активацией и 17% гелем ЭДТА. Высушивание стерильными бумажными штифтами. Трехмерная обтурация каналов эпоксидным силером (AH Plus) и гуттаперчевыми штифтами. Рентген-контроль обтурации. Временная повязка.",
		isBuiltIn: true,
	},
	periodontitis: {
		id: "canonical_periodontitis_k045",
		title: "Периодонтит K04.5",
		category: "Терапия",
		defaultIcd10: "K04.5",
		prefilledAnamnesis:
			"Соматически здоров. Аллергоанамнез не отягощен. Вредных привычек нет. Постоянные ноющие боли, усиливающиеся при накусывании на зуб, чувство «выросшего» зуба. Зуб ранее лечен эндодонтически более 2 лет назад.",
		prefilledObjective:
			"Слизистая оболочка полости рта бледно-розовая. Пальпация по переходной складке в проекции верхушки корня слабочувствительна. Коронковая часть зуба изменена в цвете, дефект пломбы. Перкуссия вертикальная резко болезненна. Зондирование устьев безболезненно. ЭОД > 100 мкА. Рентгенограмма: деструкция костной ткани в периапикальной области у верхушки корня.",
		prefilledTreatment:
			"Инфильтрационная анестезия (Артикаин 4% 1.7 мл). Трепанация / удаление старой пломбы. Коффердам. Распломбирование корневых каналов, механическая и медикаментозная обработка (NaOCl 3%, ЭДТА 17%, УЗ-активация). Прохождение до физиологического апекса под контролем апекслокатора. Временное пломбирование каналов лечебной пастой гидроксида кальция (Calcept) для купирования периапикального воспаления. Герметичная временная пломба (СИЦ).",
		isBuiltIn: true,
	},
	hygiene: {
		id: "canonical_hygiene_k050",
		title: "Профгигиена K05.0",
		category: "Гигиена",
		defaultIcd10: "K05.0",
		prefilledAnamnesis:
			"Соматически здоров. Аллергоанамнез не отягощен. Вредных привычек нет. Жалоб активно не предъявляет. Обратился для планового профилактического осмотра и профессиональной гигиены полости рта. Последняя профгигиена более 6 месяцев назад.",
		prefilledObjective:
			"Слизистая оболочка полости рта бледно-розовая, влажная. Регионарные лимфоузлы не пальпируются. Десневой край в области фронтальных зубов умеренно гиперемирован, отечен. Обильные наддесневые и поддесневые минерализованные зубные отложения, плотный пигментированный налет. Патологических зубодесневых карманов нет (глубина бороздки 1–2 мм).",
		prefilledTreatment:
			"Индикация зубного налета. Аппликационная анестезия десны. Ультразвуковой скейлинг (удаление над- и поддесневого зубного камня с водяным охлаждением). Снятие пигментированного налета порошкоструйным аппаратом Air-Flow (мелкодисперсный порошок глицина). Полировка поверхностей зубов абразивной пастой Cleanic и циркулярными щеточками, межзубные контакты обработаны флоссом. Глубокое фторирование эмали лаком Clinpro White Varnish. Индивидуальный подбор средств гигиены.",
		isBuiltIn: true,
	},
};

interface VisitDiaryTemplateSelectorProps {
	isLocked: boolean;
	onSelectTemplate: (template: Template) => void;
}

/**
 * Выбор клинического протокола на приёме + восстановление встроенных +
 * создание своего протокола.
 *
 * GET /api/templates сам ставит встроенные ТОЛЬКО если список клиники пуст.
 * Если посев упал (503 ClinicalTemplatesSeedFailed), в клинике только свои
 * протоколы без части встроенных, или врач открыл дневник до готовности базы —
 * без POST /api/templates/seed восстановить список нельзя: кнопки на экране
 * не было, CLI/SQL врачу недоступны. Здесь empty/503 → «Установить встроенные
 * протоколы»; при непустом списке — тихая ссылка «Восстановить встроенные».
 *
 * POST /api/templates создаёт свой (isBuiltIn: false) протокол с title +
 * необязательными category / prefilled* / defaultIcd10. Без UI врач мог только
 * seed/delete — свой протокол клиники (тот, что DELETE разрешает убрать)
 * создать с экрана приёма было нельзя.
 */
export function VisitDiaryTemplateSelector({
	isLocked,
	onSelectTemplate,
}: VisitDiaryTemplateSelectorProps) {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState("");
	const [loadStatus, setLoadStatus] = useState<number | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSeeding, setIsSeeding] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [createTitle, setCreateTitle] = useState("");
	const [createCategory, setCreateCategory] = useState("");
	const [createAnamnesis, setCreateAnamnesis] = useState("");
	const [createObjective, setCreateObjective] = useState("");
	const [createTreatment, setCreateTreatment] = useState("");
	const [createIcd10, setCreateIcd10] = useState("");
	const [seedError, setSeedError] = useState<string | null>(null);

	/*
	 * Источник заголовков берётся ТОЛЬКО из контекста приложения.
	 *
	 * ЧТО БЫЛО СЛОМАНО. `/api/templates` закрыт охраной requireClinicalReadAccess
	 * (routes/templates.ts): без заголовка `x-dente-admin-secret` она отвечает 403.
	 * Запрос шёл голым fetch, и на этой машине список шаблонов загружался только
	 * потому, что в корневом .env секрет закомментирован, а лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS включены. Лазейки живут, пока
	 * NODE_ENV !== "production", то есть у заказчика их нет: там список
	 * «Клинический шаблон» молча пуст, и врач набирает дневник с нуля.
	 *
	 * Одноимённый `auth` есть ещё и в AppHelpers.tsx, но тот НЕ подставляет секрет
	 * из сессии — только если передать его вторым аргументом. Брать заголовки
	 * оттуда значит скомпилироваться и всё равно получить 403 в клинике.
	 *
	 * ref, а не зависимость эффекта: useAuthLogic возвращает новый объект на
	 * каждый рендер провайдера, поэтому `auth` в зависимостях loadTemplates
	 * перезапрашивал бы шаблоны на каждое нажатие клавиши в дневнике.
	 */
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const authRef = useRef(auth);
	authRef.current = auth;

	const loadTemplates = useCallback(async () => {
		setIsLoading(true);
		setLoadFailed(false);
		setLoadStatus(null);
		setSeedError(null);
		try {
			const headerSource = authRef.current;
			const res = await fetch("/api/templates", {
				headers:
					headerSource &&
					typeof headerSource.denteClinicalReadHeaders === "function"
						? headerSource.denteClinicalReadHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
			});
			setLoadStatus(res.status);
			if (res.ok) {
				const data = await res.json();
				setTemplates(Array.isArray(data?.templates) ? data.templates : []);
				setLoadFailed(false);
			} else {
				setTemplates([]);
				setLoadFailed(true);
				// 503 ClinicalTemplatesSeedFailed — не «протоколов нет», а сбой установки.
				// Сообщение сервера показываем рядом с кнопкой посева, не гасим.
				try {
					const body = await res.json();
					const msg =
						typeof body?.message === "string" && body.message.trim()
							? body.message.trim()
							: null;
					if (msg) setSeedError(msg);
				} catch {
					/* тело не JSON — оставляем общий отказ */
				}
			}
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("Failed to load templates", error);
			setTemplates([]);
			setLoadFailed(true);
			setLoadStatus(null);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadTemplates();
	}, [loadTemplates]);

	const seedBuiltIns = useCallback(async () => {
		if (isSeeding || isLocked) return;
		setIsSeeding(true);
		setSeedError(null);
		try {
			const headerSource = authRef.current;
			const res = await fetch("/api/templates/seed", {
				method: "POST",
				headers:
					headerSource &&
					typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
			});
			if (!res.ok) {
				let serverMessage: string | null = null;
				try {
					const body = await res.json();
					if (typeof body?.message === "string" && body.message.trim()) {
						serverMessage = body.message.trim();
					}
				} catch {
					/* ignore */
				}
				const toastText =
					serverMessage ??
					actionFailureToast("Встроенные протоколы не установлены", res.status);
				setSeedError(toastText);
				showToast(toastText, "error");
				return;
			}
			let count: number | null = null;
			try {
				const body = await res.json();
				if (typeof body?.count === "number" && Number.isFinite(body.count)) {
					count = body.count;
				}
			} catch {
				/* ok without count */
			}
			showToast(
				count !== null
					? `Встроенные протоколы установлены · в списке ${count}`
					: "Встроенные протоколы установлены",
				"success",
			);
			await loadTemplates();
		} catch (error) {
			logger.error("Failed to seed templates", error);
			const toastText = actionFailureToast(
				"Встроенные протоколы не установлены",
				null,
			);
			setSeedError(toastText);
			showToast(toastText, "error");
		} finally {
			setIsSeeding(false);
		}
	}, [isLocked, isSeeding, loadTemplates]);

	/**
	 * Удаление своего (не встроенного) протокола приёма.
	 * DELETE /api/templates/:id — requireClinicalMutationAccess; 403 CannotDeleteBuiltIn
	 * для isBuiltIn; 404 NotFound. Без кнопки врач не мог убрать устаревший свой
	 * протокол из списка на приёме — только SQL/CLI.
	 */
	const deleteSelectedTemplate = useCallback(async () => {
		if (isDeleting || isLocked || isSeeding || !selectedTemplate) return;
		const tmpl = templates.find((t) => t.id === selectedTemplate);
		if (!tmpl) return;
		if (tmpl.isBuiltIn) {
			showToast(
				"Это встроенный протокол приёма — удалить его нельзя. Создайте свой и выбирайте его.",
				"error",
			);
			return;
		}
		const titleLabel = tmpl.title?.trim() || "протокол";
		setIsDeleting(true);
		try {
			const headerSource = authRef.current;
			const res = await fetch(
				`/api/templates/${encodeURIComponent(selectedTemplate)}`,
				{
					method: "DELETE",
					headers:
						headerSource &&
						typeof headerSource.denteClinicalMutationHeaders === "function"
							? headerSource.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
				},
			);
			if (!res.ok) {
				let serverMessage: string | null = null;
				try {
					const body = await res.json();
					if (typeof body?.message === "string" && body.message.trim()) {
						serverMessage = body.message.trim();
					}
				} catch {
					/* ignore */
				}
				const toastText =
					serverMessage ??
					actionFailureToast("Протокол приёма не удалён", res.status);
				showToast(toastText, "error");
				return;
			}
			showToast(`Протокол «${titleLabel}» удалён из списка`, "success");
			setSelectedTemplate("");
			await loadTemplates();
		} catch (error) {
			logger.error("Failed to delete template", error);
			showToast(actionFailureToast("Протокол приёма не удалён", null), "error");
		} finally {
			setIsDeleting(false);
		}
	}, [
		isDeleting,
		isLocked,
		isSeeding,
		selectedTemplate,
		templates,
		loadTemplates,
	]);

	const resetCreateForm = useCallback(() => {
		setCreateTitle("");
		setCreateCategory("");
		setCreateAnamnesis("");
		setCreateObjective("");
		setCreateTreatment("");
		setCreateIcd10("");
		setShowCreateForm(false);
	}, []);

	/**
	 * Создание своего протокола приёма.
	 * POST /api/templates — requireClinicalMutationAccess; title обязателен
	 * (400 Title required + TEMPLATE_TITLE_REQUIRED_MESSAGE); isBuiltIn: false.
	 * Без UI врач мог seed/delete, но не добавить свой протокол с экрана приёма.
	 */
	const createTemplate = useCallback(async () => {
		if (isCreating || isLocked || isSeeding || isDeleting) return;
		const title = createTitle.trim();
		if (!title) {
			showToast(
				"Протокол приёма не сохранён: укажите название — по нему врач выбирает протокол в списке.",
				"error",
			);
			return;
		}
		setIsCreating(true);
		try {
			const headerSource = authRef.current;
			const payload: Record<string, string> = { title };
			const category = createCategory.trim();
			const anamnesis = createAnamnesis.trim();
			const objective = createObjective.trim();
			const treatment = createTreatment.trim();
			const icd10 = createIcd10.trim();
			if (category) payload.category = category;
			if (anamnesis) payload.prefilledAnamnesis = anamnesis;
			if (objective) payload.prefilledObjective = objective;
			if (treatment) payload.prefilledTreatment = treatment;
			if (icd10) payload.defaultIcd10 = icd10;

			const res = await fetch("/api/templates", {
				method: "POST",
				headers:
					headerSource &&
					typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				let serverMessage: string | null = null;
				try {
					const body = await res.json();
					if (typeof body?.message === "string" && body.message.trim()) {
						serverMessage = body.message.trim();
					}
				} catch {
					/* ignore */
				}
				const toastText =
					serverMessage ??
					actionFailureToast("Протокол приёма не сохранён", res.status);
				showToast(toastText, "error");
				return;
			}
			let createdId: string | null = null;
			try {
				const body = await res.json();
				const t = body?.template;
				if (t && typeof t.id === "string") createdId = t.id;
			} catch {
				/* list reload is enough */
			}
			showToast(`Протокол «${title}» сохранён в списке клиники`, "success");
			resetCreateForm();
			await loadTemplates();
			if (createdId) {
				setSelectedTemplate(createdId);
			}
		} catch (error) {
			logger.error("Failed to create template", error);
			showToast(
				actionFailureToast("Протокол приёма не сохранён", null),
				"error",
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		isCreating,
		isLocked,
		isSeeding,
		isDeleting,
		createTitle,
		createCategory,
		createAnamnesis,
		createObjective,
		createTreatment,
		createIcd10,
		loadTemplates,
		resetCreateForm,
	]);

	const applyCanonicalTemplate = useCallback(
		(key: "caries" | "pulpitis" | "periodontitis" | "hygiene") => {
			if (isLocked) return;
			const canonical = CANONICAL_SOAP_TEMPLATES[key];
			setSelectedTemplate(canonical.id);
			onSelectTemplate(canonical);
			showToast(`Применён протокол: ${canonical.title}`, "success", 2500);
		},
		[isLocked, onSelectTemplate],
	);

	const selectedMeta = selectedTemplate
		? templates.find((t) => t.id === selectedTemplate)
		: undefined;
	const canDeleteSelected =
		Boolean(selectedMeta) &&
		!selectedMeta?.isBuiltIn &&
		!isLocked &&
		!isLoading;
	const canCreate =
		!isLocked && !isLoading && !isSeeding && !isDeleting && !isCreating;

	const quickSoapButtonsEl = (
		<div
			className="flex items-center gap-1.5 flex-wrap"
			data-testid="diary-quick-canonical-templates"
		>
			<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" /> 1-Клик SOAP:
			</span>
			<button
				type="button"
				data-testid="btn-quick-soap-caries"
				disabled={isLocked}
				onClick={() => applyCanonicalTemplate("caries")}
				className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
				title="Кариес дентина K02.1: автозаполнение нормы, жалоб и объективного статуса"
			>
				<span>🦷 Кариес K02.1</span>
			</button>
			<button
				type="button"
				data-testid="btn-quick-soap-pulpitis"
				disabled={isLocked}
				onClick={() => applyCanonicalTemplate("pulpitis")}
				className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
				title="Острый пульпит K04.0: автозаполнение нормы, жалоб и объективного статуса"
			>
				<span>⚡ Пульпит K04.0</span>
			</button>
			<button
				type="button"
				data-testid="btn-quick-soap-periodontitis"
				disabled={isLocked}
				onClick={() => applyCanonicalTemplate("periodontitis")}
				className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
				title="Хронический периодонтит K04.5: автозаполнение нормы, жалоб и объективного статуса"
			>
				<span>🩸 Периодонтит K04.5</span>
			</button>
			<button
				type="button"
				data-testid="btn-quick-soap-hygiene"
				disabled={isLocked}
				onClick={() => applyCanonicalTemplate("hygiene")}
				className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
				title="Профгигиена K05.0: автозаполнение нормы, жалоб и объективного статуса"
			>
				<span>✨ Профгигиена K05.0</span>
			</button>
		</div>
	);

	const templatesByCategory = React.useMemo(() => {
		const groups: Record<string, Template[]> = {};
		for (const t of templates) {
			const c = t.category || "Общие";
			if (!groups[c]) groups[c] = [];
			groups[c].push(t);
		}
		return groups;
	}, [templates]);

	const showEmptyRecovery =
		!isLoading && (templates.length === 0 || loadFailed);
	const showRestoreLink = !isLoading && templates.length > 0 && !isLocked;

	const createFormEl =
		showCreateForm && !isLocked ? (
			<div
				className="flex flex-col gap-2 w-full max-w-lg p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]"
				data-testid="diary-template-create-form"
			>
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-[var(--ink)]">
						Новый свой протокол приёма
					</span>
					<button
						type="button"
						data-testid="diary-template-create-cancel"
						disabled={isCreating}
						onClick={() => resetCreateForm()}
						className="inline-flex items-center gap-1 min-h-[44px] text-xs text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50"
						title="Закрыть форму"
					>
						<X className="w-3.5 h-3.5" />
						Отмена
					</button>
				</div>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">
						Название (обязательно)
					</span>
					<input
						type="text"
						data-testid="diary-template-create-title"
						value={createTitle}
						onChange={(e) => setCreateTitle(e.target.value)}
						disabled={isCreating}
						placeholder="Например: Кариес · композит"
						className="w-full px-2.5 py-2 min-h-[44px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">Категория</span>
					<input
						type="text"
						data-testid="diary-template-create-category"
						value={createCategory}
						onChange={(e) => setCreateCategory(e.target.value)}
						disabled={isCreating}
						placeholder="Общие"
						className="w-full px-2.5 py-2 min-h-[44px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">
						Анамнез (заготовка)
					</span>
					<textarea
						data-testid="diary-template-create-anamnesis"
						value={createAnamnesis}
						onChange={(e) => setCreateAnamnesis(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">
						Объективно (заготовка)
					</span>
					<textarea
						data-testid="diary-template-create-objective"
						value={createObjective}
						onChange={(e) => setCreateObjective(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">
						Лечение (заготовка)
					</span>
					<textarea
						data-testid="diary-template-create-treatment"
						value={createTreatment}
						onChange={(e) => setCreateTreatment(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-[var(--muted)]">
						МКБ-10 по умолчанию
					</span>
					<input
						type="text"
						data-testid="diary-template-create-icd10"
						value={createIcd10}
						onChange={(e) => setCreateIcd10(e.target.value)}
						disabled={isCreating}
						placeholder="K02.1"
						className="w-full px-2.5 py-2 min-h-[44px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--teal-glow)] outline-none disabled:opacity-50"
					/>
				</label>
				<button
					type="button"
					data-testid="diary-template-create-submit"
					disabled={isCreating || !createTitle.trim()}
					onClick={() => void createTemplate()}
					className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium text-[var(--on-teal,white)] bg-[var(--teal-dark)] hover:bg-[var(--teal)] rounded-xl disabled:opacity-50 transition-colors"
				>
					{isCreating ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Сохраняю…
						</>
					) : (
						<>
							<Plus className="w-4 h-4" />
							Сохранить протокол
						</>
					)}
				</button>
			</div>
		) : null;

	if (showEmptyRecovery) {
		const isSeedFailed = loadStatus === 503;
		return (
			<div
				className="flex flex-col gap-2 w-full sm:w-auto max-w-md flex-shrink-0"
				data-testid="diary-template-empty"
			>
				{quickSoapButtonsEl}
				<div className="text-xs text-[var(--muted)] leading-snug">
					{isSeedFailed
						? seedError ||
							"Встроенные протоколы не установились — список пуст из‑за сбоя, а не потому что протоколов нет."
						: loadFailed
							? seedError ||
								"Список клинических протоколов не загружен. Дневник можно заполнить вручную."
							: "В этой клинике пока нет клинических протоколов. Установите встроенные — врач выберет протокол в списке на приёме."}
				</div>
				<button
					type="button"
					id="diary-template-seed"
					data-testid="diary-template-seed"
					disabled={isLocked || isSeeding}
					onClick={() => void seedBuiltIns()}
					className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium text-[var(--on-teal,white)] bg-[var(--teal-dark)] hover:bg-[var(--teal)] rounded-xl disabled:opacity-50 transition-colors"
				>
					{isSeeding ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Устанавливаю…
						</>
					) : (
						<>
							<Download className="w-4 h-4" />
							Установить встроенные протоколы
						</>
					)}
				</button>
				{canCreate && !showCreateForm ? (
					<button
						type="button"
						data-testid="diary-template-create-open"
						onClick={() => setShowCreateForm(true)}
						className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl disabled:opacity-50 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Создать свой протокол
					</button>
				) : null}
				{createFormEl}
				{seedError && !isSeedFailed && (
					<p
						className="text-xs text-[var(--bad-fg)]"
						data-testid="diary-template-seed-error"
					>
						{seedError}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">
			{quickSoapButtonsEl}
			<div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
				<div className="relative w-full sm:w-60">
					<Clipboard className="absolute left-3 top-3 w-4 h-4 text-[var(--muted)] pointer-events-none" />
					<select
						id="diary-template-select"
						data-testid="diary-template-select"
						disabled={isLocked || isLoading}
						value={selectedTemplate}
						onChange={(e) => {
							const val = e.target.value;
							setSelectedTemplate(val);
							if (!val) return;
							const tmpl = templates.find((t) => t.id === val);
							if (tmpl) {
								onSelectTemplate(tmpl);
							}
						}}
						className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-sm rounded-xl focus:ring-2 focus:ring-[var(--teal-glow)] outline-none appearance-none disabled:opacity-50"
					>
						<option value="">
							{isLoading ? "Загружаем протоколы…" : "— Клинический шаблон —"}
						</option>
						{Object.entries(templatesByCategory).map(([cat, tpls]) => (
							<optgroup key={cat} label={cat || "Без категории"}>
								{tpls.map((t) => (
									<option key={t.id} value={t.id}>
										{t.title}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>
				{canDeleteSelected && (
					<button
						type="button"
						data-testid="diary-template-delete"
						disabled={isDeleting || isSeeding || isCreating}
						onClick={() => void deleteSelectedTemplate()}
						title="Удалить выбранный свой протокол из списка клиники (встроенные удалить нельзя)"
						className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium text-[var(--bad-fg)] bg-[var(--bad-bg)] hover:brightness-95 border border-[var(--bad-fg)] rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
					>
						{isDeleting ? (
							<>
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
								Удаляю…
							</>
						) : (
							<>
								<Trash2 className="w-3.5 h-3.5" />
								Удалить
							</>
						)}
					</button>
				)}
				{canCreate && !showCreateForm ? (
					<button
						type="button"
						data-testid="diary-template-create-open"
						onClick={() => setShowCreateForm(true)}
						title="Создать свой протокол приёма (не встроенный)"
						className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium text-[var(--teal-dark)] bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
					>
						<Plus className="w-3.5 h-3.5" />
						Свой
					</button>
				) : null}
				{showRestoreLink && (
					<button
						type="button"
						data-testid="diary-template-restore"
						disabled={isSeeding || isDeleting || isCreating}
						onClick={() => void seedBuiltIns()}
						title="Добавить недостающие встроенные протоколы (уже имеющиеся не дублируются)"
						className="min-h-[44px] flex items-center text-xs text-[var(--muted)] hover:text-[var(--teal)] underline-offset-2 hover:underline disabled:opacity-50 transition-colors whitespace-nowrap"
					>
						{isSeeding ? "Восстанавливаю…" : "Восстановить встроенные"}
					</button>
				)}
			</div>
			{createFormEl}
		</div>
	);
}
