/**
 * DentalLabReadyInClinicModal.tsx — Связка лаборатории с расписанием (Мандаты 8b, 8e, 8n).
 * 
 * 1-КЛИК ЭРГОНОМИКА ДЛЯ АДМИНИСТРАТОРА ПРИ ПОСТУПЛЕНИИ РАБОТЫ ИЗ ЗТЛ:
 * • Когда наряд переходит в статус «Готовая работа в клинике» (ready_in_clinic):
 *   1. 1-клик запись пациента на примерку / фиксацию (dente-quick-appointment-draft).
 *   2. Готовый шаблон SMS с автоматической подстановкой зуба, материала, врача и клиники.
 *   3. Готовый шаблон WhatsApp с открытием диалога в 1 клик (wa.me) и копированием.
 *   4. Предупреждение о времени приема (45 мин по умолчанию) и привязке к Этапу 3 (Ортопедия).
 * • Соответствие Закону о защите прав пациентов (323-ФЗ, 152-ФЗ) и запрет эмодзи в меддокументах (Мандат 8d).
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import {
	CalendarCheck,
	MessageSquare,
	Phone,
	X,
	Copy,
	Send,
	ExternalLink,
	Sparkles,
	Check,
	ArrowRight,
	Calendar,
	CheckCircle2,
	Clock,
	Split,
	RefreshCw,
	AlertTriangle,
	ShieldAlert,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	openWhatsAppChat,
	generateOrthopedicReadyMessage,
} from "../../store/telephonyClinical";
import {
	processPartialDeliveryAndRework,
	type PartialDeliveryResult,
	type DentalLabOrderRecord,
} from "./dentalLabOrderEngine";

export interface ReadyInClinicLabOrder {
	readonly id?: string | undefined;
	readonly orderNumber: string;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly toothFdi?: string | number | readonly (string | number)[] | undefined;
	readonly material?: string | undefined;
	readonly colorVita?: string | undefined;
	readonly constructionType?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly bookingUrl?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly clinicSharePct?: number | undefined;
	readonly doctorSharePct?: number | undefined;
	readonly isPartialDelivery?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
}

export interface DentalLabReadyInClinicModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: ReadyInClinicLabOrder | null;
	readonly onScheduleAppointment?: ((draft: Record<string, unknown>) => void) | undefined;
	readonly onPartialDelivery?: ((result: PartialDeliveryResult) => void) | undefined;
}

export function generateReadyInClinicSmsTemplate(
	order: ReadyInClinicLabOrder,
	clinicName = "DENTE",
	clinicPhone = "+7 (495) 000-00-00",
): string {
	return generateOrthopedicReadyMessage({
		patientName: order.patientName,
		orderNumber: order.orderNumber,
		toothFdi: order.toothFdi,
		material: order.material,
		doctorName: order.doctorName,
		clinicName,
		clinicPhone,
		channel: "sms",
	});
}

export function generateReadyInClinicWhatsAppTemplate(
	order: ReadyInClinicLabOrder,
	clinicName = "DENTE",
	clinicPhone = "+7 (495) 000-00-00",
	bookingUrl = "https://dente.ru/book",
): string {
	return generateOrthopedicReadyMessage({
		patientName: order.patientName,
		orderNumber: order.orderNumber,
		toothFdi: order.toothFdi,
		material: order.material,
		doctorName: order.doctorName || "лечащий врач",
		clinicName,
		clinicPhone,
		bookingUrl,
		channel: "whatsapp",
	});
}


export function DentalLabReadyInClinicModal({
	isOpen,
	onClose,
	order,
	onScheduleAppointment,
	onPartialDelivery,
}: DentalLabReadyInClinicModalProps) {
	const phoneInputId = useId();
	const [activeTab, setActiveTab] = useState<"whatsapp" | "sms">("whatsapp");
	const [phoneInput, setPhoneInput] = useState<string>("");
	const [smsMessage, setSmsMessage] = useState<string>("");
	const [whatsappMessage, setWhatsappMessage] = useState<string>("");
	const [isAppointmentScheduled, setIsAppointmentScheduled] = useState<boolean>(false);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const allTeeth = useMemo(() => {
		if (!order?.toothFdi) return [16];
		if (Array.isArray(order.toothFdi)) {
			return order.toothFdi.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10) || String(t)));
		}
		if (typeof order.toothFdi === "string") {
			const parts = order.toothFdi.split(/[\s,;-]+/).filter(Boolean);
			if (parts.length > 0) {
				return parts.map((t) => Number.parseInt(t, 10) || t);
			}
		}
		if (typeof order.toothFdi === "number") {
			return [order.toothFdi];
		}
		return [16];
	}, [order?.toothFdi]);

	const [showPartialDelivery, setShowPartialDelivery] = useState<boolean>(false);
	const [reworkTeeth, setReworkTeeth] = useState<(number | string)[]>([]);
	const [reworkReason, setReworkReason] = useState<string>("Краевое прилегание / коррекция окклюзии");
	const [warrantyLiability, setWarrantyLiability] = useState<"lab_defect" | "clinic_warranty">("lab_defect");

	useEffect(() => {
		if (order && isOpen) {
			setPhoneInput(order.patientPhone || "");
			const clinicName = order.clinicName || "DENTE";
			const clinicPhone = order.clinicPhone || "+7 (495) 000-00-00";
			const bookingUrl = order.bookingUrl || "https://dente.ru/book";

			setSmsMessage(generateReadyInClinicSmsTemplate(order, clinicName, clinicPhone));
			setWhatsappMessage(generateReadyInClinicWhatsAppTemplate(order, clinicName, clinicPhone, bookingUrl));
			setIsAppointmentScheduled(false);
			setIsCopied(false);
			setReworkTeeth([]);
			setShowPartialDelivery(false);
		}
	}, [order, isOpen]);

	const toggleReworkTooth = (tooth: number | string) => {
		setReworkTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
		);
	};

	const handleExecutePartialDelivery = () => {
		if (!order) return;
		const deliveredTeeth = allTeeth.filter((t) => !reworkTeeth.includes(t));
		if (deliveredTeeth.length === 0 || reworkTeeth.length === 0) {
			showToast("Для разделения наряда выберите хотя бы 1 принятый зуб и 1 зуб на переделку", "warning");
			return;
		}

		const synthRecord: DentalLabOrderRecord = ({
			id: order.id || `lab-rec-${order.orderNumber}`,
			orderNumber: order.orderNumber,
			patientId: order.patientId || "pat-1",
			patientName: order.patientName,
			doctorId: order.doctorId || "doc-1",
			doctorName: order.doctorName || "Врач-ортопед",
			constructionType: (order.constructionType as any) || "crown_zirconia",
			material: order.material || "zirconia_multilayer",
			colorVita: order.colorVita || "A2",
			teeth: allTeeth,
			priceRub: order.priceRub ?? 15000,
			status: "ready_in_clinic",
			dueDate: new Date().toISOString().slice(0, 10),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as DentalLabOrderRecord);

		const result = processPartialDeliveryAndRework({
			originalOrder: synthRecord,
			deliveredTeeth,
			reworkTeeth,
			reworkReason: reworkReason.trim() || "Рекламация по гарантии",
			warrantyLiabilityType: warrantyLiability,
		});

		if (onPartialDelivery) {
			onPartialDelivery(result);
		}

		showToast(
			`Наряд №${order.orderNumber} разделен: принято ${deliveredTeeth.join(", ")}, рекламация ${reworkTeeth.join(", ")} создана на 0 ₽!`,
			"success",
			5000,
		);
		onClose();
	};

	if (!isOpen || !order) return null;

	const teethStr = Array.isArray(order.toothFdi)
		? order.toothFdi.join(", ")
		: order.toothFdi
			? String(order.toothFdi)
			: "16";

	const handleScheduleAppointment = () => {
		const mat = order.material || "Ортопедическая конструкция";
		const shade = order.colorVita || "A2";

		const appointmentDraft = {
			patientId: order.patientId || "",
			patientName: order.patientName,
			patientPhone: phoneInput.trim() || order.patientPhone || "",
			doctorId: order.doctorId || "",
			doctorName: order.doctorName || "Врач-ортопед",
			serviceTitle: "Примерка и фиксация ортопедической конструкции",
			serviceCode: "A16.07.004", // Приказ 804н
			durationMinutes: 45,
			stageKind: "stage_3_orthopedics",
			orderNumber: order.orderNumber,
			notes: `Готовая работа ЗТЛ № ${order.orderNumber} (${mat}, зуб ${teethStr}, оттенок ${shade}). Поступила в клинику.`,
		};

		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem(
					"dente_schedule_quick_booking_draft",
					JSON.stringify(appointmentDraft),
				);
				window.dispatchEvent(
					new CustomEvent("dente-quick-appointment-draft", {
						detail: appointmentDraft,
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente-open-quick-booking", {
						detail: appointmentDraft,
					}),
				);
			} catch {
				// quota fallback
			}
		}

		if (onScheduleAppointment) {
			onScheduleAppointment(appointmentDraft);
		}

		showToast(
			`Черновик примерки/фиксации (${order.patientName}) передан в расписание!`,
			"success",
			4000,
		);
		setIsAppointmentScheduled(true);
	};

	const handleCopySms = () => {
		navigator.clipboard.writeText(smsMessage);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2500);
		showToast("Шаблон SMS скопирован в буфер обмена", "success");
	};

	const handleCopyWhatsApp = () => {
		navigator.clipboard.writeText(whatsappMessage);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2500);
		showToast("Шаблон WhatsApp скопирован в буфер обмена", "success");
	};

	const handleOpenWhatsApp = () => {
		const targetPhone = phoneInput.trim() || order.patientPhone || "";
		if (!targetPhone) {
			showToast("Укажите номер телефона пациента для отправки в WhatsApp", "warning");
			return;
		}
		openWhatsAppChat(targetPhone, whatsappMessage);
		showToast(`Открыт диалог WhatsApp для пациента ${order.patientName}`, "success");
	};

	const handleGoToSchedule = () => {
		if (typeof window !== "undefined") {
			window.location.hash = "#schedule";
		}
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ready-in-clinic-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
				data-testid="ready-in-clinic-modal"
			>
				{/* Шапка модалки */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#cbd5e1)] bg-emerald-500/10">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
							<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div className="min-w-0">
							<h3
								id="ready-in-clinic-modal-title"
								className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
							>
								Готовая работа в клинике (ЗТЛ № {order.orderNumber})
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate">
								Конструкция поступила из лаборатории · 1-клик запись и уведомление
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[36px] min-w-[36px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-5 space-y-4 overflow-y-auto max-h-[82vh]">
					{/* Сводная карточка наряда (1 уровень вложенности) */}
					<div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="font-bold text-sm text-[var(--ink,#0f172a)]">
									{order.patientName}
								</span>
								<span className="px-2 py-0.5 rounded-md font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									Зуб(ы): {teethStr}
								</span>
								{order.colorVita && (
									<span className="px-2 py-0.5 rounded-md font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
										VITA: {order.colorVita}
									</span>
								)}
							</div>
							<div className="text-[var(--muted,#64748b)]">
								Конструкция: <strong className="text-[var(--ink,#0f172a)]">{order.material || "Диоксид циркония"}</strong> · Врач: <strong className="text-[var(--ink,#0f172a)]">{order.doctorName || "Ортопед"}</strong>
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							<span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1">
								<Check className="w-3.5 h-3.5" />
								<span>Готова в клинике</span>
							</span>
						</div>
					</div>

					{/* 1-КЛИК БЛОК: ЗАПИСЬ В РАСПИСАНИЕ НА ПРИМЕРКУ/ФИКСАЦИЮ */}
					<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									1. Запись пациента в расписание
								</span>
							</div>
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								Примерка и фиксация · 45 минут · Этап 3 (Ортопедия)
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-2.5">
							<button
								type="button"
								onClick={handleScheduleAppointment}
								className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
									isAppointmentScheduled
										? "bg-emerald-600 text-white"
										: "bg-teal-600 hover:bg-teal-700 text-white"
								}`}
								data-testid="schedule-fitting-appointment-btn"
								title="Сформировать черновик приема для администратора в расписании"
							>
								{isAppointmentScheduled ? (
									<>
										<CheckCircle2 className="w-4 h-4" />
										<span>Черновик передан в расписание</span>
									</>
								) : (
									<>
										<CalendarCheck className="w-4 h-4" />
										<span>Записать на примерку/фиксацию (1 клик)</span>
									</>
								)}
							</button>

							{isAppointmentScheduled && (
								<button
									type="button"
									onClick={handleGoToSchedule}
									className="min-h-[44px] px-3.5 py-2 rounded-xl border border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40"
									data-testid="go-to-schedule-btn"
								>
									<span>В расписание</span>
									<ArrowRight className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					</div>

					{/* 1-КЛИК БЛОК: ШАБЛОНЫ УВЕДОМЛЕНИЙ ПАЦИЕНТА (WHATSAPP / SMS) */}
					<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									2. Уведомление пациента
								</span>
							</div>

							{/* Переключатель каналов WhatsApp / SMS */}
							<div className="flex items-center rounded-lg border border-[var(--line,#cbd5e1)] overflow-hidden text-xs">
								<button
									type="button"
									onClick={() => setActiveTab("whatsapp")}
									className={`min-h-[36px] px-3 font-bold cursor-pointer transition-colors ${
										activeTab === "whatsapp"
											? "bg-emerald-600 text-white"
											: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:bg-[var(--paper-soft,#f1f5f9)]"
									}`}
									data-testid="whatsapp-tab-btn"
								>
									WhatsApp
								</button>
								<button
									type="button"
									onClick={() => setActiveTab("sms")}
									className={`min-h-[36px] px-3 font-bold cursor-pointer transition-colors border-l border-[var(--line,#cbd5e1)] ${
										activeTab === "sms"
											? "bg-emerald-600 text-white"
											: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:bg-[var(--paper-soft,#f1f5f9)]"
									}`}
									data-testid="sms-tab-btn"
								>
									SMS
								</button>
							</div>
						</div>

						{/* Поле номера телефона пациента */}
						<div className="flex items-center gap-2 text-xs">
							<label htmlFor={phoneInputId} className="font-semibold text-[var(--muted,#64748b)] shrink-0">
								Телефон:
							</label>
							<div className="relative flex-1">
								<Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)]" />
								<input
									id={phoneInputId}
									type="tel"
									value={phoneInput}
									onChange={(e) => setPhoneInput(e.target.value)}
									placeholder="+7 (999) 000-00-00"
									className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-teal-500"
									data-testid="patient-phone-input"
								/>
							</div>
						</div>

						{/* Тело шаблона сообщения */}
						{activeTab === "whatsapp" ? (
							<div className="space-y-2">
								<textarea
									value={whatsappMessage}
									onChange={(e) => setWhatsappMessage(e.target.value)}
									rows={4}
									className="w-full p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
									data-testid="whatsapp-message-input"
									aria-label="Текст сообщения WhatsApp"
								/>

								<div className="flex flex-wrap items-center justify-between gap-2">
									<button
										type="button"
										onClick={handleCopyWhatsApp}
										className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-bold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
										data-testid="copy-whatsapp-template-btn"
									>
										{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
										<span>{isCopied ? "Скопировано" : "Скопировать текст"}</span>
									</button>

									<button
										type="button"
										onClick={handleOpenWhatsApp}
										className="min-h-[38px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
										data-testid="open-whatsapp-template-btn"
									>
										<Send className="w-3.5 h-3.5" />
										<span>Открыть в WhatsApp</span>
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<textarea
									value={smsMessage}
									onChange={(e) => setSmsMessage(e.target.value)}
									rows={3}
									className="w-full p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
									data-testid="sms-message-input"
									aria-label="Текст SMS сообщения"
								/>

								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-[11px] text-[var(--muted,#64748b)]">
										Длина: {smsMessage.length} симв. (~{Math.ceil(smsMessage.length / 70)} SMS)
									</div>

									<button
										type="button"
										onClick={handleCopySms}
										className="min-h-[38px] px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
										data-testid="copy-sms-template-btn"
									>
										{isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
										<span>{isCopied ? "Скопировано" : "Скопировать SMS"}</span>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* 3-Й БЛОК: ЧАСТИЧНАЯ СДАЧА И ГАРАНТИЙНАЯ РЕКЛАМАЦИЯ БЕЗ ДЕДЛОКА (0 ₽ ДЛЯ ПАЦИЕНТА) */}
					<div
						className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
						data-testid="partial-delivery-section"
					>
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<Split className="w-4 h-4 text-amber-600 dark:text-amber-400" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
									3. Частичная сдача и рекламация единиц (0 ₽ для пациента)
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowPartialDelivery((prev) => !prev)}
								className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer inline-flex items-center gap-1"
								data-testid="partial-delivery-toggle-btn"
							>
								<RefreshCw className="w-3.5 h-3.5" />
								<span>{showPartialDelivery ? "Скрыть рекламацию" : "Разделить наряд / рекламация единицы"}</span>
							</button>
						</div>

						{showPartialDelivery && (
							<div className="space-y-3 pt-2 border-t border-amber-500/20" data-testid="partial-delivery-panel">
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									Кликните по зубу, который требует гарантийной переделки в лаборатории. Остальные зубы будут оформлены как сданные. Пациенту счет за переделку строго 0 ₽.
								</div>

								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs font-bold text-[var(--ink,#0f172a)]">Единицы:</span>
									{allTeeth.map((t) => {
										const isRework = reworkTeeth.includes(t);
										return (
											<button
												key={String(t)}
												type="button"
												onClick={() => toggleReworkTooth(t)}
												data-testid={`partial-delivery-tooth-btn-${t}`}
												className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
													isRework
														? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300"
														: "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
												}`}
											>
												Зуб {t}: {isRework ? "Переделка (0 ₽)" : "Принят"}
											</button>
										);
									})}
								</div>

								{reworkTeeth.length > 0 && (
									<div className="space-y-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-500/30">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div>
												<label className="block text-[11px] font-bold text-[var(--ink,#0f172a)] mb-1">
													Причина рекламации / замечания:
												</label>
												<input
													type="text"
													value={reworkReason}
													onChange={(e) => setReworkReason(e.target.value)}
													placeholder="Краевое прилегание, окклюзия, цвет..."
													className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
													data-testid="partial-rework-reason-input"
												/>
											</div>

											<div>
												<label className="block text-[11px] font-bold text-[var(--ink,#0f172a)] mb-1">
													Ответственность по гарантии:
												</label>
												<select
													value={warrantyLiability}
													onChange={(e) => setWarrantyLiability(e.target.value as any)}
													className="w-full h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-bold"
													data-testid="partial-liability-select"
												>
													<option value="lab_defect">Брак лаборатории (0 ₽ клинике, 0 ₽ пациенту)</option>
													<option value="clinic_warranty">Гарантия клиники (клиника оплачивает ЗТЛ, 0 ₽ пациенту)</option>
												</select>
											</div>
										</div>

										<div className="flex items-center justify-between flex-wrap gap-2 pt-1">
											<span className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
												Принято: {allTeeth.filter((t) => !reworkTeeth.includes(t)).join(", ") || "нет"} · На переделку: {reworkTeeth.join(", ")}
											</span>
											<button
												type="button"
												onClick={handleExecutePartialDelivery}
												className="min-h-[38px] px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
												data-testid="lab-partial-delivery-btn"
											>
												<Split className="w-3.5 h-3.5" />
												<span>Разделить наряд: сдать готовые + рекламация (0 ₽)</span>
											</button>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Подвал */}
				<div className="px-5 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-2">
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Наряд ЗТЛ-1 · Протокол примерки и фиксации
					</span>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[38px] px-4 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-bold text-[var(--ink,#0f172a)] cursor-pointer"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
}
