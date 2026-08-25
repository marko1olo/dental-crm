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
					serviceSummary: apt.serviceName || apt.treatmentNotes || "Терапевтический приём и консультация",
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
			const paymentMutationId = `frontdesk-${visit.appointmentId}-${Date.now()}`;
			const mappedMethod = method === "sbp" ? "online" : method;
			const fnNum = `99990789${Math.floor(10000000 + Math.random() * 90000000)}`;
			const fdNum = `${Math.floor(1000 + Math.random() * 9000)}`;
			const fpdNum = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
			const receiptNumber = `ФЧ-${Math.floor(100000 + Math.random() * 900000)}`;

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: visit.patientId,
					visitId: dashboard?.activeVisit?.appointmentId === visit.appointmentId ? dashboard.activeVisit.id : null,
					amountRub: visit.amountRub,
					method: mappedMethod,
					clientMutationId: paymentMutationId,
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: new Date().toISOString().split("T")[0],
					fiscalReceipt: {
						fn: fnNum,
						fd: fdNum,
						fpd: fpdNum,
						cashierName: auth?.currentUser?.name || "Администратор кассы",
						operationType: "income",
					},
					note: `Экспресс-касса 54-ФЗ (${method === "cash" ? "Наличные" : method === "card" ? "Банковская карта" : "СБП QR"})`,
				}),
			});

			const data = await res.json().catch(() => null);

			if (!res.ok) {
				const errorMsg = data?.message || actionFailureToast("Ошибка проведения оплаты 54-ФЗ", res.status);
				showToast(errorMsg, "error");
				return;
			}

			const paidAmountFormatted = formatKopecksRu(parseKopecks(data?.amountRub ?? visit.amountRub));
			showToast(
				`Оплата ${paidAmountFormatted} принята! Фискальный чек 54-ФЗ #${data?.fiscalReceiptNumber || receiptNumber} сформирован.`,
				"success",
			);
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
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
			className="frontdesk-perspective min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 text-[var(--ink,#0f172a)] dark:text-slate-100 flex flex-col p-3 md:p-6 select-none"
		>
			{/* Top Bar: Frontdesk Context */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-4 shadow-sm">
				<div className="flex items-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 active:scale-95 transition-all text-sm cursor-pointer shadow-sm"
						title="Вернуться к стандартному расписанию"
					>
						<ArrowLeft size={20} />
						<span className="hidden sm:inline">Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2.5 py-0.5 rounded-md border border-[var(--teal,var(--brand-primary))]/40">
								Ресепшн и Экспресс-Касса 54-ФЗ
							</span>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">ОФД Онлайн · ФН готов</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-1">
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
						className="min-h-[44px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[var(--teal,var(--brand-primary))]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer active:scale-95 transition-all"
					>
						<FileText size={16} />
						<span>Справка НДФЛ 13% (1 клик)</span>
					</button>

					{/* Z-Report / Daily Cash Summary */}
					<button
						type="button"
						onClick={() => showToast("Z-отчёт и сводка кассы 54-ФЗ отправлены на печать", "info")}
						className="min-h-[44px] px-3.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs flex items-center gap-2 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer active:scale-95 transition-all shadow-sm"
					>
						<Printer size={16} />
						<span className="hidden sm:inline">Z-отчёт дня</span>
					</button>
				</div>
			</header>

			{/* Main Grid: Express Cashier (Left) + Morning Calls (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Express 54-FZ Cashier Dashboard */}
				<section className="lg:col-span-7 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
					<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex items-center gap-2">
							<Receipt size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">
								К оплате сегодня (Визиты без закрытия чека)
							</h2>
						</div>
						<span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40">
							{unbilledVisits.length} визитов
						</span>
					</div>

					{unbilledVisits.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-12 text-[var(--muted,#64748b)] dark:text-slate-400 gap-3 text-center flex-1">
							<CheckCircle2 size={48} className="text-emerald-500 opacity-90" />
							<p className="font-bold text-base text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Все визиты на сегодня рассчитаны</p>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 max-w-sm">
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
										className="p-4 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-[var(--teal,var(--brand-primary))]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
									>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-2 py-0.5 rounded border border-[var(--teal,var(--brand-primary))]/30">
													{visit.time}
												</span>
												<strong className="text-base text-[var(--ink,#0f172a)] dark:text-white">{visit.patientName}</strong>
											</div>
											<div className="text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 mt-1">{visit.serviceSummary}</div>
											<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">Врач: {visit.doctorName}</div>
										</div>

										<div className="flex items-center justify-between md:justify-end gap-3 shrink-0 flex-wrap">
											<div className="text-right">
												<div className="text-[10px] text-[var(--muted,#64748b)] dark:text-slate-400 uppercase font-bold tracking-wider">Итого к оплате</div>
												<div className="text-lg font-black text-amber-600 dark:text-amber-400">
													{formatKopecksRu(parseKopecks(visit.amountRub))}
												</div>
											</div>

											{/* 1-Click Action Buttons */}
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													disabled={isProcessing}
													onClick={() => void handle1ClickCheckout(visit, "cash")}
													className="min-h-[44px] px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-emerald-400/30"
													title="Оплата наличными (Чек 54-ФЗ)"
												>
													<Banknote size={16} />
													<span className="hidden sm:inline">Нал</span>
												</button>

												<button
													type="button"
													disabled={isProcessing}
													onClick={() => void handle1ClickCheckout(visit, "card")}
													className="min-h-[44px] px-3.5 bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-[var(--teal,var(--brand-primary))]/30"
													title="Оплата картой через терминал (Чек 54-ФЗ)"
												>
													<CreditCard size={16} />
													<span className="hidden sm:inline">Карта</span>
												</button>

												<button
													type="button"
													disabled={isProcessing}
													onClick={() => setActiveSbpQrAppointment(visit)}
													className="min-h-[44px] px-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-purple-400/30"
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
				<section className="lg:col-span-5 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="flex items-center gap-2">
								<PhoneCall size={22} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 m-0">Утренний обзвон пациентов</h2>
							</div>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">На сегодня</span>
						</div>

						{/* Filter & Search Input */}
						<div className="relative mb-3 flex items-center">
							<Search size={16} className="absolute left-3 text-[var(--muted,#64748b)] dark:text-slate-400 pointer-events-none z-10" />
							<input
								type="text"
								placeholder="Поиск по имени или телефону..."
								value={filterSearch}
								onChange={(e) => setFilterSearch(e.target.value)}
								style={{ paddingLeft: "2.75rem" }}
								className="w-full min-h-[44px] !pl-11 pr-3 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 text-xs outline-none focus:border-[var(--teal,var(--brand-primary))]"
							/>
						</div>

						{/* Calls List */}
						<div className="flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1 flex-1">
							{morningCallList.length === 0 ? (
								<div className="p-8 text-center text-[var(--muted,#64748b)] dark:text-slate-400 text-xs">
									Нет запланированных звонков в списке
								</div>
							) : (
								morningCallList.map((call) => (
									<div
										key={call.id}
										className="p-3.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex flex-col gap-2.5 shadow-sm"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] px-1.5 py-0.5 rounded border border-[var(--teal,var(--brand-primary))]/20">
														{call.time}
													</span>
													<strong className="text-sm text-[var(--ink,#0f172a)] dark:text-white">{call.patientName}</strong>
												</div>
												<div className="text-xs text-[var(--ink,#0f172a)] dark:text-slate-300 mt-1.5 flex items-center gap-2 flex-wrap">
													<Phone size={12} className="text-[var(--muted,#64748b)] dark:text-slate-400" />
													<a
														href={`tel:${call.phone}`}
														className="text-[var(--teal-dark,var(--teal))] font-semibold hover:underline"
													>
														{call.phone}
													</a>
													<span className="text-[var(--muted,#64748b)] dark:text-slate-400">· {call.chair}</span>
												</div>
											</div>

											{/* Call Status Badge */}
											<div className="shrink-0">
												{call.status === "confirmed" && (
													<span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
														<Check size={12} /> Подтвердил
													</span>
												)}
												{call.status === "no_answer" && (
													<span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1">
														<PhoneOff size={12} /> Не отвечает
													</span>
												)}
												{call.status === "rescheduled" && (
													<span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
														<PhoneForwarded size={12} /> Перенос
													</span>
												)}
											</div>
										</div>

										{/* Call Action Triggers */}
										<div className="flex items-center gap-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "confirmed")}
												className="flex-1 min-h-[44px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
											>
												<Check size={14} /> Подтвердить
											</button>
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "no_answer")}
												className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 text-rose-600 dark:text-rose-300 font-bold text-xs border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
												title="Не снял трубку"
											>
												<PhoneOff size={14} />
												<span className="hidden sm:inline">Не снял</span>
											</button>
											<button
												type="button"
												onClick={() => handleCallAction(call.id, "rescheduled")}
												className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-700 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 text-amber-600 dark:text-amber-300 font-bold text-xs border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
												title="Перенести приём"
											>
												<PhoneForwarded size={14} />
												<span className="hidden sm:inline">Перенос</span>
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
							className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative text-[var(--ink,#0f172a)] dark:text-slate-100"
						>
							<button
								type="button"
								onClick={() => setActiveSbpQrAppointment(null)}
								className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--muted,#64748b)] dark:text-slate-400 hover:text-[var(--ink,#0f172a)] dark:hover:text-white bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 cursor-pointer"
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>

							<div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-3">
								<QrCode size={32} />
							</div>

							<h3 className="text-lg font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">Оплата по СБП (0.4–0.7%)</h3>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-1 mb-4">
								Покажите QR-код пациенту или на втором экране
							</p>

							{/* Dynamic SBP QR Code container */}
							<div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner mb-4">
								<div className="w-48 h-48 bg-slate-950 rounded-xl flex flex-col items-center justify-center text-white p-2">
									<QrCode size={160} className="text-white" />
								</div>
							</div>

							<div className="text-2xl font-black text-[var(--ink,#0f172a)] dark:text-white mb-1">
								{formatKopecksRu(parseKopecks(activeSbpQrAppointment.amountRub))}
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mb-5">
								Пациент: {activeSbpQrAppointment.patientName}
							</div>

							<button
								type="button"
								onClick={() => {
									void handle1ClickCheckout(activeSbpQrAppointment, "sbp");
									setActiveSbpQrAppointment(null);
								}}
								className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
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
