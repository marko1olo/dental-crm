import React from "react";
import { PatientAvatar } from "../../../PatientAvatar";
import { VisitMainTabs } from "../../VisitMainTabs";
import { useSoftPresence } from "../../../../hooks/useSoftPresence";
import {
	PatientAlertBadgesBar,
	buildConsolidatedAllergyChip,
} from "./PatientAlertBadgesBar";
import {
	VisitTimerAndPresenceControls,
	VisitShiftQueueControls,
	VisitTimerAndStatusControls,
} from "./VisitTimerAndStatusControls";
import { VisitActionButtonsToolbar } from "./VisitActionButtonsToolbar";
import type { VisitHeaderMonolithProps } from "./types";

export * from "./types.js";
export * from "./PatientAlertBadgesBar.js";
export * from "./VisitTimerAndStatusControls.js";
export * from "./VisitActionButtonsToolbar.js";

/**
 * Канонический координатор шапки текущего приёма врача (VisitHeaderMonolith).
 * Декомпозирован по Mandate 8b и навыку /decomposer на изолированные слои:
 * - types.ts (контракты интерфейсов)
 * - PatientAlertBadgesBar.tsx (аллергии, соматика, ЗТЛ)
 * - VisitTimerAndStatusControls.tsx (секундомер, присутствие, очередь)
 * - VisitActionButtonsToolbar.tsx (клинические быстрые действия, печать бланков)
 */
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

	const consolidatedAllergyChip = React.useMemo(() => {
		return buildConsolidatedAllergyChip(activePatient, activePatientCriticalBadges);
	}, [activePatient, activePatientCriticalBadges]);

	return (
		<header
			className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-visible shrink-0 sticky top-0 z-30 backdrop-blur-md"
			data-testid="visit-header-monolith"
			aria-label="Шапка текущего приёма"
		>
			{/* Строка 1 (высота ~30-32px): Пациент, возраст, телефон, бейдж аллергии, кнопка нормы ЭМК, статус и завершить приём */}
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

					{/* Секундомер, виджет смены и мягкое присутствие */}
					<VisitTimerAndPresenceControls
						activeAppointment={activeAppointment}
						activeDoctor={activeDoctor}
						activePeers={activePeers}
						summaryText={summaryText}
					/>

					{/* Полоса медицинских алертов (аллергия, соматика, ЗТЛ) */}
					<PatientAlertBadgesBar
						activePatient={activePatient}
						activePatientCriticalBadges={activePatientCriticalBadges}
						consolidatedAllergyChip={consolidatedAllergyChip}
						activeAppointment={activeAppointment}
					/>
				</div>

				<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
					{/* Тулбар клинических действий, печать бланков, очередь смены, завершение визита */}
					<VisitActionButtonsToolbar
						handleApplySomaticNormQuick={handleApplySomaticNormQuick}
						handlePrintForm043uFast={handlePrintForm043uFast}
						handlePrintCompletedActFast={handlePrintCompletedActFast}
						handlePrintEstimateFast={handlePrintEstimateFast}
						onOpenLabOrderModal={onOpenLabOrderModal}
						setIsEmergencyModalOpen={setIsEmergencyModalOpen}
						shiftDayQueue={shiftDayQueue}
						isQueueLobbyDropdownOpen={isQueueLobbyDropdownOpen}
						setIsQueueLobbyDropdownOpen={setIsQueueLobbyDropdownOpen}
						queueLobbyDropdownRef={queueLobbyDropdownRef}
						flushPendingVisitSaves={flushPendingVisitSaves}
						handleFinishVisitAction={handleFinishVisitAction}
						isHeaderMoreMenuOpen={isHeaderMoreMenuOpen}
						setIsHeaderMoreMenuOpen={setIsHeaderMoreMenuOpen}
						headerMoreMenuRef={headerMoreMenuRef}
						handlePrintInformedConsentFast={handlePrintInformedConsentFast}
						setIsInformedConsentModalOpen={setIsInformedConsentModalOpen}
						setIsWarrantyModalOpen={setIsWarrantyModalOpen}
						setIsDoctorShiftModalOpen={setIsDoctorShiftModalOpen}
						setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
						setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
					/>
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

export default VisitHeaderMonolith;
