import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { rublesToKopecks, formatLabOrderFormZtl1A4Protocol } from "@dental/shared";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "./dentalLabFinancialGateEngine";
import {
	type DentalLabOrderData,
	type DentalLabOrderModalProps,
	type LabOrderStageKey,
	type ExpressLabPreset,
	type JawScope,
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	calculateLabFinancialSplit,
	formatGostOrderNumber,
	addWorkingDays,
	ONE_CLICK_LAB_DEFAULTS,
	formatJawScopeLabel,
} from "./labMath";
import { checkFittingAppointmentCollision } from "./dentalLabOrderEngine";
import {
	executeSaveLabOrder,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
} from "./dentalLabOrderSaveHelper";

export type LabModalTabKey = "main" | "shades" | "stages" | "print";

export function useDentalLabOrderForm({
	isOpen,
	onClose,
	initialOrder,
	patientId,
	patientName,
	doctorId,
	doctorName,
	initialToothFdi,
	initialTeeth,
	patientChartNumber,
	patientDepositRub,
	stageTotalRub,
	stagePaidRub,
	chiefDoctorName,
	skipFinancialGate,
	treatmentPlanAgeDays,
	isPlanExpired,
	treatmentPlanId: propTreatmentPlanId,
	stageId: propStageId,
	stageNumber: propStageNumber,
	stageTitle: propStageTitle,
	includeImpressionBilling: propIncludeImpressionBilling,
	onOrderSaved,
	onSaveOrder,
	clinicPhone = "",
	clinicName = "Денте",
	initialTab = "main",
	scheduledVisitDate: propScheduledVisitDate,
}: DentalLabOrderModalProps) {
	const [activeTab, setActiveTab] = useState<LabModalTabKey>(initialTab as LabModalTabKey);

	useEffect(() => {
		if (isOpen && initialTab) {
			setActiveTab(initialTab as LabModalTabKey);
		}
	}, [isOpen, initialTab]);

	// Doctor Clinical Override State (Mandates 8d, 8e)
	const [gateOverride, setGateOverride] = useState<{
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	} | null>(null);

	// Treatment Plan & Orthopedic Stage Context
	const [treatmentPlanId, setTreatmentPlanId] = useState<string | null>(
		propTreatmentPlanId || initialOrder?.treatmentPlanId || null,
	);
	const [stageId, setStageId] = useState<string | null>(
		propStageId || initialOrder?.stageId || null,
	);
	const [stageNumber, setStageNumber] = useState<number | null>(
		propStageNumber ?? initialOrder?.stageNumber ?? null,
	);
	const [stageTitle, setStageTitle] = useState<string | null>(
		propStageTitle || initialOrder?.stageTitle || null,
	);

	// Chairside Clinical Impression Billing (A02.07.010)
	const [includeImpressionBilling, setIncludeImpressionBilling] = useState<boolean>(
		propIncludeImpressionBilling ?? initialOrder?.includeImpressionBilling ?? true,
	);

	// Form State
	const [formPatientId, setFormPatientId] = useState(patientId || initialOrder?.patientId || "");
	const [formPatientName, setFormPatientName] = useState(patientName || initialOrder?.patientName || "Пациент");
	const [formDoctorId, setFormDoctorId] = useState(doctorId || initialOrder?.doctorId || "");
	const [formDoctorName, setFormDoctorName] = useState(doctorName || initialOrder?.doctorName || "Лечащий врач");

	// Tooth & Jaw Selection
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [jawScope, setJawScope] = useState<JawScope | null>(initialOrder?.jawScope || null);
	const [constructionType, setConstructionType] = useState<string>("single_crown");
	const [material, setMaterial] = useState<string>("zirconia_multilayer");
	const [impressionType, setImpressionType] = useState<string>("a_silicone");

	// VITA Shade Selection
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [shadeClassical, setShadeClassical] = useState<string>("A2");
	const [shade3dMaster, setShade3dMaster] = useState<string>("2M2");
	const [shadeBleach, setShadeBleach] = useState<string>("BL2");
	const [shadeCervical, setShadeCervical] = useState<string>("A3");
	const [shadeBody, setShadeBody] = useState<string>("A2");
	const [shadeIncisal, setShadeIncisal] = useState<string>("A1");
	const [shadeStump, setShadeStump] = useState<string>("");
	const [translucency, setTranslucency] = useState<string>("HT");
	const [mamelons, setMamelons] = useState<boolean>(false);
	const [calcifications, setCalcifications] = useState<boolean>(false);
	const [opalescence, setOpalescence] = useState<boolean>(false);
	const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(initialOrder?.attachedImageUrl || null);

	// Occlusal Specs
	const [occlusalScheme, setOcclusalScheme] = useState<string>("mutually_protected");
	const [contactTightness, setContactTightness] = useState<string>("normal");
	const [surfaceTexture, setSurfaceTexture] = useState<string>("natural_anatomy");
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(30);

	// Stages & Deadlines
	const [currentStage, setCurrentStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [dueDate, setDueDate] = useState<string>("");
	const [scheduledVisitDate, setScheduledVisitDate] = useState<string>("");
	const [frameworkTrialDate, setFrameworkTrialDate] = useState<string>("");
	const [ceramicTrialDate, setCeramicTrialDate] = useState<string>("");
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [secureToken, setSecureToken] = useState<string>("");

	// Financials (Копеечно точный расчет)
	const [priceRubInput, setPriceRubInput] = useState<string>("15000");
	const [clinicSharePct, setClinicSharePct] = useState<number>(50);
	const [doctorSharePct, setDoctorSharePct] = useState<number>(50);

	// Loading & Status
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ─── INITIALIZATION EFFECT ─────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) return;

		if (initialOrder) {
			setFormPatientId(initialOrder.patientId || patientId || "");
			setFormPatientName(initialOrder.patientName || patientName || "Пациент");
			setFormDoctorId(initialOrder.doctorId || doctorId || "");
			setFormDoctorName(initialOrder.doctorName || doctorName || "Лечащий врач");
			if (initialOrder.selectedTeeth && initialOrder.selectedTeeth.length > 0) {
				setSelectedTeeth(initialOrder.selectedTeeth);
			} else if (initialTeeth && initialTeeth.length > 0) {
				const parsed = initialTeeth
					.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10)))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else if (initialOrder.toothFdi) {
				const parsed = initialOrder.toothFdi
					.split(/[\s,;-]+/)
					.map((t) => Number.parseInt(t, 10))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else {
				setSelectedTeeth([]);
			}
			if (initialOrder.jawScope) {
				setJawScope(initialOrder.jawScope);
			} else if (initialOrder.toothFdi) {
				const tf = initialOrder.toothFdi.toLowerCase();
				if (tf.includes("обе челюсти") || tf.includes("both") || tf.includes("в/ч + н/ч")) {
					setJawScope("both");
				} else if (tf.includes("верхн") || tf.includes("в/ч") || tf.includes("upper")) {
					setJawScope("upper");
				} else if (tf.includes("нижн") || tf.includes("н/ч") || tf.includes("lower")) {
					setJawScope("lower");
				} else {
					setJawScope(null);
				}
			} else {
				setJawScope(null);
			}
			setConstructionType(initialOrder.constructionType || "single_crown");
			setMaterial(initialOrder.material || "zirconia_multilayer");
			setImpressionType(initialOrder.impressionType || "a_silicone");
			if (initialOrder.colorVita) {
				if (VITA_3D_MASTER_SHADES.includes(initialOrder.colorVita as any)) {
					setShadeSystem("3d_master");
					setShade3dMaster(initialOrder.colorVita);
				} else if (VITA_BLEACH_SHADES.includes(initialOrder.colorVita as any)) {
					setShadeSystem("bleach");
					setShadeBleach(initialOrder.colorVita);
				} else {
					setShadeSystem("classical");
					setShadeClassical(initialOrder.colorVita);
				}
				setShadeBody(initialOrder.colorVita);
			}
			setShadeCervical(initialOrder.shadeCervical || "A3");
			setShadeBody(initialOrder.shadeBody || initialOrder.colorVita || "A2");
			setShadeIncisal(initialOrder.shadeIncisal || "A1");
			setShadeStump(initialOrder.shadeStump || "");
			setTranslucency(initialOrder.translucency || "HT");
			setMamelons(Boolean(initialOrder.mamelons));
			setCalcifications(Boolean(initialOrder.calcifications));
			setOpalescence(Boolean(initialOrder.opalescence));
			setOcclusalScheme(initialOrder.occlusalScheme || "mutually_protected");
			setContactTightness(initialOrder.contactTightness || "normal");
			setSurfaceTexture(initialOrder.surfaceTexture || "natural_anatomy");
			setCementGapMicrons(initialOrder.cementGapMicrons ?? 30);
			setCurrentStage(initialOrder.currentStage || "sent_to_lab");
			setDueDate(initialOrder.dueDate ? initialOrder.dueDate.slice(0, 10) : "");
			setScheduledVisitDate(
				initialOrder.scheduledVisitDate
					? initialOrder.scheduledVisitDate.slice(0, 10)
					: propScheduledVisitDate
					? propScheduledVisitDate.slice(0, 10)
					: ""
			);
			setFrameworkTrialDate(initialOrder.frameworkTrialDate ? initialOrder.frameworkTrialDate.slice(0, 10) : "");
			setCeramicTrialDate(initialOrder.ceramicTrialDate ? initialOrder.ceramicTrialDate.slice(0, 10) : "");
			setClinicalNotes(initialOrder.clinicalNotes || "");
			setPriceRubInput(initialOrder.priceRub != null ? String(initialOrder.priceRub) : "15000");
			setClinicSharePct(initialOrder.clinicSharePct ?? 50);
			setDoctorSharePct(initialOrder.doctorSharePct ?? 50);
			setAttachedImageUrl(initialOrder.attachedImageUrl || null);
			setSecureToken(initialOrder.secureToken || crypto.randomUUID());
			setTreatmentPlanId(initialOrder.treatmentPlanId || propTreatmentPlanId || null);
			setStageId(initialOrder.stageId || propStageId || null);
			setStageNumber(initialOrder.stageNumber ?? propStageNumber ?? null);
			setStageTitle(initialOrder.stageTitle || propStageTitle || null);
			setIncludeImpressionBilling(initialOrder.includeImpressionBilling ?? propIncludeImpressionBilling ?? true);
		} else {
			setFormPatientId(patientId || "");
			setFormPatientName(patientName || "Пациент");
			setFormDoctorId(doctorId || "");
			setFormDoctorName(doctorName || "Лечащий врач");
			setTreatmentPlanId(propTreatmentPlanId || null);
			setStageId(propStageId || null);
			setStageNumber(propStageNumber ?? null);
			setStageTitle(propStageTitle || null);
			setIncludeImpressionBilling(propIncludeImpressionBilling ?? true);
			setMamelons(false);
			setCalcifications(false);
			setOpalescence(false);
			setAttachedImageUrl(null);
			setScheduledVisitDate(propScheduledVisitDate ? propScheduledVisitDate.slice(0, 10) : "");
			if (initialTeeth && initialTeeth.length > 0) {
				const parsed = initialTeeth
					.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10)))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else if (initialToothFdi) {
				const toothNum = typeof initialToothFdi === "number" ? initialToothFdi : Number.parseInt(String(initialToothFdi), 10);
				if (!Number.isNaN(toothNum)) {
					setSelectedTeeth([toothNum]);
				}
			} else {
				setSelectedTeeth([]);
			}
			setSecureToken(crypto.randomUUID());
			const d = new Date();
			d.setDate(d.getDate() + 7);
			setDueDate(d.toISOString().slice(0, 10));

			const dTrial = new Date();
			dTrial.setDate(dTrial.getDate() + 3);
			setFrameworkTrialDate(dTrial.toISOString().slice(0, 10));

			const dCeramic = new Date();
			dCeramic.setDate(dCeramic.getDate() + 5);
			setCeramicTrialDate(dCeramic.toISOString().slice(0, 10));
		}
	}, [
		isOpen,
		initialOrder,
		patientId,
		patientName,
		doctorId,
		doctorName,
		initialToothFdi,
		initialTeeth,
		propScheduledVisitDate,
		propTreatmentPlanId,
		propStageId,
		propStageNumber,
		propStageTitle,
		propIncludeImpressionBilling,
	]);

	// ─── TOOTH PICKER HELPERS ──────────────────────────────────────────────────
	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	// ─── FINANCIAL CALCULATIONS (KOPECK EXACT) ──────────────────────────────────
	const totalLabPriceRub = useMemo(() => {
		const parsed = normalizeRubAmountInput(priceRubInput);
		return parsed != null && parsed >= 0 ? parsed : 0;
	}, [priceRubInput]);

	const { doctorAmountRub } = useMemo(() => {
		return calculateLabFinancialSplit(totalLabPriceRub, doctorSharePct);
	}, [totalLabPriceRub, doctorSharePct]);

	const fittingCollision = useMemo(() => {
		const targetVisit = scheduledVisitDate || propScheduledVisitDate;
		return checkFittingAppointmentCollision(dueDate, targetVisit);
	}, [dueDate, scheduledVisitDate, propScheduledVisitDate]);

	const handleApplyOneClickDefaults = () => {
		setConstructionType(ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle);
		setMaterial(ONE_CLICK_LAB_DEFAULTS.materialId);
		setShadeSystem(ONE_CLICK_LAB_DEFAULTS.shadeSystem);
		setShadeClassical(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setShadeBody(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setSurfaceTexture(ONE_CLICK_LAB_DEFAULTS.surfaceTexture);
		setCementGapMicrons(ONE_CLICK_LAB_DEFAULTS.cementGapMicrons);
		setTranslucency(ONE_CLICK_LAB_DEFAULTS.translucency);
		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		setDueDate(due.toISOString().slice(0, 10));
		const fitDate = addWorkingDays(due, 1);
		const fitDateIso = fitDate.toISOString().slice(0, 10);
		setCeramicTrialDate(fitDateIso);
		if (!scheduledVisitDate) {
			setScheduledVisitDate(fitDateIso);
		}
		showToast(
			`Применен 1-клик пресет: «Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней» (до ${due.toLocaleDateString("ru-RU")})`,
			"success",
			4000,
		);
	};

	const handleApplyExpressPreset = (preset: ExpressLabPreset) => {
		setConstructionType(preset.constructionType);
		setMaterial(preset.materialId);
		setShadeSystem("classical");
		setShadeClassical(preset.colorVita);
		setShadeBody(preset.colorVita);
		setOcclusalScheme(preset.occlusalScheme);
		setContactTightness(preset.contactTightness);
		setSurfaceTexture(preset.surfaceTexture);
		setCementGapMicrons(preset.cementGapMicrons);
		if (preset.impressionType) {
			setImpressionType(preset.impressionType);
		}
		if (preset.isFullArchOrJaw && preset.toothFdi) {
			setJawScope("both");
		}
		const due = addWorkingDays(new Date(), preset.workingDays);
		setDueDate(due.toISOString().slice(0, 10));
		const fitDate = addWorkingDays(due, 1);
		const fitDateIso = fitDate.toISOString().slice(0, 10);
		setCeramicTrialDate(fitDateIso);
		if (!scheduledVisitDate) {
			setScheduledVisitDate(fitDateIso);
		}
		setPriceRubInput(String(preset.priceRub));
		showToast(
			`Пресет применен: ${preset.title} (${preset.shortDesc})`,
			"success",
			4000,
		);
	};

	// ─── DENTAL LAB FINANCIAL GATE ──────────────────────────────────────────────
	const financialGateResult = useMemo(() => {
		const stageTotalKopecks = rublesToKopecks(stageTotalRub ?? totalLabPriceRub);
		const paidKopecks = rublesToKopecks(stagePaidRub ?? 0);
		const depositKopecks = rublesToKopecks(patientDepositRub ?? 0);
		const orderPriceKopecks = rublesToKopecks(totalLabPriceRub);

		return checkDentalLabFinancialGate({
			stageTotalKopecks,
			paidKopecks,
			availableDepositKopecks: depositKopecks,
			labOrderPriceKopecks: orderPriceKopecks,
			minAdvancePercent: 50,
			chiefDoctorOverride: gateOverride ?? undefined,
			doctorOverride: gateOverride ?? undefined,
			treatmentPlanAgeDays,
			isPlanExpired,
		});
	}, [stageTotalRub, totalLabPriceRub, stagePaidRub, patientDepositRub, gateOverride, treatmentPlanAgeDays, isPlanExpired]);

	const gostOrderNumber = formatGostOrderNumber(secureToken);

	// ─── SUBMIT HANDLER ────────────────────────────────────────────────────────
	const handleSaveOrder = async (e?: React.FormEvent, forceSaveWithOverride = false) => {
		if (e) e.preventDefault();

		const effectivePatientId = formPatientId.trim() || (patientId ? patientId.trim() : `pat-solo-${Date.now()}`);
		const isWarrantyOrder = Boolean(initialOrder?.isWarrantyRework || totalLabPriceRub === 0 || Number(priceRubInput) === 0);
		let effectiveOverride = gateOverride;
		if (!skipFinancialGate && !forceSaveWithOverride && !financialGateResult.isGatePassed && !isWarrantyOrder && !effectiveOverride) {
			effectiveOverride = createDoctorClinicalOverride(
				formDoctorName || chiefDoctorName || "Лечащий врач",
				"Отправка наряда в ЗТЛ — клиническое решение лечащего врача (Автономия врача)",
			);
			setGateOverride(effectiveOverride);
		}

		setIsSubmitting(true);
		try {
			const finalShade =
				shadeSystem === "3d_master"
					? shade3dMaster
					: shadeSystem === "bleach"
					? shadeBleach
					: shadeClassical;

			await executeSaveLabOrder({
				initialOrder,
				effectivePatientId,
				formPatientName,
				formDoctorId,
				formDoctorName,
				patientChartNumber,
				selectedTeeth,
				jawScope,
				constructionType,
				material,
				impressionType,
				finalShade,
				shadeSystem,
				shadeCervical,
				shadeBody,
				shadeIncisal,
				shadeStump,
				translucency,
				mamelons,
				calcifications,
				opalescence,
				occlusalScheme,
				contactTightness,
				surfaceTexture,
				cementGapMicrons,
				currentStage,
				dueDate,
				scheduledVisitDate,
				frameworkTrialDate,
				ceramicTrialDate,
				clinicalNotes,
				effectiveOverride,
				totalLabPriceRub,
				attachedImageUrl,
				treatmentPlanId,
				stageId,
				stageNumber,
				stageTitle,
				includeImpressionBilling,
				clinicSharePct,
				doctorSharePct,
				doctorAmountRub,
				fittingCollision,
				gostOrderNumber,
				onOrderSaved,
				onSaveOrder,
				onClose,
			});
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения наряда ЗТЛ", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	const handleCopyZtl1Protocol = () => {
		copyLabOrderZtl1Protocol({
			gostOrderNumber,
			formPatientName,
			patientId,
			formDoctorName,
			doctorId,
			constructionType,
			material,
			shadeClassical,
			shade3dMaster,
			shadeBleach,
			selectedTeeth,
			impressionType,
			dueDate,
			currentStage,
			totalLabPriceRub,
			clinicalNotes,
		});
	};

	const handleCopyMessengerSummary = async () => {
		const finalShade =
			shadeSystem === "3d_master"
				? shade3dMaster
				: shadeSystem === "bleach"
				? shadeBleach
				: shadeClassical;

		await copyLabOrderMessengerSummary({
			clinicName,
			clinicPhone,
			gostOrderNumber,
			formPatientName,
			formDoctorName,
			jawScope,
			selectedTeeth,
			constructionType,
			material,
			finalShade,
			dueDate,
			frameworkTrialDate,
			ceramicTrialDate,
			clinicalNotes,
		});
	};

	const portalUrl = `${typeof window !== "undefined" ? (window.location?.origin || "") : ""}/#/portal/lab-order/${secureToken}`;

	return {
		activeTab,
		setActiveTab,
		gateOverride,
		setGateOverride,
		formPatientId,
		setFormPatientId,
		formPatientName,
		setFormPatientName,
		formDoctorId,
		setFormDoctorId,
		formDoctorName,
		setFormDoctorName,
		selectedTeeth,
		setSelectedTeeth,
		jawScope,
		setJawScope,
		constructionType,
		setConstructionType,
		material,
		setMaterial,
		impressionType,
		setImpressionType,
		shadeSystem,
		setShadeSystem,
		shadeClassical,
		setShadeClassical,
		shade3dMaster,
		setShade3dMaster,
		shadeBleach,
		setShadeBleach,
		shadeCervical,
		setShadeCervical,
		shadeBody,
		setShadeBody,
		shadeIncisal,
		setShadeIncisal,
		shadeStump,
		setShadeStump,
		translucency,
		setTranslucency,
		mamelons,
		setMamelons,
		calcifications,
		setCalcifications,
		opalescence,
		setOpalescence,
		attachedImageUrl,
		setAttachedImageUrl,
		occlusalScheme,
		setOcclusalScheme,
		contactTightness,
		setContactTightness,
		surfaceTexture,
		setSurfaceTexture,
		cementGapMicrons,
		setCementGapMicrons,
		currentStage,
		setCurrentStage,
		dueDate,
		setDueDate,
		scheduledVisitDate,
		setScheduledVisitDate,
		fittingCollision,
		frameworkTrialDate,
		setFrameworkTrialDate,
		ceramicTrialDate,
		setCeramicTrialDate,
		clinicalNotes,
		setClinicalNotes,
		secureToken,
		priceRubInput,
		setPriceRubInput,
		clinicSharePct,
		setClinicSharePct,
		doctorSharePct,
		setDoctorSharePct,
		isSubmitting,
		totalLabPriceRub,
		doctorAmountRub,
		financialGateResult,
		gostOrderNumber,
		portalUrl,
		toggleTooth,
		selectQuadrant,
		handleApplyOneClickDefaults,
		handleApplyExpressPreset,
		handleSaveOrder,
		handlePrint,
		handleCopyZtl1Protocol,
		handleCopyMessengerSummary,
		treatmentPlanId,
		setTreatmentPlanId,
		stageId,
		setStageId,
		stageNumber,
		setStageNumber,
		stageTitle,
		setStageTitle,
		includeImpressionBilling,
		setIncludeImpressionBilling,
	};
}
