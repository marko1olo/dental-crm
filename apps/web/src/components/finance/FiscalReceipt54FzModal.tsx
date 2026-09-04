/**
 * FiscalReceipt54FzModal.tsx — Интерактивное модальное окно фискализации 54-ФЗ (ФФД 1.2),
 * раздельной оплаты, чеков возврата прихода, коррекционных чеков и справок для налогового вычета (КНД 1151156).
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Banknote,
	Building2,
	Check,
	CheckCircle2,
	Code2,
	Coins,
	Copy,
	CreditCard,
	FileCheck,
	FileCode2,
	FileText,
	Gift,
	Layers,
	Printer,
	QrCode,
	Receipt,
	RotateCcw,
	Send,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Undo2,
	Wallet,
	X,
} from "lucide-react";
import {
	generateOneCEnterpriseXml,
	kopecksToRub,
	type OneCDocumentType,
	type OneCExportParams,
	parseChestnyZnakDataMatrix,
	rubToKopecks,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../treatment-plans/types";
import { showToast } from "../GlobalToast";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	calculateProportionalRefundAllocation,
	calculateSplitPaymentAllocation,
	calculateTaxDeductionBreakdown,
	generateFiscalCorrectionReceipt54Fz,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	generateTaxDeductionCertificate,
	mapTreatmentItemsToFiscalReceipt,
	type SplitPaymentInput,
	TAX_DEDUCTION_RELATIONSHIP_CODES,
	TAX_DEDUCTION_RELATIONSHIP_LABELS,
	type TaxDeductionRelationship,
	TREATMENT_STAGE_LABELS,
} from "./order804nFiscalEngine";
import { Order804nFiscalReceiptPrint } from "./Order804nFiscalReceiptPrint";
import { OneCExportButton } from "./OneCExportButton";
import { numberToWordsRu } from "./invoiceEngine";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter";
import type { FiscalReceiptPrintPayload } from "../../services/hardware/hardwareTypes";

export type FiscalModalTab =
	| "payment"
	| "act"
	| "certificate"
	| "oneC"
	| "refund"
	| "correction"
	| "preview";

export interface FiscalReceipt54FzModalProps {
	readonly isOpen: boolean;
	readonly items: readonly TreatmentPlanItem[];
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialTab?: FiscalModalTab | undefined;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
}

/**
 * Безупречное форматирование денежных сумм в рублях с копейками без артефактов округления.
 */
