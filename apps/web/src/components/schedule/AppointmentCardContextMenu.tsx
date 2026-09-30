import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";
import { STOMX_REFUSE_REASONS_CATALOG } from "@dental/shared";
import React, { useRef, useState, useEffect } from "react";
import {
	AlertTriangle,
	ChevronDown,
	CreditCard,
	FileText,
	MessageSquare,
	MoreVertical,
	Phone,
	Printer,
	Scan,
	UserX,
	XCircle,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { printBlankMedicalContract } from "../patients/blankContractPrint";

export interface AppointmentCardContextMenuProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentSuggestions: ScheduleSuggestion[];
	appointmentPatient: any;
	appointmentPatientName: string;
	appointmentDoctor: any;
	isQuickStatusUpdating: boolean;
	openScheduleSuggestion: (section: string) => void;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	repeatAppointment: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	openAppointmentEditor: (appointment: Appointment) => void;
}

export function AppointmentCardContextMenu({
	appointment,
	dashboard,
	appointmentSuggestions,
	appointmentPatient,
	appointmentPatientName,
	appointmentDoctor,
	isQuickStatusUpdating,
	openScheduleSuggestion,
	handleShiftAppointmentTime,
	handleQuickStatusChange,
	repeatAppointment,
	copyAppointmentToBuffer,
	openAppointmentEditor,
}: AppointmentCardContextMenuProps) {
	const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
	const [isRefusalReasonsOpen, setIsRefusalReasonsOpen] = useState(false);
	const cardMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
				setIsCardMenuOpen(false);
				setIsRefusalReasonsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsCardMenuOpen(false);
				setIsRefusalReasonsOpen(false);
			}
		};
		if (isCardMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isCardMenuOpen]);

	return (
		<div className="relative inline-flex items-center shrink-0" ref={cardMenuRef}>
			<button
				type="button"
				className="secondary-button appointment-context-menu-btn min-h-[44px] min-w-[44px] w-11 h-11 sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
				onClick={(e) => {
					e.stopPropagation();
					setIsCardMenuOpen((prev) => !prev);
				}}
				title="Все действия с записью (напоминания, опоздание, повтор, буфер, редактор)"
				aria-label="Меню действий записи"
				aria-expanded={isCardMenuOpen}
			>
				<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))]" />
			</button>

			{isCardMenuOpen && (
				<div
					className="appointment-card-context-menu absolute right-0 top-full mt-1 z-50 flex flex-col gap-1 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100 text-xs"
					role="menu"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Рекомендации и действия по записи */}
					{appointmentSuggestions.length > 0 && (
						<>
							<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
								Рекомендации
							</div>
							{appointmentSuggestions.map((suggestion) => (
								<button
									type="button"
									key={suggestion.id}
									className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									onClick={() => {
										setIsCardMenuOpen(false);
										openScheduleSuggestion(suggestion.section);
									}}
								>
									<AlertTriangle size={14} className="text-amber-600 shrink-0" />
									<span className="truncate">{suggestion.title}</span>
								</button>
							))}
						</>
					)}

					{/* 1. Напоминания и связь */}
					<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
						Связь и напоминания
					</div>
					{appointmentPatient?.phone ? (
						<button
							type="button"
							className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
							role="menuitem"
							onClick={() => {
								setIsCardMenuOpen(false);
								window.location.href = `tel:${appointmentPatient.phone}`;
							}}
							title={`Позвонить пациенту ${appointmentPatient.phone}`}
						>
							<Phone size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="truncate">Позвонить ({appointmentPatient.phone})</span>
						</button>
					) : null}
					<button
						type="button"
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							const text = generateAppointmentWhatsAppMessage({
								patientName: appointmentPatientName,
								doctorName: appointmentDoctor?.fullName,
								doctorSpecialty: appointmentDoctor?.role,
								appointmentStartsAt: appointment.startsAt,
								clinicName: dashboard?.clinicSettings?.profile?.clinicName,
								clinicAddress: dashboard?.clinicSettings?.profile?.address,
								clinicPhone: dashboard?.clinicSettings?.profile?.phone,
								treatmentReason: appointment.reason,
							});
							if (appointmentPatient?.phone) {
								openWhatsAppChat(appointmentPatient.phone, text);
							} else if (typeof navigator !== "undefined" && navigator.clipboard) {
								void navigator.clipboard.writeText(text);
								showToast(`Текст напоминания для ${appointmentPatientName} скопирован в буфер`, "success");
							}
						}}
					>
						<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Напомнить в WhatsApp / СМС</span>
					</button>

					{/* 2. Сдвиг времени при опоздании */}
					<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
						Опоздание (сдвиг времени)
					</div>
					<div className="grid grid-cols-3 gap-1 px-1 py-0.5">
						{[15, 30, 45].map((m) => (
							<button
								key={m}
								type="button"
								disabled={isQuickStatusUpdating}
								onClick={() => {
									setIsCardMenuOpen(false);
									void handleShiftAppointmentTime(m);
								}}
								className="min-h-[44px] min-w-[44px] px-1.5 py-1 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center whitespace-nowrap"
								title={`Сдвинуть на +${m} минут`}
							>
								+{m}м
							</button>
						))}
					</div>

					{/* 3. Операции с приемом */}
					<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
						Операции с приемом
					</div>
					<button
						type="button"
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							useAppStore.getState().setCurrentView("patients");
							showToast(`Открыта карта пациента: ${appointmentPatientName}`, "info");
						}}
						title="Открыть амбулаторную карту пациента (ЭМК)"
					>
						<FileText size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
						<span>Карта пациента (ЭМК)</span>
					</button>
					<button
						type="button"
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							void printBlankMedicalContract(appointmentPatient, {
								doctorName: appointmentDoctor?.fullName,
								clinicName: dashboard?.clinicSettings?.profile?.clinicName,
							});
						}}
						title="Распечатать пустой договор со строками _______ для пациента"
						data-testid="appointment-card-print-blank-contract-btn"
					>
						<Printer size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
						<span>Печать бланка договора (_______)</span>
					</button>
					<button
						type="button"
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
						}}
						title="Перейти в кассу для расчёта"
					>
						<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Принять оплату / Касса</span>
					</button>
					<button
						type="button"
						className="secondary-button appointment-repeat-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							repeatAppointment(appointment);
						}}
						title="Повторить запись (Клавиша R)"
					>
						<span>Повторить запись</span>
						<span className="text-[10px] font-mono opacity-70">R</span>
					</button>

					{copyAppointmentToBuffer ? (
						<button
							type="button"
							className="secondary-button appointment-buffer-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
							role="menuitem"
							onClick={() => {
								setIsCardMenuOpen(false);
								copyAppointmentToBuffer(appointment);
							}}
							title="Скопировать в буфер (Клавиша B)"
						>
							<span>Скопировать в буфер</span>
							<span className="text-[10px] font-mono opacity-70">B</span>
						</button>
					) : null}

					<button
						type="button"
						className="secondary-button appointment-edit-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							openAppointmentEditor(appointment);
						}}
						title="Настроить запись в редакторе (Клавиша Enter)"
					>
						<span>Настроить запись</span>
						<span className="text-[10px] font-mono opacity-70">Enter</span>
					</button>

					{/* 4. Диагностика и КТ */}
					<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
						Диагностика
					</div>
					<button
						type="button"
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
						role="menuitem"
						data-testid="appointment-open-cbct-radiology-btn"
						onClick={() => {
							setIsCardMenuOpen(false);
							if (typeof window !== "undefined") {
								if (appointmentPatient?.id) {
									usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
								}
								window.location.hash = "#radiology";
								showToast(`Открыты снимки и КТ пациента ${appointmentPatientName}`, "info");
							}
						}}
						title="Открыть рентген и 3D КТ (Клавиша X)"
					>
						<div className="flex items-center gap-2">
							<Scan size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
							<span>КТ / Рентген снимки</span>
						</div>
						<span className="text-[10px] font-mono opacity-70">X</span>
					</button>

					{/* 5. Статус и отмена */}
					<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
						Статус и отмена
					</div>
					<button
						type="button"
						disabled={isQuickStatusUpdating}
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40"
						role="menuitem"
						onClick={() => setIsRefusalReasonsOpen((prev) => !prev)}
						title="Отменить приём"
						data-testid="appointment-card-refusal-menu-trigger"
					>
						<div className="flex items-center gap-2">
							<XCircle size={14} className="text-rose-600 shrink-0" />
							<span>Отменить приём</span>
						</div>
						<ChevronDown
							size={14}
							className={`text-rose-600 shrink-0 transition-transform ${
								isRefusalReasonsOpen ? "rotate-180" : ""
							}`}
						/>
					</button>
					{isRefusalReasonsOpen && (
						<div
							className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 my-1 max-h-[190px] overflow-y-auto [scrollbar-width:thin]"
							data-testid="appointment-card-refusal-reasons-dropdown"
						>
							<div className="text-[10px] font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider px-1">
								Причины отмены (StomX):
							</div>
							{STOMX_REFUSE_REASONS_CATALOG.map((refuse) => (
								<button
									key={refuse.id}
									type="button"
									onClick={() => {
										setIsCardMenuOpen(false);
										setIsRefusalReasonsOpen(false);
										const statusToSet = refuse.code.startsWith("no_show")
											? "no_show"
											: "cancelled";
										void handleQuickStatusChange(
											statusToSet,
											`[Отмена: ${refuse.nameRu}]`,
										);
									}}
									className="w-full text-left px-2 py-1.5 min-h-[36px] rounded-lg text-[11px] font-medium text-[var(--ink)] hover:bg-rose-500/15 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-between cursor-pointer"
									data-testid={`appointment-card-refusal-reason-${refuse.code}`}
									title={`${refuse.nameRu} (${
										refuse.responsibility === "clinic"
											? "Клиника"
											: refuse.responsibility === "patient"
											? "Пациент"
											: "Система"
									})`}
								>
									<span className="truncate">{refuse.nameRu}</span>
								</button>
							))}
						</div>
					)}
					<button
						type="button"
						disabled={isQuickStatusUpdating}
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							void handleQuickStatusChange("cancelled");
						}}
						title="Отменить приём без указания причины"
					>
						<XCircle size={14} className="text-rose-600 shrink-0 opacity-60" />
						<span>Отменить без причины</span>
					</button>
					<button
						type="button"
						disabled={isQuickStatusUpdating}
						className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
						role="menuitem"
						onClick={() => {
							setIsCardMenuOpen(false);
							void handleQuickStatusChange("no_show");
						}}
						title="Отметить: пациент не явился"
					>
						<UserX size={14} className="text-amber-600 shrink-0" />
						<span>Не явился (No-show)</span>
					</button>
				</div>
			)}
		</div>
	);
}
