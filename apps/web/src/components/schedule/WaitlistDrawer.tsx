import { Calendar, CheckCircle2, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { WaitlistQuickFillModal } from "./WaitlistQuickFillModal";

/**
 * Как называется содержимое очереди для сообщений о загрузке и отказе. Общий
 * компонент отказа берётся тот же, что у виджетов карточки пациента: второй
 * язык ошибок на одном экране путает сильнее, чем сам отказ.
 */
/**
 * Заголовки для ИЗМЕНЕНИЯ очереди.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ ЧТЕНИЯ. Читать очередь разрешает токен клиники
 * (GET /api/waitlist проходит через requireResolvedOrganizationId), а изменять —
 * нет: POST, PUT и DELETE идут через requireResolvedStaffOrAdminOrganizationId,
 * которому нужен userId, и берётся он ТОЛЬКО из заголовка x-dente-staff-token
 * (apps/api/src/security/identity.ts:30, 150-170).
 * auth.denteClinicalReadHeaders() токен сотрудника не отправляет вовсе, поэтому
 * добавление в очередь отвечало 401 «Требуется вход сотрудника». Проверено живым
 * запросом: с одним токеном клиники POST /api/waitlist -> 401, с обоими -> 200.
 * denteAdminSecretRequestHeaders отправляет оба токена и уже используется в
 * проекте для таких же изменяющих запросов — свой третий вариант заголовков
 * заводить незачем.
 */
function waitlistWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

/**
 * Почему изменение не удалось — словами администратора, а не кодом ответа.
 * `action` подставляется в инфинитиве: «не удалось добавить пациента в очередь».
 */
async function writeFailureText(
	response: Response,
	action: string,
): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const body = await response.json().catch((err: any) => {
		logger.error(err);
		showToast(
			actionFailureToast(
				"Ошибка чтения ответа",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const serverMessage =
		body && typeof body.message === "string" ? body.message.trim() : "";
	// Сообщение сервера уже написано по-русски и точнее любого домысла на клиенте.
	if (serverMessage) return serverMessage;
	if (response.status === 401 || response.status === 403) {
		return `Не удалось ${action}: нет прав. Войдите как сотрудник клиники — очередь меняют под своим именем, чтобы было видно, кто добавил пациента.`;
	}
	if (response.status === 404) {
		return `Не удалось ${action}: запись уже убрал кто-то другой. Обновите список.`;
	}
	if (response.status >= 500) {
		return `Не удалось ${action}: сервер клиники ответил отказом. Повторите, а если повторится — сообщите администратору.`;
	}
	return `Не удалось ${action}. Повторите, а если повторится — сообщите администратору.`;
}

/*
 * Переименование контракта доехало, поэтому временная совместимость снята.
 *
 * ЧТО ЗДЕСЬ БЫЛО. Объект намеренно шёл без аннотации типа и нёс СРАЗУ два
 * заголовка — старый `title` и новый `notLoadedTitle`, — чтобы удовлетворить и
 * старому, и новому виду `PanelSubject`, пока переименование лежало
 * незакоммиченным у другого автора. `title` стало мёртвым полем в ту минуту,
 * когда общий модуль перестал его читать, и держать его дальше — значит хранить
 * второй заголовок отказа, который никогда не появится на экране. Тип указан
 * снова: без него забытое или неверно названное поле не заметит никто.
 */
const WAITLIST_SUBJECT: PanelSubject = {
	notLoadedTitle: "Очередь ожидания не прочитана",
	accusative: "очередь ожидания",
	emptyTitle: "В очереди никто не ждёт",
	emptyHint:
		"Это нормально, а не ошибка. Когда пациенту не подошло ни одно свободное время, добавьте его формой выше — и при отмене чужой записи система сама предложит его на освободившееся окно.",
	failureConsequence:
		"Не считайте, что очередь пуста: список не прочитан. Освободившееся окно можно отдать мимо тех, кто его ждёт.",
};

interface WaitlistItem {
	id: string;
	patientId: string;
	patientName: string | null;
	patientPhone: string | null;
	preferredDoctorId: string | null;
	preferredDoctorName: string | null;
	priorityLevel: "high" | "medium" | "low";
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	preferredTimeRanges: any;
	status: string;
	createdAt: string;
}

interface Props {
	isOpen: boolean;
	onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	updateNewAppointmentDraft: (key: any, value: any) => void;
	focusNewAppointmentEditor: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	auth?: any;
}

export function WaitlistDrawer(props: Props) {
	const {
		isOpen,
		onClose,
		updateNewAppointmentDraft,
		focusNewAppointmentEditor,
		dashboard: propDashboard,
		auth: propAuth,
	} = props;

	const ctx = useAppLogicContext();
	const dashboard = propDashboard || ctx?.dashboard;
	const auth = propAuth || ctx?.auth;
	const [items, setItems] = useState<WaitlistItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	/**
	 * Код отказа при чтении очереди. undefined — отказа не было, null — до
	 * сервера не дошли вовсе. Раньше отказ просто ничего не менял, и ящик
	 * показывал «Очередь ожидания пуста» — самая опасная из возможных подписей:
	 * непрочитанное выдавалось за прочитанное и пустое.
	 */
	const [loadFailureStatus, setLoadFailureStatus] = useState<
		number | null | undefined
	>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);

	// Form State
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState("");
	const [priorityLevel, setPriorityLevel] = useState<"high" | "medium" | "low">(
		"medium",
	);

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = staff.filter(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);
	const patientsList = dashboard?.patients ?? [];

	const fetchWaitlist = useCallback(async () => {
		try {
			setIsLoading(true);
			setLoadFailureStatus(undefined);
			const res = await fetch("/api/waitlist", {
				headers: auth?.denteClinicalReadHeaders
					? auth.denteClinicalReadHeaders()
					: {},
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
				return;
			}
			// Отказ сервера НЕ выдаём за пустую очередь: администратор решил бы,
			// что ждущих нет, и раздал бы освободившееся окно мимо очереди.
			setLoadFailureStatus(res.status);
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("Failed to load waitlist", e);
			// До сервера не дошли вовсе — это отдельный случай от «ответил отказом».
			setLoadFailureStatus(null);
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
		}
	}, [isOpen, fetchWaitlist]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!selectedPatientId) {
			showToast("Выберите пациента", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await fetch("/api/waitlist", {
				method: "POST",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({
					patientId: selectedPatientId,
					preferredDoctorId: preferredDoctorId || null,
					priorityLevel,
					preferredTimeRanges: [],
				}),
			});

			if (res.ok) {
				showToast("Пациент добавлен в лист ожидания", "success");
				setSelectedPatientId("");
				setPreferredDoctorId("");
				setPriorityLevel("medium");
				fetchWaitlist();
			} else {
				showToast(
					await writeFailureText(res, "добавить пациента в очередь"),
					"error",
				);
			}
		} catch (_e) {
			showToast(
				"Сервер клиники не ответил, пациент в очередь не добавлен. Проверьте, что программа клиники запущена и есть сеть, и повторите.",
				"error",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (loadingId === id) return;
		if (!window.confirm("Удалить запись из листа ожидания?")) return;
		setLoadingId(id);
		try {
			const res = await fetch(`/api/waitlist/${id}`, {
				method: "DELETE",
				headers: waitlistWriteHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена", "success");
				fetchWaitlist();
			} else {
				showToast(
					await writeFailureText(res, "убрать пациента из очереди"),
					"error",
				);
			}
		} catch (_e) {
			showToast(
				"Сервер клиники не ответил, запись осталась в очереди. Проверьте сеть и повторите.",
				"error",
			);
		} finally {
			setLoadingId(null);
		}
	};

	/**
	 * Заявка закрыта: человека приняли. Запись остаётся в базе со статусом
	 * fulfilled — иначе клиника теряет ответ на вопрос «а кого мы из очереди
	 * вообще позвали», и оценить, работает ли очередь, становится нечем.
	 */
	const handleFulfill = async (item: WaitlistItem) => {
		if (loadingId === item.id) return;
		setLoadingId(item.id);
		try {
			const res = await fetch(`/api/waitlist/${item.id}`, {
				method: "PUT",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({ status: "fulfilled" }),
			});
			if (res.ok) {
				showToast(
					`${item.patientName || "Пациент"} убран из очереди: заявка закрыта`,
					"success",
				);
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "закрыть заявку"), "error");
			}
		} catch (_e) {
			showToast(
				"Сервер клиники не ответил, заявка осталась в очереди. Проверьте сеть и повторите.",
				"error",
			);
		} finally {
			setLoadingId(null);
		}
	};

	const handleBook = (item: WaitlistItem) => {
		if (loadingId === item.id) return;
		setLoadingId(item.id);
		try {
			// Prefill new appointment draft
			updateNewAppointmentDraft("patientId", item.patientId);
			if (item.preferredDoctorId) {
				updateNewAppointmentDraft("doctorUserId", item.preferredDoctorId);
			}

			const formWrapper = document.querySelector<HTMLElement>(
				".appointment-create-wrapper",
			);
			const toggleBtn = formWrapper?.querySelector<HTMLButtonElement>(
				"[data-schedule-create-toggle]",
			);
			if (toggleBtn && toggleBtn.getAttribute("aria-expanded") !== "true") {
				toggleBtn.click();
			}

			// Close waitlist drawer and focus appointment editor
			onClose();
			focusNewAppointmentEditor();

			showToast(
				`Пациент ${item.patientName || ""} выбран. Укажите время записи.`,
				"success",
			);
		} finally {
			setLoadingId(null);
		}
	};

	const [isMinimized, setIsMinimized] = useState(false);

	if (!isOpen) return null;

	const priorityColors = {
		high: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
		medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35 font-bold",
		low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25",
	};

	const priorityLabels = {
		high: "Высокий",
		medium: "Средний",
		low: "Низкий",
	};

	/*
	 * ЯЩИК ВЫНЕСЕН В КОРЕНЬ СТРАНИЦЫ ПОРТАЛОМ, И ЭТО НЕ УКРАШЕНИЕ.
	 *
	 * `position: fixed` привязывается к окну только до тех пор, пока ни у одного
	 * предка нет `transform`, `filter`, `backdrop-filter`, `will-change` или
	 * `contain`. Стоит такому предку появиться — и `fixed` начинает считаться от
	 * НЕГО, а `inset-0` растягивает ящик на всю высоту предка.
	 *
	 * Ровно это и случилось, измерено снимком: `.dente-ops-shots/light_waitlist.png`
	 * имеет высоту 10 042 пикселя при окне 1000, то есть ящик растянут на всю
	 * высоту расписания. На экране это столб почти пустой белизны: заголовок с
	 * крестиком и форма остаются наверху, и администратор, прокрутив расписание к
	 * нужному времени, теряет и то и другое. Соседние панели на том же экране —
	 * около 1100 пикселей, так что дело именно в ящике.
	 *
	 * Искать конкретного предка бессмысленно: в проекте 351 КБ рукописного CSS, и
	 * завтра такой предок появится снова. Портал в document.body делает ящик
	 * независимым от того, что над ним в дереве, — приём в проекте уже принят
	 * (OdontogramModule, TreatmentEstimator, Omnibar, VisitDiaryEditor).
	 */
	if (isMinimized) {
		const minimizedContent = (
			<div className="fixed top-3.5 right-4 z-50 animate-in fade-in-50 duration-150">
				<button
					type="button"
					onClick={() => setIsMinimized(false)}
					className="bg-[var(--paper-strong)] border border-[var(--line-strong)] shadow-xl rounded-full px-3.5 py-1.5 min-h-[36px] flex items-center gap-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer backdrop-blur-md"
					title="Развернуть лист ожидания"
				>
					<Calendar className="w-4 h-4 text-[var(--teal)]" />
					<span>Лист ожидания</span>
				</button>
			</div>
		);
		return typeof document !== "undefined"
			? createPortal(minimizedContent, document.body)
			: minimizedContent;
	}

	const drawerContent = (
		<div
			className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
			data-testid="waitlist-drawer"
		>
			<button
				type="button"
				className="absolute inset-0"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onClose();
					}
				}}
			/>
			<div className="relative w-full max-w-md h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] animate-slide-in">
				{/* Header */}
				<div className="p-6 border-b border-[var(--line)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Calendar className="w-5 h-5 text-[var(--teal)]" />
						<h3 className="text-lg font-semibold tracking-wide">
							Лист ожидания
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="waitlist-quickfill-btn"
							onClick={() => setIsQuickFillOpen(true)}
							className="min-h-[38px] px-3 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex items-center gap-1.5 border border-[var(--teal,var(--brand-primary))]/30 transition-all cursor-pointer shadow-sm active:scale-95"
							title="Умный подбор пациентов на горящие окна"
						>
							<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Быстрый подбор</span>
						</button>
						<button
							type="button"
							onClick={() => setIsMinimized(true)}
							className="p-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
							title="Свернуть окно"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Свернуть окно</title>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							className="p-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body container */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Add to Waitlist Form */}
					<form
						onSubmit={handleAdd}
						className="bg-[var(--paper-soft)] rounded-xl p-4 space-y-4"
					>
						<h4 className="text-sm font-semibold text-[var(--ink-2)] flex items-center gap-2">
							<UserPlus className="w-4 h-4 text-[var(--teal)]" />
							Добавить в очередь
						</h4>

						<div className="space-y-1">
							<label
								htmlFor="waitlist-patient-select"
								className="text-xs text-[var(--muted)] font-medium"
							>
								Пациент *
							</label>
							<select
								id="waitlist-patient-select"
								value={selectedPatientId}
								onChange={(e) => setSelectedPatientId(e.target.value)}
								className="w-full bg-[var(--paper)] rounded-lg p-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] border-0"
								required
							>
								<option value="">-- Выберите пациента --</option>
								{patientsList.map((p) => (
									<option key={p.id} value={p.id}>
										{p.fullName}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1">
							<label
								htmlFor="waitlist-doctor-select"
								className="text-xs text-[var(--muted)] font-medium"
							>
								Желаемый врач
							</label>
							<select
								id="waitlist-doctor-select"
								value={preferredDoctorId}
								onChange={(e) => setPreferredDoctorId(e.target.value)}
								className="w-full bg-[var(--paper)] rounded-lg p-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] border-0"
							>
								<option value="">-- Любой врач --</option>
								{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
								{doctors.map((d: any) => (
									<option key={d.id} value={d.id}>
										{d.fullName || d.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1">
							<span className="block text-xs text-[var(--muted)] font-medium">
								Приоритет
							</span>
							<div className="flex gap-2">
								{(["low", "medium", "high"] as const).map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => setPriorityLevel(p)}
										className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
											priorityLevel === p
												? p === "high"
													? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 ring-1 ring-rose-500/50 font-bold"
													: p === "medium"
														? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40 ring-1 ring-sky-500/50 font-bold"
														: "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line-strong)] ring-1 ring-[var(--line-strong)]"
												: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{priorityLabels[p]}
									</button>
								))}
							</div>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							aria-busy={isSubmitting}
							className="w-full py-2 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-sm transition-all shadow-md shadow-[var(--teal-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Добавить в очередь
						</button>
					</form>

					{/* Waitlist queue */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Пациенты в очереди ({items.length})
						</h4>

						{loadFailureStatus !== undefined ? (
							<PanelLoadFailure
								subject={WAITLIST_SUBJECT}
								status={loadFailureStatus}
								onRetry={fetchWaitlist}
							/>
						) : isLoading && items.length === 0 ? (
							<div className="text-center py-8 text-[var(--muted)] text-sm">
								Загружаем очередь ожидания…
							</div>
						) : items.length === 0 ? (
							<EmptyState
								icon={<Calendar size={24} />}
								title={WAITLIST_SUBJECT.emptyTitle}
								description={WAITLIST_SUBJECT.emptyHint}
								glass={false}
								style={{ padding: "20px 16px" }}
							/>
						) : (
							<ul className="space-y-3">
								{items.map((item) => (
									<li
										key={item.id}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData(
												"application/json",
												JSON.stringify({ type: "waitlist_item", item }),
											);
											e.dataTransfer.effectAllowed = "copy";
										}}
										className="bg-[var(--paper-soft)] rounded-xl p-4 flex flex-col gap-3 hover:bg-[var(--surface-hover,var(--paper-soft))] cursor-grab active:cursor-grabbing transition-colors"
									>
										<div className="flex justify-between items-start">
											<div>
												<h5 className="font-semibold text-sm text-[var(--ink)]">
													{item.patientName || "Неизвестный пациент"}
												</h5>
												{item.patientPhone && (
													<p className="text-xs text-[var(--muted)] mt-0.5">
														{item.patientPhone}
													</p>
												)}
											</div>
											<span
												className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${priorityColors[item.priorityLevel]}`}
											>
												{priorityLabels[item.priorityLevel]}
											</span>
										</div>

										{item.preferredDoctorName && (
											<div className="text-xs text-[var(--muted)] flex gap-1">
												<span className="font-medium text-[var(--muted)]">
													Врач:
												</span>
												<span>{item.preferredDoctorName}</span>
											</div>
										)}

										<div className="flex gap-2 mt-1">
											<button
												type="button"
												disabled={loadingId === item.id}
												aria-busy={loadingId === item.id}
												onClick={() => handleBook(item)}
												className="flex-1 min-h-[44px] py-2 px-3 bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold rounded-xl text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
											>
												Записать на прием
											</button>
											<button
												type="button"
												disabled={loadingId === item.id}
												aria-busy={loadingId === item.id}
												onClick={() => handleFulfill(item)}
												className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 bg-[var(--ok-bg,rgba(16,185,129,0.1))] hover:brightness-105 text-[var(--ok-fg,#0d9488)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title="Дождался приёма: убрать из очереди, запись о заявке сохранить"
												aria-label="Дождался приёма: убрать из очереди, запись о заявке сохранить"
											>
												<CheckCircle2 className="w-4 h-4" />
											</button>
											<button
												type="button"
												disabled={loadingId === item.id}
												aria-busy={loadingId === item.id}
												onClick={() => handleDelete(item.id)}
												className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 bg-[var(--bad-bg,rgba(239,68,68,0.1))] hover:brightness-105 text-[var(--bad-fg,#ef4444)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title="Убрать совсем: заявка ошибочная или человек больше не хочет"
												aria-label="Убрать совсем: заявка ошибочная или человек больше не хочет"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
			<WaitlistQuickFillModal
				isOpen={isQuickFillOpen}
				onClose={() => setIsQuickFillOpen(false)}
				onAppointmentCreated={() => {
					fetchWaitlist();
					setIsQuickFillOpen(false);
				}}
			/>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(drawerContent, document.body)
		: drawerContent;
}
