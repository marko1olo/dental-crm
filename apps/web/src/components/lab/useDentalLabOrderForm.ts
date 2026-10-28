import { useEffect, useState } from "react";
import type { DentalLabOrderModalProps } from "./labMath";
import { useOrderFormTeethAndConstruction } from "./orderFormModules/useOrderFormTeethAndConstruction";
import { useOrderFormShades } from "./orderFormModules/useOrderFormShades";
import { useOrderFormDatesAndOcclusion } from "./orderFormModules/useOrderFormDatesAndOcclusion";
import { useOrderFormFinancialsAndGate } from "./orderFormModules/useOrderFormFinancialsAndGate";
import { useOrderFormPresets } from "./orderFormModules/useOrderFormPresets";
import { useOrderFormSubmit } from "./orderFormModules/useOrderFormSubmit";

export type LabModalTabKey = "main" | "shades" | "stages" | "print";

export function useDentalLabOrderForm(props: DentalLabOrderModalProps) {
	const {
		isOpen, onClose, initialOrder, patientId, patientName, doctorId, doctorName,
		initialToothFdi, initialTeeth, patientChartNumber, patientDepositRub, stageTotalRub,
		stagePaidRub, chiefDoctorName, skipFinancialGate, treatmentPlanAgeDays, isPlanExpired,
		treatmentPlanId: propPlanId, stageId: propStageId, stageNumber: propStageNum,
		stageTitle: propStageTitle, includeImpressionBilling: propImpression, onOrderSaved,
		onSaveOrder, clinicPhone = "", clinicName = "Денте", initialTab = "main", scheduledVisitDate: propVisitDate,
	} = props;

	const [activeTab, setActiveTab] = useState<LabModalTabKey>(initialTab as LabModalTabKey);
	useEffect(() => { if (isOpen && initialTab) setActiveTab(initialTab as LabModalTabKey); }, [isOpen, initialTab]);

	const [treatmentPlanId, setTreatmentPlanId] = useState<string | null>(propPlanId || initialOrder?.treatmentPlanId || null);
	const [stageId, setStageId] = useState<string | null>(propStageId || initialOrder?.stageId || null);
	const [stageNumber, setStageNumber] = useState<number | null>(propStageNum ?? initialOrder?.stageNumber ?? null);
	const [stageTitle, setStageTitle] = useState<string | null>(propStageTitle || initialOrder?.stageTitle || null);
	const [includeImpressionBilling, setIncludeImpressionBilling] = useState<boolean>(propImpression ?? initialOrder?.includeImpressionBilling ?? true);

	const [formPatientId, setFormPatientId] = useState(patientId || initialOrder?.patientId || "");
	const [formPatientName, setFormPatientName] = useState(patientName || initialOrder?.patientName || "Пациент");
	const [formDoctorId, setFormDoctorId] = useState(doctorId || initialOrder?.doctorId || "");
	const [formDoctorName, setFormDoctorName] = useState(doctorName || initialOrder?.doctorName || "Лечащий врач");

	const teethState = useOrderFormTeethAndConstruction({
		initialJawScope: initialOrder?.jawScope || null,
		initialTeeth,
		initialToothFdi,
		initialOrder,
	});
	const shadesState = useOrderFormShades(initialOrder?.attachedImageUrl || null);
	const datesState = useOrderFormDatesAndOcclusion();

	useEffect(() => {
		const handleOpenModal = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			if (detail.toothFdi || detail.toothNumber) {
				const num = Number.parseInt(String(detail.toothFdi || detail.toothNumber), 10);
				if (!Number.isNaN(num) && num >= 11 && num <= 85) {
					teethState.setSelectedTeeth([num]);
				}
			}
			if (detail.material) {
				const matLower = String(detail.material).toLowerCase();
				if (matLower.includes("zirconia") || matLower.includes("цирконий") || matLower.includes("katana")) {
					teethState.setMaterial("zirconia_multilayer");
					teethState.setConstructionType("single_crown");
				} else if (matLower.includes("emax") || matLower.includes("e.max")) {
					teethState.setMaterial("emax_lithium_disilicate");
				}
			}
			if (detail.colorVita) {
				shadesState.setShadeSystem("classical");
				shadesState.setShadeClassical(detail.colorVita);
				shadesState.setShadeBody(detail.colorVita);
			}
			if (detail.patientName) setFormPatientName(detail.patientName);
			if (detail.doctorName) setFormDoctorName(detail.doctorName);
		};

		window.addEventListener("dente-open-lab-order-modal", handleOpenModal);
		return () => window.removeEventListener("dente-open-lab-order-modal", handleOpenModal);
	}, [teethState.setSelectedTeeth, teethState.setMaterial, teethState.setConstructionType, shadesState.setShadeSystem, shadesState.setShadeClassical, shadesState.setShadeBody]);

	const financials = useOrderFormFinancialsAndGate({
		initialPriceRub: initialOrder?.priceRub, initialClinicShare: initialOrder?.clinicSharePct,
		initialDoctorShare: initialOrder?.doctorSharePct, stageTotalRub, stagePaidRub, patientDepositRub,
		treatmentPlanAgeDays, isPlanExpired, dueDate: datesState.dueDate, scheduledVisitDate: datesState.scheduledVisitDate,
		propScheduledVisitDate: propVisitDate, secureToken: datesState.secureToken,
	});

	const presets = useOrderFormPresets({
		setConstructionType: teethState.setConstructionType, setMaterial: teethState.setMaterial,
		setShadeSystem: shadesState.setShadeSystem, setShadeClassical: shadesState.setShadeClassical,
		setShadeBody: shadesState.setShadeBody, setSurfaceTexture: datesState.setSurfaceTexture,
		setCementGapMicrons: datesState.setCementGapMicrons, setTranslucency: shadesState.setTranslucency,
		setDueDate: datesState.setDueDate, setCeramicTrialDate: datesState.setCeramicTrialDate,
		setScheduledVisitDate: datesState.setScheduledVisitDate, setSelectedTeeth: teethState.setSelectedTeeth,
		setJawScope: teethState.setJawScope, setOcclusalScheme: datesState.setOcclusalScheme,
		setContactTightness: datesState.setContactTightness, setImpressionType: teethState.setImpressionType,
		setPriceRubInput: financials.setPriceRubInput, selectedTeeth: teethState.selectedTeeth,
		jawScope: teethState.jawScope, scheduledVisitDate: datesState.scheduledVisitDate,
	});

	const submit = useOrderFormSubmit({
		initialOrder, formPatientId, patientId, formPatientName, formDoctorId, formDoctorName, chiefDoctorName,
		patientChartNumber, skipFinancialGate, totalLabPriceRub: financials.totalLabPriceRub, priceRubInput: financials.priceRubInput,
		financialGateResult: financials.financialGateResult, gateOverride: financials.gateOverride, setGateOverride: financials.setGateOverride,
		selectedTeeth: teethState.selectedTeeth, jawScope: teethState.jawScope, constructionType: teethState.constructionType,
		material: teethState.material, impressionType: teethState.impressionType, shadeSystem: shadesState.shadeSystem,
		shadeClassical: shadesState.shadeClassical, shade3dMaster: shadesState.shade3dMaster, shadeBleach: shadesState.shadeBleach,
		shadeCervical: shadesState.shadeCervical, shadeBody: shadesState.shadeBody, shadeIncisal: shadesState.shadeIncisal,
		shadeStump: shadesState.shadeStump, translucency: shadesState.translucency, mamelons: shadesState.mamelons,
		calcifications: shadesState.calcifications, opalescence: shadesState.opalescence, occlusalScheme: datesState.occlusalScheme,
		contactTightness: datesState.contactTightness, surfaceTexture: datesState.surfaceTexture, cementGapMicrons: datesState.cementGapMicrons,
		currentStage: datesState.currentStage, dueDate: datesState.dueDate, scheduledVisitDate: datesState.scheduledVisitDate,
		frameworkTrialDate: datesState.frameworkTrialDate, ceramicTrialDate: datesState.ceramicTrialDate, clinicalNotes: datesState.clinicalNotes,
		attachedImageUrl: shadesState.attachedImageUrl, treatmentPlanId, stageId, stageNumber, stageTitle, includeImpressionBilling,
		clinicSharePct: financials.clinicSharePct, doctorSharePct: financials.doctorSharePct, doctorAmountRub: financials.doctorAmountRub,
		fittingCollision: financials.fittingCollision, gostOrderNumber: financials.gostOrderNumber, clinicName, clinicPhone,
		onOrderSaved, onSaveOrder, onClose,
	});

	return {
		activeTab, setActiveTab,
		formPatientId, setFormPatientId, formPatientName, setFormPatientName, formDoctorId, setFormDoctorId, formDoctorName, setFormDoctorName,
		...teethState, ...shadesState, ...datesState, ...financials, ...presets, ...submit,
		treatmentPlanId, setTreatmentPlanId, stageId, setStageId, stageNumber, setStageNumber, stageTitle, setStageTitle,
		includeImpressionBilling, setIncludeImpressionBilling,
	};
}
