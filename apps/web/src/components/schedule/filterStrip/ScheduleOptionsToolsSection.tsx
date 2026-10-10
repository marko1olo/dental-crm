import {
	AlertCircle,
	Armchair,
	BarChart3,
	Bot,
	Calendar,
	CalendarRange,
	Clipboard,
	Clock,
	LayoutGrid,
	List,
	PhoneCall,
	Printer,
	Search,
	Send,
	ShieldCheck,
	UserPlus,
	UserSearch,
	Users,
} from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";

export interface ScheduleOptionsToolsSectionProps {
	setIsOptionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	onOpenPatientSearch?: () => void;
	onToggleSmartAi?: () => void;
	setScheduleViewMode?: (mode: "timeline" | "grid" | "chairs") => void;
	scheduleViewMode?: "timeline" | "grid" | "chairs";
	onOpenDoctorFreeSlots?: () => void;
	onOpenPreventiveInspection?: () => void;
	preventiveInspectionCount?: number;
	onOpenTomorrowReminders?: () => void;
	onEmergencyCitoBooking?: () => void;
	onToggleShiftAnalytics?: () => void;
	showShiftAnalytics?: boolean;
	onOpenShiftRoster?: () => void;
	onOpenDoctorShiftDrawer?: () => void;
	onOpenChairDateRangeModal?: () => void;
	onOpenWaitlist?: () => void;
	waitlistCount?: number;
	onToggleConfirmations?: () => void;
	showConfirmationsPanel?: boolean;
	onToggleFreedSlots?: () => void;
	showFreedSlotsPanel?: boolean;
	onToggleClipboard?: () => void;
	showClipboardPanel?: boolean;
	onOpenCalendarSync?: () => void;
}

