import { showToast } from "../../GlobalToast";
import { hardwarePrinter } from "../../../services/hardware/HardwarePrinter.js";
import { downloadFnsBatchNoMedoplXmlFile, downloadFnsBatchTaxXmlFile, downloadFnsNoMedoplXmlFile, downloadFnsTaxXmlFile, renderOfficialTaxCertificateKnd1151156Html, renderTaxDeductionBatchCertificateHtml, type TaxDeductionCertificateParams } from "../taxDeductionEngine";

export interface ExportActionParams {
	readonly getCertificateParams: () => TaxDeductionCertificateParams;
	readonly patientId?: string | undefined;
	readonly selectedYear: number;
	readonly payerInn: string;
	readonly yearPayments: readonly any[];
	readonly totalRub: number;
	readonly appLogic: any;
	readonly familyBatchResult: any;
	readonly xmlRepresentation: { fileName: string; xmlContent: string };
	readonly setIsCopiedXml: (v: boolean) => void;
	readonly payerFullName?: string | undefined;
	readonly payerRelationship?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
}

export function useTaxDeductionExportActions(p: ExportActionParams) {
	const { getCertificateParams, patientId, selectedYear, payerInn, yearPayments, totalRub, appLogic, familyBatchResult, xmlRepresentation, setIsCopiedXml } = p;

	const handlePrint = async () => {
		const params = getCertificateParams();
		const html = renderOfficialTaxCertificateKnd1151156Html(params);
		if (patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
			try {
				const headers = { "Content-Type": "application/json", ...(appLogic?.auth?.denteClinicalMutationHeaders ?? {}) };
				const validInn = payerInn && /^\d{10}$|^\d{12}$/.test(payerInn.trim()) ? payerInn.trim() : null;
				const validPaymentIds = yearPayments.map((pmt) => pmt.id).filter((id) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)));
				await fetch("/api/documents", {
					method: "POST", headers,
					body: JSON.stringify({ patientId, kind: "tax_deduction_certificate", title: `Справка для налогового вычета за ${selectedYear} г.`, taxYear: selectedYear, taxPayerInn: validInn, totalAmountRub: totalRub, payload: validPaymentIds.length ? { taxPaymentSelection: { selectedPaymentIds: validPaymentIds } } : undefined }),
				});
				showToast(`Справка за ${selectedYear} г. сохранена в документах пациента`, "success");
			} catch (err) { console.warn("Не удалось сохранить справку:", err); }
		}
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, { title: `Справка для налоговой (вычет 13%) за ${selectedYear} г.`, downloadFilename: `tax_certificate_knd1151156_${selectedYear}.html` });
		} catch {
			const win = window.open("", "_blank");
			if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); }
		}
	};

	const handleDownloadXml = () => { if (!yearPayments.length) { showToast("Нет подтвержденных оплат за период", "warning"); return; } downloadFnsTaxXmlFile(getCertificateParams()); showToast(`Файл ${xmlRepresentation.fileName} выгружен`, "success"); };
	const handleDownloadNoMedoplXml = () => { if (!yearPayments.length) { showToast("Нет подтвержденных оплат за период", "warning"); return; } downloadFnsNoMedoplXmlFile(getCertificateParams()); showToast("Электронная справка выгружена для налоговой", "success"); };
	const handleDownloadBatchXml = () => { if (!familyBatchResult.totalPaymentsCount) { showToast("Нет подтвержденных оплат для пакета", "warning"); return; } downloadFnsBatchTaxXmlFile(familyBatchResult.batch); showToast(`Пакет справок (${familyBatchResult.certificatesCount} шт.) выгружен`, "success"); };
	const handleDownloadBatchNoMedoplXml = () => { if (!familyBatchResult.totalPaymentsCount) { showToast("Нет оплат для пакета", "warning"); return; } downloadFnsBatchNoMedoplXmlFile(familyBatchResult.batch); showToast("Пакет справок выгружен", "success"); };
	const handleCopyXml = () => { if (!xmlRepresentation.xmlContent) return; if (navigator.clipboard) { navigator.clipboard.writeText(xmlRepresentation.xmlContent); setIsCopiedXml(true); showToast("XML-содержимое справки скопировано в буфер обмена", "info"); setTimeout(() => setIsCopiedXml(false), 2500); } };
	const handlePrintBatch = async () => {
		if (!familyBatchResult.totalPaymentsCount) { showToast("Нет подтвержденных оплат для печати пакета", "warning"); return; }
		const html = renderTaxDeductionBatchCertificateHtml(familyBatchResult.batch);
		try { await hardwarePrinter.printHtmlWithPopupFallback(html, { title: `Пакет справок для налогового вычета (${familyBatchResult.certificatesCount} чел.)`, downloadFilename: `tax_batch_certificates_${familyBatchResult.batch.taxYear}.html` }); } catch { const win = window.open("", "_blank"); if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); } }
	};

	const handlePrintBlank = async () => {
		const blankParams: TaxDeductionCertificateParams = {
			...getCertificateParams(),
			payments: [],
			payer: {
				fullName: p.payerFullName || "________________________________________",
				inn: payerInn || "____________",
				birthDate: p.payerBirthDate || "«___» _________ _____ г.",
				relationship: (p.payerRelationship as any) || "patient",
			},
			patient: {
				fullName: p.patientName || "________________________________________",
				birthDate: p.patientBirthDate || "«___» _________ _____ г.",
				inn: p.patientInn || "____________",
			},
		};
		const html = renderOfficialTaxCertificateKnd1151156Html(blankParams);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: "Бланк справки для налоговой",
				downloadFilename: "blank_tax_certificate.html",
			});
		} catch {
			const win = window.open("", "_blank");
			if (win) {
				win.document.write(html);
				win.document.close();
				win.focus();
				setTimeout(() => win.print(), 300);
			}
		}
	};

	return { handlePrint, handlePrintBlank, handleDownloadXml, handleDownloadNoMedoplXml, handleDownloadBatchXml, handleDownloadBatchNoMedoplXml, handleCopyXml, handlePrintBatch };
}
