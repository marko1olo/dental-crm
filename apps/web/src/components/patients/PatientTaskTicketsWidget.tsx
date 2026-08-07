import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	CheckCircle2,
	Circle,
	Clock,
	Plus,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
	resolvePanelPhase,
} from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";

/**
 * Тексты трёх состояний списка. Прежде состояний было два: «загружается» ничего
 * не показывало, а отказ сервера попадал в ту же ветку, что честная пустота, и
 * показывал «Нет активных задач по пациенту» — то есть непрочитанный список
 * выдавался за пустой.
 */
const TICKETS_SUBJECT: PanelSubject = {
	notLoadedTitle: "Задачи по пациенту не загружены",
	accusative: "задачи по пациенту",
	emptyTitle: "Нет активных задач по пациенту",
	emptyHint:
		"Задачи помогают администраторам и врачам не забыть о важных делах: перезвонить, дослать документы, проверить самочувствие.",
	failureConsequence:
		"Задачи могут быть — их не удалось прочитать. Не планируйте день по этому списку, пока он не обновится.",
};

export function PatientTaskTicketsWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth } = useAppLogicContext();
	const [isAdding, setIsAdding] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const getReadHeaders = () => (auth ? auth.denteClinicalReadHeaders() : {});
	const getMutationHeaders = (extra?: Record<string, string>) =>
		auth ? auth.denteClinicalMutationHeaders(extra) : { ...(extra || {}) };

	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [assignedToId, setAssignedToId] = useState("");

	/*
	 * БЫЛО: при переключении карточки сбрасывался только СПИСОК задач (это делает
	 * usePatientResource), а открытая форма создания задачи — нет. Виджет не
	 * размонтируется: PatientOverviewTab рендерит его без key, значит это тот же
	 * компонент с тем же состоянием.
	 *
	 * Что видел администратор: набрал «перезвонить по отёку, дослать снимок» для
	 * Иванова, назначил сотрудника, не создал задачу, открыл карточку Петровой —
	 * и форма стоит заряженная чужим текстом. Кнопка «Создать задачу» отправляла
	 * её на /api/patients/<Петрова>/tickets: задача про одного человека
	 * оказывалась в карте другого, и звонок уходил не тому.
	 *
	 * Сброс в фазе рендера, а не в useEffect: эффект срабатывает после отрисовки,
	 * и чужой текст успел бы мигнуть на новой карточке. Тихо терять набранное
	 * тоже нельзя — ниже об этом сообщается прямо в виджете.
	 */
	const [formPatientId, setFormPatientId] = useState(patientId);
	const [draftDropped, setDraftDropped] = useState(false);
	if (formPatientId !== patientId) {
		setFormPatientId(patientId);
		const hadDraft = Boolean(
			newTitle.trim() || newDescription.trim() || assignedToId,
		);
		setIsAdding(false);
		setNewTitle("");
		setNewDescription("");
		setAssignedToId("");
		setDraftDropped(hadDraft);
	}

	// БЫЛО: ручная загрузка без сброса состояния и без отмены запроса —
	// задачи предыдущего пациента оставались на карточке следующего.
	const {
		data: rawTickets,
		setData: setTickets,
		isLoading,
		// БЫЛО: отказ чтения из хука не забирался, и пустой список от упавшего
		// запроса печатался как «Нет активных задач по пациенту».
		error: loadFailure,
		failureStatus,
		reload: fetchTickets,
	} = usePatientResource<any[]>(
		patientId,
		(id) => `/api/patients/${id}/tickets`,
		getReadHeaders,
		[],
	);
	const tickets: any[] = Array.isArray(rawTickets) ? rawTickets : [];
	const phase = resolvePanelPhase({
		isLoading,
		hasFailure: Boolean(loadFailure),
		isEmpty: tickets.length === 0,
	});

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!newTitle.trim() || !assignedToId) return;
		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets`, {
				method: "POST",
				headers: getMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					title: newTitle.trim(),
					description: newDescription,
					assignedToId,
					priority: "normal",
				}),
			});
			if (res.ok) {
				setIsAdding(false);
				setNewTitle("");
				setNewDescription("");
				fetchTickets();
				showToast("Задача успешно создана", "success");
			} else {
				// Поля формы очищаются только в успешной ветке выше, поэтому
				// обещание «текст остался» правдиво.
				showToast(
					`${actionFailureToast("Задача не создана", res.status)} Введённый текст остался в форме.`,
					"error",
				);
			}
		} catch (e) {
			console.error("[PatientTaskTicketsWidget add]", e);
			showToast(
				`${actionFailureToast("Задача не создана", null)} Введённый текст остался в форме.`,
				"error",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggleStatus = async (
		ticketId: string,
		currentStatus: string,
	) => {
		const newStatus = currentStatus === "pending" ? "completed" : "pending";
		// Optimistic update
		setTickets(
			tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)),
		);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/tickets/${ticketId}`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ status: newStatus }),
				},
			);
			if (!res.ok) {
				// Галочка уже переставлена оптимистично, поэтому сообщение обязано
				// сказать, что показанное значение вернулось к прежнему.
				showToast(
					`${actionFailureToast("Отметка о выполнении не сохранена", res.status)} В списке возвращено прежнее значение.`,
					"error",
				);
				fetchTickets(); // Revert on failure
			}
		} catch (e) {
			// БЫЛО: молчаливый откат. Галочка возвращалась сама, без объяснения.
			console.error("[PatientTaskTicketsWidget toggle]", e);
			showToast(
				`${actionFailureToast("Отметка о выполнении не сохранена", null)} В списке возвращено прежнее значение.`,
				"error",
			);
			fetchTickets();
		}
	};

	const handleDelete = async (ticketId: string) => {
		if (deletingId === ticketId) return;
		if (!confirm("Вы действительно хотите удалить эту задачу?")) return;
		setDeletingId(ticketId);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/tickets/${ticketId}`,
				{
					method: "DELETE",
					headers: auth.denteClinicalMutationHeaders(),
				},
			);
			if (res.ok) {
				showToast("Задача удалена", "success");
				setTickets(tickets.filter((t) => t.id !== ticketId));
			} else {
				showToast(
					`${actionFailureToast("Задача не удалена", res.status)} Она осталась в списке.`,
					"error",
				);
			}
		} catch (e) {
			// БЫЛО: только console.error. Оператор подтвердил удаление, задача
			// осталась на месте, и об этом не сообщалось.
			console.error("[PatientTaskTicketsWidget delete]", e);
			showToast(
				`${actionFailureToast("Задача не удалена", null)} Она осталась в списке.`,
				"error",
			);
		} finally {
			setDeletingId(null);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const pendingCount = tickets.filter(
		(t: any) => t.status === "pending",
	).length;

	return (
		<div
			data-testid="patient-task-tickets-widget"
			className="panel-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-0 overflow-hidden"
		>
			<div className="panel-heading flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 m-0">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
						<Clock size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white m-0 flex items-center gap-2">
							Задачи по пациенту
							{pendingCount > 0 && (
								/* БЫЛО: «3 активн.» — обрубленное слово с точкой вместо
								   согласования с числом. */
								<span className="bg-sky-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
									в работе: {pendingCount}
								</span>
							)}
						</h3>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setIsAdding(!isAdding)}
					className={`border-0 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
						isAdding
							? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
							: "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900"
					}`}
				>
					<Plus size={16} /> {isAdding ? "Отмена" : "Создать"}
				</button>
			</div>

			<div className="p-5 bg-white dark:bg-slate-900">
				{/*
					Честное сообщение о выброшенном черновике: без него сброс формы стал бы
					тихой потерей набранного текста — один обман экрана вместо другого.
				*/}
				{draftDropped && (
					<div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
						<span className="min-w-[14rem] flex-1">
							Вы открыли другую карточку. Начатая задача не перенесена сюда и не
							сохранена — чужое поручение не должно попасть в эту карту. Если
							задача нужна, вернитесь к прежнему пациенту и создайте её заново.
						</span>
						<button
							type="button"
							onClick={() => setDraftDropped(false)}
							className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1 font-semibold text-amber-900 cursor-pointer dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
						>
							Понятно
						</button>
					</div>
				)}
				<AnimatePresence>
					{isAdding && (
						<motion.form
							initial={{ opacity: 0, height: 0, marginBottom: 0 }}
							animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
							exit={{ opacity: 0, height: 0, marginBottom: 0 }}
							onSubmit={handleAdd}
							className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
						>
							<div className="grid grid-cols-1 gap-3">
								<div className="smart-field">
									<input
										id="ticket-title-input"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
										placeholder=" "
										required
										className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
									/>
									<label
										htmlFor="ticket-title-input"
										className="text-xs text-slate-500 dark:text-slate-400"
									>
										Название задачи
									</label>
								</div>

								<div className="smart-field">
									<select
										id="ticket-assigned-select"
										value={assignedToId}
										onChange={(e) => setAssignedToId(e.target.value)}
										required
										className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
									>
										<option value="" disabled>
											Выберите ответственного сотрудника
										</option>
										{staff.map((s: any) => (
											<option key={s.id} value={s.id}>
												{s.fullName}
											</option>
										))}
									</select>
									<label
										htmlFor="ticket-assigned-select"
										className="text-xs text-slate-500 dark:text-slate-400"
									>
										Кому назначена
									</label>
								</div>

								<div className="smart-field">
									<textarea
										id="ticket-description-textarea"
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
										placeholder=" "
										className="w-full p-3 rounded-lg min-h-[80px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none resize-y"
									/>
									<label
										htmlFor="ticket-description-textarea"
										className="text-xs text-slate-500 dark:text-slate-400"
									>
										Описание и комментарии (опционально)
									</label>
								</div>
							</div>

							<div className="flex gap-2 justify-end mt-4">
								<button
									type="button"
									className="ghost-button text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
									onClick={() => setIsAdding(false)}
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									aria-busy={isSubmitting}
									className="primary-button bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Создание..." : "Создать задачу"}
								</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>

				{/*
					Отказ чтения показывается вместо пустоты, а не вместе с ней:
					«задач нет» и «задачи не прочитаны» — разные утверждения.
				*/}
				{phase === "failed" && !isAdding && (
					<PanelLoadFailure
						subject={TICKETS_SUBJECT}
						status={failureStatus}
						onRetry={fetchTickets}
					/>
				)}

				{phase === "loading" && !isAdding && (
					<div className="py-4 text-xs text-slate-500 dark:text-slate-400">
						{panelStateText(TICKETS_SUBJECT, { phase: "loading" }).title}
					</div>
				)}

				{phase === "empty" && !isAdding && (
					<div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
						<Clock size={32} className="mx-auto mb-3 opacity-50" />
						<p className="m-0 text-sm font-medium text-slate-900 dark:text-white">
							{panelStateText(TICKETS_SUBJECT, { phase: "empty" }).title}
						</p>
						<p className="mt-1 mb-0 text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">
							{panelStateText(TICKETS_SUBJECT, { phase: "empty" }).hint}
						</p>
					</div>
				)}

				<div className="flex flex-col gap-2.5">
					<AnimatePresence>
						{tickets.map((ticket) => {
							const isPending = ticket.status === "pending";
							const assignee = staff.find(
								(s: any) => s.id === ticket.assignedToId,
							);

							return (
								<motion.div
									key={ticket.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
										isPending
											? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm opacity-100"
											: "bg-slate-50 dark:bg-slate-800/40 border-transparent opacity-60"
									}`}
								>
									<button
										type="button"
										onClick={() => handleToggleStatus(ticket.id, ticket.status)}
										className={`bg-transparent border-0 p-0 cursor-pointer transition-colors flex mt-0.5 ${
											isPending
												? "text-slate-400 dark:text-slate-500 hover:text-sky-600"
												: "text-emerald-500"
										}`}
										title={
											isPending
												? "Отметить как выполненную"
												: "Вернуть в работу"
										}
									>
										{isPending ? (
											<Circle size={22} />
										) : (
											<CheckCircle2 size={22} />
										)}
									</button>

									<div className="flex-1 min-w-0">
										<div
											className={`font-semibold text-sm ${
												isPending
													? "text-slate-900 dark:text-white"
													: "line-through text-slate-500 dark:text-slate-400"
											} ${ticket.description ? "mb-1.5" : "mb-2"}`}
										>
											{ticket.title}
										</div>

										{ticket.description && (
											<div className="text-xs text-slate-600 dark:text-slate-300 mb-2.5 leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-md border-l-2 border-slate-300 dark:border-slate-700">
												{ticket.description}
											</div>
										)}

										<div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
											<div className="flex items-center gap-1 font-medium">
												<User size={14} />
												<span className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded">
													{assignee?.fullName || "Неизвестный сотрудник"}
												</span>
											</div>
											<div className="flex items-center gap-1 text-slate-400">
												<Calendar size={14} />
												{new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
											</div>
										</div>
									</div>

									<button
										type="button"
										disabled={deletingId === ticket.id}
										aria-busy={deletingId === ticket.id}
										onClick={() => handleDelete(ticket.id)}
										className="bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 p-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Удалить задачу"
									>
										<Trash2 size={16} />
									</button>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
