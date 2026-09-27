import React from "react";
import {
	AlertOctagon,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
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
}: VisitHeaderMonolithProps) {
	return (
		<header
			className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-hidden shrink-0 sticky top-0 z-30 backdrop-blur-md"
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

					{/* Бейджи аллергий и критических соматических рисков в Tier 1 */}
					{activePatientCriticalBadges.map((badge) => (
						<span
							key={badge.id}
							className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 flex-shrink-0 animate-pulse whitespace-nowrap"
							data-testid={badge.testId}
							role="alert"
							title={badge.title}
						>
							<AlertOctagon
								size={13}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span className="sm:hidden text-[10px] whitespace-nowrap">
								{badge.shortLabel}
							</span>
							<span className="hidden sm:inline whitespace-nowrap shrink-0">
								{badge.fullLabel}
							</span>
						</span>
					))}
				</div>

				<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
					{/* Кнопка физиологической нормы 043/у (1-клик) */}
					<button
						type="button"
						onClick={handleApplySomaticNormQuick}
						data-testid="btn-somatic-norm-one-click"
						className="secondary-button h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg"
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

					{/* Печать Формы 043/у (Мандат 8e) */}
					<button
						type="button"
						onClick={handlePrintForm043uFast}
						data-testid="btn-visit-fast-print-043u"
						className={`secondary-button h-7 min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 text-xs font-semibold text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/30 items-center gap-1 cursor-pointer shrink-0 rounded-lg ${
							visitSubViewTab === "odontogram"
								? "!hidden"
								: "!hidden sm:!inline-flex"
						}`}
						title="Печать Формы 043/у в любой момент (если открыт — «ЧЕРНОВИК», если закрыт — «ПОДПИСАНО ВРАЧОМ»)"
					>
						<Printer
							className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0"
							aria-hidden="true"
						/>
						<span className="hidden lg:inline">Печать 043/у</span>
					</button>

					{/* Экстренная помощь / Аптечка анти-шок */}
					<button
						type="button"
						onClick={() => setIsEmergencyModalOpen(true)}
						data-testid="btn-visit-emergency-rescue"
						className="!hidden sm:!inline-flex secondary-button h-7 min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 text-xs font-bold text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 items-center gap-1 cursor-pointer shrink-0 rounded-lg"
						title="Экстренная помощь / Аптечка анти-шок (анафилаксия, коллапс, гипертонический криз)"
					>
						<AlertOctagon
							className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
							aria-hidden="true"
						/>
						<span className="hidden xl:inline">Аптечка</span>
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
							title={`Ожидает приёма: ${shiftDayQueue.arrived} пациентов в холле клиники. 1 клик для вызова`}
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

						{/* Popover для вызова ожидающего пациента в 1 клик */}
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
											title="Принять в кресло (1 клик)"
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
									"Переход в кассу для оформления чека (54-ФЗ)",
									"info",
								);
							}}
							className={`min-h-[26px] h-[26px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
								shiftDayQueue.awaitingPayment > 0
									? "bg-slate-500/15 text-slate-800 dark:text-slate-200 border border-slate-500/40 hover:bg-slate-500/25"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="visit-queue-tab-completed"
							title={`Ожидает оплаты: ${shiftDayQueue.awaitingPayment} (приём завершён, готов к кассе 54-ФЗ)`}
						>
							<CheckCircle2
								size={12}
								className="shrink-0 text-slate-600 dark:text-slate-400"
							/>
							<span className="text-[11px] whitespace-nowrap">Оплата</span>
							<span
								data-testid="visit-queue-count-completed"
								className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-600 text-white"
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
						className="sm:hidden secondary-button min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 py-0 text-xs font-bold flex items-center gap-1 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7 text-[var(--teal)] border-[var(--teal)]/40 hover:bg-[var(--teal-soft)]"
						title="Сохранить изменения приёма в 1 клик"
					>
						<Check size={14} className="stroke-[3] shrink-0" />
						<span className="text-xs font-bold whitespace-nowrap">
							Сохранить
						</span>
					</button>

					{/* Кнопка «Завершить приём» */}
					<button
						type="button"
						onClick={handleFinishVisitAction}
						data-testid="btn-complete-visit-header"
						className="primary-button min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 sm:px-3 py-0 text-xs font-bold flex items-center gap-1 sm:gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7"
						title="Завершить приём и сохранить все изменения"
					>
						<CheckCircle2 size={15} className="shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap">
							Завершить приём
						</span>
						<span className="sm:hidden text-xs font-bold whitespace-nowrap">
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
										<span className="font-semibold">Печать Формы 043/у</span>
										<span className="text-[10px] text-[var(--muted)]">
											С текущим штампом (черновик/подписано)
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
											Печать согласия (ИДС 1051н)
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
