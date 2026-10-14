/**
 * useLabOrderCreateForm.ts — Хук управления состоянием и сабмитом наряда ЗТЛ.
 *
 * Инкапсулирует:
 * - Управление полями и быстрыми пресетами.
 * - Детектор коллизий примерки.
 * - Автобронь слота в расписании врача.
 * - Реактивные события CRM и сохранение через API.
 */

import { useState, useEffect } from "react";
import {
	type OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
	type LabWorkflowStatus,
	createDentalLabOrder,
} from "../dentalLabWorkflowEngine";
import {
	calculateLabReadinessDate,
	checkFittingAppointmentCollision,
	formatRuDate,
} from "../dentalLabOrderEngine";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";
import type { DentalLabCreateOrderModalProps } from "./labOrderCreateTypes";

export function useLabOrderCreateForm(props: DentalLabCreateOrderModalProps) {
	const {
		isOpen,
		onClose,
		onCreateOrder,
		sampleLabs,
		currentDoctorName,
		currentPatientName,
		currentPatientId,
		currentToothNumber,
		stageNumber,
		stageTitle,
		initialTeeth,
	} = props;

	const [newPatientName, setNewPatientName] = useState<string>("");
	const [newChartNumber, setNewChartNumber] = useState<string>("");
	const [newDoctorName, setNewDoctorName] = useState<string>("");
	const [newLabName, setNewLabName] = useState<string>(sampleLabs?.[0] || "Центральная ЗТЛ");
	const [newWorkType, setNewWorkType] = useState<OrthopedicWorkTypeId>("crown_zirconia");
	const [newTeethInput, setNewTeethInput] = useState<string>("");
	const [isBridge, setIsBridge] = useState<boolean>(false);
	const [newShade, setNewShade] = useState<string>("A2");
	const [newStumpShade, setNewStumpShade] = useState<string>("ND2");
	const [newPriceRub, setNewPriceRub] = useState<number>(22000);
	const [newCostRub, setNewCostRub] = useState<number>(7000);
	const [newDoctorPercent] = useState<number>(20);
	const [newInitialStatus, setNewInitialStatus] = useState<LabWorkflowStatus>("draft");
	const [newExpectedLabDate, setNewExpectedLabDate] = useState<string>(() => {
		const preset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
		return calculateLabReadinessDate(new Date(), preset?.standardTurnaroundWorkingDays || 5);
	});
	const [newFittingDate, setNewFittingDate] = useState<string>(() => {
		const preset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
		const labDate = calculateLabReadinessDate(new Date(), preset?.standardTurnaroundWorkingDays || 5);
		return calculateLabReadinessDate(labDate, 1);
	});
	const [autoBookFitting, setAutoBookFitting] = useState<boolean>(true);
	const [newAppointmentId] = useState<string>("");
	const [newClinicalNotes, setNewClinicalNotes] = useState<string>("");
	const [newImplantPlatform, setNewImplantPlatform] = useState<ImplantPlatformType | "">("");
	const [newAbutmentType, setNewAbutmentType] = useState<AbutmentCategoryType | "">("");
	const [newFixationType, setNewFixationType] = useState<FixationType | "">("");
	const [newTechStage, setNewTechStage] = useState<LabTechnologicalStageId>("impression_scan");

	useEffect(() => {
		if (isOpen) {
			if (currentPatientName) setNewPatientName(currentPatientName);
			if (currentDoctorName) setNewDoctorName(currentDoctorName);
			if (initialTeeth && initialTeeth.length > 0) {
				setNewTeethInput(initialTeeth.join(", "));
				if (initialTeeth.length > 1) setIsBridge(true);
			} else if (currentToothNumber) {
				setNewTeethInput(String(currentToothNumber));
			}
			if (stageTitle) {
				const stageNote = `[План лечения: Этап ${stageNumber ?? 1} · ${stageTitle}]`;
				setNewClinicalNotes((prev) =>
					prev.includes(stageNote) ? prev : prev ? `${stageNote}\n${prev}` : stageNote,
				);
			}
		}
	}, [isOpen, currentPatientName, currentDoctorName, currentToothNumber, initialTeeth, stageNumber, stageTitle]);

	const handleWorkTypeChange = (val: OrthopedicWorkTypeId) => {
		setNewWorkType(val);
		const preset = ORTHOPEDIC_WORK_TYPES[val];
		if (preset) {
			setNewPriceRub(preset.defaultPriceKopecks / 100);
			setNewCostRub(preset.defaultCostKopecks / 100);
			const labDate = calculateLabReadinessDate(new Date(), preset.standardTurnaroundWorkingDays);
			setNewExpectedLabDate(labDate);
			setNewFittingDate(calculateLabReadinessDate(labDate, 1));
		}
	};

	const handleApplyQuickPreset = (workType: OrthopedicWorkTypeId, shade: string, stumpShade = "ND2") => {
		const preset = ORTHOPEDIC_WORK_TYPES[workType];
		if (!preset) return;
		setNewWorkType(workType);
		setNewShade(shade);
		setNewStumpShade(stumpShade);
		setNewPriceRub(preset.defaultPriceKopecks / 100);
		setNewCostRub(preset.defaultCostKopecks / 100);
		const labDate = calculateLabReadinessDate(new Date(), preset.standardTurnaroundWorkingDays);
		setNewExpectedLabDate(labDate);
		setNewFittingDate(calculateLabReadinessDate(labDate, 1));
	};

	const collision = checkFittingAppointmentCollision(newExpectedLabDate, newFittingDate);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const effectivePatientName = newPatientName.trim() || currentPatientName?.trim() || "Пациент";
		const teeth = newTeethInput
			.split(",")
			.map((s) => Number.parseInt(s.trim(), 10))
			.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
		const defaultTeeth = currentToothNumber && !Number.isNaN(Number(currentToothNumber))
			? [Number(currentToothNumber)]
			: [11];
		const selectedTeeth = teeth.length > 0 ? teeth : defaultTeeth;

		const created = createDentalLabOrder({
			patientId: currentPatientId || `pat-${Date.now()}`,
			patientName: effectivePatientName,
			patientChartNumber: newChartNumber.trim() || undefined,
			doctorId: "doc-current",
			doctorName: newDoctorName.trim() || currentDoctorName?.trim() || "Врач-ортопед",
			clinicName: "Стоматологическая клиника DENTE",
			labName: newLabName,
			workTypeId: newWorkType,
			selectedTeeth,
			shadeCode: newShade,
			stumpShadeCode: newStumpShade,
			pricePerUnitRub: newPriceRub,
			costPerUnitRub: newCostRub,
			pricePerUnitKopecks: Math.max(0, Math.round(newPriceRub * 100)),
			costPerUnitKopecks: Math.max(0, Math.round(newCostRub * 100)),
			doctorPercent: newDoctorPercent,
			initialStatus: newInitialStatus,
			expectedLabDate: newExpectedLabDate,
			fittingDate: newFittingDate,
			appointmentId: newAppointmentId.trim() || undefined,
			clinicalNotes: newClinicalNotes.trim() || undefined,
			implantPlatform: newImplantPlatform || undefined,
			abutmentType: newAbutmentType || undefined,
			fixationType: newFixationType || undefined,
			techStage: newTechStage,
		});

		if (autoBookFitting && typeof window !== "undefined") {
			const teethLabel = created.selectedTeeth.join(", ");
			const workTypeTitle = ORTHOPEDIC_WORK_TYPES[newWorkType]?.shortNameRu || "Конструкция ЗТЛ";
			const appointmentDraft = {
				patientId: created.patientId,
				patientName: created.patientName,
				patientPhone: "",
				doctorId: created.doctorId,
				doctorName: created.doctorName,
				serviceTitle: `Примерка и фиксация: ${workTypeTitle} (зуб ${teethLabel})`,
				serviceCode: "A16.07.004",
				durationMinutes: 45,
				scheduledDate: newFittingDate,
				targetDate: newFittingDate,
				stageKind: "stage_3_orthopedics",
				orderNumber: created.orderNumber,
				notes: `Автобронь примерки из ЗТЛ № ${created.orderNumber} (${created.materialName}, зуб ${teethLabel}, цвет ${created.shadeCode}). План ЗТЛ: ${formatRuDate(newExpectedLabDate)}.`,
			};
			try {
				window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(appointmentDraft));
				window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: appointmentDraft }));
				window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: appointmentDraft }));
			} catch { /* quota fallback */ }
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: created }));
			for (const toothNum of created.selectedTeeth) {
				window.dispatchEvent(new CustomEvent("dente-quick-tooth-apply", {
					detail: { toothNumber: toothNum, state: "Planned_Crown", patientId: currentPatientId || created.patientId },
				}));
			}
			try {
				fetch("/api/clinical/lab-orders", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						patientId: currentPatientId && /^[0-9a-fA-F-]{36}$/.test(currentPatientId) ? currentPatientId : undefined,
						toothFdi: created.selectedTeeth.join(", "),
						material: created.materialName || created.workTypeId || "zirconia",
						colorVita: newShade,
						dueDate: newExpectedLabDate ? new Date(newExpectedLabDate).toISOString() : null,
						status: newInitialStatus || "sent_to_lab",
						stage: newInitialStatus || "sent_to_lab",
						techStage: newTechStage,
						priceRub: newPriceRub,
						clinicalNotes: newClinicalNotes.trim() || undefined,
						orderNumber: created.orderNumber,
					}),
				}).catch(() => {});
			} catch { /* offline resilient */ }
		}

		onCreateOrder(created);
		onClose();
	};

	return {
		newPatientName,
		setNewPatientName,
		newChartNumber,
		setNewChartNumber,
		newDoctorName,
		setNewDoctorName,
		newLabName,
		setNewLabName,
		newWorkType,
		handleWorkTypeChange,
		newTeethInput,
		setNewTeethInput,
		isBridge,
		setIsBridge,
		newShade,
		setNewShade,
		newStumpShade,
		setNewStumpShade,
		newPriceRub,
		setNewPriceRub,
		newCostRub,
		setNewCostRub,
		newInitialStatus,
		setNewInitialStatus,
		newExpectedLabDate,
		setNewExpectedLabDate,
		newFittingDate,
		setNewFittingDate,
		autoBookFitting,
		setAutoBookFitting,
		newClinicalNotes,
		setNewClinicalNotes,
		newImplantPlatform,
		setNewImplantPlatform,
		newAbutmentType,
		setNewAbutmentType,
		newFixationType,
		setNewFixationType,
		newTechStage,
		setNewTechStage,
		collision,
		handleApplyQuickPreset,
		handleSubmit,
	};
}
