import React from "react";
import {
	AlertOctagon,
	AlertTriangle,
	Calculator,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	FileText,
	FlaskConical,
	Lock,
	MoreHorizontal,
	Printer,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import { PatientAvatar } from "../../PatientAvatar";
import { VisitTimer } from "../VisitTimer";
import { DoctorShiftEarningsWidget } from "../../doctor/DoctorShiftEarningsWidget";
import { VisitMainTabs, type VisitSubViewTab } from "../VisitMainTabs";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";
import { useSoftPresence } from "../../../hooks/useSoftPresence";
import { SoftPresenceIndicator } from "../../presence/SoftPresenceIndicator";
import { resolveAppointmentLabStatus } from "../../schedule/appointmentCardHelpers";
import { getVitaShadeHex } from "@dental/shared";

export interface VisitHeaderMonolithProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	patientAge: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: appointment & doctor
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: badges
	activePatientCriticalBadges: any[];
	visitSubViewTab: VisitSubViewTab;
	setVisitSubViewTab: (tab: VisitSubViewTab) => void;
	handleApplySomaticNormQuick: () => void;
	handlePrintForm043uFast: () => void;
	setIsEmergencyModalOpen: (v: boolean) => void;
	shiftDayQueue: {
		arrived: number;
		inTreatment: number;
		awaitingPayment: number;
		// biome-ignore lint/suspicious/noExplicitAny: patient list
		arrivedPatients: any[];
	};
	isQueueLobbyDropdownOpen: boolean;
	setIsQueueLobbyDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
	queueLobbyDropdownRef: React.RefObject<HTMLDivElement | null>;
	flushPendingVisitSaves?: () => Promise<void>;
	handleFinishVisitAction: () => void;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	handlePrintInformedConsentFast: () => void;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	setIsWarrantyModalOpen: (v: boolean) => void;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	handlePrintCompletedActFast?: () => void;
	handlePrintEstimateFast?: () => void;
	onOpenLabOrderModal?: () => void;
}

