import type { VisitViewHeaderProps } from "./types";
import { PatientAvatarAndInfoSection } from "./visitHeaderModules/PatientAvatarAndInfoSection";
import { VisitHeaderActionsToolbar } from "./visitHeaderModules/VisitHeaderActionsToolbar";

export * from "./visitHeaderModules/PatientAvatarAndInfoSection";
export * from "./visitHeaderModules/VisitHeaderFastPrintCluster";
export * from "./visitHeaderModules/VisitHeaderMoreActionsDropdown";
export * from "./visitHeaderModules/VisitHeaderActionsToolbar";

/**
 * Канонический фасад шапки текущего приёма врача (VisitViewHeader).
 * Декомпозирован по МАНДАТУ 8b до <= 120 строк на файл:
 * - PatientAvatarAndInfoSection: Пациент, возраст, таймер, SoftPresence, аллергия
 * - VisitHeaderFastPrintCluster: data-testid="btn-visit-fast-print-043u" h-9 min-h-[36px] min-w-[36px] w-9 rounded-xl
 * - VisitHeaderActionsToolbar: 1-клик Норма, ЗТЛ, Ассистент, Очередь, Завершить приём (bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white)
 * - VisitHeaderMoreActionsDropdown: Меню дополнительных действий (12 пунктов)
 */
export function VisitViewHeader(props: VisitViewHeaderProps) {
	return (
		<div className="min-h-[44px] h-[44px] flex items-center justify-between gap-1 px-2 py-1 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
			<PatientAvatarAndInfoSection
				activePatient={props.activePatient}
				patientAge={props.patientAge}
				activeAppointment={props.activeAppointment}
				activePeers={props.activePeers}
				summaryText={props.summaryText}
				activePatientCriticalBadges={props.activePatientCriticalBadges}
				consolidatedAllergyChip={props.consolidatedAllergyChip}
			/>
			<VisitHeaderActionsToolbar {...props} />
		</div>
	);
}

export default VisitViewHeader;
