import { useState, useRef, useMemo } from "react";
import type { LoyaltyDiscountPreset } from "./fiscal/fiscal54fzEngine";
import { generateFriendlyBillingWhatsAppMessage, buildWhatsAppLink } from "../portal/patientCabinet/patientCareInstructionsEngine";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useModalA11y } from "../../hooks/useModalA11y";
import type { PatientBillingModalProps, PatientBillingPlanStage, PatientBillingPaymentMethod } from "./PatientBillingTypes";
import { usePatientBillingData } from "./usePatientBillingData";

export function usePatientBillingState(props: PatientBillingModalProps) {
	const appLogic = useOptionalAppLogicContext();
	const clinicProfile = appLogic?.clinic;
	const { patient, patientDepositRub = 0, patientFamilyBalanceRub = 0, initialServices = [], onFiscalize, activeTreatmentPlan } = props;

	const resolvedClinic = useMemo(() => ({
		name: props.clinicName || clinicProfile?.clinicName || "Стоматологическая клиника ДЕНТЕ",
		legalName: props.clinicLegalName || clinicProfile?.legalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		inn: props.clinicInn || clinicProfile?.inn || "7707083893",
		kpp: props.clinicKpp || clinicProfile?.kpp || "770101001",
		ogrn: props.clinicOgrn || clinicProfile?.ogrn || "",
		licenseNumber: props.clinicLicenseNumber || clinicProfile?.medicalLicenseNumber || "ЛО41-01137-77/00368421",
		licenseDate: props.clinicLicenseDate || clinicProfile?.medicalLicenseIssuedAt || "12.10.2021",
		address: props.clinicAddress || clinicProfile?.address || "г. Москва, ул. Профсоюзная, д. 42",
		phone: props.clinicPhone || clinicProfile?.phone || "+7 (495) 789-01-23",
		chiefDoctorName: props.chiefDoctorName || (clinicProfile as { chiefDoctorName?: string } | undefined)?.chiefDoctorName || "Смирнов Александр Владимирович",
	}), [props, clinicProfile]);

	const [activeTab, setActiveTab] = useState<"preview" | "friendly" | "details">("friendly");
	const [selectedTender, setSelectedTender] = useState<PatientBillingPaymentMethod>("card");
	const [receivedCashRub, setReceivedCashRub] = useState<number>(0);
	const [actNumber] = useState(() => `АКТ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
	const [copied, setCopied] = useState(false);
	const [isQrOpen, setIsQrOpen] = useState(false);
	const [isFiscalOpen, setIsFiscalOpen] = useState(false);
	const [isRefundOpen, setIsRefundOpen] = useState(false);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
	const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const [discountPreset, setDiscountPreset] = useState<LoyaltyDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(0);
	const [customAmountRub, setCustomAmountRub] = useState<number>(0);
	const [customServiceName, setCustomServiceName] = useState<string>("Аванс за стоматологические услуги");

	const planStages: readonly PatientBillingPlanStage[] = useMemo(() => activeTreatmentPlan?.stages?.length ? activeTreatmentPlan.stages : activeTreatmentPlan?.activeStage ? [activeTreatmentPlan.activeStage] : [], [activeTreatmentPlan]);
	const [selectedStageId, setSelectedStageId] = useState<string | null>(() => activeTreatmentPlan?.activeStage?.id ?? activeTreatmentPlan?.stages?.[0]?.id ?? null);
	const [isStageApplied, setIsStageApplied] = useState<boolean>(() => Boolean(activeTreatmentPlan && (activeTreatmentPlan.activeStage || (activeTreatmentPlan.stages?.length && (!initialServices || initialServices.length === 0)))));

	const selectedStage = useMemo(() => selectedStageId ? planStages.find((s) => s.id === selectedStageId) ?? null : activeTreatmentPlan?.activeStage ?? planStages[0] ?? null, [planStages, selectedStageId, activeTreatmentPlan]);

	const getStageAmountRub = (stg: PatientBillingPlanStage | null | undefined): number => {
		if (!stg) return 0;
		if (typeof stg.remainingAmountRub === "number") return Math.max(0, stg.remainingAmountRub);
		if (typeof stg.remainingAmountKopecks === "number") return Math.max(0, stg.remainingAmountKopecks / 100);
		const gross = typeof stg.totalAmountRub === "number" ? stg.totalAmountRub : typeof stg.totalRub === "number" ? stg.totalRub : typeof stg.totalPriceKopecks === "number" ? stg.totalPriceKopecks / 100 : stg.items?.length ? stg.items.reduce((sum: number, it: any) => sum + (it.priceRub ?? (it.priceKopecks ? it.priceKopecks / 100 : (it.totalRub ?? 0))) * (it.quantity ?? 1), 0) : 0;
		const paid = typeof stg.paidAmountRub === "number" ? stg.paidAmountRub : typeof stg.paidAmountKopecks === "number" ? stg.paidAmountKopecks / 100 : 0;
		return Math.max(0, gross - paid);
	};

	const [itemWarrantyMap, setItemWarrantyMap] = useState<Record<string, boolean>>(() => {
		const init: Record<string, boolean> = {};
		for (const s of initialServices) { if (s.isWarranty) init[s.id] = true; }
		return init;
	});

	const toggleItemWarranty = (itemId: string) => {
		const nextVal = !(itemWarrantyMap[itemId] ?? false);
		setItemWarrantyMap((prev) => ({ ...prev, [itemId]: nextVal }));
		setToastMsg(nextVal ? "Гарантийная переделка 100%: стоимость позиции списана в 0 ₽" : "Гарантия снята: стандартная стоимость позиции возвращена");
		setTimeout(() => setToastMsg(null), 3000);
	};

	const data = usePatientBillingData({ props, actNumber, resolvedClinic, isStageApplied, selectedStage, itemWarrantyMap, discountPreset, customDiscountPercent, customDiscountRub, customAmountRub, customServiceName, receivedCashRub, getStageAmountRub });

	const handleSendWhatsApp = () => {
		const text = generateFriendlyBillingWhatsAppMessage(data.actParams.patient.fullName, data.friendlyBreakdown, data.actParams.clinic.name, data.actParams.clinic.phone || "");
		window.open(buildWhatsAppLink(data.actParams.patient.phone || "", text), "_blank");
		setToastMsg("Детализация счета отправлена в WhatsApp!");
		setTimeout(() => setToastMsg(null), 3000);
	};

	const handlePrint = () => {
		const printWin = window.open("", "_blank", "width=850,height=1050");
		if (printWin) { printWin.document.write(data.printableHtml); printWin.document.close(); printWin.focus(); setTimeout(() => printWin.print(), 250); }
	};

	const handleCopyText = () => {
		const text = `АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № ${data.summary.actNumber}\nПациент: ${data.actParams.patient.fullName}\nКлиника: ${data.actParams.clinic.legalName}\nИтого: ${data.summary.totalNetRubFormatted} ₽ (${data.summary.totalInWords})\nГарантии:\n${data.summary.warrantyTerms.map((w) => `• ${w.categoryName} (${w.teethDisplay}): ${w.warrantyPeriodText}`).join("\n")}`;
		if (navigator.clipboard) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
	};

	const handleFiscalizeAction = () => { if (onFiscalize) { onFiscalize(); } else { setIsFiscalOpen(true); } };
	const primaryInputRef = useRef<HTMLInputElement | null>(null);
	const { modalRef, handleInputEnterKeyDown } = useModalA11y<HTMLDivElement>({ isOpen: props.isOpen, onClose: props.onClose, onSubmit: handleFiscalizeAction, autoFocusRef: primaryInputRef, initialFocusSelector: '[data-testid="btn-tab-friendly-bill"], [data-testid="btn-fiscalize-54fz"], button' });

	return {
		activeTab, setActiveTab, selectedTender, setSelectedTender, receivedCashRub, setReceivedCashRub, actNumber, copied, isQrOpen, setIsQrOpen, isFiscalOpen, setIsFiscalOpen, isRefundOpen, setIsRefundOpen, isTaxModalOpen, setIsTaxModalOpen, isMobileActionsOpen, setIsMobileActionsOpen, toastMsg, setToastMsg, discountPreset, setDiscountPreset, customDiscountPercent, setCustomDiscountPercent, customDiscountRub, setCustomDiscountRub, customAmountRub, setCustomAmountRub, customServiceName, setCustomServiceName, planStages, selectedStageId, setSelectedStageId, isStageApplied, setIsStageApplied, selectedStage, getStageAmountRub, itemWarrantyMap, toggleItemWarranty, ...data, handleSendWhatsApp, handlePrint, handleCopyText, handleFiscalizeAction, primaryInputRef, modalRef, handleInputEnterKeyDown, effectiveDeposit: patient?.depositRub ?? patientDepositRub ?? 0, effectiveFamilyBalance: patient?.familyBalanceRub ?? patientFamilyBalanceRub ?? 0, resolvedClinicLegalName: resolvedClinic.legalName, resolvedClinicLicenseNumber: resolvedClinic.licenseNumber, resolvedInn: resolvedClinic.inn, resolvedKpp: resolvedClinic.kpp, resolvedOgrn: resolvedClinic.ogrn, resolvedLicenseDate: resolvedClinic.licenseDate, resolvedAddress: resolvedClinic.address, resolvedChiefDoctor: resolvedClinic.chiefDoctorName, resolvedLegalName: resolvedClinic.legalName,
	};
}
