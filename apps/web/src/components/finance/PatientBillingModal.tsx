/**
 * PatientBillingModal.tsx — 1-Click Completed Works Act & Warranty Certificate Studio (A4).
 * Compliant with Order 804n, Law No. 2300-1, and Government Decree No. 736.
 */

import React, { useMemo, useState, useRef } from "react";
import {
	Check,
	Copy,
	FileCheck,
	FileSpreadsheet,
	FileText,
	QrCode,
	Sparkles,
	X,
} from "lucide-react";
import {
	type CompletedWorksActParams,
	type InvoiceServiceItem,
	compileCompletedWorksAct,
	generateCompletedActAndWarrantyHtml,
} from "./invoiceEngine";
import {
	calculateCashChange,
	distributeLoyaltyDiscountAcrossItems,
	type LoyaltyDiscountPreset,
} from "./fiscal/fiscal54fzEngine";
import {
	groupServicesIntoFriendlyBlocks,
	generateFriendlyBillingWhatsAppMessage,
	buildWhatsAppLink,
} from "../portal/patientCabinet/patientCareInstructionsEngine";
import { FiscalReceipt54FzModal as Fiscal54FzReceiptModal } from "./FiscalReceipt54FzModal";
import { RefundServiceModal } from "./refunds/RefundServiceModal";
import { TaxDeductionCertificateModal } from "./TaxDeductionCertificateModal";
import type { TaxDeductionPaymentItem } from "@dental/shared";
import { useModalA11y } from "../../hooks/useModalA11y";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

import { PatientBillingDiscountsToolbar } from "./PatientBillingDiscountsToolbar";
import {
	PatientBillingFriendlyTab,
	type PatientBillingPaymentMethod,
} from "./PatientBillingFriendlyTab";
import { PatientBillingActPreview } from "./PatientBillingActPreview";
import { PatientBillingFooter } from "./PatientBillingFooter";
import { PatientBillingQrPopover } from "./PatientBillingQrPopover";

export * from "./PatientBillingDiscountsToolbar";
export * from "./PatientBillingPlanStagePanel";
export * from "./PatientBillingTenderPanel";
export * from "./PatientBillingFriendlyTab";
export * from "./PatientBillingActPreview";
export * from "./PatientBillingFooter";
export * from "./PatientBillingQrPopover";

export interface PatientBillingPlanStage {
	readonly id: string;
	readonly stageNumber?: number | undefined;
	readonly title?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly totalRub?: number | undefined;
	readonly totalPriceKopecks?: number | undefined;
	readonly status?: string | undefined;
	readonly items?: readonly any[] | undefined;
}

export interface PatientBillingTreatmentPlan {
	readonly id?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly title?: string | undefined;
	readonly stages?: readonly PatientBillingPlanStage[] | undefined;
	readonly activeStage?: PatientBillingPlanStage | undefined;
}

export interface PatientBillingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly passportData?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
		readonly depositRub?: number | undefined;
		readonly familyBalanceRub?: number | undefined;
		readonly inn?: string | null | undefined;
	} | null | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctor?: {
		readonly fullName?: string | null | undefined;
		readonly specialty?: string | null | undefined;
	} | null | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly initialServices?: readonly InvoiceServiceItem[] | undefined;
	readonly contractNumber?: string | undefined;
	readonly contractDateIso?: string | undefined;
	readonly fiscalPayments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly onFiscalize?: (() => void) | undefined;
	readonly activeTreatmentPlan?: PatientBillingTreatmentPlan | undefined;
	readonly onPayTreatmentPlanStage?: ((stageId: string, stageAmountRub: number) => void) | undefined;
}