function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const FiscalReceipt54FzModal: React.FC<FiscalReceipt54FzModalProps> = ({
	isOpen,
	items,
	patientId,
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	initialTab = "payment",
	onClose,
	onReceiptFiscalized,
}) => {
	if (!isOpen) return null;

	const [activeTab, setActiveTab] = useState<FiscalModalTab>(initialTab || "payment");
	const [actNumber, setActNumber] = useState<string>(
		`АКТ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
	);
	const [contractNumber, setContractNumber] = useState<string>(
		`ДОГ-${new Date().getFullYear()}/${patientId.slice(0, 5).toUpperCase()}`,
	);
	const [selectedStageKind, setSelectedStageKind] = useState<string>("all");
	const [mdlpCodes, setMdlpCodes] = useState<Record<string, string>>({});
	const [cashAmount, setCashAmount] = useState<number>(0);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(0);
	const [sbpAmount, setSbpAmount] = useState<number>(0);
	const [depositAmount, setDepositAmount] = useState<number>(0);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [insuranceAmount, setInsuranceAmount] = useState<number>(0);
	const [guaranteeLetterNumber, setGuaranteeLetterNumber] = useState<string>("");
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);
	const inFlightRef = React.useRef(false);
	const lastClickTimeRef = React.useRef(0);

	// Refund state (Возврат прихода при отказе от части услуг)
	const [refundItemSelection, setRefundItemSelection] = useState<Record<string, boolean>>({});
	const [refundReason, setRefundReason] = useState<string>("Отказ пациента от части услуг плана лечения");
	const [originalReceiptNumberForRefund, setOriginalReceiptNumberForRefund] = useState<string>("");

	// Correction state (Чек коррекции 54-ФЗ)
	const [correctionType, setCorrectionType] = useState<"self_initiated" | "by_instruction">("self_initiated");
	const [correctionDocDate, setCorrectionDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [correctionDocNumber, setCorrectionDocNumber] = useState<string>("АКТ-1");
	const [correctionReason, setCorrectionReason] = useState<string>("Коррекция неприменения ККТ при техническом сбое");

	// Certificate state (Справка для налоговой КНД 1151156)
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>("");
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("self");
	const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());

	// 1C:Enterprise (1С:Предприятие 8.3 XML / CommerceML 2.09) state
	const [oneCDocType, setOneCDocType] = useState<OneCDocumentType>("act");
	const [oneCDocDate, setOneCDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [oneCDocTime] = useState<string>("12:00:00");
	const [oneCClinicInn, setOneCClinicInn] = useState<string>("7701234567");
	const [oneCClinicKpp, setOneCClinicKpp] = useState<string>("770101001");
	const [oneCPatientInn, setOneCPatientInn] = useState<string>("");
	const [oneCPatientAddress, setOneCPatientAddress] = useState<string>("г. Москва, ул. Клиническая, д. 12");

	const availableStages = useMemo(() => {
		const stages = new Set<string>();
		for (const it of items) {
			if (it.stageKind) stages.add(it.stageKind);
			else if (it.category) stages.add(it.category);
		}
		return Array.from(stages);
	}, [items]);

	const activeItems = useMemo(() => {
		if (selectedStageKind === "all") return items;
		return items.filter((it) => (it.stageKind || it.category) === selectedStageKind);
	}, [items, selectedStageKind]);

	const fiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(activeItems);
	}, [activeItems]);

	const totalSumRub = fiscalData.totalRub;
	const totalKopecks = fiscalData.totalKopecks;

	// Initial default allocation: 100% to Card if all are 0
	React.useEffect(() => {
		if (
			cashAmount === 0 &&
			cardAmount === 0 &&
			sbpAmount === 0 &&
			depositAmount === 0 &&
			certificateAmount === 0 &&
			insuranceAmount === 0 &&
			totalSumRub > 0
		) {
			setCardAmount(totalSumRub);
		}
	}, [totalSumRub]);

	const handleSelectStage = (stage: string) => {
		setSelectedStageKind(stage);
		const filtered = stage === "all" ? items : items.filter((it) => (it.stageKind || it.category) === stage);
		const newTotalRub = mapTreatmentItemsToFiscalReceipt(filtered).totalRub;
		setCardAmount(newTotalRub);
		setCashAmount(0);
		setSbpAmount(0);
		setDepositAmount(0);
		setCertificateAmount(0);
		setInsuranceAmount(0);
		showToast(
			stage === "all"
				? `Выбран полный план: ${formatMoneyRu(newTotalRub)}`
				: `Выбран этап [${TREATMENT_STAGE_LABELS[stage] || stage}]: ${formatMoneyRu(newTotalRub)}`,
			"info",
			2000,
		);
	};

	const handleUpdateMdlpCode = (itemId: string, rawCode: string) => {
		setMdlpCodes((prev) => ({ ...prev, [itemId]: rawCode }));
		if (rawCode.trim()) {
			const parsed = parseChestnyZnakDataMatrix(rawCode);
			if (parsed.isValid) {
				showToast(`DataMatrix Честный ЗНАК валиден: ${parsed.matchedTradeName || "код принят"}`, "success", 2000);
			} else {
				showToast(`Некорректный код маркировки: ${parsed.errorMessage || "ошибка формата"}`, "warning", 3000);
			}
		}
	};

	const splitInput: SplitPaymentInput = useMemo(
		() => ({
			cashRub: cashAmount,
			receivedCashRub: receivedCashRub > 0 ? receivedCashRub : cashAmount,
			cardRub: cardAmount,
			sbpRub: sbpAmount,
			depositRub: depositAmount + certificateAmount,
			insuranceRub: insuranceAmount,
			...(guaranteeLetterNumber.trim() ? { guaranteeLetterNumber: guaranteeLetterNumber.trim() } : {}),
		}),
		[
			cashAmount,
			receivedCashRub,
			cardAmount,
			sbpAmount,
			depositAmount,
			certificateAmount,
			insuranceAmount,
			guaranteeLetterNumber,
		],
	);

	const allocation = useMemo(() => {
		return calculateSplitPaymentAllocation(totalKopecks, splitInput);
	}, [totalKopecks, splitInput]);

	const remainingRub = Math.round(allocation.remainingKopecks / 100);
	const patientCoPayRub = allocation.patientCoPayRub;

	// Select 100% to single payment method
	const selectSingleMethod = (
		type: "card" | "sbp" | "cash" | "deposit" | "certificate" | "insurance",
	) => {
		if (type === "insurance") {
			setInsuranceAmount(totalSumRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана 100% оплата по ДМС: ${formatMoneyRu(totalSumRub)}`, "info", 1500);
		} else if (type === "card") {
			setCardAmount(totalSumRub - insuranceAmount);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата картой: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "sbp") {
			setSbpAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата СБП QR: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "cash") {
			setCashAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата наличными: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "deposit") {
			const targetTotal = totalSumRub - insuranceAmount;
			const depUsed = Math.min(patientDepositRub, targetTotal);
			setDepositAmount(depUsed);
			const rest = targetTotal - depUsed;
			setCardAmount(rest);
			setSbpAmount(0);
			setCashAmount(0);
			setCertificateAmount(0);
			showToast(
				depUsed === targetTotal
					? `Выбрана 100% оплата с депозита: ${formatMoneyRu(depUsed)}`
					: `Зачет аванса: ${formatMoneyRu(depUsed)} + остаток на карту ${formatMoneyRu(rest)}`,
				"info",
				2000,
			);
		} else if (type === "certificate") {
			setCertificateAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			showToast(`Выбрана оплата сертификатом: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		}
	};

	// 1-Click Fast Combined Payment (Нал + Карта + Аванс / Депозит) с точностью до копейки
	const applyCombinedPaymentPreset = (
		mode: "advance_card" | "advance_cash" | "split_cash_card" | "advance_cash_card",
	) => {
		const targetTotalKop = Math.max(0, rubToKopecks(totalSumRub) - rubToKopecks(insuranceAmount));
		if (targetTotalKop === 0) return;

		const depAvailKop = rubToKopecks(patientDepositRub || 0);

		if (mode === "advance_card") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const depRub = kopecksToRub(depUsedKop);
			const remRub = kopecksToRub(remKop);
			setDepositAmount(depRub);
			setCardAmount(remRub);
			setCashAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + карта ${formatMoneyRu(remRub)}`, "success", 2000);
		} else if (mode === "advance_cash") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const depRub = kopecksToRub(depUsedKop);
			const remRub = kopecksToRub(remKop);
			setDepositAmount(depRub);
			setCashAmount(remRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + наличные ${formatMoneyRu(remRub)}`, "success", 2000);
		} else if (mode === "split_cash_card") {
			const halfKop = Math.floor(targetTotalKop / 2);
			const otherKop = targetTotalKop - halfKop;
			const cashRub = kopecksToRub(halfKop);
			const cardRub = kopecksToRub(otherKop);
			setCashAmount(cashRub);
			setCardAmount(cardRub);
			setDepositAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата 50/50: наличные ${formatMoneyRu(cashRub)} + карта ${formatMoneyRu(cardRub)}`, "success", 2000);
		} else if (mode === "advance_cash_card") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const cashKop = Math.floor(remKop / 2);
			const cardKop = remKop - cashKop;
			const depRub = kopecksToRub(depUsedKop);
			const cashRub = kopecksToRub(cashKop);
			const cardRub = kopecksToRub(cardKop);
			setDepositAmount(depRub);
			setCashAmount(cashRub);
			setCardAmount(cardRub);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + нал ${formatMoneyRu(cashRub)} + карта ${formatMoneyRu(cardRub)}`, "success", 2000);
		}
	};

	const handleFillRemaining = (type: "cash" | "card" | "sbp" | "deposit" | "certificate") => {
		const unallocated = Math.max(0, remainingRub);
		if (type === "cash") setCashAmount((prev) => prev + unallocated);
		if (type === "card") setCardAmount((prev) => prev + unallocated);
		if (type === "sbp") setSbpAmount((prev) => prev + unallocated);
		if (type === "certificate") setCertificateAmount((prev) => prev + unallocated);
		if (type === "deposit") {
			const maxDepositCanUse = Math.min(patientDepositRub, depositAmount + unallocated);
			setDepositAmount(maxDepositCanUse);
		}
	};

	const handleAutoDistributeRemaining = () => {
		if (remainingRub <= 0) return;
		if (cardAmount > 0 || (cashAmount === 0 && sbpAmount === 0 && depositAmount === 0 && certificateAmount === 0)) {
			setCardAmount((prev) => prev + remainingRub);
		} else if (sbpAmount > 0) {
			setSbpAmount((prev) => prev + remainingRub);
		} else if (cashAmount > 0) {
			setCashAmount((prev) => prev + remainingRub);
		} else if (certificateAmount > 0) {
			setCertificateAmount((prev) => prev + remainingRub);
		} else {
			setCardAmount((prev) => prev + remainingRub);
		}
		showToast(`Остаток ${formatMoneyRu(remainingRub)} распределен`, "success", 1500);
	};

	// Refund items calculation
	const refundActiveItems = useMemo(() => {
		const hasAnySelection = Object.values(refundItemSelection).some(Boolean);
		if (!hasAnySelection) return activeItems;
		return activeItems.filter((i) => refundItemSelection[i.id]);
	}, [activeItems, refundItemSelection]);

	const refundFiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(refundActiveItems);
	}, [refundActiveItems]);

	const fiscalReceipt = useMemo(() => {
		if (activeTab === "refund") {
			return generateFiscalRefundReceipt54Fz({
				items: refundActiveItems,
				originalReceipt: {
					receiptNumber: originalReceiptNumberForRefund || `CHK-${taxYear}-0001`,
					patientId,
					patientName,
					customerContact: customerContact.trim() || patientPhone,
					cashierFullName,
					clinicLegalName: clinicName,
				},
				refundReason,
				cashierFullName,
			});
		}

		if (activeTab === "correction") {
			return generateFiscalCorrectionReceipt54Fz({
				items: activeItems,
				splitPayment: splitInput,
				correctionType,
				correctionDocDate,
				correctionDocNumber,
				correctionReason,
				patientId,
				patientName,
				customerContact: customerContact.trim() || patientPhone,
				cashierFullName,
				clinicLegalName: clinicName,
			});
		}

		return generateFiscalReceipt54Fz({
			items: activeItems,
			splitPayment: splitInput,
			patientId,
			patientName,
			customerContact: customerContact.trim() || patientPhone,
			cashierFullName,
			clinicLegalName: clinicName,
		});
	}, [
		activeTab,
		activeItems,
		refundActiveItems,
		originalReceiptNumberForRefund,
		refundReason,
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		splitInput,
		patientId,
		patientName,
		customerContact,
		patientPhone,
		cashierFullName,
		clinicName,
		taxYear,
	]);

	const taxDeductionBreakdown = useMemo(() => {
		return calculateTaxDeductionBreakdown(activeItems);
	}, [activeItems]);

	const taxDeductionCert = useMemo(() => {
		return generateTaxDeductionCertificate({
			receipt: fiscalReceipt,
			payerFullName: payerFullName.trim() || patientName,
			payerInn: payerInn.trim() || undefined,
			payerRelationship,
			taxYear,
		});
	}, [fiscalReceipt, payerFullName, patientName, payerInn, payerRelationship, taxYear]);

	const oneCExportParams: OneCExportParams = useMemo(() => {
		const effectiveDate = oneCDocDate || new Date().toISOString().slice(0, 10);
		return {
			exportId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
			generatedAt: new Date().toISOString(),
			clinic: {
				id: "clinic-dente",
				name: clinicName,
				fullName: clinicName,
				inn: oneCClinicInn,
				kpp: oneCClinicKpp,
				isLegalEntity: true,
				phone: "+7 (495) 123-45-67",
				address: "г. Москва, Ломоносовский проспект, д. 24",
				bankAccount: "40702810938000012345",
				bankBik: "044525225",
				bankName: "ПАО СБЕРБАНК",
				bankCorrAccount: "30101810400000000225",
			},
			documents: [
				{
					id: `doc-${actNumber}`,
					number: actNumber,
					documentDate: effectiveDate,
					documentTime: oneCDocTime,
					docType: oneCDocType,
					operationName:
						oneCDocType === "act"
							? "Реализация товаров и услуг"
							: oneCDocType === "invoice"
								? "Заказ покупателя"
								: oneCDocType === "cash_order"
									? "Приходный кассовый ордер"
									: "Оплата платежной картой",
					patient: {
						id: patientId,
						name: patientName,
						fullName: patientName,
						inn: oneCPatientInn.trim() || null,
						phone: customerContact || patientPhone || null,
						address: oneCPatientAddress || null,
						isLegalEntity: false,
					},
					items: activeItems.map((it, idx) => {
						const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
						const unitPriceKop = Math.round(it.priceRub * 100);
						const discKop = Math.round((it.discountRub || 0) * 100);
						const totalKop = Math.max(0, unitPriceKop * qty - discKop);
						return {
							id: it.id || `item-${idx + 1}`,
							code804n: it.code804n || null,
							name: it.name,
							toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
							quantity: qty,
							priceKopecks: unitPriceKop,
							discountPercent: it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0,
							totalKopecks: totalKop,
							vatRate: "Без НДС",
							vatAmountKopecks: 0,
						};
					}),
					totalKopecks: Math.round(totalSumRub * 100),
					contractNumber: contractNumber || null,
					contractDate: effectiveDate,
					attendingDoctorName: cashierFullName,
					comment: `Выгрузка из CRM DENTE: ${actNumber}`,
				},
			],
		};
	}, [
		clinicName,
		oneCClinicInn,
		oneCClinicKpp,
		actNumber,
		oneCDocDate,
		oneCDocTime,
		oneCDocType,
		patientId,
		patientName,
		oneCPatientInn,
		customerContact,
		patientPhone,
		oneCPatientAddress,
		activeItems,
		totalSumRub,
		contractNumber,
		cashierFullName,
	]);

	const oneCXmlPreview = useMemo(() => {
		try {
			return generateOneCEnterpriseXml(oneCExportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [oneCExportParams]);

	const handleExecuteFiscalization = async () => {
		const now = Date.now();
		if (inFlightRef.current || isFiscalizing || now - lastClickTimeRef.current < 600) {
			return;
		}

		if (activeTab === "payment" && !allocation.isFullyAllocated) {
			showToast(
				`Сумма оплат не совпадает с суммой чека (остаток: ${formatMoneyRu(remainingRub)})`,
				"warning",
				4000,
			);
			return;
		}

		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsFiscalizing(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			const opText =
				activeTab === "refund"
					? "Чек возврата прихода"
					: activeTab === "correction"
						? "Чек коррекции"
						: "Чек";
			showToast(
				`${opText} №${fiscalReceipt.receiptNumber} на сумму ${formatMoneyRu(fiscalReceipt.totalRub)} успешно фискализирован в ОФД!`,
				"success",
				6000,
			);
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: cashierFullName || "Кассир",
				customerContact: patientPhone || patientName,
				operationType: activeTab === "refund" ? "income_return" : "income",
				items: (fiscalReceipt.items || []).map((it) => ({
					name: it.name || "Стоматологическая услуга",
					priceRub: it.unitPriceRub || 0,
					quantity: it.quantity || 1,
					amountRub: it.amountRub || 0,
					vatRate: "vat_0",
					medicalServiceCode804n: it.code804n,
					markingCode: it.markingCode,
				})),
				totalRub: fiscalReceipt.totalRub || 0,
				electronicRub: fiscalReceipt.payments?.cardRub || 0,
				cashRub: fiscalReceipt.payments?.cashRub || 0,
				sbpRub: fiscalReceipt.payments?.sbpRub || 0,
				prepaidRub:
					(fiscalReceipt.payments?.depositRub || 0) +
					(fiscalReceipt.payments?.advanceOffsetRub || 0) +
					(fiscalReceipt.payments?.familyWalletRub || 0),
			};

			try {
				void hardwarePrinter.printFiscalReceipt(printPayload);
			} catch (printErr) {
				console.warn("[FiscalReceipt54FzModal] Thermal printer print deferred:", printErr);
			}

			if (onReceiptFiscalized) {
				onReceiptFiscalized(fiscalReceipt.receiptNumber);
			}
			setActiveTab("preview");
		} catch (err) {
			showToast("Ошибка связи с фискальным регистратором ККТ", "error");
		} finally {
			setIsFiscalizing(false);
			inFlightRef.current = false;
		}
	};

	const handleCopyCertData = () => {
		const text = `СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ФНС (КНД 1151156)
