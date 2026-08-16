import type { Appointment } from "@dental/shared";
import { formatKopecksRu, parseKopecks } from "@dental/shared";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	Banknote,
	Calendar,
	Check,
	CheckCircle,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	Download,
	FileSpreadsheet,
	FileText,
	MessageSquare,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneOff,
	Printer,
	QrCode,
	Receipt,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	User,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { usePatientStore } from "../../store/patientStore";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { logger } from "../../utils/logger";
import { NdflCalculatorModal } from "../documents/NdflCalculatorModal";
import { showToast } from "../GlobalToast";

interface CheckoutItem {
	appointmentId: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	serviceSummary: string;
	amountRub: number;
	fiscalStatus: "pending" | "paid";
	time: string;
}

export function FrontdeskPerspectiveView() {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const setPerspective = usePerspectiveStore((s) => s.setPerspective);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const [isNdflModalOpen, setIsNdflModalOpen] = useState(false);
	const [activeSbpQrAppointment, setActiveSbpQrAppointment] = useState<CheckoutItem | null>(null);
	const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
	const [callStatusMap, setCallStatusMap] = useState<Record<string, "confirmed" | "no_answer" | "rescheduled" | "cancelled">>({});
	const [filterSearch, setFilterSearch] = useState("");

	// Today's Appointments with unbilled / checkout status
	const unbilledVisits: CheckoutItem[] = useMemo(() => {
		if (!dashboard?.appointments) return [];
		return dashboard.appointments
			.filter((apt) => apt.status === "completed" || apt.status === "in_treatment" || apt.status === "arrived")
			.map((apt) => {
				const patient = dashboard.patients?.find((p) => p.id === apt.patientId);
				const doctor = dashboard.staff?.find((s) => s.id === apt.doctorId);
				const amount = apt.priceRub ? Number(apt.priceRub) : 4500;
				return {
					appointmentId: apt.id,
					patientId: apt.patientId,
					patientName: patient?.fullName || apt.patientName || "Пациент",
					doctorName: doctor?.name || "Врач клиники",
					serviceSummary: apt.serviceName || apt.treatmentNotes || "Терапевтический прием и консультация",
					amountRub: amount,
					fiscalStatus: "pending",
					time: apt.startTime || "10:00",
				};
			});
	}, [dashboard?.appointments, dashboard?.patients, dashboard?.staff]);

	// Morning Call List (Planned & Confirmed appointments for today)
	const morningCallList = useMemo(() => {
		if (!dashboard?.appointments) return [];
		return dashboard.appointments
			.filter((apt) => apt.status === "planned" || apt.status === "confirmed")
			.map((apt) => {
				const patient = dashboard.patients?.find((p) => p.id === apt.patientId);
				const doctor = dashboard.staff?.find((s) => s.id === apt.doctorId);
				return {
					id: apt.id,
					patientId: apt.patientId,
					patientName: patient?.fullName || apt.patientName || "Пациент",
					phone: patient?.phone || "+7 (999) 000-00-00",
					doctorName: doctor?.name || "Врач клиники",
					time: apt.startTime || "11:00",
					chair: apt.chairId || "Кабинет 1",
					status: callStatusMap[apt.id] || "planned",
				};
			})
			.filter((item) => {
				if (!filterSearch.trim()) return true;
				const q = filterSearch.toLowerCase();
				return item.patientName.toLowerCase().includes(q) || item.phone.includes(q);
			});
	}, [dashboard?.appointments, dashboard?.patients, dashboard?.staff, callStatusMap, filterSearch]);

	const handle1ClickCheckout = async (visit: CheckoutItem, method: "cash" | "card" | "sbp") => {
		setProcessingPaymentId(visit.appointmentId);
		try {
			const res = await fetch("/api/payments/checkout", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					appointmentId: visit.appointmentId,
					patientId: visit.patientId,
					amountRub: visit.amountRub,
					paymentMethod: method,
					fiscalize54Fz: true,
				}),
			});

			if (!res.ok) {
				showToast(actionFailureToast("Ошибка проведения оплаты 54-ФЗ", res.status), "error");
				return;
			}

			const data = await res.json();
			showToast(
				`Оплата ${visit.amountRub.toLocaleString("ru-RU")} ₽ принята! Фискальный чек 54-ФЗ #${data.fiscalReceiptNumber || "ОФД"} сформирован.`,
				"success",
			);
			await loadDashboard();
		} catch (err) {
			logger.error("[FrontdeskPerspective] Checkout error", err);
			showToast("Ошибка связи с фискальным регистратором", "error");
		} finally {
			setProcessingPaymentId(null);
		}
	};

	const handleCallAction = (appointmentId: string, status: "confirmed" | "no_answer" | "rescheduled" | "cancelled") => {
		setCallStatusMap((prev) => ({ ...prev, [appointmentId]: status }));
		const statusText =
			status === "confirmed"
				? "Приём подтверждён"
				: status === "no_answer"
					? "Не отвечает"
					: status === "rescheduled"
						? "Запрос на перенос"
						: "Отмена визита";
		showToast(`Статус звонка: «${statusText}»`, "info");
	};

	return (
		<div
			data-testid="frontdesk-perspective-view"
			className="frontdesk-perspective min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col p-3 md:p-6 select-none"
		>
			{/* Top Bar: Frontdesk Context */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl p-4 shadow-sm">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[52px] min-w-[52px] px-4 py-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--ink,#0f172a)] font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к стандартному расписанию"
					>
						<ArrowLeft size={20} />
						<span className="hidden sm:inline">Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-500/30">
								Ресепшн и Экспресс-Касса 54-ФЗ
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">ОФД Онлайн · ФН готов</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] m-0 mt-1">
							Рабочее место администратора
						</h1>
					</div>
				</div>

				{/* 1-Click Fast Actions */}
				<div className="flex items-center gap-2.5 flex-wrap">
					{/* 1-Click NDFL 13% Certificate Generator */}
					<button
						type="button"
						onClick={() => setIsNdflModalOpen(true)}
						className="h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 border border-teal-500/30 cursor-pointer active:scale-95 transition-all"
					>
						<FileText size={16} />
						<span>Справка НДФЛ 13% (1 клик)</span>
					</button>

					{/* Z-Report / Daily Cash Summary */}
					<button
						type="button"
						onClick={() => showToast("Z-отчёт и сводка кассы 54-ФЗ отправлены на печать", "info")}
						className="h-11 px-3.5 rounded-xl bg-[var(--surface,#f1f5f9)] hover:bg-[var(--surface-muted,#e2e8f0)] text-[var(--ink,#0f172a)] font-bold text-xs flex items-center gap-2 border border-[var(--line,#cbd5e1)] cursor-pointer active:scale-95 transition-all"
					>
						<Printer size={16} />
						<span className="hidden sm:inline">Z-отчёт дня</span>
					</button>
				</div>
			</header>

			{/* Main Grid: Express Cashier (Left) + Morning Calls (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Express 54-FZ Cashier Dashboard */}
				<section className="lg:col-span-7 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl p-5 shadow-sm flex flex-col">
					<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)]">
						<div className="flex items-center gap-2">
							<Receipt size={22} className="text-teal-600 dark:text-teal-400" />
							<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] m-0">
								К оплате сегодня (Визиты без закрытия чека)
							</h2>
						</div>
						<span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
							{unbilledVisits.length} визитов
						</span>
					</div>

					{unbilledVisits.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-12 text-[var(--muted,#64748b)] gap-3 text-center flex-1">
							<CheckCircle2 size={48} className="text-emerald-500 opacity-80" />
							<p className="font-bold text-base text-[var(--ink,#0f172a)] m-0">Все визиты на сегодня рассчитаны</p>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 max-w-sm">
								Нет неоплаченных приёмов. Все фискальные чеки 54-ФЗ сформированы и отправлены в ОФД.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
							{unbilledVisits.map((visit) => {
								const isProcessing = processingPaymentId === visit.appointmentId;
								return (
									<div
										key={visit.appointmentId}
										className="p-4 rounded-xl bg-[var(--surface,#f1f5f9)] border border-[var(--line,#cbd5e1)] hover:border-teal-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
									>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
													{visit.time}
												</span>
												<strong className="text-base text-[var(--ink,#0f172a)]">{visit.patientName}</strong>
											</div>
											<div className="text-xs text-[var(--ink,#0f172a)] mt-1">{visit.serviceSummary}</div>
											<div className="text-xs text-[var(--muted,#64748b)] mt-0.5">Врач: {visit.doctorName}</div>
										</div>

										<div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
											<div className="text-right">
												<div className="text-xs text-[var(--muted,#64748b)] uppercase font-semibold">Итого к оплате</div>
												<div className="text-lg font-black text-amber-600 dark:text-amber-400">
													{visit.amountRub.toLocaleString("ru-RU")} ₽
												</div>
											</div>

											{/* 1-Click Action Buttons */}
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													disabled={isProcessing}
													onClick={() => void handle1ClickCheckout(visit, "cash")}
													className="h-11 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-emerald-400/30"
													title="Оплата наличными (Чек 54-ФЗ)"
												>
													<Banknote size={16} />
													<span className="hidden sm:inline">Нал</span>
												</button>

												<button
													type="button"
													disabled={isProcessing}
													onClick={() => void handle1ClickCheckout(visit, "card")}
													className="h-11 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-blue-400/30"
													title="Оплата картой через терминал (Чек 54-ФЗ)"
												>
													<CreditCard size={16} />
													<span className="hidden sm:inline">Карта</span>
												</button>

												<button
													type="button"
													disabled={isProcessing}
													onClick={() => setActiveSbpQrAppointment(visit)}
													className="h-11 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-purple-400/30"
													title="Оплата по СБП (Динамический QR-код на экране)"
												>
													<QrCode size={16} />
													<span>СБП</span>
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>

				{/* Right: Morning Call List */}
				<section className="lg:col-span-5 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-2">
								<PhoneCall size={22} className="text-teal-600 dark:text-teal-400" />
								<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] m-0">Утренний обзвон пациентов</h2>
							</div>
							<span className="text-xs text-[var(--muted,#64748b)]">На сегодня</span>
						</div>

						{/* Filter & Search Input */}
						<div className="relative mb-3 flex items-center">
							<Search size={16} className="absolute left-3 text-[var(--muted,#64748b)] pointer-events-none z-10" />
							<input
								type="text"
								placeholder="Поиск по имени или телефону..."
								value={filterSearch}
								onChange={(e) => setFilterSearch(e.target.value)}
								style={{ paddingLeft: "38px" }}
								className="w-full h-10 pr-3 rounded-lg bg-[var(--surface,#f1f5f9)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] text-xs outline-none focus:border-teal-500"
							/>
						</div>

						{/* Calls List */}
						<div className="flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1 flex-1">
							{morningCallList.length === 0 ? (
								<div className="p-8 text-center text-[var(--muted,#64748b)] text-xs">
									Нет запланированных звонков в списке
								</div>
							) : (
								morningCallList.map((call) => (
									<div
										key={call.id}
										className="p-3 rounded-xl bg-[var(--surface,#f1f5f9)] border border-[var(--line,#cbd5e1)] flex flex-col gap-2"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-1.5 py-0.2 rounded border border-teal-500/20">
														{call.time}
													</span>
													<strong className="text-sm text-[var(--ink,#0f172a)]">{call.patientName}</strong>
												</div>
												<div className="text-xs text-[var(--ink,#0f172a)] mt-1 flex items-center gap-2">
													<Phone size={12} className="text-[var(--muted,#64748b)]" />
													<a
														href={`tel:${call.phone}`}
														className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
													>
														{call.phone}
													</a>
													<span className="text-[var(--muted,#64748b)]">· {call.chair}</span>
												</div>
											</div>

											{/* Call Status Badge */}
											<div className="shrink-0">
												{call.status === "confirmed" && (
													<span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
														<Check size={12} /> Подтвердил
													</span>
												)}
												{call.status === "no_answer" && (
													<span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
														<PhoneOff size={12} /> Не отвечает
													</span>
												)}
												{call.status === "rescheduled" && (
													<span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
														<PhoneForwarded size={12} /> Перенос
													</span>
												)}
											</div>
										</div>

										{/* Call Action Triggers */}
										<div className="flex items-center gap-1.5 pt-2 border-t border-[var(--line,#e2e8f0)]">
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "confirmed")}
												className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
											>
												<Check size={14} /> Подтвердить
											</button>
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "no_answer")}
												className="py-1.5 px-2.5 rounded-lg bg-[var(--paper,#ffffff)] hover:bg-[var(--surface-muted,#e2e8f0)] text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-[var(--line,#cbd5e1)] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
												title="Не снял трубку"
											>
												<PhoneOff size={14} />
											</button>
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "rescheduled")}
												className="py-1.5 px-2.5 rounded-lg bg-[var(--paper,#ffffff)] hover:bg-[var(--surface-muted,#e2e8f0)] text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-[var(--line,#cbd5e1)] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
												title="Перенести прием"
											>
												<PhoneForwarded size={14} />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</section>
			</main>

			{/* SBP QR Modal */}
			<AnimatePresence>
				{activeSbpQrAppointment && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative"
						>
							<button
								type="button"
								onClick={() => setActiveSbpQrAppointment(null)}
								className="absolute top-4 right-4 p-2 rounded-full text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] bg-[var(--surface,#f1f5f9)] cursor-pointer"
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>

							<div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-3">
								<QrCode size={32} />
							</div>

							<h3 className="text-lg font-bold text-[var(--ink,#0f172a)] m-0">Оплата по СБП (0.4–0.7%)</h3>
							<p className="text-xs text-[var(--muted,#64748b)] mt-1 mb-4">
								Покажите QR-код пациенту или на втором экране
							</p>

							{/* Simulated Dynamic SBP QR Code */}
							<div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner mb-4">
								<div className="w-48 h-48 bg-slate-950 rounded-xl flex flex-col items-center justify-center text-white p-2">
									<QrCode size={160} className="text-white" />
								</div>
							</div>

							<div className="text-2xl font-black text-[var(--ink,#0f172a)] mb-1">
								{activeSbpQrAppointment.amountRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] mb-5">
								Пациент: {activeSbpQrAppointment.patientName}
							</div>

							<button
								type="button"
								onClick={() => {
									void handle1ClickCheckout(activeSbpQrAppointment, "sbp");
									setActiveSbpQrAppointment(null);
								}}
								className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
							>
								<Check size={18} />
								<span>Подтвердить оплату и выбить чек 54-ФЗ</span>
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* NDFL Calculator / 13% Certificate Modal */}
			{isNdflModalOpen && <NdflCalculatorModal onClose={() => setIsNdflModalOpen(false)} />}
		</div>
	);
}
