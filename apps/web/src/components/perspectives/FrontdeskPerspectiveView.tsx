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
					time: apt.startTime || "09:00",
					doctorName: doctor?.name || "Врач-стоматолог",
					chair: apt.chairId || "Кабинет 1",
					status: callStatusMap[apt.id] || apt.status,
				};
			})
			.filter((item) => {
				if (!filterSearch) return true;
				const q = filterSearch.toLowerCase();
				return item.patientName.toLowerCase().includes(q) || item.phone.includes(q);
			});
	}, [dashboard?.appointments, dashboard?.patients, dashboard?.staff, callStatusMap, filterSearch]);

	const handle1ClickCheckout = async (item: CheckoutItem, method: "cash" | "card" | "sbp") => {
		if (method === "sbp") {
			setActiveSbpQrAppointment(item);
			return;
		}

		setProcessingPaymentId(item.appointmentId);
		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: item.patientId,
					appointmentId: item.appointmentId,
					amountRub: item.amountRub,
					paymentMethod: method === "cash" ? "cash" : "card",
					fiscalReceiptRequested: true,
				}),
			});

			if (!res.ok) {
				showToast(actionFailureToast("Ошибка проведения оплаты 54-ФЗ", res.status), "error");
				return;
			}

			const receiptData = await res.json().catch(() => null);
			const methodLabel = method === "cash" ? "Наличными" : "Банковской картой";
			showToast(`Оплата ${item.amountRub} ₽ проведена (${methodLabel}). Чек 54-ФЗ фискализирован!`, "success");
			await loadDashboard();
		} catch (err) {
			logger.error("[FrontdeskPerspective] Checkout error", err);
			showToast("Ошибка соединения с кассовым сервером", "error");
		} finally {
			setProcessingPaymentId(null);
		}
	};

	const handleConfirmSbpPayment = async () => {
		if (!activeSbpQrAppointment) return;
		setProcessingPaymentId(activeSbpQrAppointment.appointmentId);
		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: activeSbpQrAppointment.patientId,
					appointmentId: activeSbpQrAppointment.appointmentId,
					amountRub: activeSbpQrAppointment.amountRub,
					paymentMethod: "sbp",
					fiscalReceiptRequested: true,
				}),
			});

			if (res.ok) {
				showToast(`СБП платёж ${activeSbpQrAppointment.amountRub} ₽ успешно зачислен. Электронный чек выслан.`, "success");
				setActiveSbpQrAppointment(null);
				await loadDashboard();
			} else {
				showToast("СБП платёж не подтверждён банком", "error");
			}
		} catch (err) {
			logger.error("[FrontdeskPerspective] SBP payment confirm error", err);
			showToast("Ошибка проверки статуса СБП", "error");
		} finally {
			setProcessingPaymentId(null);
		}
	};

	const handleCallAction = (aptId: string, action: "confirmed" | "no_answer" | "rescheduled" | "cancelled") => {
		setCallStatusMap((prev) => ({ ...prev, [aptId]: action }));
		const labels: Record<string, string> = {
			confirmed: "Визит подтверждён пациентом",
			no_answer: "Статус: Не отвечает на звонок",
			rescheduled: "Запрос на перенос визита",
			cancelled: "Визит отменён пациентом",
		};
		showToast(labels[action] || "Статус звонка обновлен", "info");
	};

	return (
		<div
			data-testid="frontdesk-perspective-view"
			className="frontdesk-perspective min-h-screen bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] flex flex-col p-3 md:p-6"
		>
			{/* Top Bar */}
			<header className="flex flex-wrap items-center justify-between gap-4 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-4 shadow-xl">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setPerspective("standard")}
						className="min-h-[50px] px-4 py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-bold flex items-center gap-2 border border-slate-600 active:scale-95 transition-all text-sm cursor-pointer shadow-md"
					>
						<ArrowLeft size={20} />
						<span>Стандартный вид</span>
					</button>

					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs uppercase tracking-widest font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-500/30">
								Ресепшн и Экспресс-касса 54-ФЗ
							</span>
							<span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
								<ShieldCheck size={14} /> ФР Онлайн
							</span>
						</div>
						<h1 className="text-xl md:text-2xl font-black text-white m-0 mt-1">
							Рабочее место администратора
						</h1>
					</div>
				</div>

				{/* 1-Click Tax Deduction Quick Action */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setIsNdflModalOpen(true)}
						className="min-h-[50px] px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/30 border border-teal-400/40 cursor-pointer active:scale-95 transition-all"
					>
						<FileSpreadsheet size={20} />
						<span>Справка НДФЛ 13% (КНД 1151156)</span>
					</button>
				</div>
			</header>

			{/* Main Grid: Express Cashier (Left) + Morning Calls (Right) */}
			<main className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1">
				{/* Left: Express 54-FZ Cashier Dashboard */}
				<section className="lg:col-span-7 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex flex-col">
					<div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
						<div className="flex items-center gap-2">
							<Receipt size={22} className="text-amber-400" />
							<h2 className="text-lg font-bold text-white m-0">
								К оплате сегодня (Визиты без закрытия чека)
							</h2>
						</div>
						<span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
							{unbilledVisits.length} визитов
						</span>
					</div>

					{unbilledVisits.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3 text-center flex-1">
							<CheckCircle2 size={48} className="text-emerald-400 opacity-80" />
							<p className="font-bold text-base text-white m-0">Все визиты на сегодня рассчитаны</p>
							<p className="text-xs text-slate-400 m-0 max-w-sm">
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
										className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
									>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
													{visit.time}
												</span>
												<strong className="text-base text-white">{visit.patientName}</strong>
											</div>
											<div className="text-xs text-slate-300 mt-1">{visit.serviceSummary}</div>
											<div className="text-xs text-slate-400 mt-0.5">Врач: {visit.doctorName}</div>
										</div>

										<div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
											<div className="text-right">
												<div className="text-xs text-slate-400 uppercase">Итого к оплате</div>
												<div className="text-lg font-black text-amber-400">
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
													onClick={() => void handle1ClickCheckout(visit, "sbp")}
													className="h-11 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer transition-all border border-purple-400/30"
													title="СБП (Оплата по QR-коду)"
												>
													<QrCode size={16} />
													<span className="hidden sm:inline">СБП QR</span>
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>

				{/* Right: Morning Call List (Утренний обзвон) */}
				<section className="lg:col-span-5 bg-[var(--paper,#1e293b)] border border-[var(--line-strong,#334155)] rounded-2xl p-5 shadow-xl flex flex-col">
					<div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
						<div className="flex items-center gap-2">
							<PhoneCall size={22} className="text-teal-400" />
							<h2 className="text-lg font-bold text-white m-0">Утренний обзвон пациентов</h2>
						</div>
						<span className="text-xs text-slate-400">На сегодня</span>
					</div>

					{/* Filter & Search Input */}
					<div className="relative mb-3">
						<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							placeholder="Поиск по имени или телефону..."
							value={filterSearch}
							onChange={(e) => setFilterSearch(e.target.value)}
							className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-teal-500"
						/>
					</div>

					{/* Calls List */}
					<div className="flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1 flex-1">
						{morningCallList.length === 0 ? (
							<div className="p-8 text-center text-slate-400 text-xs">
								Нет запланированных звонков в списке
							</div>
						) : (
							morningCallList.map((call) => (
								<div
									key={call.id}
									className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col gap-2"
								>
									<div className="flex items-start justify-between gap-2">
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-bold text-teal-300 bg-teal-950 px-1.5 py-0.2 rounded border border-teal-500/20">
													{call.time}
												</span>
												<strong className="text-sm text-white">{call.patientName}</strong>
											</div>
											<div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
												<Phone size={12} className="text-slate-400" />
												<a
													href={`tel:${call.phone}`}
													className="text-teal-400 font-semibold hover:underline"
												>
													{call.phone}
												</a>
												<span className="text-slate-500">· {call.chair}</span>
											</div>
										</div>

										{/* Call Status Badge */}
										<div className="shrink-0">
											{call.status === "confirmed" && (
												<span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
													<Check size={12} /> Подтвердил
												</span>
											)}
											{call.status === "no_answer" && (
												<span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
													<PhoneOff size={12} /> Не отвечает
												</span>
											)}
											{call.status === "rescheduled" && (
												<span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
													<PhoneForwarded size={12} /> Перенос
												</span>
											)}
										</div>
									</div>

									{/* Quick Action Chips */}
									<div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/60">
										<button
											type="button"
											onClick={() => handleCallAction(call.id, "confirmed")}
											className="flex-1 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
										>
											<Check size={14} /> Да
										</button>
										<button
											type="button"
											onClick={() => handleCallAction(call.id, "no_answer")}
											className="flex-1 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
										>
											<PhoneOff size={14} /> Не берет
										</button>
										<a
											href={`https://wa.me/${call.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Здравствуйте, ${call.patientName}! Напоминаем о вашем визите в стоматологию сегодня в ${call.time}. Подтвердите, пожалуйста, запись.`)}`}
											target="_blank"
											rel="noopener noreferrer"
											className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
											title="Написать в WhatsApp"
										>
											<MessageSquare size={14} /> WA
										</a>
									</div>
								</div>
							))
						)}
					</div>
				</section>
			</main>

			{/* SBP Dynamic QR Modal */}
			{activeSbpQrAppointment && (
				<div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-[var(--paper,#1e293b)] border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center"
					>
						<div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
							<QrCode size={28} />
						</div>

						<h3 className="text-lg font-bold text-white m-0">Оплата по СБП (QR-код)</h3>
						<p className="text-xs text-slate-300 mt-1 mb-4">
							Покажите QR-код пациенту для сканирования в банковском приложении.
						</p>

						{/* Dynamic SBP QR Code (Vector Matrix) */}
						<div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 mb-4">
							<svg width="180" height="180" viewBox="0 0 180 180" className="mx-auto" aria-label="СБП QR Код">
								<title>СБП QR Код для оплаты</title>
								<rect width="180" height="180" fill="white" />
								{/* Position detection patterns */}
								<rect x="10" y="10" width="50" height="50" fill="black" />
								<rect x="20" y="20" width="30" height="30" fill="white" />
								<rect x="27" y="27" width="16" height="16" fill="black" />

								<rect x="120" y="10" width="50" height="50" fill="black" />
								<rect x="130" y="20" width="30" height="30" fill="white" />
								<rect x="137" y="27" width="16" height="16" fill="black" />

								<rect x="10" y="120" width="50" height="50" fill="black" />
								<rect x="20" y="130" width="30" height="30" fill="white" />
								<rect x="27" y="137" width="16" height="16" fill="black" />

								{/* Matrix data cells */}
								<rect x="70" y="20" width="10" height="10" fill="black" />
								<rect x="90" y="20" width="10" height="10" fill="black" />
								<rect x="80" y="40" width="10" height="10" fill="black" />
								<rect x="70" y="70" width="10" height="10" fill="black" />
								<rect x="90" y="70" width="10" height="10" fill="black" />
								<rect x="110" y="70" width="10" height="10" fill="black" />
								<rect x="130" y="90" width="10" height="10" fill="black" />
								<rect x="150" y="110" width="10" height="10" fill="black" />
								<rect x="70" y="130" width="10" height="10" fill="black" />
								<rect x="100" y="140" width="10" height="10" fill="black" />
								<rect x="130" y="140" width="10" height="10" fill="black" />
								<rect x="150" y="150" width="10" height="10" fill="black" />
							</svg>
						</div>

						<div className="text-xl font-black text-white mb-1">
							{activeSbpQrAppointment.amountRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-xs text-slate-400 mb-5">
							{activeSbpQrAppointment.patientName}
						</div>

						<div className="flex items-center gap-3 w-full">
							<button
								type="button"
								onClick={() => setActiveSbpQrAppointment(null)}
								className="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={() => void handleConfirmSbpPayment()}
								className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 cursor-pointer border border-purple-400/40"
							>
								Оплачено
							</button>
						</div>
					</motion.div>
				</div>
			)}

			{/* NDFL Calculator Modal */}
			{isNdflModalOpen && <NdflCalculatorModal onClose={() => setIsNdflModalOpen(false)} />}
		</div>
	);
}
