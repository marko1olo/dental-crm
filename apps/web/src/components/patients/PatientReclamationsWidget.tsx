import { AnimatePresence, motion } from "framer-motion";
import {
	AlertOctagon,
	Calendar,
	CheckCircle2,
	Plus,
	ShieldAlert,
	Stethoscope,
	Trash2,
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
 * Что показывать вместо списка. Заведено здесь, а не в разметке, потому что
 * «журнал осложнений не прочитан» и «осложнений нет» — противоположные
 * утверждения, и раньше виджет печатал второе вместо первого: при отказе
 * сервера список приходил пустым, и заголовок сообщал
 * «Рекламации и осложнения отсутствуют» врачу, у пациента которого они есть.
 */
const RECLAMATIONS_SUBJECT: PanelSubject = {
	notLoadedTitle: "Рекламации и осложнения не загружены",
	accusative: "рекламации и осложнения по пациенту",
	emptyTitle: "Рекламации и осложнения отсутствуют",
	emptyHint:
		"Если пациент жалуется на результат лечения, зафиксируйте это здесь — тогда история будет видна врачу и руководителю.",
	failureConsequence:
		"Не считайте, что осложнений нет: журнал не прочитан. Перед разговором с пациентом обновите список.",
};

export function PatientReclamationsWidget({
	patientId,
}: {
	patientId: string;
}) {
	const { dashboard, auth } = useAppLogicContext();
	const [isAdding, setIsAdding] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const getReadHeaders = () => (auth ? auth.denteClinicalReadHeaders() : {});
	const getMutationHeaders = (extra?: Record<string, string>) =>
		auth ? auth.denteClinicalMutationHeaders(extra) : { ...(extra || {}) };

	const [newComplicationDetails, setNewComplicationDetails] = useState("");
	const [newProposedAction, setNewProposedAction] = useState("");
	const [doctorId, setDoctorId] = useState("");

	/*
	 * БЫЛО: при переключении карточки сбрасывался только СПИСОК (это делает
	 * usePatientResource), а открытая форма фиксации осложнения — нет. Виджет не
	 * размонтируется: PatientOverviewTab рендерит его как
	 * <PatientReclamationsWidget patientId={selectedPatientId} /> без key, то есть
	 * это тот же самый компонент с тем же состоянием.
	 *
	 * Что видел администратор: начал записывать жалобу пациента Иванова, выбрал
	 * лечащего врача, не сохранил, открыл карточку Петровой — и под её фамилией
	 * стоит уже заряженная форма с текстом про Иванова. Нажатие «Зафиксировать в
	 * карту» отправляло этот текст на /api/patients/<Петрова>/reclamations, то
	 * есть осложнение приписывалось человеку, у которого его не было. Это уже не
	 * косметика: рекламация — основание для гарантии, возврата и разбора с врачом.
	 *
	 * Сброс сделан в фазе рендера, а не в useEffect: useEffect срабатывает ПОСЛЕ
	 * отрисовки, и чужой текст успел бы мигнуть на экране новой карточки.
	 * Молча терять набранное тоже нельзя, поэтому ниже показывается строка о том,
	 * что текст не перенесён и не сохранён.
	 */
	const [formPatientId, setFormPatientId] = useState(patientId);
	const [draftDropped, setDraftDropped] = useState(false);
	if (formPatientId !== patientId) {
		setFormPatientId(patientId);
		const hadDraft = Boolean(
			newComplicationDetails.trim() || newProposedAction.trim() || doctorId,
		);
		setIsAdding(false);
		setNewComplicationDetails("");
		setNewProposedAction("");
		setDoctorId("");
		setDraftDropped(hadDraft);
	}

	// БЫЛО: ручная загрузка без сброса состояния и без отмены запроса. При
	// переключении пациента на его карточке оставались осложнения и
	// претензии предыдущего — это уже не косметика, а приписывание чужого
	// осложнения другому человеку.
	const {
		data: rawReclamations,
		setData: setReclamations,
		isLoading,
		// БЫЛО: отказ чтения не забирался из хука вовсе, и пустой список от
		// упавшего запроса превращался в «осложнений нет».
		error: loadFailure,
		failureStatus,
		reload: fetchReclamations,
	} = usePatientResource<any[]>(
		patientId,
		(id) => `/api/patients/${id}/reclamations`,
		getReadHeaders,
		[],
	);
	const reclamations: any[] = Array.isArray(rawReclamations)
		? rawReclamations
		: [];
	const phase = resolvePanelPhase({
		isLoading,
		hasFailure: Boolean(loadFailure),
		isEmpty: reclamations.length === 0,
	});

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!newComplicationDetails.trim() || !doctorId) return;
		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations`, {
				method: "POST",
				headers: getMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					complicationDetails: newComplicationDetails.trim(),
					proposedAction: newProposedAction,
					doctorId,
				}),
			});
			if (res.ok) {
				setIsAdding(false);
				setNewComplicationDetails("");
				setNewProposedAction("");
				setDoctorId("");
				fetchReclamations();
				showToast("Рекламация зафиксирована", "success");
			} else {
				// Форма не очищается при отказе, поэтому обещание «текст остался»
				// правдиво: сброс полей стоит только в успешной ветке выше.
				showToast(
					`${actionFailureToast("Рекламация не зафиксирована", res.status)} Введённый текст остался в форме.`,
					"error",
				);
			}
		} catch (e) {
			console.error("[PatientReclamationsWidget add]", e);
			showToast(
				`${actionFailureToast("Рекламация не зафиксирована", null)} Введённый текст остался в форме.`,
				"error",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggleStatus = async (recId: string, currentStatus: string) => {
		const newStatus =
			currentStatus === "under_review" ? "resolved" : "under_review";

		setReclamations(
			reclamations.map((r) =>
				r.id === recId ? { ...r, status: newStatus } : r,
			),
		);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/reclamations/${recId}`,
				{
					method: "PUT",
					headers: getMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ status: newStatus }),
				},
			);
			if (!res.ok) {
				// Строка уже перекрашена оптимистично, поэтому сообщение обязано
				// сказать, что показанное значение вернулось к прежнему.
				showToast(
					`${actionFailureToast("Статус инцидента не изменён", res.status)} В списке возвращено прежнее значение.`,
					"error",
				);
				fetchReclamations();
			} else {
				showToast(
					newStatus === "resolved"
						? "Инцидент урегулирован"
						: "Инцидент возвращен в работу",
					"success",
				);
			}
		} catch (e) {
			console.error("[PatientReclamationsWidget toggle]", e);
			// БЫЛО: молчаливый откат. Оператор нажал «Урегулировано», строка
			// вернулась в прежний вид, и почему — не сообщалось.
			showToast(
				`${actionFailureToast("Статус инцидента не изменён", null)} В списке возвращено прежнее значение.`,
				"error",
			);
			fetchReclamations();
		}
	};

	const handleDelete = async (recId: string) => {
		if (deletingId === recId) return;
		if (
			!confirm(
				"Вы действительно хотите полностью удалить запись об этом инциденте? Это действие нельзя отменить.",
			)
		)
			return;
		setDeletingId(recId);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/reclamations/${recId}`,
				{
					method: "DELETE",
					headers: getMutationHeaders(),
				},
			);
			if (res.ok) {
				showToast("Рекламация удалена", "success");
				setReclamations(reclamations.filter((r) => r.id !== recId));
			} else {
				showToast(
					`${actionFailureToast("Рекламация не удалена", res.status)} Запись осталась в карте.`,
					"error",
				);
			}
		} catch (e) {
			// БЫЛО: только console.error. Оператор подтвердил безвозвратное
			// удаление, запись осталась на месте, и об этом ему не сказали.
			console.error("[PatientReclamationsWidget delete]", e);
			showToast(
				`${actionFailureToast("Рекламация не удалена", null)} Запись осталась в карте.`,
				"error",
			);
		} finally {
			setDeletingId(null);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter(
		(s: any) => s.role === "doctor" || s.role === "Врач",
	);
	const reviewCount = reclamations.filter(
		(t: any) => t.status === "under_review",
	).length;

	/*
	 * Честное сообщение о выброшенном черновике. Без него сброс формы превратился
	 * бы в тихую потерю набранного текста — второй обман экрана вместо первого.
	 * Показывается во всех четырёх состояниях виджета, потому что сразу после
	 * переключения карточки виджет уходит в «загружается», а не в список.
	 */
	const draftDroppedNotice = draftDropped ? (
		<div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
			<span className="min-w-[14rem] flex-1">
				Вы открыли другую карточку. Набранная жалоба не перенесена сюда и не
				сохранена — чужое осложнение не должно попасть в эту карту. Если запись
				нужна, вернитесь к прежнему пациенту и внесите её заново.
			</span>
			<button
				type="button"
				onClick={() => setDraftDropped(false)}
				className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1 font-semibold text-amber-900 cursor-pointer dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100"
			>
				Понятно
			</button>
		</div>
	) : null;

	/*
	 * Три состояния разведены и идут в этом порядке: отказ важнее пустоты,
	 * пустота отличается от загрузки. Прежде проверка была одна —
	 * `length === 0 && !isLoading` — и накрывала оба нештатных случая
	 * заголовком «Рекламации и осложнения отсутствуют».
	 */
	if (phase === "failed" && !isAdding) {
		return (
			<div
				data-testid="patient-reclamations-widget"
				className="panel-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-4 flex flex-wrap items-start gap-3"
			>
				{draftDroppedNotice ? (
					<div className="w-full">{draftDroppedNotice}</div>
				) : null}
				<PanelLoadFailure
					subject={RECLAMATIONS_SUBJECT}
					status={failureStatus}
					onRetry={fetchReclamations}
					className="flex-1 min-w-[16rem]"
				/>
				{/*
					БЫЛО: этот возврат содержал ТОЛЬКО строку отказа. Оба вызова
					`setIsAdding(true)` живут в ветках «пусто» и «данные есть», поэтому
					при отказе чтения `isAdding` не мог стать true никогда — упавшее
					ЧТЕНИЕ отбирало возможность ЗАПИСИ. Это две независимые операции:
					при обрыве сети или сбое сервера врач всё равно обязан иметь
					возможность зафиксировать осложнение, а не остаться со списком,
					который не читается. Обещания «сохранится» здесь нет намеренно:
					отказ записи виджет озвучит своим уведомлением.
				*/}
				<button
					type="button"
					onClick={() => setIsAdding(true)}
					className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
				>
					+ Фиксировать
				</button>
			</div>
		);
	}

	if (phase === "loading" && !isAdding) {
		return (
			<div
				data-testid="patient-reclamations-widget"
				className="panel-card bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-4 text-xs text-slate-500 dark:text-slate-400"
			>
				{draftDroppedNotice}
				{panelStateText(RECLAMATIONS_SUBJECT, { phase: "loading" }).title}
			</div>
		);
	}

	if (phase === "empty" && !isAdding) {
		const emptyText = panelStateText(RECLAMATIONS_SUBJECT, { phase: "empty" });
		return (
			<div
				data-testid="patient-reclamations-widget"
				className="panel-card bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-0 overflow-hidden"
			>
				{draftDroppedNotice ? (
					<div className="px-4 pt-4">{draftDroppedNotice}</div>
				) : null}
				<div className="panel-heading flex flex-wrap justify-between items-start gap-3 p-4 bg-transparent m-0">
					<div className="flex items-start gap-2.5 text-slate-500 dark:text-slate-400 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<ShieldAlert size={16} />
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-semibold m-0 text-slate-900 dark:text-white">
								{emptyText.title}
							</h3>
							{/* Пустота без подсказки — тупик: непонятно, зачем этот блок здесь. */}
							<p className="text-xs m-0 mt-1 leading-relaxed break-words">
								{emptyText.hint}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setIsAdding(true)}
						className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
					>
						+ Фиксировать
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			data-testid="patient-reclamations-widget"
			className="panel-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-0 overflow-hidden"
		>
			<div className="panel-heading flex justify-between items-center p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 m-0">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
						<AlertOctagon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-rose-900 dark:text-rose-300 m-0 flex items-center gap-2">
							Рекламации и инциденты
							{reviewCount > 0 && (
								/* БЫЛО: «3 открыт.» — обрубленное слово с точкой, которое
								   ничего не согласует ни с одним числом. */
								<span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow">
									в работе: {reviewCount}
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
							? "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100"
							: "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
					}`}
				>
					<Plus size={16} /> {isAdding ? "Отмена" : "Добавить"}
				</button>
			</div>

			<div className="p-5 bg-white dark:bg-slate-900">
				{draftDroppedNotice}
				{/*
					Форма открыта, а список не прочитан — это состояние тоже надо
					называть: иначе, нажав «Фиксировать» на упавшем чтении, оператор
					увидит пустой журнал под формой и решит, что осложнений нет.
				*/}
				{phase === "failed" && (
					<PanelLoadFailure
						subject={RECLAMATIONS_SUBJECT}
						status={failureStatus}
						onRetry={fetchReclamations}
						className="mb-5"
					/>
				)}
				<AnimatePresence>
					{isAdding && (
						<motion.form
							initial={{ opacity: 0, height: 0, marginBottom: 0 }}
							animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
							exit={{ opacity: 0, height: 0, marginBottom: 0 }}
							onSubmit={handleAdd}
							className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-xl border border-dashed border-rose-300 dark:border-rose-800 overflow-hidden"
						>
							<div className="grid grid-cols-1 gap-4">
								<div className="smart-field">
									<select
										id="reclamation-doctor-select"
										value={doctorId}
										onChange={(e) => setDoctorId(e.target.value)}
										required
										className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-slate-900 dark:text-white outline-none"
									>
										<option value="" disabled>
											Выберите лечащего врача
										</option>
										{doctors.map((s: any) => (
											<option key={s.id} value={s.id}>
												{s.fullName}
											</option>
										))}
									</select>
									<label
										htmlFor="reclamation-doctor-select"
										className="text-xs text-rose-700 dark:text-rose-400 font-medium"
									>
										Врач (автор работы)
									</label>
								</div>

								<div className="smart-field">
									<textarea
										id="reclamation-details"
										value={newComplicationDetails}
										onChange={(e) => setNewComplicationDetails(e.target.value)}
										placeholder=" "
										required
										className="w-full p-3 rounded-lg min-h-[80px] bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-slate-900 dark:text-white outline-none resize-y"
									/>
									<label
										htmlFor="reclamation-details"
										className="text-xs text-rose-700 dark:text-rose-400 font-medium"
									>
										Суть жалобы или осложнения
									</label>
								</div>

								<div className="smart-field">
									<textarea
										id="reclamation-proposed-action"
										value={newProposedAction}
										onChange={(e) => setNewProposedAction(e.target.value)}
										placeholder=" "
										className="w-full p-3 rounded-lg min-h-[60px] bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-slate-900 dark:text-white outline-none resize-y"
									/>
									<label
										htmlFor="reclamation-proposed-action"
										className="text-xs text-rose-700 dark:text-rose-400 font-medium"
									>
										Предложенное решение (гарантия, возврат, переделка)
									</label>
								</div>
							</div>

							<div className="flex gap-3 justify-end mt-5">
								<button
									type="button"
									className="ghost-button text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
									onClick={() => setIsAdding(false)}
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									aria-busy={isSubmitting}
									className="primary-button bg-rose-600 hover:bg-rose-700 text-white border-0 px-4 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Фиксация..." : "Зафиксировать в карту"}
								</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>

				<div className="flex flex-col gap-3">
					<AnimatePresence>
						{reclamations.map((rec) => {
							const isUnderReview = rec.status === "under_review";
							const doctor = staff.find((s: any) => s.id === rec.doctorId);

							return (
								<motion.div
									key={rec.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
										isUnderReview
											? "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 shadow-sm opacity-100"
											: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-70"
									}`}
								>
									<div
										className={`w-1 h-10 rounded-full mt-1 ${
											isUnderReview ? "bg-rose-500" : "bg-emerald-500"
										}`}
									/>

									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-start mb-2">
											<div
												className={`font-semibold text-sm ${
													isUnderReview
														? "text-rose-950 dark:text-rose-200"
														: "text-slate-900 dark:text-white"
												}`}
											>
												{rec.complicationDetails}
											</div>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => handleToggleStatus(rec.id, rec.status)}
													className={`border-0 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
														isUnderReview
															? "bg-emerald-600 hover:bg-emerald-700 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
													}`}
													title={
														isUnderReview
															? "Отметить как урегулированную"
															: "Вернуть на рассмотрение"
													}
												>
													{isUnderReview ? (
														<>
															<CheckCircle2 size={14} /> Урегулировано
														</>
													) : (
														"Вернуть в работу"
													)}
												</button>
												<button
													type="button"
													disabled={deletingId === rec.id}
													aria-busy={deletingId === rec.id}
													onClick={() => handleDelete(rec.id)}
													className="bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 p-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													title="Удалить безвозвратно"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>

										{rec.proposedAction && (
											<div className="text-xs text-slate-700 dark:text-slate-300 mb-3 leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border-l-2 border-slate-300 dark:border-slate-700">
												<strong className="block mb-1 text-slate-900 dark:text-white">
													Предложенное решение:
												</strong>
												{rec.proposedAction}
											</div>
										)}

										<div className="flex items-center gap-4 flex-wrap mt-3 text-xs text-slate-500 dark:text-slate-400">
											<div className="flex items-center gap-1.5 font-medium">
												<Stethoscope size={14} />
												<span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
													{doctor?.fullName || "Неизвестный врач"}
												</span>
											</div>
											<div className="flex items-center gap-1 text-slate-400">
												<Calendar size={14} />
												Зафиксировано:{" "}
												{new Date(rec.createdAt).toLocaleDateString("ru-RU")}
											</div>
											{rec.resolvedAt && (
												<div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
													<CheckCircle2 size={14} />
													Урегулировано:{" "}
													{new Date(rec.resolvedAt).toLocaleDateString("ru-RU")}
												</div>
											)}
										</div>
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
