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

	// Reactive sync with chairside orthopedics and photography VITA colorimetry (Mandates 8e, 8k, 8n)
	useEffect(() => {
		const applyChairsideDraft = (draft: {
			toothFdi?: string;
			material?: string;
			colorVita?: string;
			stumpShade?: string;
			preparationMargin?: string;
			preparationMarginLabel?: string;
			priceRub?: number;
			costRub?: number;
			dueDate?: string;
		}) => {
			if (!draft) return;
			if (draft.toothFdi) {
				setNewTeethInput(String(draft.toothFdi));
				if (String(draft.toothFdi).includes(",") || String(draft.toothFdi).includes(" ")) {
					setIsBridge(true);
				}
			}
			if (draft.material) {
				const matLower = String(draft.material).toLowerCase();
				if (matLower.includes("e.max") || matLower.includes("emax") || matLower.includes("винир") || matLower.includes("veneer")) {
					setNewWorkType("crown_emax");
				} else if (matLower.includes("zro2") || matLower.includes("zirconia") || matLower.includes("цирконий")) {
					setNewWorkType("crown_zirconia");
				} else if (matLower.includes("pmma") || matLower.includes("временн") || matLower.includes("temporary")) {
					setNewWorkType("temporary_pmma");
				} else if (matLower.includes("бюгель") || matLower.includes("clasp")) {
					setNewWorkType("clasp_prosthesis");
				} else if (matLower.includes("металлокерам") || matLower.includes("noritake")) {
					setNewWorkType("metal_ceramic");
				}
			}
			if (draft.colorVita) setNewShade(draft.colorVita);
			if (draft.stumpShade) setNewStumpShade(draft.stumpShade);
			if (typeof draft.priceRub === "number") setNewPriceRub(draft.priceRub);
			if (typeof draft.costRub === "number") setNewCostRub(draft.costRub);
			if (draft.dueDate) {
				setNewExpectedLabDate(draft.dueDate);
				setNewFittingDate(draft.dueDate);
			}
			const margin = draft.preparationMarginLabel || draft.preparationMargin;
			if (margin) {
				const marginNote = `[Уступ ЗТЛ: ${margin}]`;
				setNewClinicalNotes((prev) =>
					prev && prev.includes(marginNote) ? prev : prev ? `${marginNote}\n${prev}` : marginNote,
				);
			}
		};

		const handleApplyShade = (e: Event) => {
			const customEvent = e as CustomEvent<{
				shadeCode?: string;
				stumpShadeCode?: string;
				notes?: string;
			}>;
			const detail = customEvent?.detail;
			if (!detail) return;
			if (detail.shadeCode) setNewShade(detail.shadeCode);
			if (detail.stumpShadeCode) setNewStumpShade(detail.stumpShadeCode);
			if (detail.notes) {
				setNewClinicalNotes((prev) =>
					prev && prev.includes(detail.notes!) ? prev : prev ? `${prev}\n${detail.notes}` : detail.notes!,
				);
			}
		};

		const handleOpenModal = (e: Event) => {
			const customEvent = e as CustomEvent<any>;
			if (customEvent?.detail) {
				applyChairsideDraft(customEvent.detail);
			}
		};

		window.addEventListener("dente-apply-lab-shade", handleApplyShade);
		window.addEventListener("dente-open-lab-order-modal", handleOpenModal);

		if (isOpen) {
			try {
				const chairDraftRaw =
					(typeof sessionStorage !== "undefined" && sessionStorage.getItem("dente_chairside_ortho_order_draft")) ||
					(typeof localStorage !== "undefined" && localStorage.getItem("dente_chairside_ortho_order_draft"));
				if (chairDraftRaw) {
					applyChairsideDraft(JSON.parse(chairDraftRaw));
				}
			} catch {
				// non-blocking
			}

			try {
				const saved = localStorage.getItem("dente_active_lab_shade_preset");
				if (saved) {
					const data = JSON.parse(saved);
					if (data.shadeCode) setNewShade(data.shadeCode);
					if (data.stumpShadeCode) setNewStumpShade(data.stumpShadeCode);
					if (data.notes) {
						setNewClinicalNotes((prev) =>
							prev && prev.includes(data.notes) ? prev : prev ? `${prev}\n${data.notes}` : data.notes,
						);
					}
				}
			} catch {
				// non-blocking
			}
		}

		return () => {
			window.removeEventListener("dente-apply-lab-shade", handleApplyShade);
			window.removeEventListener("dente-open-lab-order-modal", handleOpenModal);
		};
	}, [isOpen]);

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
