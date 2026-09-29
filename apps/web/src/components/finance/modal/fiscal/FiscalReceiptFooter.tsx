import React from "react";
import { Check, Copy, FileText, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import type { OneCDocumentType } from "@dental/shared";
import { OneCExportButton } from "../../OneCExportButton";
import { showToast } from "../../../GlobalToast";
import { formatMoneyRu } from "./fiscalModalRefundLogic";
import type { FiscalModalTab } from "./fiscalModalTypes";
import type { FiscalReceipt54FzResult } from "../../order804nFiscalEngine";

export interface FiscalReceiptFooterProps {
	activeTab: FiscalModalTab;
	totalSumRub: number;
	remainingRub: number;
	allocation: { isFullyAllocated: boolean };
	isFiscalizing: boolean;
	onClose: () => void;
	handlePrintSalesSlip: () => void;
	handleExecuteFiscalization: () => void;
	oneCXmlPreview: string;
	showToast?: (msg: string, type: "success" | "error" | "info", duration?: number) => void;
	oneCDocType: OneCDocumentType;
	actNumber: string;
	oneCDocDate: string;
	clinicName: string;
	oneCClinicInn: string;
	oneCClinicKpp: string;
	patientName: string;
	contractNumber: string;
	activeItems: readonly any[];
	patientId?: string | undefined;
	customerContact?: string | undefined;
	patientPhone?: string | undefined;
	oneCPatientAddress: string;
	cashierFullName: string;
	handleCopyActData: () => void;
	handleCopyCertData: () => void;
	refundFiscalData: { totalRub: number };
	fiscalReceipt: FiscalReceipt54FzResult;
}

export const FiscalReceiptFooter: React.FC<FiscalReceiptFooterProps> = ({
	activeTab,
	totalSumRub,
	remainingRub,
	allocation,
	isFiscalizing,
	onClose,
	handlePrintSalesSlip,
	handleExecuteFiscalization,
	oneCXmlPreview,
	showToast: propShowToast,
	oneCDocType,
	actNumber,
	oneCDocDate,
	clinicName,
	oneCClinicInn,
	oneCClinicKpp,
	patientName,
	contractNumber,
	activeItems,
	patientId,
	customerContact,
	patientPhone,
	oneCPatientAddress,
	cashierFullName,
	handleCopyActData,
	handleCopyCertData,
	refundFiscalData,
	fiscalReceipt,
}) => {
	const notify = propShowToast || showToast;

	return (
		<div className="shrink-0 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
			{activeTab === "payment" && (
				<>
					<div className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2">
						<span>
							К оплате:{" "}
							<strong className="text-sm font-mono text-[var(--ink,#0f172a)] font-bold">
								{formatMoneyRu(totalSumRub)}
							</strong>
						</span>
						<span>·</span>
						<span
							className={
								allocation.isFullyAllocated
									? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"
									: "text-amber-600 dark:text-amber-400 font-bold"
							}
						>
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
							className="h-9 px-3 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
							data-testid="btn-print-sales-slip-modal"
							title="Напечатать товарный чек с номенклатурой 804н без фискализации в ОФД"
						>
							<FileText size={14} className="text-teal-600" />
							<span>Товарный чек</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => handleExecuteFiscalization()}
							disabled={isFiscalizing}
							data-testid="btn-execute-fiscalization btn-fiscalize-receipt"
							title={isFiscalizing ? "Идет фискализация чека в ККТ..." : undefined}
							className="h-9 px-5 rounded-xl font-bold text-xs bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
						>
							<ShieldCheck size={16} />
							<span>
								{isFiscalizing
									? "Фискализация..."
									: totalSumRub === 0
										? "Пробить чек 0.00 ₽ (Гарантия)"
										: `Пробить чек на ${formatMoneyRu(totalSumRub)}`}
							</span>
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
								notify("XML-код 1С:Предприятие скопирован в буфер обмена!", "success", 2500);
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
								notify("Сводка для бухгалтера скопирована!", "success", 2500);
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
							items={activeItems as any}
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
							<span>Печать справки для налогового вычета</span>
						</button>
					</div>
				</>
			)}

			{activeTab === "refund" && (
				<>
					<div className="text-xs text-[var(--muted,#64748b)]">
						К возврату:{" "}
						<strong className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">
							{formatMoneyRu(refundFiscalData.totalRub)}
						</strong>
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
							onClick={() => handleExecuteFiscalization()}
							disabled={isFiscalizing}
							title={
								isFiscalizing
									? "Идет фискализация возврата в ККТ..."
									: refundFiscalData.totalRub <= 0
										? "Укажите сумму возврата больше 0 ₽"
										: undefined
							}
							data-testid="btn-refund-footer-execute"
							className="h-9 px-5 rounded-xl font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
						>
							<RotateCcw size={15} />
							<span>
								{isFiscalizing
									? "Фискализация..."
									: `Пробить чек возврата на ${formatMoneyRu(refundFiscalData.totalRub)}`}
							</span>
						</button>
					</div>
				</>
			)}

			{activeTab === "correction" && (
				<>
					<div className="text-xs text-[var(--muted,#64748b)]">
						Сумма коррекции:{" "}
						<strong className="text-sm font-mono text-amber-600 dark:text-amber-400 font-bold">
							{formatMoneyRu(totalSumRub)}
						</strong>
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
							onClick={() => handleExecuteFiscalization()}
							disabled={isFiscalizing}
							title={isFiscalizing ? "Идет фискализация чека коррекции в ККТ..." : undefined}
							className="h-9 px-5 rounded-xl font-bold text-xs bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center gap-1.5"
						>
							<ShieldCheck size={15} />
							<span>
								{isFiscalizing
									? "Фискализация..."
									: `Пробить чек коррекции на ${formatMoneyRu(totalSumRub)}`}
							</span>
						</button>
					</div>
				</>
			)}

			{activeTab === "preview" && (
				<>
					<div className="text-xs text-[var(--muted,#64748b)]">
						Чек 54-ФЗ (ФФД 1.2) ·{" "}
						<strong className="font-mono text-[var(--ink,#0f172a)]">
							{fiscalReceipt.receiptNumber}
						</strong>
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
	);
};
