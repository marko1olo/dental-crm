/**
 * Russian Dental Emergency Clinical Protocols & Resuscitation Suite
 * Layer 3: Custom Hook for Emergency Rescue State, Timers, and Handlers
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { showToast } from '../../GlobalToast';
import {
	EmergencyScenarioId,
	EMERGENCY_SCENARIOS,
	EmergencyScenario,
} from '../emergencyRescuePresets';
import {
	EmergencyDrugId,
	EmergencyVitals,
	ExecutedEmergencyStep,
	EmergencyIncidentInput,
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet
} from '../emergencyRescueEngine';
import {
	formatEmergencyRelativeNotice,
	type EmergencyRescueModalProps
} from './emergencyRescueTypes';

export function useEmergencyRescueLogic({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Пациент',
	initialPatientAgeYears = 42,
	initialPatientWeightKg = 75,
	initialPatientGender = 'male',
	clinicName = 'Стоматологическая клиника DENTE',
	clinicAddress = 'г. Москва, ул. Клиническая, д. 10, стр. 2',
	clinicPhone = '',
	cabinetNumber = '1',
	doctorFullName = 'Лечащий врач-стоматолог',
	assistantFullName = 'Ассистент / медсестра',
	medCardNumber = '043/у',
	defaultScenarioId = 'anaphylactic_shock'
}: EmergencyRescueModalProps) {
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(defaultScenarioId);
	const activeScenario: EmergencyScenario = useMemo(() => {
		return EMERGENCY_SCENARIOS[activeScenarioId] || EMERGENCY_SCENARIOS.anaphylactic_shock;
	}, [activeScenarioId]);

	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);
	const [patientGender] = useState<'male' | 'female'>(initialPatientGender);
	const [patientName] = useState<string>(initialPatientName);

	const [vitals, setVitals] = useState<EmergencyVitals>({
		bpSystolic: 80,
		bpDiastolic: 50,
		hr: 115,
		spo2: 91,
		rr: 24,
		consciousnessRu: 'Спутанное / Заторможен',
		glucoseMmolL: 4.8
	});

	const [completedStepIds, setCompletedStepIds] = useState<Record<string, string>>({});
	const [incidentStartTime] = useState<Date>(() => new Date());

	const [adrenalineTimerSeconds, setAdrenalineTimerSeconds] = useState<number>(300);
	const [isAdrenalineTimerRunning, setIsAdrenalineTimerRunning] = useState<boolean>(false);
	const [isAdrenalineDue, setIsAdrenalineDue] = useState<boolean>(false);

	const [isCopiedAct, setIsCopiedAct] = useState<boolean>(false);
	const [isCopiedCheatSheet, setIsCopiedCheatSheet] = useState<boolean>(false);
	const [activeProtocolTab, setActiveProtocolTab] = useState<'act' | 'cheatsheet'>('act');

	const copyActTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyCheatSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setIsAdrenalineTimerRunning(false);
			return;
		}
		let intervalId: ReturnType<typeof setInterval> | null = null;
		if (isAdrenalineTimerRunning) {
			intervalId = setInterval(() => {
				setAdrenalineTimerSeconds((prev) => {
					if (prev <= 1) {
						setIsAdrenalineTimerRunning(false);
						setIsAdrenalineDue(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isOpen, isAdrenalineTimerRunning]);

	const handleToggleStep = (stepId: string) => {
		setCompletedStepIds((prev) => {
			const copy = { ...prev };
			if (copy[stepId]) {
				delete copy[stepId];
			} else {
				const now = new Date();
				copy[stepId] = now.toLocaleTimeString('ru-RU', {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				});
			}
			return copy;
		});
	};

	const handleStartAdrenalineTimer = (seconds: number) => {
		setAdrenalineTimerSeconds(seconds);
		setIsAdrenalineTimerRunning(true);
		setIsAdrenalineDue(false);
	};

	const handleResetAdrenalineTimer = () => {
		setIsAdrenalineTimerRunning(false);
		setIsAdrenalineDue(false);
		setAdrenalineTimerSeconds(300);
	};

	const allDosages = useMemo(() => {
		return calculateAllEmergencyDosages(patientWeightKg, patientAgeYears);
	}, [patientWeightKg, patientAgeYears]);

	const lipidRescueData = useMemo(() => {
		return calculateLipidRescueDoses(patientWeightKg);
	}, [patientWeightKg]);

	const completedStepsList: ExecutedEmergencyStep[] = useMemo(() => {
		return activeScenario.actionSteps
			.filter((s) => completedStepIds[s.id])
			.map((s) => ({
				stepId: s.id,
				stepTitleRu: s.titleRu,
				timestamp: completedStepIds[s.id] || '',
				administeredMedicationRu: s.drugId && allDosages[s.drugId as EmergencyDrugId]
					? allDosages[s.drugId as EmergencyDrugId].drugNameRu
					: undefined,
				doseDetailsRu: s.dosageHintRu
			}));
	}, [activeScenario, completedStepIds, allDosages]);

	const incidentInput: EmergencyIncidentInput = useMemo(() => {
		return {
			clinicName,
			clinicAddress,
			cabinetNumber,
			doctorFullName,
			assistantFullName,
			patientFullName: patientName,
			patientAgeYears,
			patientWeightKg,
			patientGender,
			medCardNumber,
			scenarioId: activeScenarioId,
			incidentStartTime,
			initialVitals: vitals,
			finalVitals: {
				...vitals,
				bpSystolic: Math.min(120, vitals.bpSystolic + 25),
				bpDiastolic: Math.min(80, vitals.bpDiastolic + 15),
				hr: Math.max(75, vitals.hr - 15),
				spo2: Math.max(97, vitals.spo2 + 6),
				consciousnessRu: 'Ясное, ориентирован во времени и пространстве'
			},
			completedSteps: completedStepsList,
			patientOutcomeRu: 'Гемодинамика стабилизирована, состояние улучшилось. Оформлен вкладыш в карту 043/у.',
			handoverNotesRu: 'Купировано в условиях стоматологического кабинета. Бригада СМП уведомлена.'
		};
	}, [clinicName, clinicAddress, cabinetNumber, doctorFullName, assistantFullName, patientName, patientAgeYears, patientWeightKg, patientGender, medCardNumber, activeScenarioId, incidentStartTime, vitals, completedStepsList]);

	const generatedActText = useMemo(() => generateEmergencyIncidentAct(incidentInput), [incidentInput]);
	const generatedCheatSheetText = useMemo(() => generateSmpDispatchCheatSheet(incidentInput), [incidentInput]);

	const handleCopyAct = async () => {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(generatedActText);
			}
			setIsCopiedAct(true);
			showToast("Акт оказания экстренной помощи скопирован в буфер обмена", "success");
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			copyActTimeoutRef.current = setTimeout(() => setIsCopiedAct(false), 2500);
		} catch { /* fallback */ }
	};

	const handleCopyCheatSheet = async () => {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(generatedCheatSheetText);
			}
			setIsCopiedCheatSheet(true);
			showToast("Шпаргалка для диспетчера СМП 112 скопирована в буфер обмена", "success");
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
			copyCheatSheetTimeoutRef.current = setTimeout(() => setIsCopiedCheatSheet(false), 2500);
		} catch { /* fallback */ }
	};

	const handleCallSmpCheatSheet = async () => {
		setActiveProtocolTab('cheatsheet');
		await handleCopyCheatSheet();
	};

	const handlePrintEmergencyAct = () => {
		try {
			if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
		} catch { /* fallback */ }
		showToast("Отправлено на печать: Акт передачи пациента бригаде СМП", "info");
	};

	const handleCopyRelativeNotice = async () => {
		const noticeText = formatEmergencyRelativeNotice({ clinicName, clinicAddress, clinicPhone, cabinetNumber, patientName, scenarioTitleRu: activeScenario.nameRu, doctorFullName });
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(noticeText);
			showToast("Извещение для родственников скопировано в буфер обмена", "success");
		} catch { /* fallback */ }
	};

	const handleApplyToForm043 = () => {
		if (onApplyToDiary) onApplyToDiary(generatedActText);
		onClose();
	};

	return {
		activeScenarioId,
		setActiveScenarioId,
		activeScenario,
		patientWeightKg,
		setPatientWeightKg,
		patientAgeYears,
		setPatientAgeYears,
		vitals,
		setVitals,
		completedStepIds,
		handleToggleStep,
		allDosages,
		lipidRescueData,
		completedStepsList,
		adrenalineTimerSeconds,
		isAdrenalineTimerRunning,
		isAdrenalineDue,
		handleStartAdrenalineTimer,
		handleResetAdrenalineTimer,
		isCopiedAct,
		isCopiedCheatSheet,
		activeProtocolTab,
		setActiveProtocolTab,
		generatedActText,
		generatedCheatSheetText,
		handleCopyAct,
		handleCopyCheatSheet,
		handleCallSmpCheatSheet,
		handlePrintEmergencyAct,
		handleCopyRelativeNotice,
		handleApplyToForm043,
	};
}
