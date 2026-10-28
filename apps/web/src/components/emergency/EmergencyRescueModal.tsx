/**
 * Russian Dental Emergency Rescue Master Modal (SSOT Facade)
 * Минздрав РФ Приказ 786н / 1079н / 1144н / 138н
 *
 * - ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА декомпозирован в EmergencyResuscitationTools.tsx
 * - УКЛАДКА ЭКСТРЕННОЙ ПОМОЩИ (ПРИКАЗ МЗ РФ № 786н / 1144н)
 */

import React, { useEffect } from 'react';
import { showToast } from '../GlobalToast';
import { calculateAllEmergencyDosages } from './emergencyRescueEngine';
import {
	formatEmergencyRelativeNotice,
	type EmergencyRelativeNoticeParams,
	type EmergencyRescueModalProps
} from './emergencyModules/emergencyRescueTypes';
import { EmergencyModalHeader } from './emergencyModules/EmergencyModalHeader';
import { EmergencyTabsBar } from './emergencyModules/EmergencyTabsBar';
import { EmergencyScenariosStrip } from './emergencyModules/EmergencyScenariosStrip';
import { EmergencyBriefingGrid } from './emergencyModules/EmergencyBriefingGrid';
import { EmergencyDispatcherBox } from './emergencyModules/EmergencyDispatcherBox';
import { EmergencyWeightPresetsBar } from './emergencyModules/EmergencyWeightPresetsBar';
import { EmergencyDosageCardsGrid } from './EmergencyDosageCardsGrid';
import { EmergencyKitActionsBar } from './emergencyModules/EmergencyKitActionsBar';
import { EmergencyProtocolHandoverBox } from './EmergencyProtocolHandoverBox';
import { useEmergencyRescueLogic } from './emergencyModules/useEmergencyRescueLogic';
if (typeof document !== 'undefined') {
	import('./EmergencyRescueModal.css');
}

export { EmergencyDosageCardsGrid, EmergencyProtocolHandoverBox };
export { formatEmergencyRelativeNotice };
export { calculateAllEmergencyDosages };
export type { EmergencyRelativeNoticeParams, EmergencyRescueModalProps };

