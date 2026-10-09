import { useState, useMemo } from "react";
import {
	DENTAL_CLINICAL_PRESETS,
	DEFAULT_COMMISSION_PRESETS
} from "../sickLeaveElnPresets";
import {
	SickLeaveFormState,
	SickLeavePatientData,
	IncapacityPeriod,
	MedicalCommissionProtocol,
	calculateSickLeaveDates,
	addDays,
	formatDateRu,
	generateElnNumber,
	validateSickLeaveDuration,
	generateElnXmlPayload,
	generateElnJsonPayload,
	generateForm036uEntry,
	generateSickLeavePatientMemoHtml,
	generateEmrDiarySnippet,
	DEFAULT_CLINIC_NAME,
	DEFAULT_CLINIC_OGRN,
	DEFAULT_CLINIC_ADDRESS,
	DEFAULT_CLINIC_LICENCE,
	SINGLE_DOCTOR_MAX_DAYS
} from "../sickLeaveElnEngine";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { SickLeaveElnModalProps, TabType, DigitalSignatureStatus } from "./types";

export function useSickLeaveElnLogic(props: SickLeaveElnModalProps) {
	const {
		onClose,
		onApplyToDiary,
		initialPatientName = '',
		initialPatientBirthDate = '',
		initialPatientSnils = '',
		initialPatientGender = 'male',
		initialEmployerName = '',
		initialDiagnosisText = 'Острый гнойный периостит нижней челюсти от зуба 4.6',
		initialIcd10Code = 'K10.2',
		initialDoctorFio = '',
		initialDoctorSnils = '',
		initialDoctorSpecialty = 'Врач-стоматолог-хирург'
	} = props;

	const todayStr: string = useMemo(() => new Date().toISOString().split('T')[0] ?? '2026-08-22', []);
	const [activeTab, setActiveTab] = useState<TabType>('eln_form');
	const [selectedPresetId, setSelectedPresetId] = useState<string>('acute_purulent_periostitis');
	const [isSfrSent, setIsSfrSent] = useState<boolean>(false);
	const [isCopiedDiary, setIsCopiedDiary] = useState<boolean>(false);
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);

	// Patient Data State
	const [patientData, setPatientData] = useState<SickLeavePatientData>({
		patientFio: initialPatientName,
		patientBirthDate: initialPatientBirthDate,
		patientGender: initialPatientGender,
		patientSnils: initialPatientSnils,
		patientOmsNumber: '',
		patientPassport: '',
		employerName: initialEmployerName,
		isPrimaryWorkplace: true,
		patientPhone: ''
	});

	// Digital Signature State
	const [signatureStatus, setSignatureStatus] = useState<DigitalSignatureStatus>({
		signedByDoctor: false,
		signedByOrg: false,
		isValid: true,
		cryptoProAvailable: true
	});

	// Form State
	const [formState, setFormState] = useState<SickLeaveFormState>(() => {
		const initDates = calculateSickLeaveDates(todayStr, 5);
		const initialPeriod: IncapacityPeriod = {
			id: 'p-1',
			dateFrom: initDates.dateFrom,
			dateTo: initDates.dateTo,
			doctorSpecialty: initialDoctorSpecialty,
			doctorFio: initialDoctorFio,
			doctorSnils: initialDoctorSnils,
			doctorRole: 'attending'
		};

		return {
			elnNumber: generateElnNumber(),
			issueDate: todayStr,
			isDuplicate: false,
			reasonCode: '01',
			regimeType: 'ambulatory',
			icd10Code: initialIcd10Code,
			diagnosisText: initialDiagnosisText,
			periods: [initialPeriod],
			closingCode: '31',
			workResumeDate: initDates.workResumeDate,
			isVkRequired: false,
			organizationName: isDemoShowcaseMode() ? DEFAULT_CLINIC_NAME : "",
			organizationOgrn: isDemoShowcaseMode() ? DEFAULT_CLINIC_OGRN : "",
			organizationAddress: isDemoShowcaseMode() ? DEFAULT_CLINIC_ADDRESS : "",
			medicalLicenceNumber: isDemoShowcaseMode() ? DEFAULT_CLINIC_LICENCE : ""
		};
	});

	// Synchronize when preset is selected
	const handleApplyPreset = (presetKey: string) => {
		const preset = DENTAL_CLINICAL_PRESETS[presetKey];
		if (!preset) return;
		setSelectedPresetId(presetKey);

		const isVk = preset.isVkMandatory || preset.defaultDays > SINGLE_DOCTOR_MAX_DAYS;
		const startDate = formState.issueDate || todayStr;
		const initDates = calculateSickLeaveDates(startDate, preset.defaultDays);

		let newPeriods: IncapacityPeriod[] = [];

		if (isVk) {
			const p1Dates = calculateSickLeaveDates(startDate, 15);
			const p1: IncapacityPeriod = {
				id: 'p-1',
				dateFrom: p1Dates.dateFrom,
				dateTo: p1Dates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'attending'
			};

			const remainingDays = preset.defaultDays - 15;
			const p2Start = addDays(p1Dates.dateTo, 1);
			const p2Dates = calculateSickLeaveDates(p2Start, remainingDays);
			const chair = DEFAULT_COMMISSION_PRESETS[0];
			const p2: IncapacityPeriod = {
				id: 'p-2',
				dateFrom: p2Dates.dateFrom,
				dateTo: p2Dates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'vk_member',
				vkChairpersonFio: chair ? chair.fio : 'Председатель ВК',
				vkChairpersonSnils: chair ? chair.snils : '',
				vkProtocolNumber: 'ВК-84/2026',
				vkProtocolDate: p1Dates.dateTo
			};
			newPeriods = [p1, p2];
		} else {
			const p1: IncapacityPeriod = {
				id: 'p-1',
				dateFrom: initDates.dateFrom,
				dateTo: initDates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'attending'
			};
			newPeriods = [p1];
		}

		const chairPreset = DEFAULT_COMMISSION_PRESETS[0];
		const deputyPreset = DEFAULT_COMMISSION_PRESETS[1];
		const memberPreset = DEFAULT_COMMISSION_PRESETS[2];

		const firstP = newPeriods[0];
		const secondP = newPeriods[1];

		const newVkProtocol: MedicalCommissionProtocol | undefined = isVk
			? {
					protocolNumber: 'ВК-84/2026',
					protocolDate: firstP ? firstP.dateTo : formState.issueDate,
					chairpersonFio: chairPreset ? chairPreset.fio : 'Председатель ВК',
					chairpersonSpecialty: chairPreset ? chairPreset.specialty : 'Главный врач',
					chairpersonSnils: chairPreset ? chairPreset.snils : '',
					deputyChairpersonFio: deputyPreset ? deputyPreset.fio : 'Зам. председателя ВК',
					memberFios: [memberPreset ? memberPreset.fio : 'Член ВК', initialDoctorFio].filter(Boolean),
					attendingDoctorFio: initialDoctorFio,
					clinicalDiagnosis: preset.clinicalDescriptionRu,
					icd10Code: preset.icd10Code,
					clinicalSubstantiation: preset.expertJustificationRu,
					expertDecision: `Продлить листок нетрудоспособности № ${formState.elnNumber} с ${formatDateRu(secondP ? secondP.dateFrom : '')} по ${formatDateRu(secondP ? secondP.dateTo : '')}. Режим амбулаторный. Назначен повторный осмотр ВК.`,
					extensionDays: preset.defaultDays - 15,
					extensionDateFrom: secondP ? secondP.dateFrom : '',
					extensionDateTo: secondP ? secondP.dateTo : '',
					nextReviewDate: secondP ? secondP.dateTo : ''
				}
			: undefined;

		setFormState((prev) => ({
			...prev,
			reasonCode: preset.reasonCode,
			icd10Code: preset.icd10Code,
			diagnosisText: preset.clinicalDescriptionRu,
			periods: newPeriods,
			isVkRequired: isVk,
			vkProtocol: newVkProtocol,
			workResumeDate: initDates.workResumeDate
		}));
	};

	// Validation
	const validation = useMemo(() => {
		return validateSickLeaveDuration(formState);
	}, [formState]);

	// Period Operations
	const handleAddPeriod = () => {
		const lastPeriod = formState.periods[formState.periods.length - 1];
		const nextStart = lastPeriod ? addDays(lastPeriod.dateTo, 1) : formState.issueDate;
		const nextDates = calculateSickLeaveDates(nextStart, 5);
		const chair = DEFAULT_COMMISSION_PRESETS[0];

		const newPeriod: IncapacityPeriod = {
			id: `p-${Date.now()}`,
			dateFrom: nextDates.dateFrom,
			dateTo: nextDates.dateTo,
			doctorSpecialty: initialDoctorSpecialty,
			doctorFio: initialDoctorFio,
			doctorSnils: initialDoctorSnils,
			doctorRole: formState.isVkRequired ? 'vk_member' : 'attending',
			vkChairpersonFio: formState.isVkRequired && chair ? chair.fio : undefined,
			vkChairpersonSnils: formState.isVkRequired && chair ? chair.snils : undefined,
			vkProtocolNumber: formState.isVkRequired ? formState.vkProtocol?.protocolNumber || 'ВК-84/2026' : undefined,
			vkProtocolDate: formState.isVkRequired ? nextStart : undefined
		};

		setFormState((prev) => {
			const updated = [...prev.periods, newPeriod];
			return {
				...prev,
				periods: updated,
				workResumeDate: nextDates.workResumeDate
			};
		});
	};

	const handleRemovePeriod = (index: number) => {
		if (formState.periods.length <= 1) return;
		setFormState((prev) => {
			const updated = prev.periods.filter((_, idx) => idx !== index);
			const last = updated[updated.length - 1];
			return {
				...prev,
				periods: updated,
				workResumeDate: last ? addDays(last.dateTo, 1) : prev.workResumeDate
			};
		});
	};

	const handlePeriodDateChange = (index: number, field: 'dateFrom' | 'dateTo', value: string) => {
		setFormState((prev) => {
			const existing = prev.periods[index];
			if (!existing) return prev;
			const updated = [...prev.periods];
			const current: IncapacityPeriod = { ...existing, [field]: value };
			updated[index] = current;
			const last = updated[updated.length - 1];
			return {
				...prev,
				periods: updated,
				workResumeDate: last && last.dateTo ? addDays(last.dateTo, 1) : prev.workResumeDate
			};
		});
	};

	// Toggle Medical Commission
	const handleToggleVk = (enable: boolean) => {
		if (enable) {
			const lastPeriod = formState.periods[formState.periods.length - 1];
			const chair = DEFAULT_COMMISSION_PRESETS[0];
			const deputy = DEFAULT_COMMISSION_PRESETS[1];
			const member = DEFAULT_COMMISSION_PRESETS[2];

			const vkProtocol: MedicalCommissionProtocol = {
				protocolNumber: formState.vkProtocol?.protocolNumber || 'ВК-84/2026',
				protocolDate: lastPeriod?.dateFrom || formState.issueDate,
				chairpersonFio: chair ? chair.fio : 'Председатель ВК',
				chairpersonSpecialty: chair ? chair.specialty : 'Главный врач',
				chairpersonSnils: chair ? chair.snils : '',
				deputyChairpersonFio: deputy ? deputy.fio : 'Зам. председателя ВК',
				memberFios: [member ? member.fio : 'Член ВК', initialDoctorFio].filter(Boolean),
				attendingDoctorFio: initialDoctorFio,
				clinicalDiagnosis: formState.diagnosisText,
				icd10Code: formState.icd10Code,
				clinicalSubstantiation:
					'Тяжелое клиническое течение одонтогенного процесса с интоксикацией и замедленной регенерацией костной ткани. Необходимость продления нетрудоспособности свыше 15 дней.',
				expertDecision: `Продлить временную нетрудоспособность по ЭЛН № ${formState.elnNumber}. Режим амбулаторный. Назначен контрольный осмотр.`,
				extensionDays: 7,
				extensionDateFrom: lastPeriod?.dateFrom || formState.issueDate,
				extensionDateTo: lastPeriod?.dateTo || formState.issueDate,
				nextReviewDate: lastPeriod?.dateTo || formState.issueDate
			};
			setFormState((prev) => ({
				...prev,
				isVkRequired: true,
				vkProtocol
			}));
		} else {
			setFormState((prev) => ({
				...prev,
				isVkRequired: false,
				vkProtocol: undefined
			}));
		}
	};

	// Handlers
	const handleCopyDiarySnippet = () => {
		const isDraft = !validation.isValid;
		const snippet = generateEmrDiarySnippet(formState, patientData, isDraft);
		navigator.clipboard.writeText(snippet);
		setIsCopiedDiary(true);
		setTimeout(() => setIsCopiedDiary(false), 2000);
		if (isDraft) {
			showToast("Черновик записи ЭЛН скопирован в буфер (требуется завершить оформление)", "info");
		} else {
			showToast("Запись ЭЛН скопирована в буфер обмена", "success");
		}
	};

	const handleApplyDiary = () => {
		const isDraft = !validation.isValid;
		const snippet = generateEmrDiarySnippet(formState, patientData, isDraft);
		if (onApplyToDiary) {
			onApplyToDiary(snippet, formState);
		}
		if (isDraft) {
			showToast("В дневник приёма вставлен черновик ЭЛН (требуется завершить оформление)", "info");
		} else {
			showToast("Запись об ЭЛН успешно вставлена в дневник приёма", "success");
		}
		onClose();
	};

	const handleSendSfr = () => {
		if (!validation.isValid) {
			const errorList = validation.errors.length > 0
				? validation.errors.join("; ")
				: "Не заполнены обязательные реквизиты для передачи в СФР";
			showToast(`Невозможно отправить в СФР: ${errorList}`, "warning", 6000);
			return;
		}
		setIsSfrSent(true);
		showToast("ЭЛН успешно передан в информационную систему СФР", "success");
		setTimeout(() => setIsSfrSent(false), 4000);
	};

	const handlePrintMemo = () => {
		const html = generateSickLeavePatientMemoHtml(formState, patientData);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 300);
		}
	};

	const handleSignDoctor = () => {
		const now = new Date().toLocaleTimeString('ru-RU');
		setSignatureStatus((prev) => ({
			...prev,
			signedByDoctor: true,
			doctorCertThumbprint: "7F4A-98B2-C110-EE32-90A1",
			doctorSignedAt: now
		}));
		showToast("ЭЛН успешно подписан УКЭП лечащего врача (ГОСТ Р 34.10-2012)", "success");
	};

	const handleSignOrganization = () => {
		const now = new Date().toLocaleTimeString('ru-RU');
		setSignatureStatus((prev) => ({
			...prev,
			signedByOrg: true,
			orgCertThumbprint: "3E8D-55AC-09FA-41B8-6612",
			orgSignedAt: now
		}));
		showToast("ЭЛН успешно подписан УКЭП медицинской организации (Главврач)", "success");
	};

	const handleVerifySignatures = () => {
		showToast("Сертификаты УКЭП валидны, цепочка доверия КриптоПро подтверждена", "success");
	};

	const xmlPayload = useMemo(() => {
		return generateElnXmlPayload(formState, patientData);
	}, [formState, patientData]);

	const jsonPayload = useMemo(() => {
		return JSON.stringify(generateElnJsonPayload(formState, patientData), null, 2);
	}, [formState, patientData]);

	const form036u = useMemo(() => {
		return generateForm036uEntry(formState, patientData);
	}, [formState, patientData]);

	return {
		todayStr,
		activeTab,
		setActiveTab,
		selectedPresetId,
		isSfrSent,
		isCopiedDiary,
		isCopiedXml,
		setIsCopiedXml,
		patientData,
		setPatientData,
		formState,
		setFormState,
		signatureStatus,
		validation,
		xmlPayload,
		jsonPayload,
		form036u,
		handleApplyPreset,
		handleAddPeriod,
		handleRemovePeriod,
		handlePeriodDateChange,
		handleToggleVk,
		handleCopyDiarySnippet,
		handleApplyDiary,
		handleSendSfr,
		handlePrintMemo,
		handleSignDoctor,
		handleSignOrganization,
		handleVerifySignatures,
		initialDoctorFio,
		initialDoctorSnils
	};
}