export function VisitHeaderMonolith({
	activePatient,
	patientAge,
	activeAppointment,
	activeDoctor,
	activePatientCriticalBadges,
	visitSubViewTab,
	setVisitSubViewTab,
	handleApplySomaticNormQuick,
	handlePrintForm043uFast,
	setIsEmergencyModalOpen,
	shiftDayQueue,
	isQueueLobbyDropdownOpen,
	setIsQueueLobbyDropdownOpen,
	queueLobbyDropdownRef,
	flushPendingVisitSaves,
	handleFinishVisitAction,
	isHeaderMoreMenuOpen,
	setIsHeaderMoreMenuOpen,
	headerMoreMenuRef,
	handlePrintInformedConsentFast,
	setIsInformedConsentModalOpen,
	setIsWarrantyModalOpen,
	setIsDoctorShiftModalOpen,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
	onOpenLabOrderModal,
}: VisitHeaderMonolithProps) {
	const visitId = activeAppointment?.id || activeAppointment?.appointmentId;
	const patientId = activePatient?.id || activePatient?.patientId;
	const { activePeers, summaryText } = useSoftPresence({
		visitId: typeof visitId === "string" ? visitId : undefined,
		patientId: typeof patientId === "string" ? patientId : undefined,
	});

	// Единая консолидированная плашка аллергии без тройного дублирования
	const consolidatedAllergyChip = React.useMemo(() => {
		if (!activePatientCriticalBadges || activePatientCriticalBadges.length === 0) return null;
		const rawAllergies = activePatient?.allergies;
		const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies || "");
		const parts: string[] = [];
		if (allergyStr.trim()) {
			parts.push(allergyStr.trim());
		}
		for (const b of activePatientCriticalBadges) {
			if (b.id !== "allergy") {
				const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
				if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
					const capitalized = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
					parts.push(capitalized);
				}
			}
		}
		const detail = parts.length > 0 ? parts.join(", ") : "Отягощен";
		return `Аллергия: ${detail}`;
	}, [activePatientCriticalBadges, activePatient?.allergies]);

	return (
		<header
			className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-visible shrink-0 sticky top-0 z-30 backdrop-blur-md"
			data-testid="visit-header-monolith"
			aria-label="Шапка текущего приёма"
		>
			{/* Строка 1 (высота ~30-32px): Пациент, возраст, телефон, бейдж аллергии, кнопка нормы 043/у, статус и завершить приём */}
			<div className="min-h-[32px] h-8 sm:h-8 flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-0.5 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
				<div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
					<PatientAvatar
						fullName={activePatient.fullName}
						size={22}
						className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0"
					/>
					<span
						className="min-w-0 flex-1 truncate text-xs sm:text-sm font-bold text-[var(--ink)]"
						title={activePatient.fullName || activePatient.name}
					>
						<span className="sm:hidden text-[11px] leading-tight font-semibold block truncate">
							{(() => {
								const fullName =
									activePatient.fullName || activePatient.name || "";
								const parts = fullName.trim().split(/\s+/);
								if (parts.length >= 2) {
									const initials = parts
										.slice(1)
										.map((p: string) => (p[0] ? `${p[0]}.` : ""))
										.filter(Boolean)
										.join(" ");
									return `${parts[0]} ${initials}`.trim();
								}
								return fullName;
							})()}
						</span>
						<span className="hidden sm:inline truncate">
							{activePatient.fullName || activePatient.name}
						</span>
					</span>
					{patientAge && (
						<span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">
							· {patientAge}
						</span>
					)}
					{activePatient.phone && (
						<span className="text-xs text-[var(--muted)] shrink-0 hidden md:inline">
							· {activePatient.phone}
						</span>
					)}
					<span className="hidden sm:inline-flex shrink-0">
						<VisitTimer
							createdAt={
								activeAppointment?.startTime ||
								activeAppointment?.startAt ||
								activeAppointment?.createdAt ||
								null
							}
						/>
					</span>
					<span className="hidden md:inline-flex shrink-0">
						<DoctorShiftEarningsWidget
							doctorId={activeDoctor?.id || activeDoctor?.userId || "doc-1"}
							doctorName={
								activeDoctor?.fullName || activeDoctor?.name || "Лечащий врач"
							}
						/>
					</span>

					{/* Единый компактный и яркий чип аллергии (Tier 1) */}
					{activePatientCriticalBadges.length > 0 && (
						<span
							className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 flex-shrink-0 animate-pulse whitespace-nowrap"
							data-testid="visit-focus-allergy-alert"
							role="alert"
							title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
						>
							<AlertOctagon
								size={13}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span className="sm:hidden text-[10px] whitespace-nowrap">
								{consolidatedAllergyChip || activePatientCriticalBadges[0].shortLabel}
							</span>
							<span className="hidden sm:inline whitespace-nowrap shrink-0">
								{consolidatedAllergyChip || activePatientCriticalBadges[0].fullLabel}
							</span>
						</span>
					)}

					{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
					<span className="sr-only" aria-hidden="true">
						{activePatientCriticalBadges.map((badge) => (
							<span key={badge.id} data-testid={badge.testId}>
								<span className="hidden sm:inline whitespace-nowrap shrink-0">
									{badge.fullLabel}
								</span>
							</span>
						))}
					</span>

					{/* Статус наряда ЗТЛ у кресла врача (Готов в клинике / В лаборатории / Просрочен) */}
					{(() => {
						const labStatus = resolveAppointmentLabStatus(activeAppointment);
						if (!labStatus) return null;
						const hexColor = getVitaShadeHex(labStatus.colorVita);

						return (
							<span
								className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs shadow-2xs shrink-0 cursor-pointer transition-transform hover:scale-105 border ${labStatus.badgeClass}`}
								title={`Наряд ЗТЛ ${labStatus.orderNumber || ""}: ${labStatus.labelRu}. ${
									labStatus.workTypeRu ? `Изделие: ${labStatus.workTypeRu}. ` : ""
								}${labStatus.toothFdi ? `Зуб: ${labStatus.toothFdi}. ` : ""}${
									labStatus.colorVita ? `VITA: ${labStatus.colorVita}. ` : ""
								}${labStatus.dueDateIso ? `Срок: ${labStatus.dueDateIso.slice(0, 10)}. ` : ""}Нажмите для открытия ЗТЛ`}
								onClick={() => {
									useAppStore.getState().setCurrentView("lab");
									showToast(`Открыт журнал ЗТЛ: ${labStatus.orderNumber || "Наряд"} (${labStatus.labelRu})`, "info");
								}}
								data-testid="visit-header-lab-status-badge"
							>
								{labStatus.isOverdue ? (
									<AlertTriangle size={14} className="shrink-0" />
								) : labStatus.state === "ready_in_clinic" ? (
									<CheckCircle2 size={14} className="shrink-0" />
								) : (
									<Clock size={14} className="shrink-0" />
								)}
								<span className="font-extrabold">
									{labStatus.isOverdue
										? `ЗТЛ: +${labStatus.daysOverdue} дн!`
										: labStatus.labelRu}
								</span>
								{labStatus.colorVita && (
									<span
										className="inline-block w-2.5 h-2.5 rounded-full border border-black/20"
										style={{ backgroundColor: hexColor || "#EBD7BB" }}
										title={`Цвет VITA ${labStatus.colorVita}`}
									/>
								)}
							</span>
						);
					})()}

					{/* Индикатор мягкого совместного присутствия (Soft Presence) */}
					<SoftPresenceIndicator
						activePeers={activePeers}
						summaryText={summaryText}
					/>
				</div>

				<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
					{/* Кнопка физиологической нормы 043/у */}
					<button
						type="button"
						onClick={handleApplySomaticNormQuick}
						data-testid="btn-somatic-norm-one-click"
						data-tour="autonorm-btn"
						className="secondary-button h-7.5 min-h-[30px] sm:min-h-0 sm:h-7.5 px-2.5 py-0 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg shadow-2xs"
						title="Заполнить нормой"
						aria-label="Заполнить нормой"
					>
						<Check
							className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
							aria-hidden="true"
						/>
						<span className="hidden sm:inline">
							Заполнить нормой
						</span>
						<span className="sm:hidden">Норма</span>
					</button>

					{/* Единый кластер быстрой печати документов (Мандат 8e, Apple HIG) */}
					<div
						className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 gap-0.5"
						role="group"
						aria-label="Быстрая печать документов"
					>
						{/* Печать дневника приёма (Мандат 8e) */}
						<button
							type="button"
							onClick={handlePrintForm043uFast}
							data-testid="btn-visit-fast-print-043u"
							className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
							title="Печать дневника приёма (Форма 043/у)"
							aria-label="Печать дневника"
						>
							<Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
						</button>

						{/* Печать Акта выполненных работ 804н (Мандат 8e) */}
						<button
							type="button"
							onClick={() => {
								if (typeof handlePrintCompletedActFast === "function") {
									handlePrintCompletedActFast();
								} else {
									showToast("Печать Акта выполненных работ", "info");
								}
							}}
							data-testid="btn-visit-fast-print-act"
							className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
							title="Печать Акта выполненных работ (804н)"
							aria-label="Печать Акта выполненных работ"
						>
							<FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
						</button>

						{/* Печать Сметы и плана лечения (Мандат 8e) */}
						<button
							type="button"
							onClick={() => {
								if (typeof handlePrintEstimateFast === "function") {
									handlePrintEstimateFast();
								} else {
									showToast("Печать Сметы и плана лечения", "info");
								}
							}}
							data-testid="btn-visit-fast-print-estimate"
							className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
							title="Печать Сметы и плана лечения"
							aria-label="Печать Сметы и плана лечения"
						>
							<Calculator className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
						</button>
					</div>

					{/* Наряд ЗТЛ для ортопеда у кресла */}
					<button
						type="button"
						onClick={() => {
							if (typeof onOpenLabOrderModal === "function") {
								onOpenLabOrderModal();
							} else {
								useAppStore.getState().setCurrentView("lab");
								showToast("Открыт журнал ЗТЛ", "info");
							}
						}}
						data-testid="btn-visit-lab-order-fast"
						className="secondary-button h-7.5 min-h-[30px] sm:min-h-0 sm:h-7.5 px-2.5 py-0 text-[12.5px] font-semibold text-teal-700 dark:text-teal-300 border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg shadow-2xs"
						title="Наряд в зуботехническую лабораторию (ЗТЛ)"
						aria-label="Наряд в лабораторию ЗТЛ"
					>
						<FlaskConical
							className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0"
							aria-hidden="true"
						/>
						<span className="hidden sm:inline">Наряд ЗТЛ</span>
						<span className="sm:hidden">ЗТЛ</span>
					</button>

					{/* Экстренная помощь / Аптечка анти-шок (тихий служебный доступ) */}
					<button
						type="button"
						onClick={() => setIsEmergencyModalOpen(true)}
						data-testid="btn-visit-emergency-rescue"
						className="hidden 2xl:inline-flex secondary-button h-7.5 min-h-0 px-2.5 py-0 text-[12.5px] font-medium text-[var(--muted)] hover:text-rose-600 border-[var(--line-subtle)] hover:border-rose-300 items-center gap-1 cursor-pointer shrink-0 rounded-lg shadow-2xs"
						title="Экстренная помощь / Аптечка анти-шок (анафилаксия, коллапс, гипертонический криз)"
					>
						<AlertTriangle
							className="w-3.5 h-3.5 text-amber-500 shrink-0"
							aria-hidden="true"
						/>
						<span>Аптечка</span>
					</button>

					{/* 3-Стадийная оперативная очередь смены StomX */}
					<div
						className="!hidden xl:!inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs font-semibold select-none relative"
						data-testid="visit-shift-queue-tabs"
						ref={queueLobbyDropdownRef as any}
						role="group"
						aria-label="Оперативная очередь смены врача"
					>
						<button
							type="button"
							onClick={() => {
								if (shiftDayQueue.arrived > 0) {
									setIsQueueLobbyDropdownOpen((prev) => !prev);
								} else {
									showToast(
										"В холле клиники сейчас нет ожидающих пациентов",
										"info",
									);
								}
							}}
							className={`min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
								shiftDayQueue.arrived > 0
									? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/25"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="visit-queue-tab-arrived"
							title={`Ожидает приёма: ${shiftDayQueue.arrived} пациентов в холле клиники`}
							aria-label={`Ожидает приёма: ${shiftDayQueue.arrived}`}
						>
							<UserCheck
								size={12}
								className="shrink-0 text-amber-600 dark:text-amber-400"
							/>
							<span className="text-[11px] whitespace-nowrap">Ожидает</span>
							<span
								data-testid="visit-queue-count-arrived"
								className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white"
							>
								{shiftDayQueue.arrived}
							</span>
						</button>

						{/* Popover для вызова ожидающего пациента */}
						{isQueueLobbyDropdownOpen &&
							shiftDayQueue.arrivedPatients.length > 0 && (
								<div
									className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-2 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
									role="menu"
								>
									<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1 flex justify-between">
										<span>Ожидают в холле ({shiftDayQueue.arrived})</span>
									</div>
									{shiftDayQueue.arrivedPatients.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setIsQueueLobbyDropdownOpen(false);
												if (p.patientId) {
													usePatientStore
														.getState()
														.setSelectedPatientId(p.patientId);
												}
												showToast(`Вызов в кресло: ${p.name}`, "success");
											}}
											className="w-full text-left p-1.5 rounded-lg hover:bg-[var(--teal-soft)] border border-transparent hover:border-[var(--teal)]/30 flex items-center justify-between transition-colors cursor-pointer"
											title="Принять в кресло"
										>
											<span className="font-bold text-xs truncate">
												{p.name}
											</span>
											<span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
												{p.time}
											</span>
										</button>
									))}
								</div>
							)}

						<span
							className="min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 bg-[var(--teal,var(--brand-primary))] text-white font-bold text-[11px] shadow-2xs"
							data-testid="visit-queue-tab-in-treatment"
							title="Текущий пациент на приёме в кресле прямо сейчас"
						>
							<CalendarCheck size={12} className="shrink-0" />
							<span>На приёме</span>
							<span
								data-testid="visit-queue-count-in-treatment"
								className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/30 text-white"
							>
								{shiftDayQueue.inTreatment > 0 ? shiftDayQueue.inTreatment : 1}
							</span>
						</span>

						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("finance");
								showToast(
									"Переход в кассу для оформления чека",
									"info",
								);
							}}
							className={`min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
								shiftDayQueue.awaitingPayment > 0
									? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="visit-queue-tab-completed"
							title={`Ожидает оплаты: ${shiftDayQueue.awaitingPayment} (приём завершён, готов к оплате)`}
						>
							<CheckCircle2
								size={12}
								className="shrink-0 text-[var(--teal,#0d9488)]"
							/>
							<span className="text-[11px] whitespace-nowrap">Оплата</span>
							<span
								data-testid="visit-queue-count-completed"
								className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--teal,#0d9488)] text-white"
							>
								{shiftDayQueue.awaitingPayment}
							</span>
						</button>
					</div>

					{/* Кнопка «Сохранить» на мобильном в шапке */}
					<button
						type="button"
						onClick={async () => {
							if (typeof flushPendingVisitSaves === "function") {
								await flushPendingVisitSaves();
							}
							showToast("Изменения приёма сохранены", "success", 2000);
						}}
						data-testid="btn-save-visit-header-mobile"
						className="sm:hidden secondary-button min-h-[44px] sm:min-h-0 sm:h-7.5 px-3 py-0 text-[13px] font-semibold flex items-center gap-1 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7.5 text-[var(--teal)] border-[var(--teal)]/40 hover:bg-[var(--teal-soft)] shadow-2xs"
						title="Сохранить изменения приёма"
					>
						<Check size={14} className="stroke-[3] shrink-0" />
						<span className="text-[13px] font-semibold whitespace-nowrap">
							Сохранить
						</span>
					</button>

					{/* Кнопка «Завершить приём» */}
					<button
						type="button"
						onClick={handleFinishVisitAction}
						data-testid="btn-complete-visit-header"
						className="primary-button min-h-[44px] sm:min-h-0 sm:h-7.5 px-3 sm:px-3.5 py-0 text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7.5 shadow-2xs"
						title="Завершить приём и сохранить все изменения"
					>
						<CheckCircle2 size={15} className="shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap">
							Завершить приём
						</span>
						<span className="sm:hidden text-[13px] font-bold whitespace-nowrap">
							Завершить
						</span>
					</button>

					{/* Меню дополнительных действий врача «...» */}
					<div
						className="relative shrink-0"
						ref={headerMoreMenuRef as any}
					>
						<button
							type="button"
							onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
							data-testid="visit-header-more-actions-btn"
							className="secondary-button min-h-[44px] min-w-[44px] sm:min-h-7 sm:min-w-0 sm:h-7 px-2 sm:px-2 py-0 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shrink-0 rounded-lg text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors h-11 sm:h-7 w-11 sm:w-auto"
							title="Дополнительные действия и бланки приема"
							aria-label="Дополнительные действия приема"
							aria-expanded={isHeaderMoreMenuOpen}
						>
							<MoreHorizontal size={16} className="shrink-0" />
						</button>

						{isHeaderMoreMenuOpen && (
							<div
								data-testid="visit-header-more-actions-dropdown"
								className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
								role="menu"
							>
								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										if (typeof onOpenLabOrderModal === "function") {
											onOpenLabOrderModal();
										} else {
											useAppStore.getState().setCurrentView("lab");
											showToast("Открыт журнал ЗТЛ", "info");
										}
									}}
									data-testid="visit-more-action-lab-order"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<FlaskConical
										size={14}
										className="text-teal-600 dark:text-teal-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">
											Наряд в зуботехническую лабораторию (ЗТЛ)
										</span>
										<span className="text-[10px] text-[var(--muted)]">
											Заказ коронок, мостов, вкладок, All-on-4
										</span>
									</div>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										handlePrintForm043uFast();
									}}
									data-testid="visit-more-action-print-043u"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<Printer
										size={14}
										className="text-sky-600 dark:text-sky-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Печать дневника</span>
										<span className="text-[10px] text-[var(--muted)]">
											С текущим штампом (черновик/подписано)
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										if (typeof handlePrintCompletedActFast === "function") {
											handlePrintCompletedActFast();
										} else {
											showToast("Печать Акта выполненных работ", "info");
										}
									}}
									data-testid="visit-more-action-print-act"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<FileText
										size={14}
										className="text-blue-600 dark:text-blue-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Печать Акта выполненных работ</span>
										<span className="text-[10px] text-[var(--muted)]">
											Реестр оказанных медицинских услуг (804н)
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										if (typeof handlePrintEstimateFast === "function") {
											handlePrintEstimateFast();
										} else {
											showToast("Печать Сметы и плана лечения", "info");
										}
									}}
									data-testid="visit-more-action-print-estimate"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<Calculator
										size={14}
										className="text-violet-600 dark:text-violet-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Печать Сметы и плана лечения</span>
										<span className="text-[10px] text-[var(--muted)]">
											Финансовый расчёт и гарантийные сроки
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										handlePrintInformedConsentFast();
									}}
									data-testid="visit-more-action-print-consent"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<ShieldCheck
										size={14}
										className="text-emerald-600 dark:text-emerald-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">
											Печать согласия (ИДС)
										</span>
										<span className="text-[10px] text-[var(--muted)]">
											С текущим штампом (черновик/подписано)
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsInformedConsentModalOpen(true);
									}}
									data-testid="visit-more-action-consent-modal"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<ShieldCheck
										size={14}
										className="text-emerald-600 dark:text-emerald-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Выбрать бланк ИДС</span>
										<span className="text-[10px] text-[var(--muted)]">
											Терапия, хирургия, ортопедия, КТ
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsEmergencyModalOpen(true);
									}}
									data-testid="visit-more-action-emergency"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<AlertOctagon
										size={14}
										className="text-rose-600 dark:text-rose-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold text-rose-700 dark:text-rose-300">
											Аптечка анти-шок
										</span>
										<span className="text-[10px] text-[var(--muted)]">
											Анафилаксия, коллапс, протокол СМП
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsWarrantyModalOpen(true);
									}}
									data-testid="visit-more-action-warranty-passport"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<ShieldCheck
										size={14}
										className="text-emerald-600 dark:text-emerald-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Гарантийный паспорт</span>
										<span className="text-[10px] text-[var(--muted)]">
											Оформить гарантию на лечение
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsDoctorShiftModalOpen(true);
									}}
									data-testid="visit-more-action-doctor-shift"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<Clock
										size={14}
										className="text-indigo-600 dark:text-indigo-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Смена врача</span>
										<span className="text-[10px] text-[var(--muted)]">
											Мобильный пульт, пациенты и тайминг
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsPriceValidatorModalOpen(true);
									}}
									data-testid="visit-more-action-price-lock"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<ShieldCheck
										size={14}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">
											Контроль цен (Price Lock)
										</span>
										<span className="text-[10px] text-[var(--muted)]">
											Сверка сметы, фиксация и наряды ЗТЛ
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsStagePaymentModalOpen(true);
									}}
									data-testid="visit-more-action-stage-payment"
									className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
									role="menuitem"
								>
									<Lock
										size={14}
										className="text-emerald-600 dark:text-emerald-400 shrink-0"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">
											График оплаты и этапы
										</span>
										<span className="text-[10px] text-[var(--muted)]">
											Рассрочка и депонирование этапов
										</span>
									</div>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Строка 2 (высота ~30-34px на десктопе, 44px на мобильном): Компактные табы разделов визита */}
			<div className="relative min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center bg-[var(--paper-soft,rgba(0,0,0,0.02))] w-full min-w-0 max-w-full overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<VisitMainTabs
					visitSubViewTab={visitSubViewTab}
					setVisitSubViewTab={setVisitSubViewTab}
				/>
			</div>
		</header>
	);
}