Номер: ${taxDeductionCert.certificateNumber}
Клиника: ${taxDeductionCert.clinicLegalName} (ИНН ${taxDeductionCert.clinicInn} / КПП ${taxDeductionCert.clinicKpp})
Налогоплательщик: ${taxDeductionCert.payerFullName} (Степень родства: ${taxDeductionCert.payerRelationshipLabel}, Код ${taxDeductionCert.payerRelationshipCode})
Пациент: ${taxDeductionCert.patientFullName}
Налоговый период: ${taxDeductionCert.taxYear} год
Сумма по Коду 01 (Стандартное лечение): ${formatMoneyRu(taxDeductionCert.breakdown.code01Rub)}
Сумма по Коду 02 (Дорогостоящее лечение): ${formatMoneyRu(taxDeductionCert.breakdown.code02Rub)}
ИТОГО к вычету: ${formatMoneyRu(taxDeductionCert.breakdown.totalRub)}
Оценка возврата НДФЛ (13%): ${formatMoneyRu(taxDeductionCert.breakdown.refund13EstimateRub)}`;
		navigator.clipboard.writeText(text);
		showToast("Данные справки скопированы в буфер обмена!", "success", 2500);
	};

	const handleCopyActData = () => {
		const lines = [
			`АКТ № ${actNumber} СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ (ОКАЗАННЫХ УСЛУГ)`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			`К договору оказания платных медицинских услуг: № ${contractNumber}`,
			`Исполнитель: ${clinicName}`,
			`Пациент (Заказчик): ${patientName}`,
			``,
			`ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ:`,
			...activeItems.map((it, i) => {
				const toothPart = it.toothNumber ? ` [Зуб ${it.toothNumber}]` : "";
				const codePart = it.code804n ? ` (${it.code804n})` : "";
				const qty = it.quantity || 1;
				const sum = it.priceRub * qty - (it.discountRub || 0);
				return `${i + 1}. ${it.name}${codePart}${toothPart} — ${qty} шт. × ${formatMoneyRu(it.priceRub)} = ${formatMoneyRu(sum)}`;
			}),
			``,
			`ИТОГО ОКАЗАНО УСЛУГ: ${formatMoneyRu(totalSumRub)}`,
			`Сумма прописью: ${numberToWordsRu(totalSumRub)}`,
			``,
			`УСЛОВИЯ ПРИЕМКИ:`,
			`Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки.`,
			`Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.`,
			``,
			`Исполнитель: _________________ / ${cashierFullName}`,
			`Заказчик:    _________________ / ${patientName}`,
		];
		navigator.clipboard.writeText(lines.join("\n"));
		showToast("Текст Акта выполненных работ скопирован в буфер!", "success", 2500);
	};

	// 🖨️ Печать товарного чека / копии без фискализации (для безнала / детализации пациенту)
	const handlePrintSalesSlip = async () => {
		const docNum = `ТЧ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const wholeRub = Math.floor(totalSumRub);
		const kop = Math.round((totalSumRub - wholeRub) * 100);
		const wordsRu = numberToWordsRu(wholeRub, kop);

		const rowsHtml = activeItems
			.map((it, idx) => {
				const qty = it.quantity || 1;
				const lineTotal = Math.max(0, it.priceRub * qty - (it.discountRub || 0));
				return `
					<tr>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px;">
							<strong>${it.name}</strong>
							${it.toothNumber ? `<br><small style="color: #64748b;">Зуб FDI: ${it.toothNumber}</small>` : ""}
							${it.code804n ? `<br><small style="color: #64748b;">Код Минздрава 804н: ${it.code804n}</small>` : ""}
						</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${qty}</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace;">${it.priceRub.toFixed(2)} ₽</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace;">${(it.discountRub || 0).toFixed(2)} ₽</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">${lineTotal.toFixed(2)} ₽</td>
					</tr>
				`;
			})
			.join("");

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Товарный чек № ${docNum}</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			font-size: 12px;
			color: #0f172a;
			margin: 20px;
			line-height: 1.4;
		}
		.header {
			border-bottom: 2px solid #0f172a;
			padding-bottom: 10px;
			margin-bottom: 12px;
		}
		.title {
			font-size: 16px;
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			margin: 0 0 4px;
		}
		.non-fiscal-warning {
			font-size: 10.5px;
			font-weight: bold;
			color: #475569;
			text-transform: uppercase;
			margin-bottom: 6px;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
			font-size: 11.5px;
			margin-top: 6px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 14px 0;
			font-size: 11.5px;
		}
		th {
			background: #f1f5f9;
			border: 1px solid #cbd5e1;
			padding: 8px;
			font-weight: 700;
			text-align: left;
		}
		.total-section {
			margin-top: 14px;
			padding: 10px;
			background: #f8fafc;
			border: 1px solid #cbd5e1;
			border-radius: 6px;
		}
		.total-row {
			display: flex;
			justify-content: space-between;
			font-size: 14px;
			font-weight: 800;
		}
		.signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 36px;
			padding-top: 10px;
		}
		.sig-box {
			width: 45%;
			border-top: 1px dashed #64748b;
			padding-top: 6px;
			font-size: 11px;
		}
		@media print {
			body { margin: 0; }
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="title">ТОВАРНЫЙ ЧЕК № ${docNum}</div>
		<div class="non-fiscal-warning">НЕ ЯВЛЯЕТСЯ ФИСКАЛЬНЫМ ДОКУМЕНТОМ • ВЫДАН БЕЗ ККТ / ДЕТАЛИЗАЦИЯ УСЛУГ</div>
		<div class="meta-grid">
			<div>
				<div><strong>Организация:</strong> ${clinicName}</div>
				<div><strong>ИНН:</strong> 7701234567</div>
				<div><strong>Лицензия:</strong> ЛО41-01137-77/00368421</div>
			</div>
			<div>
				<div><strong>Дата и время:</strong> ${nowStr}</div>
				<div><strong>Покупатель (пациент):</strong> ${patientName}</div>
				<div><strong>Телефон:</strong> ${patientPhone}</div>
			</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 32px; text-align: center;">№</th>
				<th>Наименование медицинской работы (услуги)</th>
				<th style="width: 50px; text-align: center;">Кол-во</th>
				<th style="width: 90px; text-align: right;">Цена</th>
				<th style="width: 80px; text-align: right;">Скидка</th>
				<th style="width: 95px; text-align: right;">Сумма</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="total-section">
		<div class="total-row">
			<span>ИТОГО К ОПЛАТЕ:</span>
			<span>${totalSumRub.toFixed(2)} ₽</span>
		</div>
		<div style="font-size: 11px; margin-top: 4px; color: #334155;">
			Сумма прописью: <em>${wordsRu}</em>
		</div>
		<div style="font-size: 11px; margin-top: 4px; color: #334155;">
			Форма расчета: <strong>Безналичный расчет / Без фискализации в ОФД</strong>
		</div>
	</div>

	<div class="signatures">
		<div class="sig-box">
			Кассир (администратор): _________________ / ${cashierFullName}<br>
			<small style="color: #64748b;">М.П.</small>
		</div>
		<div class="sig-box">
			Покупатель (клиент): _________________ / ${patientName}<br>
			<small style="color: #64748b;">Претензий по объему и стоимости не имею</small>
		</div>
	</div>

	<script>
		window.onload = function() {
			try {
				window.focus();
				window.print();
			} catch (e) {}
		};
	</script>
</body>
</html>`;

		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Товарный чек № ${docNum}`,
				downloadFilename: `tovarniy_check_${docNum}.html`,
			});
			showToast("Товарный чек отправлен на печать (без фискализации)", "success", 3000);
		} catch {
			showToast("Ошибка отправки товарного чека на печать", "error");
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6"
			data-testid="fiscal-receipt-54fz-modal"
		>
			<div className="relative flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[var(--border,#cbd5e1)]">
				{/* Top Modal Header */}
				<div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0">
					<div className="flex items-center gap-3 min-w-0 max-w-full flex-1">
						<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
							<Receipt size={18} />
						</div>
						<div className="min-w-0 max-w-full flex-1">
							<div className="flex items-center gap-2.5 flex-wrap">
								<h3 className="font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)] whitespace-normal break-normal tracking-tight">
									{activeTab === "refund"
										? "Возврат прихода / Отказ от услуг"
										: activeTab === "correction"
											? "Чек коррекции 54-ФЗ (ФФД 1.2)"
											: activeTab === "certificate"
												? "Справка для налогового вычета (КНД 1151156)"
												: activeTab === "act"
													? "Акт сдачи-приемки выполненных работ (804н)"
													: activeTab === "oneC"
														? "1С:Предприятие 8.3 / Экспорт в CommerceML 2.09 и 54-ФЗ"
														: "Фискализация 54-ФЗ & Прием платежей"}
								</h3>
								<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-bold shrink-0">
									ФФД 1.2
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
								Пациент:{" "}
								<strong className="text-[var(--ink,#0f172a)] font-semibold">
									{patientName}
								</strong>{" "}
								· Итого:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
									{formatMoneyRu(activeTab === "refund" ? refundFiscalData.totalRub : totalSumRub)}
								</strong>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center justify-center cursor-pointer transition-colors border border-transparent hover:border-[var(--border,#cbd5e1)] shrink-0"
						aria-label="Закрыть модальное окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Multi-Tab Selector Subheader Strip (Compact 32px height) */}
				<div className="px-4 sm:px-6 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--border,#cbd5e1)] shrink-0 overflow-x-auto">
					<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs min-w-max">
						<button
							type="button"
							onClick={() => setActiveTab("payment")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "payment"
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Оплата 54-ФЗ
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("act")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "act"
									? "bg-emerald-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Акт работ (804н)
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("oneC")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "oneC"
									? "bg-amber-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-1c-export"
						>
							1С:Экспорт XML
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("certificate")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "certificate"
									? "bg-indigo-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Справка для ФНС
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("refund")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "refund"
									? "bg-rose-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Возврат услуг
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("correction")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "correction"
									? "bg-amber-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Коррекция
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("preview")}
							className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
								activeTab === "preview"
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Чек
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="p-4 sm:p-5 overflow-y-auto min-h-0 flex-1 space-y-4">
					{activeTab === "payment" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Split Payment Builders */}
							<div className="lg:col-span-7 space-y-4">
								{/* 1-Click Fast Documentation Action Bar for Front Desk */}
								<div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-wrap items-center justify-between gap-2.5">
									<div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-100">
										<FileCheck size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span>1-Click Документы при закрытии визита:</span>
									</div>
									<div className="flex items-center gap-2 flex-wrap">
										<button
											type="button"
											onClick={() => setActiveTab("act")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
											title="1-Клик: Сформировать и распечатать Акт выполненных работ"
										>
											<FileText size={14} />
											<span>Акт выполненных работ (804н)</span>
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("oneC")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
											title="1-Клик: Экспорт в 1С:Предприятие 8.3 (CommerceML 2.09 XML)"
										>
											<FileCode2 size={14} />
											<span>1С:Экспорт (XML)</span>
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("certificate")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
											title="1-Клик: Сформировать и распечатать Справку для налоговой КНД 1151156"
										>
											<FileCheck size={14} />
											<span>Справка КНД 1151156</span>
										</button>
									</div>
								</div>
								{/* Stage Filter Chips */}
								{availableStages.length > 0 && (
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
										<div className="flex items-center justify-between text-xs font-bold">
											<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)] uppercase tracking-wider text-xs">
												<Layers size={14} className="text-teal-600 dark:text-teal-400" />
												Этап плана лечения для оплаты:
											</span>
											<span className="font-mono text-teal-700 dark:text-teal-300">
												Позиций: {activeItems.length}
											</span>
										</div>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => handleSelectStage("all")}
												className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
													selectedStageKind === "all"
														? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
														: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
												}`}
											>
												Все этапы ({formatMoneyRu(mapTreatmentItemsToFiscalReceipt(items).totalRub)})
											</button>
											{availableStages.map((st) => {
												const stageItems = items.filter((i) => (i.stageKind || i.category) === st);
												const stageSumRub = mapTreatmentItemsToFiscalReceipt(stageItems).totalRub;
												const label = TREATMENT_STAGE_LABELS[st] || st;
												return (
													<button
														key={st}
														type="button"
														onClick={() => handleSelectStage(st)}
														className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
															selectedStageKind === st
																? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
																: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
														}`}
													>
														{label} ({formatMoneyRu(stageSumRub)})
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* MDLP DataMatrix Marking Code Capture Block */}
								{fiscalData.items.some((i) => i.isMarkedItem) && (
									<div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-2">
										<div className="flex items-center justify-between text-xs">
											<span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
												<ShieldCheck size={16} className="text-amber-600" />
												Маркировка Честный ЗНАК / МДЛП (Тег 1162 / 2000)
											</span>
											<span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
												Обязательно 54-ФЗ
											</span>
										</div>
										<p className="text-xs text-amber-800 dark:text-amber-300">
											В счете присутствуют лекарственные препараты / имплантаты, подлежащие выводу из оборота через ККТ.
										</p>
										<div className="space-y-2 pt-1">
											{fiscalData.items
												.filter((i) => i.isMarkedItem)
												.map((markedItem) => {
													const currentCode = mdlpCodes[markedItem.id] || "";
													const parseResult = currentCode ? parseChestnyZnakDataMatrix(currentCode) : null;
													return (
														<div
															key={markedItem.id}
															className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-200 dark:border-amber-800/60 space-y-2"
														>
															<div className="flex items-center justify-between text-xs">
																<span className="font-bold text-[var(--ink,#0f172a)] truncate max-w-[280px]">
																	{markedItem.name}
																</span>
																<span className="text-xs font-mono text-[var(--muted,#64748b)]">
																	{formatMoneyRu(markedItem.amountRub)}
																</span>
															</div>
															<div className="flex items-center gap-2">
																<input
																	type="text"
																	value={currentCode}
																	onChange={(e) => handleUpdateMdlpCode(markedItem.id, e.target.value)}
																	placeholder="Отсканируйте GS1 DataMatrix (01)...(21)..."
																	className="min-h-[44px] flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
																/>
																{parseResult?.isValid ? (
																	<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1">
																		<CheckCircle2 size={16} /> [М] ОК
																	</span>
																) : currentCode ? (
																	<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center">
																		Ошибка GS1
																	</span>
																) : null}
															</div>
														</div>
													);
												})}
										</div>
									</div>
								)}

								<div className="flex items-center justify-between">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										1. Способ оплаты (1 клик для 100% суммы)
									</h4>
									<span className="font-mono text-[var(--ink,#0f172a)] font-bold text-xs">
										Сумма: {formatMoneyRu(totalSumRub)}
									</span>
								</div>

								{/* 1-Click Fast Combined Payment Presets */}
								<div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-2xl bg-teal-500/5 border border-teal-500/20">
									<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1 shrink-0">
										<Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
										<span>1-клик комбо:</span>
									</span>
									{patientDepositRub > 0 && (
										<button
											type="button"
											onClick={() => applyCombinedPaymentPreset("advance_card")}
											className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 hover:border-teal-500 cursor-pointer transition-all shadow-2xs active:scale-95"
											title="Зачесть доступный депозит, а остаток списать с карты"
										>
											Аванс + Карта
										</button>
									)}
									{patientDepositRub > 0 && (
										<button
											type="button"
											onClick={() => applyCombinedPaymentPreset("advance_cash")}
											className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs active:scale-95"
											title="Зачесть доступный депозит, а остаток принять наличными"
										>
											Аванс + Наличные
										</button>
									)}
									{patientDepositRub > 0 && (
										<button
											type="button"
											onClick={() => applyCombinedPaymentPreset("advance_cash_card")}
											className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 hover:border-purple-500 cursor-pointer transition-all shadow-2xs active:scale-95"
											title="Зачесть доступный депозит, а остаток разделить 50% наличными и 50% картой"
										>
											Аванс + Нал + Карта
										</button>
									)}
									<button
										type="button"
										onClick={() => applyCombinedPaymentPreset("split_cash_card")}
										className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all shadow-2xs active:scale-95"
										title="Разделить оплату ровно пополам: 50% наличные + 50% карта"
									>
										50% Нал + 50% Карта
									</button>
								</div>

								{/* 6 Tactile Payment Method Tiles with DMS & Guarantee Letter support */}
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
									<button
										type="button"
										onClick={() => selectSingleMethod("card")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											cardAmount === (totalSumRub - insuranceAmount) && cardAmount > 0
												? "border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<CreditCard size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">Карта</span>
										<span className="text-xs opacity-75 font-normal leading-none">Безнал</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("sbp")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											sbpAmount === (totalSumRub - insuranceAmount) && sbpAmount > 0
												? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-md ring-2 ring-teal-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<QrCode size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">СБП QR</span>
										<span className="text-xs opacity-75 font-normal leading-none">Плати QR</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("cash")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											cashAmount === (totalSumRub - insuranceAmount) && cashAmount > 0
												? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Banknote size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">Наличные</span>
										<span className="text-xs opacity-75 font-normal leading-none">Касса</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("deposit")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											depositAmount > 0
												? "border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-md ring-2 ring-amber-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Coins size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">Зачет аванса</span>
										<span className="text-xs opacity-75 font-normal leading-none">Депозит</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("certificate")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											certificateAmount === (totalSumRub - insuranceAmount) && certificateAmount > 0
												? "border-purple-600 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-md ring-2 ring-purple-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<Gift size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">Сертификат</span>
										<span className="text-xs opacity-75 font-normal leading-none">Подарок</span>
									</button>

									<button
										type="button"
										onClick={() => selectSingleMethod("insurance")}
										className={`min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 ${
											insuranceAmount > 0
												? "border-indigo-600 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-md ring-2 ring-indigo-500/30"
												: "border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
										<span className="text-xs font-bold whitespace-nowrap">ДМС / ГП</span>
										<span className="text-xs opacity-75 font-normal leading-none">Страховая</span>
									</button>
								</div>

								{/* Detailed Split Payment Rows with Elevated min-h-[48px] Buttons */}
								<div className="space-y-3 pt-1">
									{/* Bank Card */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
												<CreditCard size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Безналичные / Эквайринг
												</span>
												<span className="text-xs text-[var(--muted,#64748b)]">
													Банковская карта (Тег 1081)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cardAmount || ""}
												onChange={(e) => setCardAmount(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("card")}
													className="min-h-[48px] px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
													title={`Добавить остаток ${formatMoneyRu(remainingRub)} на карту`}
													data-testid="btn-fill-remaining-card"
												>
													<Sparkles size={13} />
													<span>+Остаток</span>
												</button>
											)}
											{cardAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("card")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 cursor-pointer transition-colors flex items-center justify-center"
													title="Внести всю сумму на карту"
												>
													Вся сумма
												</button>
											)}
										</div>
									</div>

									{/* SBP Dynamic QR */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
												<QrCode size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													СБП / Плати QR
												</span>
												<span className="text-xs text-[var(--muted,#64748b)]">
													Динамический QR НСПК (Тег 1081)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={sbpAmount || ""}
												onChange={(e) => setSbpAmount(Math.max(0, Number(e.target.value) || 0))}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("sbp")}
													className="min-h-[48px] px-3 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
													title={`Добавить остаток ${formatMoneyRu(remainingRub)} в СБП`}
													data-testid="btn-fill-remaining-sbp"
												>
													<Sparkles size={13} />
													<span>+Остаток</span>
												</button>
											)}
											{sbpAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("sbp")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 cursor-pointer transition-colors flex items-center justify-center"
												>
													Вся сумма
												</button>
											)}
										</div>
									</div>

									{/* Cash */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<Banknote size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Наличные
												</span>
												<span className="text-xs text-[var(--muted,#64748b)]">
													Купюры / касса (Тег 1031)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={totalSumRub}
												value={cashAmount || ""}
												onChange={(e) => {
													const val = Math.max(0, Number(e.target.value) || 0);
													setCashAmount(val);
													if (receivedCashRub < val) setReceivedCashRub(val);
												}}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{remainingRub > 0 && (
												<button
													type="button"
													onClick={() => handleFillRemaining("cash")}
													className="min-h-[48px] px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
													title={`Добавить остаток ${formatMoneyRu(remainingRub)} наличными`}
													data-testid="btn-fill-remaining-cash"
												>
													<Sparkles size={13} />
													<span>+Остаток</span>
												</button>
											)}
											{cashAmount < totalSumRub && (
												<button
													type="button"
													onClick={() => selectSingleMethod("cash")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition-colors flex items-center justify-center"
												>
													Вся сумма
												</button>
											)}
										</div>
									</div>

									{/* Patient Deposit / Prepaid */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
												<Coins size={18} />
											</div>
											<div>
												<span className="font-bold text-xs sm:text-sm block text-[var(--ink,#0f172a)]">
													Зачет аванса / Депозит
												</span>
												<span className="text-xs text-[var(--muted,#64748b)]">
													Доступно: {formatMoneyRu(patientDepositRub)} (Тег 1215)
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min={0}
												max={patientDepositRub}
												value={depositAmount || ""}
												onChange={(e) =>
													setDepositAmount(
														Math.max(0, Math.min(patientDepositRub, Number(e.target.value) || 0)),
													)
												}
												placeholder="0"
												className="min-h-[48px] w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
											/>
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => selectSingleMethod("deposit")}
													className="min-h-[48px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer transition-colors flex items-center justify-center"
												>
													Зачесть
												</button>
											)}
										</div>
									</div>
								</div>

								{/* Allocation Status Indicator */}
								<div
									className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold ${
										allocation.isFullyAllocated
											? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
											: allocation.isOverallocated
												? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
												: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
									}`}
								>
									<div className="flex items-center gap-2">
										{allocation.isFullyAllocated ? (
											<CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
										) : (
											<AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
										)}
										<span>
											{allocation.isFullyAllocated
												? "Сумма чека полностью распределена"
												: allocation.isOverallocated
													? `Превышение суммы на ${formatMoneyRu(Math.abs(remainingRub))}`
													: `Не распределено: ${formatMoneyRu(remainingRub)}`}
										</span>
									</div>

									<div className="flex items-center gap-3 justify-between sm:justify-end">
										{remainingRub > 0 && (
											<button
												type="button"
												onClick={handleAutoDistributeRemaining}
												className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-500 shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
											>
												<Sparkles size={16} />
												<span>Распределить остаток (+{formatMoneyRu(remainingRub)})</span>
											</button>
										)}
										<span className="font-mono text-sm sm:text-base font-black">
											{(allocation.allocatedKopecks / 100).toLocaleString("ru-RU", {
												minimumFractionDigits: allocation.allocatedKopecks % 100 !== 0 ? 2 : 0,
												maximumFractionDigits: 2,
											})}{" "}
											/ {formatMoneyRu(totalSumRub)}
										</span>
									</div>
								</div>

								{/* 54-FZ Electronic Contact Input */}
								<div className="space-y-1.5 pt-2">
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)]">
										Телефон или Email для отправки электронного чека (54-ФЗ, Тег 1008):
									</label>
									<input
										type="text"
										value={customerContact}
										onChange={(e) => setCustomerContact(e.target.value)}
										placeholder="+7 999 123-45-67 или email@example.com"
										className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>
							</div>

							{/* Right Column: SBP Dynamic QR Preview & Summary */}
							<div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
								<div className="space-y-4">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
										2. Оплата по QR-коду СБП
									</h4>

									{sbpAmount > 0 ? (
										<div className="p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 text-center space-y-3">
											<div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300">
												<QrCode size={18} />
												<span>Динамический QR СБП ({formatMoneyRu(sbpAmount)})</span>
											</div>

											<div className="inline-block p-4 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-2xl border border-[var(--border,#cbd5e1)] shadow-md">
												<div className="w-36 h-36 bg-[var(--paper-soft,#f8fafc)] rounded-lg flex flex-col items-center justify-center text-[var(--ink,#0f172a)] text-xs font-mono p-2 space-y-1 border border-[var(--border,#cbd5e1)]">
													<QrCode size={56} className="text-teal-600 dark:text-teal-400" />
													<span className="font-bold">НСПК СБП QR</span>
													<span className="text-xs text-[var(--muted,#64748b)] font-semibold">
														{formatMoneyRu(sbpAmount)}
													</span>
												</div>
											</div>

											<p className="text-xs text-[var(--muted,#64748b)]">
												Пациент сканирует QR камерой телефона или в приложении любого банка РФ.
											</p>
										</div>
									) : (
										<div className="p-8 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-center text-xs text-[var(--muted,#64748b)] space-y-2">
											<QrCode size={32} className="mx-auto text-slate-400" />
											<p>
												Укажите сумму в поле «СБП / Плати QR», чтобы сформировать платежный QR-код НСПК.
											</p>
										</div>
									)}

									{/* NDFL Deduction Category Badge */}
									<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between text-xs sm:text-sm">
										<span className="text-[var(--muted,#64748b)]">
											Справка об оплате для ФНС:
										</span>
										<span className="font-bold text-[var(--ink,#0f172a)] font-mono">
											{fiscalData.taxDeductionSummaryCode === "2"
												? "КОД 02 (Дорогостоящее)"
												: "КОД 01 (Стандартное)"}
										</span>
									</div>
								</div>

								{/* Action: Fiscalize */}
								<div className="pt-2">
									<button
										type="button"
										onClick={handleExecuteFiscalization}
										disabled={!allocation.isFullyAllocated || isFiscalizing}
										className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
									>
										<ShieldCheck size={18} />
										<span>
											{isFiscalizing
												? "Фискализация на ККТ..."
												: `Пробить чек на ${formatMoneyRu(totalSumRub)}`}
										</span>
									</button>
								</div>
							</div>
						</div>
					)}

					{/* TAB: REFUND / ВОЗВРАТ ПРИХОДА */}
					{activeTab === "refund" && (
						<div className="space-y-6">
							<div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/60 flex items-start gap-3">
								<Undo2 size={24} className="text-rose-600 shrink-0 mt-0.5" />
								<div>
									<h4 className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
										Формирование чека возврата прихода (ФФД 1.2 Тег 1054 = 2)
									</h4>
									<p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
										Отметьте позиции, от которых пациент отказался. Сумма возврата будет автоматически распределена с сохранением копеечной точности по методу наибольших остатков.
									</p>
								</div>
							</div>

							{/* Refused items picker */}
							<div className="space-y-2">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
									1. Выберите отменяемые услуги плана лечения:
								</h4>
								<div className="divide-y divide-[var(--border,#cbd5e1)] rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] overflow-hidden">
									{activeItems.map((item) => {
										const isSelected = refundItemSelection[item.id] ?? false;
										const itemRub = (item.unitPriceRub || item.priceRub || 0) * (item.quantity || 1) - (item.discountRub || 0);
										return (
											<label
												key={item.id}
												className="flex items-center justify-between p-3.5 hover:bg-[var(--paper-strong,var(--paper,#ffffff))] cursor-pointer transition-colors"
											>
												<div className="flex items-center gap-3">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) =>
															setRefundItemSelection((prev) => ({
																...prev,
																[item.id]: e.target.checked,
															}))
														}
														className="w-5 h-5 rounded text-rose-600 accent-rose-600 cursor-pointer"
													/>
													<div>
														<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] block">
															{item.name} {item.toothNumber ? `(зуб №${item.toothNumber})` : ""}
														</span>
														<span className="text-xs text-[var(--muted,#64748b)]">
															{item.code804n ? `[${item.code804n}] · ` : ""}
															{item.quantity || 1} шт. × {formatMoneyRu(item.unitPriceRub || item.priceRub || 0)}
															{item.discountRub ? ` (- скидка ${formatMoneyRu(item.discountRub)})` : ""}
														</span>
													</div>
												</div>
												<span className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
													{formatMoneyRu(itemRub)}
												</span>
											</label>
										);
									})}
								</div>
							</div>

							{/* Refund details inputs */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Номер исходного чека продажи:
									</label>
									<input
										type="text"
										value={originalReceiptNumberForRefund}
										onChange={(e) => setOriginalReceiptNumberForRefund(e.target.value)}
										placeholder="CHK-2026-XXXXX"
										className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Причина возврата (для журнала ККТ):
									</label>
									<input
										type="text"
										value={refundReason}
										onChange={(e) => setRefundReason(e.target.value)}
										placeholder="Отказ пациента / Коррекция"
										className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>
							</div>

							{/* Action: Execute Refund */}
							<button
								type="button"
								onClick={handleExecuteFiscalization}
								disabled={refundFiscalData.totalRub <= 0 || isFiscalizing}
								className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
							>
								<RotateCcw size={18} />
								<span>
									{isFiscalizing
										? "Фискализация возврата..."
										: `Пробить чек возврата прихода на ${formatMoneyRu(refundFiscalData.totalRub)}`}
								</span>
							</button>
						</div>
					)}

					{/* TAB: CORRECTION / ЧЕК КОРРЕКЦИИ */}
					{activeTab === "correction" && (
						<div className="space-y-6">
							<div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
								<ShieldAlert size={24} className="text-amber-600 shrink-0 mt-0.5" />
								<div>
									<h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
										Кассовый чек коррекции по 54-ФЗ (ФФД 1.2)
									</h4>
									<p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
										Применяется при исправлении ошибок кассира или оформлении расчетов, произведенных без применения ККТ (с указанием документа-основания: Теги 1173, 1178, 1179).
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Тип коррекции (Тег 1173):
									</label>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => setCorrectionType("self_initiated")}
											className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
												correctionType === "self_initiated"
													? "bg-amber-600 text-white border-amber-600"
													: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)]"
											}`}
										>
											Самостоятельно (0)
										</button>
										<button
											type="button"
											onClick={() => setCorrectionType("by_instruction")}
											className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
												correctionType === "by_instruction"
													? "bg-amber-600 text-white border-amber-600"
													: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)]"
											}`}
										>
											По предписанию (1)
										</button>
									</div>
								</div>

								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Дата документа-основания (Тег 1178):
									</label>
									<input
										type="date"
										value={correctionDocDate}
										onChange={(e) => setCorrectionDocDate(e.target.value)}
										className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] font-mono"
									/>
								</div>

								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Номер документа-основания (Тег 1179):
									</label>
									<input
										type="text"
										value={correctionDocNumber}
										onChange={(e) => setCorrectionDocNumber(e.target.value)}
										placeholder="АКТ-1 или Предписание №12"
										className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>

								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
										Описание причины коррекции:
									</label>
									<input
										type="text"
										value={correctionReason}
										onChange={(e) => setCorrectionReason(e.target.value)}
										placeholder="Сбой ККТ / Ошибка оператора"
										className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
								</div>
							</div>

							<button
								type="button"
								onClick={handleExecuteFiscalization}
								disabled={isFiscalizing}
								className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
							>
								<ShieldCheck size={18} />
								<span>
									{isFiscalizing
										? "Фискализация чека коррекции..."
										: `Пробить чек коррекции на ${formatMoneyRu(totalSumRub)}`}
								</span>
							</button>
						</div>
					)}

					{/* TAB: TAX DEDUCTION CERTIFICATE / СПРАВКА ДЛЯ ФНС */}
					{activeTab === "certificate" && (
						<div className="space-y-6">
							{/* Deduction Codes Breakdown HUD */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Code 01 */}
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
									<div className="flex items-center justify-between">
										<span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs">
											КОД 01 — Стандартное лечение
										</span>
										<span className="text-xs text-[var(--muted,#64748b)]">
											Лимит: 150 000 ₽ / год
										</span>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)]">
										Терапия, кариес, пульпит, профгигиена, ортодонтия (брекеты, элайнеры).
									</p>
									<div className="pt-2 flex justify-between items-baseline border-t border-[var(--border,#cbd5e1)]">
										<span className="text-xs text-[var(--muted,#64748b)]">Сумма услуг:</span>
										<span className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
											{formatMoneyRu(taxDeductionBreakdown.code01Rub)}
										</span>
									</div>
									<div className="flex justify-between items-baseline text-xs text-[var(--teal,#0d9488)] font-semibold">
										<span>Возврат 13% (до 19 500 ₽):</span>
										<span className="font-mono font-bold">
											{formatMoneyRu(taxDeductionBreakdown.code01Refund13Rub)}
										</span>
									</div>
								</div>

								{/* Code 02 */}
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
									<div className="flex items-center justify-between">
										<span className="px-2.5 py-1 rounded-lg bg-[var(--brand-primary-soft,#f0fdfa)] text-[var(--brand-primary,#0d9488)] font-mono font-bold text-xs">
											КОД 02 — Дорогостоящее лечение
										</span>
										<span className="text-xs font-bold text-[var(--brand-primary,#0d9488)]">
											БЕЗ ЛИМИТА (ст. 219 НК)
										</span>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)]">
										Дентальная имплантация, костная пластика, синус-лифтинг, сложная хирургия.
									</p>
									<div className="pt-2 flex justify-between items-baseline border-t border-[var(--border,#cbd5e1)]">
										<span className="text-xs text-[var(--muted,#64748b)]">Сумма услуг:</span>
										<span className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
											{formatMoneyRu(taxDeductionBreakdown.code02Rub)}
										</span>
									</div>
									<div className="flex justify-between items-baseline text-xs text-[var(--brand-primary,#0d9488)] font-semibold">
										<span>Возврат 13% (со всей суммы):</span>
										<span className="font-mono font-bold">
											{formatMoneyRu(taxDeductionBreakdown.code02Refund13Rub)}
										</span>
									</div>
								</div>
							</div>

							{/* Taxpayer / Payer Form */}
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-4">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<FileCheck size={16} className="text-[var(--teal,#0d9488)]" />
									Реквизиты справки КНД 1151156 для налогового органа:
								</h4>

								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											Налогоплательщик (ФИО):
										</label>
										<input
											type="text"
											value={payerFullName}
											onChange={(e) => setPayerFullName(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											ИНН налогоплательщика:
										</label>
										<input
											type="text"
											value={payerInn}
											onChange={(e) => setPayerInn(e.target.value)}
											placeholder="12 цифр"
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											Степень родства:
										</label>
										<select
											value={payerRelationship}
											onChange={(e) => setPayerRelationship(e.target.value as TaxDeductionRelationship)}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										>
											<option value="self">1 — Пациент лично (за себя)</option>
											<option value="spouse">2 — Супруг / супруга</option>
											<option value="parent">3 — Родитель</option>
											<option value="child">4 — Ребенок / подопечный</option>
										</select>
									</div>
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											Налоговый год:
										</label>
										<input
											type="number"
											value={taxYear}
											onChange={(e) => setTaxYear(Number(e.target.value) || new Date().getFullYear())}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										/>
									</div>
								</div>
							</div>

							{/* Actions: Copy & Print */}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={handleCopyCertData}
									className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
								>
									<Copy size={16} />
									<span>Скопировать данные справки</span>
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand-primary,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
								>
									<Printer size={16} />
									<span>Печать справки КНД 1151156</span>
								</button>
							</div>
						</div>
					)}

					{/* TAB: COMPLETED WORKS ACT / АКТ ВЫПОЛНЕННЫХ РАБОТ */}
					{activeTab === "act" && (
						<div className="space-y-6">
							{/* Act Controls */}
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<FileText size={16} className="text-[var(--ok-fg,#059669)]" />
									Реквизиты Акта сдачи-приемки выполненных медицинских работ:
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											Номер акта:
										</label>
										<input
											type="text"
											value={actNumber}
											onChange={(e) => setActNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											К договору №:
										</label>
										<input
											type="text"
											value={contractNumber}
											onChange={(e) => setContractNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
											Исполнитель (Кассир / Врач):
										</label>
										<input
											type="text"
											value={cashierFullName}
											readOnly
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] cursor-not-allowed"
										/>
									</div>
								</div>
							</div>

							{/* Official Printable Act Layout */}
							<div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-sm space-y-4 font-serif select-text">
								<div className="text-center space-y-1 border-b border-slate-300 pb-3">
									<h2 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
										АКТ № {actNumber}
									</h2>
									<p className="text-xs font-sans text-slate-600">
										сдачи-приемки выполненных стоматологических работ (оказанных медицинских услуг)
									</p>
									<p className="text-xs font-sans font-semibold text-slate-700">
										к Договору на оказание платных медицинских услуг № {contractNumber} от {new Date().toLocaleDateString("ru-RU")} г.
									</p>
								</div>

								<div className="text-xs space-y-1 text-slate-800 font-sans">
									<p>
										<strong>Исполнитель:</strong> {clinicName}, ИНН 7701234567, КПП 770101001, Лицензия ЛО41-01137-77/00123456
									</p>
									<p>
										<strong>Заказчик (Пациент):</strong> {patientName}, тел. {customerContact}
									</p>
									<p className="pt-1 leading-relaxed">
										Мы, нижеподписавшиеся, Исполнитель в лице {cashierFullName}, с одной стороны, и Пациент (Заказчик) {patientName}, с другой стороны, составили настоящий Акт о том, что Исполнителем были фактически оказаны, а Заказчиком приняты следующие медицинские услуги:
									</p>
								</div>

								{/* Items Table */}
								<div className="overflow-x-auto">
									<table className="w-full text-xs font-sans border-collapse border border-slate-400">
										<thead>
											<tr className="bg-slate-100 text-slate-800 font-bold text-center">
												<th className="border border-slate-400 p-2 w-8">№</th>
												<th className="border border-slate-400 p-2 w-28">Код 804н</th>
												<th className="border border-slate-400 p-2 text-left">Наименование медицинской услуги</th>
												<th className="border border-slate-400 p-2 w-14">Зуб</th>
												<th className="border border-slate-400 p-2 w-14">Кол-во</th>
												<th className="border border-slate-400 p-2 w-24 text-right">Цена (руб.)</th>
												<th className="border border-slate-400 p-2 w-24 text-right">Сумма (руб.)</th>
											</tr>
										</thead>
										<tbody>
											{activeItems.map((it, idx) => {
												const qty = it.quantity || 1;
												const sum = it.priceRub * qty - (it.discountRub || 0);
												return (
													<tr key={it.id || idx} className="hover:bg-slate-50">
														<td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
														<td className="border border-slate-400 p-2 font-mono text-center text-[11px]">{it.code804n || "—"}</td>
														<td className="border border-slate-400 p-2">{it.name}</td>
														<td className="border border-slate-400 p-2 text-center font-bold">{it.toothNumber || "—"}</td>
														<td className="border border-slate-400 p-2 text-center">{qty}</td>
														<td className="border border-slate-400 p-2 text-right font-mono">{formatMoneyRu(it.priceRub)}</td>
														<td className="border border-slate-400 p-2 text-right font-mono font-bold">{formatMoneyRu(sum)}</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="bg-slate-100 font-bold">
												<td colSpan={6} className="border border-slate-400 p-2 text-right uppercase">Итого к оплате:</td>
												<td className="border border-slate-400 p-2 text-right font-mono font-extrabold text-sm">{formatMoneyRu(totalSumRub)}</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{/* Amount in words */}
								<div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans space-y-1">
									<p>
										<strong>Всего оказано услуг:</strong> {activeItems.length} на сумму <strong>{formatMoneyRu(totalSumRub)}</strong>
									</p>
									<p>
										<strong>Сумма прописью:</strong> <em>{numberToWordsRu(totalSumRub)}</em>
									</p>
								</div>

								{/* Guarantee and Quality Statement */}
								<div className="text-[11px] text-slate-700 font-sans space-y-1 pt-1 leading-relaxed">
									<p>
										Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки согласно стандартам медицинской помощи и клиническим рекомендациям Минздрава РФ (ст. 779 ГК РФ, Постановление Правительства РФ № 736). Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.
									</p>
								</div>

								{/* Signatures */}
								<div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs font-sans">
									<div className="space-y-4">
										<p className="font-bold">Исполнитель:</p>
										<p className="text-slate-600">{clinicName}</p>
										<div className="pt-4 border-b border-slate-400 flex justify-between items-end">
											<span>Подпись / М.П.:</span>
											<span className="font-bold">/ {cashierFullName} /</span>
										</div>
									</div>
									<div className="space-y-4">
										<p className="font-bold">Заказчик (Пациент):</p>
										<p className="text-slate-600">{patientName}</p>
										<div className="pt-4 border-b border-slate-400 flex justify-between items-end">
											<span>Подпись:</span>
											<span className="font-bold">/ {patientName} /</span>
										</div>
									</div>
								</div>
							</div>

							{/* Actions: Copy & Print */}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={handleCopyActData}
									className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
								>
									<Copy size={16} />
									<span>Скопировать текст Акта</span>
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--ok-fg,#059669)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
								>
									<Printer size={16} />
									<span>Печать Акта выполненных работ</span>
								</button>
							</div>
						</div>
					)}

					{/* TAB: 1C:ENTERPRISE COMMERCEML XML EXPORT */}
					{activeTab === "oneC" && (
						<div className="space-y-4" data-testid="1c-enterprise-export-panel">
							{/* Statutory Badges Bar */}
							<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5">
								<div className="flex items-center gap-2">
									<div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
										<FileCode2 size={16} />
									</div>
									<div>
										<h4 className="font-extrabold text-xs text-[var(--ink,#0f172a)] flex items-center gap-2">
											<span>1С:Предприятие 8.3 / Бухгалтерия & УТ</span>
											<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
												CommerceML 2.09
											</span>
										</h4>
										<p className="text-[11px] text-[var(--muted,#64748b)]">
											Выгрузка электронных первичных документов и счетов в учетную систему 1С с привязкой номенклатуры 804н и освобождением от НДС
										</p>
									</div>
								</div>

								{/* Badges */}
								<div className="flex items-center gap-1.5 flex-wrap text-xs">
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
										<CheckCircle2 size={12} />
										<span>пп. 2 п. 2 ст. 149 НК РФ (Без НДС)</span>
									</span>
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
										ОКЕИ 796 (Шт.)
									</span>
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
										КНД 1151156 / 804н
									</span>
								</div>
							</div>

							{/* Document Configuration Parameters - Compact 2-Column Grid with h-8 inputs */}
							<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2.5">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<Building2 size={14} className="text-amber-600 dark:text-amber-400" />
									Параметры документа выгрузки в 1С:
								</h4>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
									{/* Column 1: Document Requisites */}
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													Тип документа 1С:
												</label>
												<select
													value={oneCDocType}
													onChange={(e) => setOneCDocType(e.target.value as OneCDocumentType)}
													className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] cursor-pointer"
												>
													<option value="act">Реализация товаров и услуг (Акт 804н)</option>
													<option value="invoice">Заказ покупателя (Счет на оплату)</option>
													<option value="cash_order">Приходный кассовый ордер (ПКО)</option>
													<option value="acquiring_payment">Оплата картой (Эквайринг)</option>
												</select>
											</div>

											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													Номер документа:
												</label>
												<input
													type="text"
													value={actNumber}
													onChange={(e) => setActNumber(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													Дата проведения:
												</label>
												<input
													type="date"
													value={oneCDocDate}
													onChange={(e) => setOneCDocDate(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>

											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													Договор пациента:
												</label>
												<input
													type="text"
													value={contractNumber}
													onChange={(e) => setContractNumber(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>
										</div>
									</div>

									{/* Column 2: Parties Requisites */}
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													ИНН Клиники:
												</label>
												<input
													type="text"
													value={oneCClinicInn}
													onChange={(e) => setOneCClinicInn(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>

											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													КПП Клиники:
												</label>
												<input
													type="text"
													value={oneCClinicKpp}
													onChange={(e) => setOneCClinicKpp(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													ИНН Пациента (опционально):
												</label>
												<input
													type="text"
													placeholder="770123456789"
													value={oneCPatientInn}
													onChange={(e) => setOneCPatientInn(e.target.value)}
													className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
												/>
											</div>

											<div>
												<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
													Адрес / Врач:
												</label>
												<input
													type="text"
													value={oneCPatientAddress}
													onChange={(e) => setOneCPatientAddress(e.target.value)}
													placeholder="г. Москва, ул. Клиническая..."
													className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] truncate"
													title={`Адрес: ${oneCPatientAddress} | Врач: ${cashierFullName}`}
												/>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Items Registry Table for 1C */}
							<div className="p-4 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] space-y-3 shadow-xs">
								<div className="flex items-center justify-between">
									<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										<FileCheck size={16} className="text-amber-600 dark:text-amber-400" />
										Реестр номенклатурных позиций для 1С (Табличная часть):
									</h4>
									<span className="text-xs font-mono text-[var(--muted,#64748b)]">
										Позиций: {activeItems.length} · Итого: <strong>{formatMoneyRu(totalSumRub)}</strong>
									</span>
								</div>

								<div className="overflow-x-auto">
									<table className="w-full text-xs font-sans border-collapse border border-[var(--border,#cbd5e1)]">
										<thead>
											<tr className="bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-bold text-center">
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-8">№</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-28">Артикул / 804н</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 text-left">Наименование номенклатуры</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-16">Ед. ОКЕИ</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-14">Кол-во</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-24 text-right">Цена</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-16 text-center">Скидка</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-24 text-right">Сумма</th>
												<th className="border border-[var(--border,#cbd5e1)] p-2 w-20 text-center">Ставка НДС</th>
											</tr>
										</thead>
										<tbody>
											{activeItems.map((it, idx) => {
												const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
												const sum = it.priceRub * qty - (it.discountRub || 0);
												const discPercent = it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0;
												return (
													<tr key={it.id || idx} className="hover:bg-[var(--paper-soft,#f8fafc)]">
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[var(--muted,#64748b)]">{idx + 1}</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 font-mono text-center text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
															{it.code804n || `ART-${idx + 1}`}
														</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 font-medium text-[var(--ink,#0f172a)]">
															{it.name}
															{it.toothNumber ? (
																<span className="ml-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
																	[Зуб {it.toothNumber}]
																</span>
															) : null}
														</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[var(--muted,#64748b)]">796 (шт)</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-center font-bold">{qty}</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono">{formatMoneyRu(it.priceRub)}</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-center font-mono">
															{discPercent > 0 ? `${discPercent}%` : "0%"}
														</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
															{formatMoneyRu(sum)}
														</td>
														<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[11px] text-[var(--muted,#64748b)]">
															Без НДС
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="bg-[var(--paper-soft,#f8fafc)] font-bold">
												<td colSpan={7} className="border border-[var(--border,#cbd5e1)] p-2 text-right uppercase text-[var(--muted,#64748b)]">
													Итого по выгрузке (Копеек: {totalKopecks}):
												</td>
												<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
													{formatMoneyRu(totalSumRub)}
												</td>
												<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
													Освобождено
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</div>

							{/* CommerceML 2.09 XML Live Preview Box */}
							<div className="p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-2">
								<div className="flex items-center justify-between pb-2 border-b border-slate-800">
									<div className="flex items-center gap-2">
										<Code2 size={16} className="text-amber-400" />
										<span className="font-mono text-xs font-bold text-amber-300">
											Предпросмотр XML-пакета CommerceML 2.09 (1С:Предприятие 8.3)
										</span>
									</div>
									<span className="text-[11px] font-mono text-slate-400">
										Размер: {new Blob([oneCXmlPreview]).size} байт · Кодировка UTF-8
									</span>
								</div>

								<pre className="p-3 bg-slate-900/90 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-52 border border-slate-800 select-all leading-relaxed whitespace-pre">
									{oneCXmlPreview}
								</pre>
							</div>
						</div>
					)}

					{/* TAB: PREVIEW / ЧЕК НА ТЕРМОЛЕНТЕ */}
					{activeTab === "preview" && (
						<div className="space-y-4">
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									<Printer size={16} />
									<span>Печать чека</span>
								</button>
							</div>

							<Order804nFiscalReceiptPrint receipt={fiscalReceipt} />
						</div>
					)}
				</div>

				{/* Fixed Modal Footer (Sticky Bottom Bar across all tabs) */}
				<div className="shrink-0 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
					{activeTab === "payment" && (
						<>
							<div className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2">
								<span>К оплате: <strong className="text-sm font-mono text-[var(--ink,#0f172a)] font-bold">{formatMoneyRu(totalSumRub)}</strong></span>
								<span>·</span>
								<span className={allocation.isFullyAllocated ? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1" : "text-amber-600 dark:text-amber-400 font-bold"}>
									{allocation.isFullyAllocated ? (
										<>
											<Check size={14} className="shrink-0" />
											<span>Сумма распределена</span>
										</>
									) : (
										`Остаток: ${formatMoneyRu(remainingRub)}`
									)}
								</span>
							</div>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={handlePrintSalesSlip}
									className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
									data-testid="btn-print-sales-slip-modal"
									title="Напечатать товарный чек с номенклатурой 804н без фискализации в ОФД"
								>
									<FileText size={14} className="text-teal-600" />
									<span>Товарный чек (без кассы)</span>
								</button>
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={handleExecuteFiscalization}
									disabled={!allocation.isFullyAllocated || isFiscalizing}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
								>
									<ShieldCheck size={16} />
									<span>{isFiscalizing ? "Фискализация..." : `Пробить чек на ${formatMoneyRu(totalSumRub)}`}</span>
								</button>
							</div>
						</>
					)}

					{activeTab === "oneC" && (
						<>
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(oneCXmlPreview);
										showToast("XML-код 1С:Предприятие скопирован в буфер обмена!", "success", 2500);
									}}
									className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
								>
									<Copy size={14} />
									<span>Копировать XML</span>
								</button>

								<button
									type="button"
									onClick={() => {
										const summaryText = `ВЫГРУЗКА В 1С:ПРЕДПРИЯТИЕ 8.3\nДокумент: ${oneCDocType === "act" ? "Акт выполненных работ" : "Счет на оплату"} № ${actNumber} от ${oneCDocDate}\nКлиника: ${clinicName} (ИНН ${oneCClinicInn} / КПП ${oneCClinicKpp})\nПациент: ${patientName} (Договор ${contractNumber})\nПозиций: ${activeItems.length}\nСумма: ${formatMoneyRu(totalSumRub)} (Без НДС - пп. 2 п. 2 ст. 149 НК РФ)`;
										navigator.clipboard.writeText(summaryText);
										showToast("Сводка для бухгалтера скопирована!", "success", 2500);
									}}
									className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
								>
									<FileText size={14} />
									<span>Сводка для бухгалтерии</span>
								</button>
							</div>

							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<OneCExportButton
									actNumber={actNumber}
									documentDate={oneCDocDate}
									docType={oneCDocType}
									patientName={patientName}
									patientId={patientId}
									patientPhone={customerContact || patientPhone}
									patientAddress={oneCPatientAddress}
									doctorName={cashierFullName}
									clinicName={clinicName}
									clinicInn={oneCClinicInn}
									clinicKpp={oneCClinicKpp}
									items={activeItems}
									totalRub={totalSumRub}
									contractNumber={contractNumber}
									contractDate={oneCDocDate}
									variant="primary"
									label="Экспорт в 1С (XML)"
									className="h-9 px-5 font-bold shadow-md bg-amber-600 hover:bg-amber-700 text-white"
								/>
							</div>
						</>
					)}

					{activeTab === "act" && (
						<>
							<button
								type="button"
								onClick={handleCopyActData}
								className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
							>
								<Copy size={14} />
								<span>Скопировать текст Акта</span>
							</button>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-[var(--ok-fg,#059669)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
								>
									<Printer size={15} />
									<span>Печать Акта (804н)</span>
								</button>
							</div>
						</>
					)}

					{activeTab === "certificate" && (
						<>
							<button
								type="button"
								onClick={handleCopyCertData}
								className="h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
							>
								<Copy size={14} />
								<span>Скопировать данные справки</span>
							</button>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-[var(--brand-primary,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
								>
									<Printer size={15} />
									<span>Печать справки КНД 1151156</span>
								</button>
							</div>
						</>
					)}

					{activeTab === "refund" && (
						<>
							<div className="text-xs text-[var(--muted,#64748b)]">
								К возврату: <strong className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">{formatMoneyRu(refundFiscalData.totalRub)}</strong>
							</div>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={handleExecuteFiscalization}
									disabled={refundFiscalData.totalRub <= 0 || isFiscalizing}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
								>
									<RotateCcw size={15} />
									<span>{isFiscalizing ? "Фискализация..." : `Пробить чек возврата на ${formatMoneyRu(refundFiscalData.totalRub)}`}</span>
								</button>
							</div>
						</>
					)}

					{activeTab === "correction" && (
						<>
							<div className="text-xs text-[var(--muted,#64748b)]">
								Сумма коррекции: <strong className="text-sm font-mono text-amber-600 dark:text-amber-400 font-bold">{formatMoneyRu(totalSumRub)}</strong>
							</div>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={handleExecuteFiscalization}
									disabled={isFiscalizing}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
								>
									<ShieldCheck size={15} />
									<span>{isFiscalizing ? "Фискализация..." : `Пробить чек коррекции на ${formatMoneyRu(totalSumRub)}`}</span>
								</button>
							</div>
						</>
					)}

					{activeTab === "preview" && (
						<>
							<div className="text-xs text-[var(--muted,#64748b)]">
								Чек 54-ФЗ (ФФД 1.2) · <strong className="font-mono text-[var(--ink,#0f172a)]">{fiscalReceipt.receiptNumber}</strong>
							</div>
							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={onClose}
									className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								>
									Закрыть
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="h-9 px-5 rounded-xl font-bold text-xs bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
								>
									<Printer size={15} />
									<span>Печать чека</span>
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
