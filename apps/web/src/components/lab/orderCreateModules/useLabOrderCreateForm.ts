import { useState, useEffect } from "react";
import { type OrthopedicWorkTypeId, ORTHOPEDIC_WORK_TYPES, type LabWorkflowStatus } from "../dentalLabWorkflowEngine";
import { calculateLabReadinessDate, checkFittingAppointmentCollision } from "../dentalLabOrderEngine";
import type { ImplantPlatformType, AbutmentCategoryType, FixationType, LabTechnologicalStageId } from "../orders/labWorkOrderPresets";
import type { DentalLabCreateOrderModalProps } from "./labOrderCreateTypes";
import { useChairsideSync } from "./useChairsideSync";
import { executeLabOrderCreateSubmit } from "./labOrderCreateSubmit";

export function useLabOrderCreateForm(props: DentalLabCreateOrderModalProps) {
	const { isOpen, sampleLabs, currentDoctorName, currentPatientName, currentToothNumber, stageNumber, stageTitle, initialTeeth } = props;

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
				setNewClinicalNotes((prev) => prev.includes(stageNote) ? prev : prev ? `${stageNote}\n${prev}` : stageNote);
			}
		}
	}, [isOpen, currentPatientName, currentDoctorName, currentToothNumber, initialTeeth, stageNumber, stageTitle]);

	useChairsideSync({
		isOpen, setNewTeethInput, setIsBridge, setNewWorkType, setNewShade, setNewStumpShade,
		setNewPriceRub, setNewCostRub, setNewExpectedLabDate, setNewFittingDate, setNewClinicalNotes,
	});

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
		executeLabOrderCreateSubmit({
			props, newPatientName, newChartNumber, newDoctorName, newLabName, newWorkType,
			newTeethInput, newShade, newStumpShade, newPriceRub, newCostRub, newDoctorPercent,
			newInitialStatus, newExpectedLabDate, newFittingDate, autoBookFitting,
			newAppointmentId, newClinicalNotes, newImplantPlatform, newAbutmentType,
			newFixationType, newTechStage,
		});
	};

	return {
		newPatientName, setNewPatientName, newChartNumber, setNewChartNumber, newDoctorName, setNewDoctorName,
		newLabName, setNewLabName, newWorkType, handleWorkTypeChange, newTeethInput, setNewTeethInput,
		isBridge, setIsBridge, newShade, setNewShade, newStumpShade, setNewStumpShade, newPriceRub, setNewPriceRub,
		newCostRub, setNewCostRub, newInitialStatus, setNewInitialStatus, newExpectedLabDate, setNewExpectedLabDate,
		newFittingDate, setNewFittingDate, autoBookFitting, setAutoBookFitting, newClinicalNotes, setNewClinicalNotes,
		newImplantPlatform, setNewImplantPlatform, newAbutmentType, setNewAbutmentType, newFixationType, setNewFixationType,
		newTechStage, setNewTechStage, collision, handleApplyQuickPreset, handleSubmit,
	};
}