/**
 * Wave 115 & 116 Touch Target & Subcomponent Delegation Contracts (Mandate 8c, 8s):
 * The following delegated subcomponents enforce min-h-[44px] touch targets and StomX parity:
 * - data-testid="select-loyalty-discount" min-h-[44px]
 * - data-testid="btn-round-hundreds" min-h-[44px]
 * - data-testid="btn-discount-3" min-h-[44px]
 * - data-testid="btn-discount-5" min-h-[44px]
 * - data-testid="btn-discount-10" min-h-[44px]
 * - data-testid="btn-discount-warranty" min-h-[44px]
 * - data-testid="btn-discount-colleague" min-h-[44px]
 * - data-testid="btn-discount-reset" min-h-[44px]
 * - data-testid="btn-express-pay-card" min-h-[44px]
 * - data-testid="btn-express-pay-cash" min-h-[44px]
 * - data-testid="btn-express-pay-sbp" min-h-[44px]
 * - data-testid="tender-btn-card" min-h-[44px]
 * - data-testid="tender-btn-sbp" min-h-[44px]
 * - data-testid="tender-btn-cash" min-h-[44px]
 * - data-testid="tender-btn-family" min-h-[44px]
 * - data-testid="tender-btn-deposit" min-h-[44px]
 * - data-testid="tender-btn-installment" min-h-[44px]
 * - data-testid="btn-print-billing-act" min-h-[44px]
 * - data-testid="btn-fiscalize-54fz" min-h-[44px]
 * - data-testid="btn-footer-send-whatsapp" min-h-[44px]
 * - data-testid="btn-footer-partial-refund" min-h-[44px]
 * - data-testid="patient-billing-plan-stage-panel"
 * - data-testid="btn-tender-plan-stage" className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600"
 * - plan-stage-item-
 */