export function EmergencyRescueModal(props: EmergencyRescueModalProps): React.ReactElement | null {
	const { isOpen, onClose, onApplyToDiary, clinicName, clinicAddress, clinicPhone, cabinetNumber, doctorFullName, initialPatientName, initialPatientGender } = props;
	const logic = useEmergencyRescueLogic(props);
	const { copyActTimeoutRef, copyCheatSheetTimeoutRef, copyRelativeTimeoutRef } = logic.timers;

	useEffect(() => {
		return () => {
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			if (copyRelativeTimeoutRef.current) clearTimeout(copyRelativeTimeoutRef.current);
		};
	}, [copyActTimeoutRef, copyCheatSheetTimeoutRef, copyRelativeTimeoutRef]);

	if (!isOpen) return null;

	const handleCopyCheatSheet = async () => {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(logic.generatedCheatSheetText).catch(() => {});
		}
		logic.timers.setIsCopiedCheatSheet(true);
		showToast("Шпаргалка для диспетчера 112 скопирована в буфер обмена", "success");
		if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
		copyCheatSheetTimeoutRef.current = setTimeout(() => logic.timers.setIsCopiedCheatSheet(false), 2500);
	};

	const handlePrintEmergencyAct = () => {
		if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
		showToast("Отправлено на печать: Акт передачи пациента бригаде СМП", "info");
	};

	const handleCopyRelativeNotice = async () => {
		const noticeText = formatEmergencyRelativeNotice({
			clinicName: clinicName || 'Стоматологическая клиника DENTE',
			clinicAddress: clinicAddress || 'г. Москва, ул. Клиническая, д. 10, стр. 2',
			clinicPhone: clinicPhone || '',
			cabinetNumber: cabinetNumber || '1',
			patientName: initialPatientName || 'Пациент',
			scenarioTitleRu: logic.activeScenario.nameRu,
			doctorFullName: doctorFullName || 'Лечащий врач-стоматолог'
		});
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(noticeText).catch(() => {});
		}
		logic.timers.setIsCopiedRelative(true);
		showToast("Извещение для родственников скопировано в буфер обмена", "success");
		if (copyRelativeTimeoutRef.current) clearTimeout(copyRelativeTimeoutRef.current);
		copyRelativeTimeoutRef.current = setTimeout(() => logic.timers.setIsCopiedRelative(false), 2500);
	};

	const handleCopyAct = async () => {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(logic.generatedActText).catch(() => {});
		}
		logic.timers.setIsCopiedAct(true);
		showToast("Акт оказания экстренной помощи скопирован в буфер обмена", "success");
		if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
		copyActTimeoutRef.current = setTimeout(() => logic.timers.setIsCopiedAct(false), 2500);
	};

	const handleApplyToForm043 = () => {
		if (onApplyToDiary) onApplyToDiary(logic.generatedActText);
		onClose();
	};

	return (
		<div className="emergency-modal-overlay" role="dialog" aria-modal="true" aria-label="Экстренная помощь у кресла">
			<div className="emergency-modal-container">
				<EmergencyModalHeader onCall112={() => { logic.setActiveTab('cheatsheet'); handleCopyCheatSheet(); }} onClose={onClose} />
				<EmergencyTabsBar activeTab={logic.activeTab} setActiveTab={logic.setActiveTab} />
				<EmergencyScenariosStrip activeScenarioId={logic.activeScenarioId} setActiveScenarioId={logic.setActiveScenarioId} />
				<div className="emergency-modal-body-unified">
					<div className={`emergency-tab-content emergency-cheatsheet-pane ${logic.activeTab === 'cheatsheet' ? '' : 'hidden'}`} style={{ display: logic.activeTab === 'cheatsheet' ? 'flex' : 'none' }}>
						<EmergencyBriefingGrid clinicAddress={clinicAddress} cabinetNumber={cabinetNumber} clinicPhone={clinicPhone} doctorFullName={doctorFullName} patientFullName={initialPatientName} patientAgeYears={logic.patientAgeYears} patientWeightKg={logic.patientWeightKg} patientGender={initialPatientGender} activeScenario={logic.activeScenario} />
						<EmergencyDispatcherBox generatedCheatSheetText={logic.generatedCheatSheetText} isCopiedCheatSheet={logic.timers.isCopiedCheatSheet} onCopyCheatSheet={handleCopyCheatSheet} onPrintEmergencyAct={handlePrintEmergencyAct} isKitWrittenOff={logic.isKitWrittenOff} isWritingOffKit={logic.isWritingOffKit} onWriteoffAntishockKit={logic.handleWriteoffAntishockKit} onApplyToDiary={onApplyToDiary} onApplyToForm043={handleApplyToForm043} isCopiedAct={logic.timers.isCopiedAct} onCopyAct={handleCopyAct} isCopiedRelative={logic.timers.isCopiedRelative} onCopyRelativeNotice={handleCopyRelativeNotice} />
					</div>
					<div className={`emergency-tab-content emergency-kit-pane ${logic.activeTab === 'kit' ? '' : 'hidden'}`} style={{ display: logic.activeTab === 'kit' ? 'flex' : 'none' }}>
						<EmergencyWeightPresetsBar patientWeightKg={logic.patientWeightKg} patientAgeYears={logic.patientAgeYears} onSelectWeight={(w, a) => { logic.setPatientWeightKg(w); logic.setPatientAgeYears(a); }} />
						<EmergencyDosageCardsGrid activeScenarioId={logic.activeScenarioId} patientWeightKg={logic.patientWeightKg} patientAgeYears={logic.patientAgeYears} allDosages={logic.allDosages} lipidRescueData={logic.lipidRescueData} />
						<EmergencyKitActionsBar isKitWrittenOff={logic.isKitWrittenOff} isWritingOffKit={logic.isWritingOffKit} onWriteoffAntishockKit={logic.handleWriteoffAntishockKit} onPrintEmergencyAct={handlePrintEmergencyAct} onApplyToDiary={onApplyToDiary} onApplyToForm043={handleApplyToForm043} />
					</div>
				</div>
			</div>
		</div>
	);
}
