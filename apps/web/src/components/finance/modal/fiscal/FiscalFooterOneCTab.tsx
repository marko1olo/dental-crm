import type React from "react";
import { Copy, FileText } from "lucide-react";
import { OneCExportButton } from "../../OneCExportButton.js";
import { formatMoneyRu } from "./fiscalModalRefundLogic.js";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";

/**
 * 1C Enterprise export footer controls.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalFooterOneCTab: React.FC<
	FiscalReceiptFooterProps & { notify: (msg: string, type: "success" | "error" | "info", dur?: number) => void }
> = (p) => {
	const { totalSumRub, onClose, oneCXmlPreview, notify, oneCDocType, actNumber, oneCDocDate, clinicName, oneCClinicInn, oneCClinicKpp, patientName, contractNumber, activeItems, patientId, customerContact, patientPhone, oneCPatientAddress, cashierFullName } = p;

	return (
		<>
			<div className="flex items-center gap-2 flex-wrap">
				<button type="button" onClick={() => { navigator.clipboard.writeText(oneCXmlPreview); notify("XML-код 1С скопирован!", "success", 2500); }} className="min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer shadow-xs">
					<Copy size={14} /><span>Копировать XML</span>
				</button>
				<button type="button" onClick={() => { const s = `ВЫГРУЗКА В 1С:ПРЕДПРИЯТИЕ 8.3\nДокумент: ${oneCDocType === "act" ? "Акт выполненных работ" : "Счет на оплату"} № ${actNumber} от ${oneCDocDate}\nКлиника: ${clinicName} (ИНН ${oneCClinicInn} / КПП ${oneCClinicKpp})\nПациент: ${patientName} (Договор ${contractNumber})\nПозиций: ${activeItems.length}\nСумма: ${formatMoneyRu(totalSumRub)} (Без НДС: медицинские услуги)`; navigator.clipboard.writeText(s); notify("Сводка для бухгалтера скопирована!", "success", 2500); }} className="min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer shadow-xs">
					<FileText size={14} /><span>Сводка для бухгалтерии</span>
				</button>
			</div>
			<div className="flex items-center gap-2.5">
				<button type="button" onClick={onClose} className="min-h-[44px] sm:min-h-0 sm:h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer">Закрыть</button>
				<OneCExportButton actNumber={actNumber} documentDate={oneCDocDate} docType={oneCDocType} patientName={patientName} patientId={patientId} patientPhone={customerContact || patientPhone} patientAddress={oneCPatientAddress} doctorName={cashierFullName} clinicName={clinicName} clinicInn={oneCClinicInn} clinicKpp={oneCClinicKpp} items={activeItems} totalRub={totalSumRub} contractNumber={contractNumber} contractDate={oneCDocDate} variant="primary" label="Экспорт в 1С (XML)" className="min-h-[44px] sm:min-h-0 sm:h-9 px-5 font-bold shadow-md bg-amber-600 hover:bg-amber-700 text-white" />
			</div>
		</>
	);
};