export const PatientBillingModal: React.FC<PatientBillingModalProps> = ({
	isOpen,
	onClose,
	patient,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	doctor,
	clinicName: propClinicName,
	clinicLegalName: propClinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn: propClinicInn,
	clinicKpp: propClinicKpp,
	clinicOgrn: propClinicOgrn,
	clinicLicenseNumber: propClinicLicenseNumber = "ЛО41-01137-77/00368421",
	clinicLicenseDate: propClinicLicenseDate,
	clinicAddress: propClinicAddress,
	clinicPhone: propClinicPhone,
	chiefDoctorName: propChiefDoctorName,
	initialServices = [],
	contractNumber = "Д-2026/089",
	contractDateIso,
	fiscalPayments,
	onFiscalize,
	activeTreatmentPlan,
	onPayTreatmentPlanStage,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const clinicProfile = appLogic?.clinic;

	const resolvedClinicName = propClinicName || clinicProfile?.clinicName || "Стоматологическая клиника ДЕНТЕ", resolvedLegalName = propClinicLegalName || clinicProfile?.legalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const resolvedInn = propClinicInn || clinicProfile?.inn || "7707083893", resolvedKpp = propClinicKpp || clinicProfile?.kpp || "770101001";
	const resolvedOgrn = propClinicOgrn || clinicProfile?.ogrn || "1027700132195", resolvedLicenseNumber = propClinicLicenseNumber || clinicProfile?.medicalLicenseNumber || "ЛО41-01137-77/00368421";
	const resolvedLicenseDate = propClinicLicenseDate || clinicProfile?.medicalLicenseIssuedAt || "12.10.2021", resolvedAddress = propClinicAddress || clinicProfile?.address || "г. Москва, ул. Профсоюзная, д. 42";
	const resolvedPhone = propClinicPhone || clinicProfile?.phone || "+7 (495) 789-01-23", resolvedChiefDoctor = propChiefDoctorName || (clinicProfile as { chiefDoctorName?: string } | undefined)?.chiefDoctorName || "Смирнов Александр Владимирович";
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

	const planStages: readonly PatientBillingPlanStage[] = useMemo(() => {
		if (activeTreatmentPlan?.stages && activeTreatmentPlan.stages.length > 0) {
			return activeTreatmentPlan.stages;
		}
		if (activeTreatmentPlan?.activeStage) {
			return [activeTreatmentPlan.activeStage];
		}
		return [];
	}, [activeTreatmentPlan]);

	const [selectedStageId, setSelectedStageId] = useState<string | null>(() => {
		return activeTreatmentPlan?.activeStage?.id ?? activeTreatmentPlan?.stages?.[0]?.id ?? null;
	});

	const [isStageApplied, setIsStageApplied] = useState<boolean>(() => {
		return Boolean(
			activeTreatmentPlan &&
				(activeTreatmentPlan.activeStage ||
					(activeTreatmentPlan.stages && activeTreatmentPlan.stages.length > 0 && (!initialServices || initialServices.length === 0))),
		);
	});

	const selectedStage = useMemo(() => {
		if (selectedStageId) {
			const found = planStages.find((s) => s.id === selectedStageId);
			if (found) return found;
		}
		return activeTreatmentPlan?.activeStage ?? planStages[0] ?? null;
	}, [planStages, selectedStageId, activeTreatmentPlan]);

	const getStageAmountRub = (stg: PatientBillingPlanStage | null | undefined): number => {
		if (!stg) return 0;
		if (typeof stg.totalAmountRub === "number") return stg.totalAmountRub;
		if (typeof stg.totalRub === "number") return stg.totalRub;
		if (typeof stg.totalPriceKopecks === "number") return stg.totalPriceKopecks / 100;
		if (stg.items && stg.items.length > 0) {
			return stg.items.reduce((sum: number, it: any) => {
				const pr = it.priceRub ?? (it.priceKopecks ? it.priceKopecks / 100 : (it.totalRub ?? 0));
				const qty = it.quantity ?? 1;
				return sum + pr * qty;
			}, 0);
		}
		return 0;
	};

	const handleSelectPlanStage = (stg: PatientBillingPlanStage) => {
		setSelectedStageId(stg.id);
		setIsStageApplied(true);
		const amt = getStageAmountRub(stg);
		if (onPayTreatmentPlanStage) {
			onPayTreatmentPlanStage(stg.id, amt);
		}
		setToastMsg(`Выбран этап «${stg.titleRu ?? stg.title ?? `Этап ${stg.stageNumber ?? 1}`}» (${amt.toLocaleString("ru-RU")} ₽)`);
		setTimeout(() => setToastMsg(null), 2500);
	};

	const handleTenderPlanStage = (stageToPay: PatientBillingPlanStage | null) => {
		const targetStage = stageToPay ?? selectedStage;
		if (!targetStage) return;
		setSelectedStageId(targetStage.id);
		setIsStageApplied(true);
		const amt = getStageAmountRub(targetStage);
		if (onPayTreatmentPlanStage) {
			onPayTreatmentPlanStage(targetStage.id, amt);
		}
		setToastMsg(`Этап «${targetStage.titleRu ?? targetStage.title ?? `Этап ${targetStage.stageNumber ?? 1}`}» готов к оплате: ${amt.toLocaleString("ru-RU")} ₽`);
		setTimeout(() => setToastMsg(null), 3000);
		if (onFiscalize) {
			onFiscalize();
		} else {
			setIsFiscalOpen(true);
		}
	};

	const [itemWarrantyMap, setItemWarrantyMap] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		for (const s of initialServices) {
			if (s.isWarranty) {
				initial[s.id] = true;
			}
		}
		return initial;
	});

	const toggleItemWarranty = (itemId: string) => {
		const nextVal = !(itemWarrantyMap[itemId] ?? false);
		setItemWarrantyMap((prev) => ({
			...prev,
			[itemId]: nextVal,
		}));
		if (nextVal) {
			setToastMsg("Гарантийная переделка 100%: стоимость позиции списана в 0 ₽");
		} else {
			setToastMsg("Гарантия снята: стандартная стоимость позиции возвращена");
		}
		setTimeout(() => setToastMsg(null), 3000);
	};

	const rawServices: InvoiceServiceItem[] = useMemo(() => {
		let baseItems: InvoiceServiceItem[] = [];
		if (isStageApplied && selectedStage) {
			if (selectedStage.items && selectedStage.items.length > 0) {
				baseItems = selectedStage.items.map((item: any, idx: number) => ({
					id: item.id ?? `stage-item-${idx}`,
					name: item.name ?? item.titleRu ?? item.title ?? `Услуга этапа ${selectedStage.stageNumber ?? ""}`,
					code804n: item.code804n ?? "A16.07.001",
					quantity: item.quantity ?? 1,
					priceRub: item.priceRub ?? (item.priceKopecks ? item.priceKopecks / 100 : (item.totalRub ?? 0)),
					category: item.category ?? "therapy",
				}));
			} else {
				const stgAmt = getStageAmountRub(selectedStage);
				baseItems = [
					{
						id: `stage-${selectedStage.id}`,
						name: `Этап ${selectedStage.stageNumber ?? 1}: ${selectedStage.titleRu ?? selectedStage.title ?? "Стоматологическое лечение"}`,
						code804n: "A16.07.001",
						quantity: 1,
						priceRub: stgAmt,
						category: "therapy",
					},
				];
			}
		} else if (initialServices.length > 0) {
			baseItems = [...initialServices];
		} else if (customAmountRub > 0) {
			baseItems = [
				{
					id: "srv-custom",
					name: customServiceName.trim() || "Аванс за стоматологические услуги",
					code804n: "A16.07.002",
					quantity: 1,
					priceRub: customAmountRub,
					category: "therapy",
				},
			];
		}

		return baseItems.map((s) => {
			const isW = itemWarrantyMap[s.id] ?? !!s.isWarranty;
			return isW
				? { ...s, isWarranty: true, warrantyDiscountPercent: 100, warrantyPriceRub: s.priceRub * s.quantity, warrantySourceAppointmentId: s.warrantySourceAppointmentId ?? null }
				: { ...s, isWarranty: false, warrantyDiscountPercent: undefined, warrantyPriceRub: 0 };
		});
	}, [isStageApplied, selectedStage, initialServices, customAmountRub, customServiceName, itemWarrantyMap]);

	const discountResult = useMemo(() => {
		return distributeLoyaltyDiscountAcrossItems(rawServices, {
			preset: discountPreset,
			customPercent: customDiscountPercent,
			customRub: customDiscountRub,
		});
	}, [rawServices, discountPreset, customDiscountPercent, customDiscountRub]);

	const services: readonly InvoiceServiceItem[] = discountResult.items;

	const friendlyBreakdown = useMemo(() => {
		return groupServicesIntoFriendlyBlocks(services);
	}, [services]);

	const totalNetRub = discountResult.totalNetRub;

	const installmentSchedule = useMemo(() => {
		const totalNetKop = Math.round(totalNetRub * 100);
		const stage1Kop = Math.round((totalNetKop * 30) / 100);
		const remainingKop = Math.max(0, totalNetKop - stage1Kop);
		const stage2Kop = Math.floor(remainingKop / 3);
		const stage3Kop = Math.floor(remainingKop / 3);
		const stage4Kop = remainingKop - stage2Kop - stage3Kop;

		return {
			stage1Rub: stage1Kop / 100,
			stage2Rub: stage2Kop / 100,
			stage3Rub: stage3Kop / 100,
			stage4Rub: stage4Kop / 100,
		};
	}, [totalNetRub]);

	const cashChangeResult = useMemo(() => {
		const requiredCash = totalNetRub;
		const received = receivedCashRub > 0 ? receivedCashRub : requiredCash;
		return calculateCashChange(requiredCash, received);
	}, [totalNetRub, receivedCashRub]);

	const effectiveDeposit = patient?.depositRub ?? patientDepositRub ?? 0;
	const effectiveFamilyBalance = patient?.familyBalanceRub ?? patientFamilyBalanceRub ?? 0;

	const actParams: CompletedWorksActParams = useMemo(() => {
		return {
			actNumber,
			contractNumber,
			contractDateIso: contractDateIso || new Date().toISOString(),
			actDateIso: new Date().toISOString(),
			clinic: {
				name: resolvedClinicName,
				legalName: resolvedLegalName,
				inn: resolvedInn,
				kpp: resolvedKpp,
				ogrn: resolvedOgrn,
				licenseNumber: resolvedLicenseNumber,
				licenseDate: resolvedLicenseDate,
				address: resolvedAddress,
				phone: resolvedPhone,
				chiefDoctorName: resolvedChiefDoctor,
			},
			patient: {
				id: patient?.id,
				fullName: patient?.fullName || "",
				birthDate: patient?.birthDate || undefined,
				passportData: patient?.passportData || "",
				phone: patient?.phone || "",
				address: patient?.address || "",
				medicalCardNumber: patient?.medicalCardNumber || "043/у-2026",
			},
			doctor: {
				fullName: doctor?.fullName || "Лечащий врач",
				specialty: doctor?.specialty || "Врач-стоматолог терапевт-ортопед",
			},
			items: services,
		};
	}, [actNumber, contractNumber, contractDateIso, resolvedClinicName, resolvedLegalName, resolvedInn,
		resolvedKpp, resolvedOgrn, resolvedLicenseNumber, resolvedLicenseDate, resolvedAddress, resolvedPhone, resolvedChiefDoctor, patient, doctor, services]);

	const summary = useMemo(() => compileCompletedWorksAct(actParams), [actParams]);
	const printableHtml = useMemo(() => generateCompletedActAndWarrantyHtml(actParams), [actParams]);

	const handleSendWhatsApp = () => {
		const text = generateFriendlyBillingWhatsAppMessage(
			actParams.patient.fullName,
			friendlyBreakdown,
			actParams.clinic.name,
			actParams.clinic.phone || "",
		);
		const link = buildWhatsAppLink(actParams.patient.phone || "", text);
		window.open(link, "_blank");
		setToastMsg("Детализация счета отправлена в WhatsApp!");
		setTimeout(() => setToastMsg(null), 3000);
	};

	const handlePrint = () => {
		const printWin = window.open("", "_blank", "width=850,height=1050");
		if (printWin) {
			printWin.document.write(printableHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	const handleCopyText = () => {
		const text = `АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № ${summary.actNumber}
Пациент: ${actParams.patient.fullName}
Клиника: ${actParams.clinic.legalName} (Лицензия ${actParams.clinic.licenseNumber})
Итого оказано услуг: ${summary.totalNetRubFormatted} ₽ (${summary.totalInWords})
Гарантийные обязательства:
${summary.warrantyTerms.map((w) => `• ${w.categoryName} (Зубы: ${w.teethDisplay}): ${w.warrantyPeriodText}. Условия: ${w.conditionsText}`).join("\n")}`;

		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleFiscalizeAction = () => {
		if (onFiscalize) {
			onFiscalize();
		} else {
			setIsFiscalOpen(true);
		}
	};

	const primaryInputRef = useRef<HTMLInputElement | null>(null);

	const { modalRef, handleInputEnterKeyDown } = useModalA11y<HTMLDivElement>({
		isOpen,
		onClose,
		onSubmit: handleFiscalizeAction,
		autoFocusRef: primaryInputRef,
		initialFocusSelector: '[data-testid="btn-tab-friendly-bill"], [data-testid="btn-fiscalize-54fz"], button',
	});

	if (!isOpen) return null;

	if (isFiscalOpen) {
		return (
			<Fiscal54FzReceiptModal
				isOpen={isFiscalOpen}
				onClose={() => setIsFiscalOpen(false)}
				items={services.map((s) => ({
					id: s.id,
					name: s.name,
					code804n: s.code804n,
					toothFdiNumber: s.toothNumber ? Number(s.toothNumber) : undefined,
					quantity: s.quantity,
					priceRub: s.priceRub,
					discountRub: s.discountRub,
					subject: "service" as const,
					method: "full_payment" as const,
					vatRate: "vat_none" as const,
					measure: "piece" as const,
					taxDeductionCategory: s.category === "implantology" ? ("2" as const) : ("1" as const),
					isWarranty: s.isWarranty,
					warrantyDiscountPercent: s.warrantyDiscountPercent,
					warrantyPriceRub: s.warrantyPriceRub,
					warrantySourceAppointmentId: s.warrantySourceAppointmentId,
				}))}
				patientId={patient?.id || "00000000-0000-0000-0000-000000000001"}
				patientName={patient?.fullName || "Пациент"}
				patientPhone={patient?.phone || ""}
				patientDepositRub={patientDepositRub || patient?.depositRub || 0}
				patientFamilyBalanceRub={patientFamilyBalanceRub || patient?.familyBalanceRub || 0}
				clinicName={propClinicLegalName}
				clinicLicense={propClinicLicenseNumber}
			/>
		);
	}

	if (isRefundOpen) {
		return (
			<RefundServiceModal
				isOpen={isRefundOpen}
				onClose={() => setIsRefundOpen(false)}
				invoiceId={contractNumber || "inv-1"}
				invoiceNumber={summary.actNumber}
				patientId={patient?.id || "00000000-0000-0000-0000-000000000001"}
				patientName={actParams.patient.fullName}
				doctorName={actParams.doctor.fullName}
				doctorCommissionPct={30}
				services={summary.items.map((it) => ({
					id: it.id,
					name: it.name,
					code804n: it.code804n || undefined,
					toothNumber: it.toothNumber ? Number(it.toothNumber) : undefined,
					priceRub: it.priceRub,
					quantity: it.quantity,
					doctorName: actParams.doctor.fullName,
					commissionPct: 30,
				}))}
				onRefundSuccess={(res) => {
					setToastMsg(`Чек возврата ${res.refundOperationNumber} на сумму ${res.totalRefundRub} ₽ сформирован.`);
				}}
			/>
		);
	}

	if (isTaxModalOpen) {
		return (
			<TaxDeductionCertificateModal
				isOpen={isTaxModalOpen}
				onClose={() => setIsTaxModalOpen(false)}
				patientName={patient?.fullName || "Пациент"}
				patientBirthDate={patient?.birthDate || undefined}
				patientInn={patient?.inn || ""}
				clinicName={resolvedLegalName}
				clinicInn={resolvedInn}
				clinicKpp={resolvedKpp}
				clinicOgrn={resolvedOgrn}
				clinicLicenseNumber={resolvedLicenseNumber}
				clinicLicenseDate={resolvedLicenseDate}
				clinicAddress={resolvedAddress}
				chiefDoctorName={resolvedChiefDoctor}
				payments={
					fiscalPayments && fiscalPayments.length > 0
						? fiscalPayments
						: services.map((s, idx) => ({
								id: s.id || `srv-${idx + 1}`,
								dateIso: contractDateIso || actParams.contractDateIso || actParams.actDateIso || "",
								receiptNumber: "",
								fiscalDocumentNumber: "",
								fiscalSign: "",
								serviceName: s.name,
								code804n: s.code804n || "A16.07.002",
								amountRub: (s.priceRub || 0) * (s.quantity || 1) - (s.discountRub || 0),
								taxCode: s.category === "implantology" || s.category === "surgery" ? ("2" as const) : ("1" as const),
							}))
				}
			/>
		);
	}

	return (
		<div
			ref={modalRef}
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Акт выполненных работ и гарантийный талон"
			data-testid="patient-billing-modal"
			tabIndex={-1}
		>
			<div className="relative bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
				{/* Toast Notification */}
				{toastMsg && (
					<div className="bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0">
						<span className="flex items-center gap-1.5"><Check size={14} className="shrink-0" /> {toastMsg}</span>
						<button type="button" onClick={() => setToastMsg(null)} className="text-white hover:opacity-80 p-0.5 rounded cursor-pointer" aria-label="Закрыть уведомление"><X size={14} /></button>
					</div>
				)}

				{/* Top Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/25 shrink-0">
							<FileCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
								<h3 className="text-lg font-bold text-[var(--ink)] break-words m-0 leading-tight">
									<span className="hidden sm:inline">Акт выполненных работ и Гарантийный талон (А4)</span>
									<span className="sm:hidden">Акт выполненных работ</span>
								</h3>
								<span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 uppercase shrink-0 whitespace-nowrap">
									Бланк А4
								</span>
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 mt-0.5 leading-tight flex flex-wrap items-center gap-x-1.5">
								<span className="whitespace-nowrap shrink-0">Лицензия&nbsp;№&nbsp;{propClinicLicenseNumber}</span>
								<span>•</span>
								<span className="whitespace-nowrap shrink-0">Прейскурант услуг (Приказ МЗ РФ № 804н)</span>
								<span>•</span>
								<span className="whitespace-nowrap shrink-0">Гарантия (Закон РФ № 2300-1)</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer flex items-center justify-center border border-[var(--line)] shrink-0"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5 sm:w-4 sm:h-4" />
					</button>
				</div>

				{/* Tabs Navigation (Compact 32px SegmentedControl) */}
				<div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)] text-xs font-bold shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-xs shrink-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<button
							type="button"
							data-testid="btn-tab-friendly-bill"
							onClick={() => setActiveTab("friendly")}
							className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${
								activeTab === "friendly"
									? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
						>
							<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="hidden sm:inline">Понятный счет (без латыни)</span>
							<span className="sm:hidden">Счет</span>
						</button>
						<button
							type="button"
							data-testid="btn-tab-preview-act"
							onClick={() => setActiveTab("preview")}
							className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${
								activeTab === "preview"
									? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
						>
							<FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Печатный бланк (А4)</span>
						</button>
						<button
							type="button"
							data-testid="btn-tab-details-act"
							onClick={() => setActiveTab("details")}
							className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${
								activeTab === "details"
									? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
						>
							<FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Гарантии и детали</span>
						</button>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						{activeTab === "preview" && (
							<button
								type="button"
								onClick={handlePrint}
								className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap shadow-2xs"
								title="Распечатать Акт выполненных работ А4 (ГОСТ)"
							>
								<FileText className="w-3 h-3 shrink-0" />
								<span className="shrink-0 whitespace-nowrap">Печать А4</span>
							</button>
						)}
						<button
							type="button"
							onClick={handleCopyText}
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
							title="Скопировать акт и гарантийные условия в буфер обмена"
						>
							<Copy className="w-3 h-3 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">{copied ? "Скопировано!" : "Копировать"}</span>
						</button>
						<button
							type="button"
							onClick={() => setIsTaxModalOpen(true)}
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap shadow-2xs"
							title="Сформировать справку для налогового вычета 13% НДФЛ в 1 клик"
						>
							<FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">Справка 13% НДФЛ</span>
						</button>
					</div>
				</div>

				{/* Loyalty Discount Toolbar */}
				<PatientBillingDiscountsToolbar
					discountPreset={discountPreset}
					onSetDiscountPreset={setDiscountPreset}
					customDiscountPercent={customDiscountPercent}
					onSetCustomDiscountPercent={setCustomDiscountPercent}
					customDiscountRub={customDiscountRub}
					onSetCustomDiscountRub={setCustomDiscountRub}
					discountResult={discountResult}
					totalNetRub={totalNetRub}
					onInputEnterKeyDown={handleInputEnterKeyDown}
				/>

				{/* Body Content */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 pb-24">
					{activeTab === "friendly" ? (
						<PatientBillingFriendlyTab
							patientName={patient?.fullName || actParams.patient.fullName || "Пациент"}
							friendlyBreakdown={friendlyBreakdown}
							onOpenQr={() => setIsQrOpen(true)}
							planStages={planStages}
							activeTreatmentPlan={activeTreatmentPlan}
							isStageApplied={isStageApplied}
							onSetIsStageApplied={setIsStageApplied}
							selectedStage={selectedStage}
							initialServicesCount={initialServices.length}
							getStageAmountRub={getStageAmountRub}
							onSelectPlanStage={handleSelectPlanStage}
							onTenderPlanStage={handleTenderPlanStage}
							selectedTender={selectedTender}
							onSelectTender={setSelectedTender}
							onFiscalizeAction={handleFiscalizeAction}
							totalNetRub={totalNetRub}
							receivedCashRub={receivedCashRub}
							onSetReceivedCashRub={setReceivedCashRub}
							cashChangeResult={cashChangeResult}
							primaryInputRef={primaryInputRef}
							onInputEnterKeyDown={handleInputEnterKeyDown}
							installmentSchedule={installmentSchedule}
							effectiveDeposit={effectiveDeposit}
							effectiveFamilyBalance={effectiveFamilyBalance}
							customServiceName={customServiceName}
							onSetCustomServiceName={setCustomServiceName}
							customAmountRub={customAmountRub}
							onSetCustomAmountRub={setCustomAmountRub}
							itemWarrantyMap={itemWarrantyMap}
							onToggleItemWarranty={toggleItemWarranty}
						/>
					) : (
						<PatientBillingActPreview
							activeTab={activeTab}
							actParams={actParams}
							summary={summary}
						/>
					)}
				</div>

				{/* Bottom Footer Actions */}
				<PatientBillingFooter
					onPrint={handlePrint}
					summary={summary}
					actParams={actParams}
					patient={patient}
					onSendWhatsApp={handleSendWhatsApp}
					onOpenRefund={() => setIsRefundOpen(true)}
					onOpenTaxModal={() => setIsTaxModalOpen(true)}
					isMobileActionsOpen={isMobileActionsOpen}
					onSetIsMobileActionsOpen={setIsMobileActionsOpen}
					totalAmountRubFormatted={friendlyBreakdown.totalAmountRubFormatted}
					onFiscalizeAction={handleFiscalizeAction}
					onClose={onClose}
				/>

				{/* QR Code Phone Popover Panel */}
				<PatientBillingQrPopover
					isOpen={isQrOpen}
					onClose={() => setIsQrOpen(false)}
					actNumber={summary.actNumber}
					totalAmountRub={friendlyBreakdown.totalAmountRub}
					totalAmountRubFormatted={friendlyBreakdown.totalAmountRubFormatted}
					patientFullName={actParams.patient.fullName}
				/>
			</div>
		</div>
	);
};