export function ScheduleOptionsToolsSection({
	setIsOptionsMenuOpen,
	onOpenPatientSearch,
	onToggleSmartAi,
	setScheduleViewMode,
	scheduleViewMode = "timeline",
	onOpenDoctorFreeSlots,
	onOpenPreventiveInspection,
	preventiveInspectionCount = 0,
	onOpenTomorrowReminders,
	onEmergencyCitoBooking,
	onToggleShiftAnalytics,
	showShiftAnalytics = false,
	onOpenShiftRoster,
	onOpenDoctorShiftDrawer,
	onOpenChairDateRangeModal,
	onOpenWaitlist,
	waitlistCount = 0,
	onToggleConfirmations,
	showConfirmationsPanel = false,
	onToggleFreedSlots,
	showFreedSlotsPanel = false,
	onToggleClipboard,
	showClipboardPanel = false,
	onOpenCalendarSync,
}: ScheduleOptionsToolsSectionProps): ReactElement {
	return (
		<>
			{onOpenPatientSearch && (
				<button
					type="button"
					onClick={() => {
						onOpenPatientSearch();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="schedule-search-patient-btn"
					title="Мгновенный поиск пациента по телефону или фамилии (Ctrl+K)"
				>
					<UserSearch size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Пациент (Ctrl+K)</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => {
					setIsOptionsMenuOpen(false);
					void printBlankMedicalContract(null);
				}}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Распечатать пустой договор со строками _______ для ручного заполнения"
				data-testid="schedule-toolbar-print-blank-contract-btn"
			>
				<Printer size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Бланк договора (_______)</span>
			</button>

			{onToggleSmartAi && (
				<button
					type="button"
					onClick={() => {
						onToggleSmartAi();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="schedule-options-dictation-btn"
				>
					<Bot size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Быстрая запись / диктовка</span>
				</button>
			)}

			{setScheduleViewMode && (
				<button
					type="button"
					onClick={() => {
						const nextMode =
							scheduleViewMode === "timeline"
								? "grid"
								: scheduleViewMode === "grid"
									? "chairs"
									: "timeline";
						setScheduleViewMode(nextMode);
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="schedule-options-mode-toggle"
				>
					{scheduleViewMode === "timeline" ? (
						<>
							<LayoutGrid size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Сетка по кабинетам</span>
						</>
					) : scheduleViewMode === "grid" ? (
						<>
							<Armchair size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>По креслам</span>
						</>
					) : (
						<>
							<List size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Лента по дням</span>
						</>
					)}
				</button>
			)}

			{onOpenDoctorFreeSlots && (
				<button
					type="button"
					onClick={() => {
						onOpenDoctorFreeSlots();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Search size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Свободные окна</span>
				</button>
			)}

			{onOpenPreventiveInspection && (
				<button
					type="button"
					onClick={() => {
						onOpenPreventiveInspection();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
					data-testid="schedule-strip-preventive-inspection-btn"
				>
					<div className="flex items-center gap-2">
						<ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
						<span>Осмотры по гарантии (6 мес.)</span>
					</div>
					{preventiveInspectionCount !== undefined && preventiveInspectionCount > 0 && (
						<span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
							{preventiveInspectionCount}
						</span>
					)}
				</button>
			)}

			{onOpenTomorrowReminders && (
				<button
					type="button"
					onClick={() => {
						onOpenTomorrowReminders();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					aria-label="Напомнить всем на завтра: рассылка WhatsApp и СМС"
					data-testid="schedule-strip-tomorrow-reminders-btn"
				>
					<Send size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Напомнить на завтра</span>
				</button>
			)}

			{onEmergencyCitoBooking && (
				<button
					type="button"
					onClick={() => {
						onEmergencyCitoBooking();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					aria-label="Пациент с острой болью: быстрая запись дежурному врачу"
				>
					<AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span>Острая боль (срочно)</span>
				</button>
			)}

			{/* Secondary Panels and Modes */}
			{onToggleShiftAnalytics && (
				<button
					type="button"
					onClick={() => {
						onToggleShiftAnalytics();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<BarChart3 size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}</span>
				</button>
			)}

			{onOpenShiftRoster && (
				<button
					type="button"
					onClick={() => {
						onOpenShiftRoster();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Users size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Табель смен (ТК РФ)</span>
				</button>
			)}

			{onOpenDoctorShiftDrawer && (
				<button
					type="button"
					onClick={() => {
						onOpenDoctorShiftDrawer();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="schedule-options-doctor-shift-btn"
					title="Назначить смену врача"
				>
					<Clock size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>График смен</span>
				</button>
			)}

			{onOpenChairDateRangeModal && (
				<button
					type="button"
					onClick={() => {
						onOpenChairDateRangeModal();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="schedule-options-chair-range-btn"
					title="Назначить смену на период дат"
				>
					<CalendarRange size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Период кресел</span>
				</button>
			)}

			{onOpenWaitlist && (
				<button
					type="button"
					onClick={() => {
						onOpenWaitlist();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<UserPlus size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Лист ожидания {waitlistCount > 0 ? `(${waitlistCount})` : ""}</span>
				</button>
			)}

			{onToggleConfirmations && (
				<button
					type="button"
					onClick={() => {
						onToggleConfirmations();
						setIsOptionsMenuOpen(false);
					}}
					className={`w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
						showConfirmationsPanel
							? "bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold"
							: "text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)]"
					}`}
					role="menuitem"
					data-testid="schedule-auto-call-chip-btn"
					title="Утренний автодозвон и подтверждение визитов"
				>
					<PhoneCall size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>{showConfirmationsPanel ? "Скрыть автодозвон" : "Автодозвон и подтверждения"}</span>
				</button>
			)}

			{onToggleFreedSlots && (
				<button
					type="button"
					onClick={() => {
						onToggleFreedSlots();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Clock size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>{showFreedSlotsPanel ? "Скрыть окна" : "Освободившиеся окна"}</span>
				</button>
			)}

			{onToggleClipboard && (
				<button
					type="button"
					onClick={() => {
						onToggleClipboard();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Clipboard size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>{showClipboardPanel ? "Скрыть буфер" : "Буфер расписания"}</span>
				</button>
			)}

			{onOpenCalendarSync && (
				<button
					type="button"
					onClick={() => {
						onOpenCalendarSync();
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					data-testid="open-calendar-sync-modal-btn"
					title="Синхронизация с Яндекс Календарём, Apple Calendar и Google Calendar (iCal/CalDAV)"
				>
					<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Синхронизация календарей (iCal)</span>
				</button>
			)}
		</>
	);
}
