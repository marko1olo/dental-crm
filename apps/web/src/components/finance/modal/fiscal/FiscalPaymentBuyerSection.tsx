import React from "react";
import {
	Building2,
	FileText,
	QrCode,
	ShieldCheck,
	User,
} from "lucide-react";
import { kopecksToRub } from "@dental/shared";
import { mapTreatmentItemsToFiscalReceipt } from "../../order804nFiscalEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalPaymentBuyerSectionProps {
	readonly payerType: "individual" | "legal_entity";
	readonly setPayerType: (v: "individual" | "legal_entity") => void;
	readonly buyerLegalName: string;
	readonly setBuyerLegalName: (v: string) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (v: string) => void;
	readonly customerContact: string;
	readonly setCustomerContact: (v: string) => void;
	readonly sbpAmount: number;
	readonly fiscalData: ReturnType<typeof mapTreatmentItemsToFiscalReceipt>;
	readonly totalSumRub: number;
	readonly cashAmount: number;
	readonly cardAmount: number;
	readonly depositAmount: number;
	readonly certificateAmount: number;
	readonly insuranceAmount: number;
}

export const FiscalPaymentBuyerSection: React.FC<FiscalPaymentBuyerSectionProps> = ({
	payerType,
	setPayerType,
	buyerLegalName,
	setBuyerLegalName,
	buyerInn,
	setBuyerInn,
	customerContact,
	setCustomerContact,
	sbpAmount,
	fiscalData,
	totalSumRub,
	cashAmount,
	cardAmount,
	depositAmount,
	certificateAmount,
	insuranceAmount,
}) => {
	return (
		<>
			{/* 54-FZ Payer Type & Buyer Requisites (Physical Person vs B2B Legal Entity/IP) */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3" data-testid="54fz-payer-type-section">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
						<User size={15} className="text-teal-600 dark:text-teal-400" />
						<span>Тип плательщика:</span>
					</div>
					<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
						{payerType === "individual" ? (
							<>
								<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span>Для физлиц ИНН не требуется</span>
							</>
						) : (
							"Оплата от организации / ИП"
						)}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setPayerType("individual")}
						className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
							payerType === "individual"
								? "bg-teal-600 text-white border-teal-600 shadow-sm"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-[var(--border,#cbd5e1)] hover:bg-slate-50 dark:hover:bg-slate-800"
						}`}
						data-testid="btn-payer-type-individual"
						title="Физическое лицо (гражданин) — оплата картой, наличными или СБП. ИНН не требуется."
					>
						<User size={15} />
						<span>Физическое лицо (без ИНН)</span>
					</button>

					<button
						type="button"
						onClick={() => setPayerType("legal_entity")}
						className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
							payerType === "legal_entity"
								? "bg-teal-600 text-white border-teal-600 shadow-sm"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-[var(--border,#cbd5e1)] hover:bg-slate-50 dark:hover:bg-slate-800"
						}`}
						data-testid="btn-payer-type-legal"
						title="Юридическое лицо или Индивидуальный предприниматель (оплата по счету или корпоративной карте)"
					>
						<Building2 size={15} />
						<span>Юрлицо / ИП</span>
					</button>
				</div>

				{/* Physical Person: Explicit zero-friction explanation */}
				{payerType === "individual" ? (
					<div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-[11.5px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
						<ShieldCheck size={16} className="text-emerald-600 shrink-0" />
						<span>
							При расчетах с пациентами-физлицами ИНН <strong>не требуется</strong>. Чек печатается мгновенно в 1 клик.
						</span>
					</div>
				) : (
					/* B2B Legal Entity / IP: Optional requisites inputs */
					<div className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 space-y-2.5" data-testid="b2b-requisites-box">
						<div className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
							<FileText size={14} />
							<span>Реквизиты организации / ИП:</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
									Наименование юрлица или ИП:
								</label>
								<input
									type="text"
									value={buyerLegalName}
									onChange={(e) => setBuyerLegalName(e.target.value)}
									placeholder="ООО «Ромашка» или ИП Иванов И.И."
									className="w-full min-h-[40px] px-3 py-1.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>
							<div>
								<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
									ИНН покупателя (10 или 12 цифр):
								</label>
								<input
									type="text"
									value={buyerInn}
									onChange={(e) => setBuyerInn(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
									placeholder="10 цифр для ЮЛ / 12 для ИП"
									className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)] m-0">
							Заполняется при безналичной оплате организацией или ИП по счету/корпоративной карте.
						</p>
					</div>
				)}
			</div>

			{/* Electronic Contact Input */}
			<div className="space-y-1.5 pt-1">
				<label className="block text-xs font-semibold text-[var(--muted,#64748b)]">
					Телефон или Email для электронного чека:
				</label>
				<input
					type="text"
					value={customerContact}
					onChange={(e) => setCustomerContact(e.target.value)}
					placeholder="+7 999 123-45-67 или email@example.com"
					className="w-full min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
				/>
			</div>
		</>
	);
};

export interface FiscalPaymentSummaryColumnProps {
	readonly sbpAmount: number;
	readonly fiscalData: ReturnType<typeof mapTreatmentItemsToFiscalReceipt>;
	readonly totalSumRub: number;
	readonly cashAmount: number;
	readonly cardAmount: number;
	readonly depositAmount: number;
	readonly certificateAmount: number;
	readonly insuranceAmount: number;
}

export const FiscalPaymentSummaryColumn: React.FC<FiscalPaymentSummaryColumnProps> = ({
	sbpAmount,
	fiscalData,
	totalSumRub,
	cashAmount,
	cardAmount,
	depositAmount,
	certificateAmount,
	insuranceAmount,
}) => {
	return (
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

			{/* Receipt Tender Summary Card */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
				<div className="flex items-center justify-between text-xs font-bold">
					<span className="text-[var(--muted,#64748b)]">Итого к оплате:</span>
					<span className="text-base font-mono text-emerald-600 dark:text-emerald-400 font-black">
						{formatMoneyRu(totalSumRub)}
					</span>
				</div>
				<div className="text-[11.5px] text-[var(--muted,#64748b)] space-y-1 pt-1 border-t border-[var(--border,#cbd5e1)]">
					{cashAmount > 0 && (
						<div className="flex justify-between">
							<span>Наличные:</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(cashAmount)}</strong>
						</div>
					)}
					{cardAmount > 0 && (
						<div className="flex justify-between">
							<span>Карта:</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(cardAmount)}</strong>
						</div>
					)}
					{sbpAmount > 0 && (
						<div className="flex justify-between">
							<span>СБП QR:</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(sbpAmount)}</strong>
						</div>
					)}
					{depositAmount > 0 && (
						<div className="flex justify-between">
							<span>Зачет аванса:</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(depositAmount)}</strong>
						</div>
					)}
					{certificateAmount > 0 && (
						<div className="flex justify-between">
							<span>Сертификат (Тег 1215):</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(certificateAmount)}</strong>
						</div>
					)}
					{insuranceAmount > 0 && (
						<div className="flex justify-between">
							<span>ДМС:</span>
							<strong className="font-mono text-[var(--ink,#0f172a)]">{formatMoneyRu(insuranceAmount)}</strong>
						</div>
					)}
					{fiscalData.hasMixedItems && (
						<div className="pt-2 border-t border-[var(--border,#cbd5e1)] text-[11px] space-y-0.5" data-testid="mixed-fiscal-summary-card">
							<div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
								<span>Медуслуги (Без НДС, ст. 149):</span>
								<span className="font-mono">{formatMoneyRu(kopecksToRub(fiscalData.vatNoneKopecks))}</span>
							</div>
							<div className="flex justify-between text-blue-700 dark:text-blue-400 font-bold">
								<span>Товары витрины (НДС 20%, ст. 164):</span>
								<span className="font-mono">{formatMoneyRu(kopecksToRub(fiscalData.retailTotalKopecks || 0))}</span>
							</div>
							<div className="flex justify-between text-[var(--muted,#64748b)]">
								<span>В т.ч. сумма НДС 20%:</span>
								<span className="font-mono">{formatMoneyRu(fiscalData.vat20Rub)}</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
