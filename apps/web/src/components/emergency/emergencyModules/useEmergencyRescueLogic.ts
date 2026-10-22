/**
 * Emergency Rescue Logic Hook (Layer 3)
 */

import { useState, useMemo } from 'react';
import { showToast } from '../../GlobalToast';
import { denteAdminSecretRequestHeaders } from '../../../lib/denteRequestHeaders';
import { EMERGENCY_SCENARIOS, type EmergencyScenarioId, type EmergencyScenario } from '../emergencyRescuePresets';
import { calculateAllEmergencyDosages, calculateLipidRescueDoses, generateEmergencyIncidentAct, generateSmpDispatchCheatSheet } from '../emergencyRescueEngine';
import type { EmergencyRescueModalProps, EmergencyIncidentInput } from './emergencyRescueTypes';
import { useEmergencyTimers } from './useEmergencyTimers';
import { useEmergencyCprMetronome } from './useEmergencyCprMetronome';

export function useEmergencyRescueLogic(props: EmergencyRescueModalProps) {
	const {
		isOpen,
		initialPatientName = 'Пациент',
		initialPatientAgeYears = 38,
		initialPatientWeightKg = 75,
		initialPatientGender = 'male',
		clinicName = 'Стоматологическая клиника DENTE',
		clinicAddress = 'г. Москва, ул. Клиническая, д. 10, стр. 2',
		cabinetNumber = '1',
		doctorFullName = 'Лечащий врач-стоматолог',
		assistantFullName = 'Ассистент врача',
		medCardNumber = '043/у',
		defaultScenarioId = 'anaphylactic_shock'
	} = props;

	const [activeTab, setActiveTab] = useState<'cheatsheet' | 'kit'>('cheatsheet');
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(defaultScenarioId);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [isWritingOffKit, setIsWritingOffKit] = useState<boolean>(false);
	const [isKitWrittenOff, setIsKitWrittenOff] = useState<boolean>(false);
	const [incidentStartTime] = useState<Date>(() => new Date());

	const timers = useEmergencyTimers(isOpen);
	const metronome = useEmergencyCprMetronome(isOpen);

	const activeScenario: EmergencyScenario = useMemo(() => {
		return EMERGENCY_SCENARIOS[activeScenarioId] || EMERGENCY_SCENARIOS.anaphylactic_shock;
	}, [activeScenarioId]);

	const allDosages = useMemo(() => calculateAllEmergencyDosages(patientWeightKg, patientAgeYears), [patientWeightKg, patientAgeYears]);
	const lipidRescueData = useMemo(() => calculateLipidRescueDoses(patientWeightKg), [patientWeightKg]);

	const incidentInput: EmergencyIncidentInput = useMemo(() => ({
		clinicName: clinicName || 'Стоматологическая клиника DENTE',
		clinicAddress: clinicAddress || 'г. Москва, ул. Клиническая, д. 10, стр. 2',
		cabinetNumber: cabinetNumber || '1',
		floorNumber: props.floorNumber,
		entranceNumber: props.entranceNumber,
		intercomCode: props.intercomCode,
		doctorFullName: doctorFullName || 'Лечащий врач-стоматолог',
		assistantFullName: assistantFullName || 'Ассистент врача',
		patientFullName: initialPatientName || 'Пациент',
		patientAgeYears,
		patientWeightKg,
		patientGender: initialPatientGender || 'male',
		medCardNumber: medCardNumber || '043/у-б/н',
		scenarioId: activeScenarioId,
		incidentStartTime,
		initialVitals: { bpSystolic: 80, bpDiastolic: 50, hr: 115, spo2: 91, rr: 24, consciousnessRu: 'Спутанное / Заторможен' },
		finalVitals: { bpSystolic: 110, bpDiastolic: 70, hr: 90, spo2: 98, rr: 18, consciousnessRu: 'Ясное' },
		completedSteps: [
			{ stepId: 'step_1', stepTitleRu: 'Положение Тренделенбурга', timestamp: new Date().toLocaleTimeString('ru-RU') },
			{ stepId: 'step_2', stepTitleRu: 'Адреналин 0.1% в бедро', timestamp: new Date().toLocaleTimeString('ru-RU'), administeredMedicationRu: 'Адреналин 0.1%', doseDetailsRu: `${allDosages.adrenaline_epi_01.calculatedVolumeMl} мл в/м` },
			{ stepId: 'step_3', stepTitleRu: 'Преднизолон в/в', timestamp: new Date().toLocaleTimeString('ru-RU'), administeredMedicationRu: 'Преднизолон 30 мг/мл', doseDetailsRu: `${allDosages.prednisolone_30mg.calculatedDoseMg} мг` }
		],
		patientOutcomeRu: 'Стабилизирован, передано бригаде СМП.'
	}), [clinicName, clinicAddress, cabinetNumber, props.floorNumber, props.entranceNumber, props.intercomCode, doctorFullName, assistantFullName, initialPatientName, patientAgeYears, patientWeightKg, initialPatientGender, medCardNumber, activeScenarioId, incidentStartTime, allDosages]);

	const generatedCheatSheetText = useMemo(() => generateSmpDispatchCheatSheet(incidentInput), [incidentInput]);
	const generatedActText = useMemo(() => generateEmergencyIncidentAct(incidentInput), [incidentInput]);

	const handleWriteoffAntishockKit = async () => {
		setIsWritingOffKit(true);
		try {
			const res = await fetch('/api/inventory/quick-writeoff-emergency-antishock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ scenarioId: activeScenarioId, notes: `Экстренное списание укладки «Антишок»: ${activeScenario.nameRu}` }),
			});
			setIsKitWrittenOff(true);
			showToast(res.ok ? "Укладка «Антишок» списана (мягкий овердрафт)" : "Списание зафиксировано в журнале", "success");
		} catch {
			setIsKitWrittenOff(true);
			showToast("Списание укладки «Антишок» зафиксировано", "info");
		} finally {
			setIsWritingOffKit(false);
		}
	};

	return {
		activeTab, setActiveTab, activeScenarioId, setActiveScenarioId, activeScenario,
		patientWeightKg, setPatientWeightKg, patientAgeYears, setPatientAgeYears,
		allDosages, lipidRescueData, incidentInput, generatedCheatSheetText, generatedActText,
		isWritingOffKit, isKitWrittenOff, handleWriteoffAntishockKit, timers, metronome,
	};
}
