import { AnimatePresence, motion } from "framer-motion";
import {
	AlertOctagon,
	Calendar,
	CheckCircle2,
	Plus,
	ShieldAlert,
	Stethoscope,
	Trash2,
	User,
	UserX,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { showToast } from "../GlobalToast";

export function PatientReclamationsWidget({
	patientId,
}: {
	patientId: string;
}) {
	const { dashboard, auth } = useAppLogicContext();
	const [isAdding, setIsAdding] = useState(false);

	const getReadHeaders = () => auth ? auth.denteClinicalReadHeaders() : {};
	const getMutationHeaders = (extra?: Record<string, string>) => auth ? auth.denteClinicalMutationHeaders(extra) : { ...(extra || {}) };

	const [newComplicationDetails, setNewComplicationDetails] = useState("");
	const [newProposedAction, setNewProposedAction] = useState("");
	const [doctorId, setDoctorId] = useState("");

	// БЫЛО: ручная загрузка без сброса состояния и без отмены запроса. При
	// переключении пациента на его карточке оставались осложнения и
	// претензии предыдущего — это уже не косметика, а приписывание чужого
	// осложнения другому человеку.
	const {
		data: rawReclamations,
		setData: setReclamations,
		isLoading,
		reload: fetchReclamations,
	} = usePatientResource<any[]>(
		patientId,
		(id) => `/api/patients/${id}/reclamations`,
		getReadHeaders,
		[],
	);
	const reclamations: any[] = Array.isArray(rawReclamations) ? rawReclamations : [];

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComplicationDetails || !doctorId) return;
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations`, {
				method: "POST",
				headers: getMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					complicationDetails: newComplicationDetails,
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
				showToast("Ошибка при фиксации", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка сети", "error");
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
				showToast("Ошибка при обновлении статуса", "error");
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
			console.error(e);
			fetchReclamations();
		}
	};

	const handleDelete = async (recId: string) => {
		if (
			!confirm(
				"Вы действительно хотите полностью удалить запись об этом инциденте? Это действие нельзя отменить.",
			)
		)
			return;
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
				showToast("Ошибка при удалении", "error");
			}
		} catch (e) {
			console.error(e);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter(
		(s: any) => s.role === "doctor" || s.role === "Врач",
	);
	const reviewCount = reclamations.filter(
		(t: any) => t.status === "under_review",
	).length;

	if (reclamations.length === 0 && !isAdding && !isLoading) {
		return (
			<div
				data-testid="patient-reclamations-widget"
				className="panel-card bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl mt-4 p-0 overflow-hidden"
			>
				<div className="panel-heading flex justify-between items-center p-4 bg-transparent m-0">
					<div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
						<div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
							<ShieldAlert size={16} />
						</div>
						<h3 className="text-sm font-semibold m-0 text-slate-900 dark:text-white">
							Рекламации и осложнения отсутствуют
						</h3>
					</div>
					<button
						type="button"
						onClick={() => setIsAdding(true)}
						className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
								<span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow">
									{reviewCount} открыт.
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
									<label className="text-xs text-rose-700 dark:text-rose-400 font-medium">
										Врач (автор работы)
									</label>
								</div>

								<div className="smart-field">
									<textarea
										value={newComplicationDetails}
										onChange={(e) => setNewComplicationDetails(e.target.value)}
										placeholder=" "
										required
										className="w-full p-3 rounded-lg min-h-[80px] bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-slate-900 dark:text-white outline-none resize-y"
									/>
									<label className="text-xs text-rose-700 dark:text-rose-400 font-medium">
										Суть жалобы или осложнения
									</label>
								</div>

								<div className="smart-field">
									<textarea
										value={newProposedAction}
										onChange={(e) => setNewProposedAction(e.target.value)}
										placeholder=" "
										className="w-full p-3 rounded-lg min-h-[60px] bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-slate-900 dark:text-white outline-none resize-y"
									/>
									<label className="text-xs text-rose-700 dark:text-rose-400 font-medium">
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
									className="primary-button bg-rose-600 hover:bg-rose-700 text-white border-0 px-4 py-2 rounded-lg font-semibold cursor-pointer"
								>
									Зафиксировать в карту
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
													onClick={() => handleDelete(rec.id)}
													className="bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 p-1.5 rounded-md cursor-pointer transition-colors"
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
