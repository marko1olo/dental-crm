import { useMemo, useState } from "react";
import {
	generateOneCEnterpriseXml,
	type OneCDocumentType,
	type OneCExportParams,
	type StomxExpenseTypeAlias,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { showToast } from "../../../GlobalToast";
import {
	calculateTaxDeductionBreakdown,
	generateFiscalCorrectionReceipt54Fz,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	generateTaxDeductionCertificate,
	mapTreatmentItemsToFiscalReceipt,
	type SplitPaymentInput,
	type TaxDeductionRelationship,
} from "../../order804nFiscalEngine";
import { numberToWordsRu, generateCompletedActAndWarrantyHtml, type CompletedWorksActParams } from "../../invoiceEngine";
import { renderOfficialTaxCertificateKnd1151156Html, type TaxDeductionCertificateParams } from "../../taxDeductionEngine";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter";
import {
	formatMoneyRu,
	selectAllRefundItems,
	deselectAllRefundItems,
	calculateRefundActiveItems,
} from "./fiscalModalRefundLogic";
import type { FiscalModalTab } from "./fiscalModalTypes";

export interface UseFiscalRefundAndAuxTabsParams {
	readonly items: readonly TreatmentPlanItem[];
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly activeTab: FiscalModalTab;
	readonly totalSumRub: number;
	readonly splitInput: SplitPaymentInput;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly customerContact: string;
	readonly payerType: "individual" | "legal_entity";
	readonly buyerLegalName: string;
	readonly buyerInn: string;
}

export function useFiscalRefundAndAuxTabs({
	items,
	activeItems,
	activeTab,
	totalSumRub,
	splitInput,
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	customerContact,
	payerType,
	buyerLegalName,
	buyerInn,
}: UseFiscalRefundAndAuxTabsParams) {
	const [actNumber, setActNumber] = useState<string>(
		`АКТ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
	);
	const [contractNumber, setContractNumber] = useState<string>(
		`ДОГ-${new Date().getFullYear()}/${(patientId || "patient").slice(0, 5).toUpperCase()}`,
	);

	// Refund state (Возврат прихода при отказе от части услуг / возврат аванса 54-ФЗ)
	const [refundItemSelection, setRefundItemSelection] = useState<Record<string, boolean>>({});
	const [refundReason, setRefundReason] = useState<string>("Отказ пациента от части услуг плана лечения");
	const [originalReceiptNumberForRefund, setOriginalReceiptNumberForRefund] = useState<string>("");
	const [refundMode, setRefundMode] = useState<"items" | "advance">(
		items.length === 0 ? "advance" : "items",
	);
	const [refundAdvanceAmountRub, setRefundAdvanceAmountRub] = useState<number>(
		items.length === 0 && patientDepositRub && patientDepositRub > 0 ? patientDepositRub : 0,
	);
	const [refundAdvancePurpose, setRefundAdvancePurpose] = useState<string>("Возврат аванса / денежных средств");
	const [selectedExpenseAlias, setSelectedExpenseAlias] = useState<StomxExpenseTypeAlias>("return_appointment");

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
	const [oneCClinicInn, setOneCClinicInn] = useState<string>("");
	const [oneCClinicKpp, setOneCClinicKpp] = useState<string>("");
	const [oneCPatientInn, setOneCPatientInn] = useState<string>("");
	const [oneCPatientAddress, setOneCPatientAddress] = useState<string>("");

	const handleSelectAllRefundItems = () => {
		setRefundItemSelection(selectAllRefundItems(activeItems));
	};

	const handleDeselectAllRefundItems = () => {
		setRefundItemSelection(deselectAllRefundItems());
	};

	// Refund items calculation (Мандаты 8e, 8k, 8n: экспресс-возврат и возврат аванса без привязки к смете)
	const isAdvanceRefund = activeItems.length === 0 || refundMode === "advance";

	const refundActiveItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		return calculateRefundActiveItems({
			items: activeItems,
			selection: refundItemSelection,
			isAdvanceRefund,
			advanceAmountRub: refundAdvanceAmountRub,
			advancePurpose: refundAdvancePurpose,
		});
	}, [isAdvanceRefund, activeItems, refundItemSelection, refundAdvanceAmountRub, refundAdvancePurpose]);

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
			payerType,
			buyerInn: payerType === "legal_entity" ? buyerInn : undefined,
			buyerName: payerType === "legal_entity" ? buyerLegalName : undefined,
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
		payerType,
		buyerInn,
		buyerLegalName,
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
				phone: "",
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

	const handlePrintSalesSlip = async () => {
		const docNum = `ТЧ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
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
			} catch (e) {
				console.warn("[tovarniy check template] window.print error:", e);
			}
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
		} catch (printErr: unknown) {
			console.warn("[FiscalReceipt54FzModal] Print tovarniy check failed:", printErr);
			showToast("Ошибка отправки товарного чека на печать", "error");
		}
	};

	const handlePrintAct = async () => {
		const actParams: CompletedWorksActParams = {
			actNumber,
			contractNumber,
			contractDateIso: new Date().toISOString(),
			actDateIso: new Date().toISOString(),
			clinic: {
				name: clinicName || "Стоматологическая клиника ДЕНТЕ",
				legalName: clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: oneCClinicInn || "7707083893",
				kpp: oneCClinicKpp || "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: "г. Москва, ул. Профсоюзная, д. 42",
				phone: "+7 (495) 789-01-23",
				chiefDoctorName: cashierFullName || "Смирнов Александр Владимирович",
			},
			patient: {
				id: patientId,
				fullName: patientName,
				phone: patientPhone || "",
				address: oneCPatientAddress || "",
				medicalCardNumber: `043/у-${(patientId || "patient").slice(0, 4)}`,
			},
			doctor: {
				fullName: cashierFullName || "Лечащий врач",
				specialty: "Врач-стоматолог терапевт-ортопед",
			},
			items: activeItems.map((it, idx) => ({
				id: it.id || `srv-${idx + 1}`,
				name: it.name,
				category: it.category || "therapy",
				toothNumber: it.toothNumber ? String(it.toothNumber) : undefined,
				code804n: it.code804n || "A16.07.002",
				priceRub: it.priceRub,
				quantity: it.quantity || 1,
				discountRub: it.discountRub || 0,
				warrantyMonths: it.isWarranty ? 12 : undefined,
				isWarranty: it.isWarranty,
			})),
		};

		const html = generateCompletedActAndWarrantyHtml(actParams);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Акт выполненных работ № ${actNumber}`,
				downloadFilename: `act_${actNumber}.html`,
			});
			showToast("Акт выполненных работ отправлен на печать", "success", 3000);
		} catch (err) {
			console.warn("[FiscalReceipt54FzModal] Print act failed:", err);
			showToast("Ошибка отправки акта на печать", "error");
		}
	};

	const handlePrintTaxCertificate = async () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: taxDeductionCert.certificateNumber,
			issueDateIso: new Date().toISOString(),
			taxYear,
			taxOfficeCode: "7701",
			clinic: {
				legalName: clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: oneCClinicInn || taxDeductionCert.clinicInn || "7707083893",
				kpp: oneCClinicKpp || taxDeductionCert.clinicKpp || "770101001",
				ogrn: taxDeductionCert.clinicOgrn || "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: taxDeductionCert.clinicAddress || "г. Москва, ул. Профсоюзная, д. 42",
				chiefDoctorName: cashierFullName || "Смирнов Александр Владимирович",
			},
			payer: {
				fullName: payerFullName.trim() || patientName,
				inn: payerInn.trim() || undefined,
				relationship: payerRelationship,
			},
			patient: {
				fullName: patientName,
			},
			payments: activeItems.map((it, idx) => ({
				id: it.id || `pmt-${idx + 1}`,
				dateIso: new Date().toISOString(),
				receiptNumber: fiscalReceipt.receiptNumber || `CHK-${taxYear}-${idx + 1}`,
				fiscalDocumentNumber: fiscalReceipt.fiscalDocumentNumber || "1001",
				fiscalSign: fiscalReceipt.fiscalSign || "1234567890",
				serviceName: it.name,
				code804n: it.code804n || "A16.07.002",
				amountRub: Math.max(0, it.priceRub * (it.quantity || 1) - (it.discountRub || 0)),
				taxCode: it.category === "implantology" || it.category === "surgery" ? "2" : "1",
			})),
		};

		const html = renderOfficialTaxCertificateKnd1151156Html(certParams);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Справка КНД 1151156 № ${taxDeductionCert.certificateNumber}`,
				downloadFilename: `spravka_knd_1151156_${taxDeductionCert.certificateNumber}.html`,
			});
			showToast("Справка для налогового вычета отправлена на печать", "success", 3000);
		} catch (err) {
			console.warn("[FiscalReceipt54FzModal] Print tax certificate failed:", err);
			showToast("Ошибка отправки справки на печать", "error");
		}
	};

	return {
		actNumber,
		setActNumber,
		contractNumber,
		setContractNumber,
		refundItemSelection,
		setRefundItemSelection,
		refundReason,
		setRefundReason,
		originalReceiptNumberForRefund,
		setOriginalReceiptNumberForRefund,
		refundMode,
		setRefundMode,
		refundAdvanceAmountRub,
		setRefundAdvanceAmountRub,
		refundAdvancePurpose,
		setRefundAdvancePurpose,
		handleSelectAllRefundItems,
		handleDeselectAllRefundItems,
		isAdvanceRefund,
		refundActiveItems,
		refundFiscalData,
		correctionType,
		setCorrectionType,
		correctionDocDate,
		setCorrectionDocDate,
		correctionDocNumber,
		setCorrectionDocNumber,
		correctionReason,
		setCorrectionReason,
		payerFullName,
		setPayerFullName,
		payerInn,
		setPayerInn,
		payerRelationship,
		setPayerRelationship,
		taxYear,
		setTaxYear,
		taxDeductionBreakdown,
		taxDeductionCert,
		handleCopyCertData,
		handleCopyActData,
		handlePrintSalesSlip,
		handlePrintAct,
		handlePrintTaxCertificate,
		oneCDocType,
		setOneCDocType,
		oneCDocDate,
		setOneCDocDate,
		oneCDocTime,
		oneCClinicInn,
		setOneCClinicInn,
		oneCClinicKpp,
		setOneCClinicKpp,
		oneCPatientInn,
		setOneCPatientInn,
		oneCPatientAddress,
		setOneCPatientAddress,
		oneCExportParams,
		oneCXmlPreview,
		fiscalReceipt,
		selectedExpenseAlias,
		setSelectedExpenseAlias,
	};
}
