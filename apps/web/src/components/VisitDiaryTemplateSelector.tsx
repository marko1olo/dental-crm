import { Clipboard, Download, Loader2, Plus, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { actionFailureToast } from "../lib/panelStateText";
import { showToast } from "./GlobalToast";

interface Template {
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
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			console.error("Failed to load templates", error);
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
			console.error("Failed to seed templates", error);
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
		const ok = window.confirm(
			`Удалить свой протокол «${titleLabel}» из списка клиники? На уже заполненные дневники это не влияет — только на выбор при следующих приёмах.`,
		);
		if (!ok) return;
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
			console.error("Failed to delete template", error);
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
			console.error("Failed to create template", error);
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
				className="flex flex-col gap-2 w-full max-w-lg p-3 rounded-xl border border-zinc-700/60 bg-zinc-900/80"
				data-testid="diary-template-create-form"
			>
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-zinc-300">
						Новый свой протокол приёма
					</span>
					<button
						type="button"
						data-testid="diary-template-create-cancel"
						disabled={isCreating}
						onClick={() => resetCreateForm()}
						className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
						title="Закрыть форму"
					>
						<X className="w-3.5 h-3.5" />
						Отмена
					</button>
				</div>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">
						Название (обязательно)
					</span>
					<input
						type="text"
						data-testid="diary-template-create-title"
						value={createTitle}
						onChange={(e) => setCreateTitle(e.target.value)}
						disabled={isCreating}
						placeholder="Например: Кариес · композит"
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">Категория</span>
					<input
						type="text"
						data-testid="diary-template-create-category"
						value={createCategory}
						onChange={(e) => setCreateCategory(e.target.value)}
						disabled={isCreating}
						placeholder="Общие"
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">Анамнез (заготовка)</span>
					<textarea
						data-testid="diary-template-create-anamnesis"
						value={createAnamnesis}
						onChange={(e) => setCreateAnamnesis(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">
						Объективно (заготовка)
					</span>
					<textarea
						data-testid="diary-template-create-objective"
						value={createObjective}
						onChange={(e) => setCreateObjective(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">Лечение (заготовка)</span>
					<textarea
						data-testid="diary-template-create-treatment"
						value={createTreatment}
						onChange={(e) => setCreateTreatment(e.target.value)}
						disabled={isCreating}
						rows={2}
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50 resize-y"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-[11px] text-zinc-500">МКБ-10 по умолчанию</span>
					<input
						type="text"
						data-testid="diary-template-create-icd10"
						value={createIcd10}
						onChange={(e) => setCreateIcd10(e.target.value)}
						disabled={isCreating}
						placeholder="K02.1"
						className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700/60 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none disabled:opacity-50"
					/>
				</label>
				<button
					type="button"
					data-testid="diary-template-create-submit"
					disabled={isCreating || !createTitle.trim()}
					onClick={() => void createTemplate()}
					className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-100 bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 rounded-xl disabled:opacity-50 transition-colors"
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
				<div className="text-xs text-zinc-400 leading-snug">
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
					className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-100 bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 rounded-xl disabled:opacity-50 transition-colors"
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
						className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600/50 rounded-xl disabled:opacity-50 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Создать свой протокол
					</button>
				) : null}
				{createFormEl}
				{seedError && !isSeedFailed && (
					<p
						className="text-xs text-rose-400/90"
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
			<div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
				<div className="relative w-full sm:w-60">
					<Clipboard className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
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
						className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/60 text-zinc-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none disabled:opacity-50"
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
						className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-rose-200/90 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-700/40 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
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
						className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-emerald-200/90 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
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
						className="text-xs text-zinc-500 hover:text-emerald-400 underline-offset-2 hover:underline disabled:opacity-50 transition-colors whitespace-nowrap"
					>
						{isSeeding ? "Восстанавливаю…" : "Восстановить встроенные"}
					</button>
				)}
			</div>
			{createFormEl}
		</div>
	);
}
