import { Calendar, CheckCircle2, Trash2, UserPlus, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

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
}

export function WaitlistDrawer({
	isOpen,
	onClose,
	updateNewAppointmentDraft,
	focusNewAppointmentEditor,
}: Props) {
	const { auth, dashboard } = useAppLogicContext();
	const [items, setItems] = useState<WaitlistItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Form State
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState("");
	const [priorityLevel, setPriorityLevel] = useState<"high" | "medium" | "low">(
		"medium",
	);

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter(
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);
	const patientsList = dashboard?.patients || [];

	const fetchWaitlist = async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/waitlist", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			console.error("Failed to load waitlist", e);
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
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
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
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка добавления", "error");
			}
		} catch (e) {
			showToast("Системная ошибка", "error");
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Удалить запись из листа ожидания?")) return;
		try {
			const res = await fetch(`/api/waitlist/${id}`, {
				method: "DELETE",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена", "success");
				fetchWaitlist();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (e) {
			showToast("Системная ошибка", "error");
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
		low: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
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
					className="border border-slate-600 shadow-xl rounded-lg p-3 flex items-center gap-3 transition-colors"
					style={{ background: "var(--paper)", color: "var(--ink)" }}
				>
					<Calendar className="w-5 h-5 text-teal-400" />
					<span className="font-medium">
						Лист ожидания (Свернут)
					</span>
				</button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
			<div className="absolute inset-0" onClick={onClose} />
			<div 
				className="relative w-full max-w-md h-full border-l border-slate-700/80 shadow-2xl flex flex-col z-10 animate-slide-in"
				style={{ background: "var(--paper)", color: "var(--ink)" }}
			>
				{/* Header */}
				<div className="p-6 border-b border-slate-700/60 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Calendar className="w-5 h-5 text-teal-400" />
						<h3 className="text-lg font-semibold tracking-wide">
							Лист ожидания
						</h3>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setIsMinimized(true)}
							className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
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
							className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
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
						className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 space-y-4"
					>
						<h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
							<UserPlus className="w-4 h-4 text-teal-400" />
							Добавить в очередь
						</h4>

						<div className="space-y-1">
							<label className="text-xs text-slate-400 font-medium">
								Пациент *
							</label>
							<select
								value={selectedPatientId}
								onChange={(e) => setSelectedPatientId(e.target.value)}
								className="w-full border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-teal-500"
								style={{ background: "var(--paper)", color: "var(--ink)" }}
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
							<label className="text-xs text-slate-400 font-medium">
								Желаемый врач
							</label>
							<select
								value={preferredDoctorId}
								onChange={(e) => setPreferredDoctorId(e.target.value)}
								className="w-full border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-teal-500"
								style={{ background: "var(--paper)", color: "var(--ink)" }}
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
							<label className="text-xs text-slate-400 font-medium">
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
												: "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
										}`}
									>
										{priorityLabels[p]}
									</button>
								))}
							</div>
						</div>

						<button
							type="submit"
							className="w-full py-2 bg-teal-500 font-bold rounded-lg text-sm transition-colors shadow-md shadow-teal-500/10"
							style={{ background: "var(--teal)", color: "var(--paper)" }}
						>
							Добавить в очередь
						</button>
					</form>

					{/* Waitlist queue */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							Пациенты в очереди ({items.length})
						</h4>

						{isLoading && items.length === 0 ? (
							<div className="text-center py-8 text-slate-400 text-sm">
								Загрузка...
							</div>
						) : items.length === 0 ? (
							<div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-700/80 rounded-xl">
								Очередь ожидания пуста
							</div>
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
										className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 hover:border-teal-500/50 cursor-grab active:cursor-grabbing transition-colors"
									>
										<div className="flex justify-between items-start">
											<div>
												<h5 className="font-semibold text-sm text-slate-100">
													{item.patientName || "Неизвестный пациент"}
												</h5>
												{item.patientPhone && (
													<p className="text-xs text-slate-400 mt-0.5">
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
											<div className="text-xs text-slate-400 flex gap-1">
												<span className="font-medium text-slate-500">
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
											<button
												onClick={async () => {
													try {
														const res = await fetch(
															`/api/waitlist/${item.id}`,
															{
																method: "DELETE",
																headers: auth.denteClinicalReadHeaders(),
															},
														);
														if (res.ok) {
															showToast("Заявка выполнена", "success");
															fetchWaitlist();
														} else {
															showToast("Ошибка при выполнении", "error");
														}
													} catch (e) {
														showToast("Системная ошибка", "error");
													}
												}}
												className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-colors"
												title="Отметить выполненным"
											>
												<CheckCircle2 className="w-3.5 h-3.5" />
											</button>
											<button
												onClick={() => handleDelete(item.id)}
												className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
												title="Удалить из очереди"
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
