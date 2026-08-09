import { Calendar, CheckCircle2, Trash2, UserPlus, X } from "lucide-react";
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
		high: "bg-red-500/20 text-red-400 border border-red-500/30",
		medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
		low: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-strong)]",
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
		return createPortal(
			<div className="fixed bottom-4 right-4 z-50">
				<button
					type="button"
					onClick={() => setIsMinimized(false)}
					className="bg-[var(--paper)] border border-[var(--line-strong)] shadow-xl rounded-lg p-3 flex items-center gap-3 hover:bg-[var(--paper-soft)] transition-colors"
				>
					<Calendar className="w-5 h-5 text-[var(--teal)]" />
					<span className="text-[var(--ink)] font-medium">
						Лист ожидания (Свернут)
					</span>
				</button>
			</div>,
			document.body,
		);
	}

	return createPortal(
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
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setIsMinimized(true)}
							className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
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
							className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
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
						className="bg-[var(--paper-soft)] rounded-xl p-4 border border-[var(--line)] space-y-4"
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
								className="w-full bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg p-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
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
								className="w-full bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg p-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
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
										className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
											priorityLevel === p
												? p === "high"
													? "bg-red-500/20 border-red-500 text-red-400"
													: p === "medium"
														? "bg-amber-500/20 border-amber-500 text-amber-400"
														: "bg-[var(--paper-soft)] border-[var(--line-strong)] text-[var(--ink)]"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{priorityLabels[p]}
									</button>
								))}
							</div>
						</div>

						{/*
							ГЛАВНОЕ ДЕЙСТВИЕ ЯЩИКА БРАЛО ЦВЕТ НЕ ИЗ ТЕМЫ.

							Здесь стояли стоковые классы Tailwind (bg-teal-500, текст
							#1e293b). Палитра Tailwind в проекте не переопределена, поэтому
							кнопка красилась одинаково во всех трёх темах. Измерено по
							снимкам .dente-ops-shots/*_waitlist.png: кнопка #00bba7 в
							светлой, тёмной И ночной, тогда как подложка ящика уходит с
							#e2e8f0 на #2a3847 и на тёплый #342d26, а иконка пустого
							состояния рядом честно меняется с #0f766e на #14b8a6 и на тёплый
							#cf9146. То есть в ночной теме — она ТЁПЛАЯ, а не просто тёмная —
							самый громкий элемент панели оставался холодной бирюзой. И даже
							в светлой теме кнопка была мимо палитры: --teal там #0d9488, а на
							экране #00bba7.

							ПОЧЕМУ ИМЕННО --teal-dark, А НЕ --teal. Пара «фон --teal-dark +
							текст --on-teal» даёт контраст 5.47:1 в светлой, 6.81:1 в тёмной,
							6.60:1 в ночной — при норме 4.5:1 для полужирного текста 14px.
							Пара с --teal провалила бы светлую тему: белый на #0d9488 — 3.74:1.
							Починка темы не имеет права стоить читаемости.

							Наведение сделано яркостью, а не вторым цветом: --teal светлее
							--teal-dark во всех трёх темах, но текст на нём теряет контраст,
							а brightness двигает фон и текст вместе.
						*/}
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
										className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3 hover:border-[var(--teal-ring)] cursor-grab active:cursor-grabbing transition-colors"
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
												className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${priorityColors[item.priorityLevel]}`}
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
												className="flex-1 py-1.5 px-3 bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold rounded-lg text-xs transition-colors border border-[var(--teal-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
											>
												Записать на прием
											</button>
											{/*
												«Дождался» закрывает заявку, СОХРАНЯЯ запись: PUT со
												статусом fulfilled. Раньше здесь стоял тот же DELETE,
												что и у корзины рядом, — две разные кнопки давали на
												сервере ровно один результат, и запись о том, что
												человека всё-таки приняли, уничтожалась вместе с
												заявкой. Список показывает только status = active
												(routes/waitlist.ts:60), поэтому закрытая заявка из
												очереди уходит, а из базы — нет.
											*/}
											<button
												type="button"
												disabled={loadingId === item.id}
												aria-busy={loadingId === item.id}
												onClick={() => handleFulfill(item)}
												className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title="Дождался приёма: убрать из очереди, запись о заявке сохранить"
												aria-label="Дождался приёма: убрать из очереди, запись о заявке сохранить"
											>
												<CheckCircle2 className="w-3.5 h-3.5" />
											</button>
											<button
												type="button"
												disabled={loadingId === item.id}
												aria-busy={loadingId === item.id}
												onClick={() => handleDelete(item.id)}
												className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												title="Убрать совсем: заявка ошибочная или человек больше не хочет"
												aria-label="Убрать совсем: заявка ошибочная или человек больше не хочет"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
