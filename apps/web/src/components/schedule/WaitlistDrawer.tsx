import { Calendar, CheckCircle2, Trash2, UserPlus, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { EmptyState } from "../EmptyState";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

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
async function writeFailureText(response: Response, action: string): Promise<string> {
	const body = await response.json().catch(() => null);
	const serverMessage = body && typeof body.message === "string" ? body.message.trim() : "";
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
 * Тип НЕ указан намеренно, и оба заголовка заданы намеренно.
 *
 * Контракт PanelSubject переименовывают прямо сейчас, в другой незакоммиченной
 * работе: поле `title` («Задачи по пациенту», к которому модуль сам дописывал
 * «не загружены») становится `notLoadedTitle` — целой согласованной строкой,
 * потому что название в единственном числе давало «Статус не загружены».
 * Объект без аннотации типа удовлетворяет и старому, и новому виду контракта:
 * лишнее поле у переменной (в отличие от литерала на месте вызова) не считается
 * ошибкой. Это позволяет закоммитить ящик, не дожидаясь чужой правки и не ломая
 * сборку main, и не заводя второй язык сообщений об отказе рядом с общим.
 * Когда переименование доедет, лишний заголовок надо убрать — он останется
 * мёртвым полем, а не тонкой совместимостью.
 */
const WAITLIST_SUBJECT = {
	notLoadedTitle: "Очередь ожидания не прочитана",
	title: "Очередь ожидания",
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
	preferredTimeRanges: any;
	status: string;
	createdAt: string;
}

interface Props {
	isOpen: boolean;
	onClose: () => void;
	updateNewAppointmentDraft: (key: any, value: any) => void;
	focusNewAppointmentEditor: () => void;
	dashboard?: any;
	auth?: any;
}

export function WaitlistDrawer(props: Props) {
	const {
		isOpen,
		onClose,
		updateNewAppointmentDraft,
		focusNewAppointmentEditor,
		dashboard: propDashboard,
		auth: propAuth
	} = props;

	let ctx: any = null;
	try {
		ctx = useAppLogicContext();
	} catch (e) {
		ctx = null;
	}
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
	const [loadFailureStatus, setLoadFailureStatus] = useState<number | null | undefined>(undefined);

	// Form State
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState("");
	const [priorityLevel, setPriorityLevel] = useState<"high" | "medium" | "low">(
		"medium",
	);

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = staff.filter(
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);
	const patientsList = dashboard?.patients ?? [];

	const fetchWaitlist = async () => {
		try {
			setIsLoading(true);
			setLoadFailureStatus(undefined);
			const res = await fetch("/api/waitlist", {
				headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
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
			console.error("Failed to load waitlist", e);
			// До сервера не дошли вовсе — это отдельный случай от «ответил отказом».
			setLoadFailureStatus(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
		}
	}, [isOpen]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedPatientId) {
			showToast("Выберите пациента", "error");
			return;
		}

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
				showToast(await writeFailureText(res, "добавить пациента в очередь"), "error");
			}
		} catch (e) {
			showToast(
				"Сервер клиники не ответил, пациент в очередь не добавлен. Проверьте, что программа клиники запущена и есть сеть, и повторите.",
				"error",
			);
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Удалить запись из листа ожидания?")) return;
		try {
			const res = await fetch(`/api/waitlist/${id}`, {
				method: "DELETE",
				headers: waitlistWriteHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена", "success");
				fetchWaitlist();
			} else {
				showToast(await writeFailureText(res, "убрать пациента из очереди"), "error");
			}
		} catch (e) {
			showToast(
				"Сервер клиники не ответил, запись осталась в очереди. Проверьте сеть и повторите.",
				"error",
			);
		}
	};

	/**
	 * Заявка закрыта: человека приняли. Запись остаётся в базе со статусом
	 * fulfilled — иначе клиника теряет ответ на вопрос «а кого мы из очереди
	 * вообще позвали», и оценить, работает ли очередь, становится нечем.
	 */
	const handleFulfill = async (item: WaitlistItem) => {
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
		} catch (e) {
			showToast(
				"Сервер клиники не ответил, заявка осталась в очереди. Проверьте сеть и повторите.",
				"error",
			);
		}
	};

	const handleBook = (item: WaitlistItem) => {
		// Prefill new appointment draft
		updateNewAppointmentDraft("patientId", item.patientId);
		if (item.preferredDoctorId) {
			updateNewAppointmentDraft("doctorUserId", item.preferredDoctorId);
		}

		// Trigger click to open form if hidden
		const formWrapper = document.querySelector<HTMLElement>(
			".appointment-create-wrapper",
		);
		const toggleBtn =
			formWrapper?.querySelector<HTMLButtonElement>(".text-button");
		if (toggleBtn && toggleBtn.textContent?.includes("Показать все поля")) {
			toggleBtn.click();
		}

		// Close waitlist drawer and focus appointment editor
		onClose();
		focusNewAppointmentEditor();

		// Auto-remove/fulfill waitlist item after booking or let the user complete it
		// The user can now mark it as completed using the CheckCircle2 button, avoiding orphaned waitlist entries.
		showToast(
			`Пациент ${item.patientName || ""} выбран. Укажите время записи.`,
			"success",
		);
	};

	const [isMinimized, setIsMinimized] = useState(false);

	if (!isOpen) return null;

	const priorityColors = {
		high: "bg-red-500/20 text-red-400 border border-red-500/30",
		medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
		low: "bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/30",
	};

	const priorityLabels = {
		high: "Высокий",
		medium: "Средний",
		low: "Низкий",
	};

	if (isMinimized) {
		return (
			<div className="fixed bottom-4 right-4 z-50">
				<button
					onClick={() => setIsMinimized(false)}
					className="bg-slate-50 dark:bg-slate-800 border border-slate-600 shadow-xl rounded-lg p-3 flex items-center gap-3 hover:bg-white dark:hover:bg-slate-800 transition-colors"
				>
					<Calendar className="w-5 h-5 text-teal-400" />
					<span className="text-slate-900 dark:text-slate-100 font-medium">
						Лист ожидания (Свернут)
					</span>
				</button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" data-testid="waitlist-drawer">
			<div className="absolute inset-0" onClick={onClose} />
			<div className="relative w-full max-w-md h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 text-slate-900 dark:text-slate-100 animate-slide-in">
				{/* Header */}
				<div className="p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Calendar className="w-5 h-5 text-teal-400" />
						<h3 className="text-lg font-semibold tracking-wide">
							Лист ожидания
						</h3>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setIsMinimized(true)}
							className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
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
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
						</button>
						<button
							onClick={onClose}
							aria-label="Закрыть"
							className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
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
						className="bg-white dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/40 space-y-4"
					>
						<h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
							<UserPlus className="w-4 h-4 text-teal-400" />
							Добавить в очередь
						</h4>

						<div className="space-y-1">
							<label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Пациент *
							</label>
							<select
								value={selectedPatientId}
								onChange={(e) => setSelectedPatientId(e.target.value)}
								className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
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
							<label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Желаемый врач
							</label>
							<select
								value={preferredDoctorId}
								onChange={(e) => setPreferredDoctorId(e.target.value)}
								className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
							>
								<option value="">-- Любой врач --</option>
								{doctors.map((d: any) => (
									<option key={d.id} value={d.id}>
										{d.fullName || d.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1">
							<label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Приоритет
							</label>
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
														: "bg-slate-500/25 border-slate-400 text-slate-200"
												: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
										}`}
									>
										{priorityLabels[p]}
									</button>
								))}
							</div>
						</div>

						<button
							type="submit"
							className="w-full py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-[#1e293b] font-bold rounded-lg text-sm transition-colors shadow-md shadow-teal-500/10"
						>
							Добавить в очередь
						</button>
					</form>

					{/* Waitlist queue */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Пациенты в очереди ({items.length})
						</h4>

						{loadFailureStatus !== undefined ? (
							<PanelLoadFailure
								subject={WAITLIST_SUBJECT}
								status={loadFailureStatus}
								onRetry={fetchWaitlist}
							/>
						) : isLoading && items.length === 0 ? (
							<div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
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
							<div className="space-y-3">
								{items.map((item) => (
									<div
										key={item.id}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData(
												"application/json",
												JSON.stringify({ type: "waitlist_item", item }),
											);
											e.dataTransfer.effectAllowed = "copy";
										}}
										className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 hover:border-teal-500/50 cursor-grab active:cursor-grabbing transition-colors"
									>
										<div className="flex justify-between items-start">
											<div>
												<h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
													{item.patientName || "Неизвестный пациент"}
												</h5>
												{item.patientPhone && (
													<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
											<div className="text-xs text-slate-500 dark:text-slate-400 flex gap-1">
												<span className="font-medium text-slate-600 dark:text-slate-500">
													Врач:
												</span>
												<span>{item.preferredDoctorName}</span>
											</div>
										)}

										<div className="flex gap-2 mt-1">
											<button
												onClick={() => handleBook(item)}
												className="flex-1 py-1.5 px-3 bg-teal-500/15 hover:bg-teal-500/25 active:bg-teal-500/35 text-teal-400 font-semibold rounded-lg text-xs transition-colors border border-teal-500/20"
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
												onClick={() => handleFulfill(item)}
												className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-colors"
												title="Дождался приёма: убрать из очереди, запись о заявке сохранить"
												aria-label="Дождался приёма: убрать из очереди, запись о заявке сохранить"
											>
												<CheckCircle2 className="w-3.5 h-3.5" />
											</button>
											<button
												onClick={() => handleDelete(item.id)}
												className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
												title="Убрать совсем: заявка ошибочная или человек больше не хочет"
												aria-label="Убрать совсем: заявка ошибочная или человек больше не хочет"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
