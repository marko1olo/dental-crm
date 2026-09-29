import React from "react";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Coins,
	Receipt,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import {
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	amountToWordsRu,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "./taxDeductionEngine";

export interface TaxDeductionRequisitesFormProps {
	selectedYear: number;
	setSelectedYear: (yr: number) => void;
	availableYears: number[];
	paymentsCountByYear: Record<number, number>;
	payerRelationship: TaxDeductionRelationship;
	setPayerRelationship: (rel: TaxDeductionRelationship) => void;
	onFillFromPatient: () => void;
	payerFullName: string;
	setPayerFullName: (val: string) => void;
	payerInn: string;
	setPayerInn: (val: string) => void;
	innValidation: { isValid: boolean; message?: string };
	payerBirthDate: string;
	setPayerBirthDate: (val: string) => void;
	passportSeries: string;
	setPassportSeries: (val: string) => void;
	passportNumber: string;
	setPassportNumber: (val: string) => void;
	certificateNumber: string;
	setCertificateNumber: (val: string) => void;
	taxOfficeCode: string;
	setTaxOfficeCode: (val: string) => void;
	yearPayments: readonly TaxDeductionPaymentItem[];
	payments: readonly TaxDeductionPaymentItem[];
	targetYearSummary: {
		taxYear: number;
		code01Rub: number;
		code01Kopecks: number;
		code02Rub: number;
		code02Kopecks: number;
		totalRub: number;
		totalKopecks: number;
		receiptsCount: number;
		code01StatutoryLimitRub: number;
		code01EligibleRub: number;
		refund13EstimateRub: number;
		refund15EstimateRub: number;
	};
	clinicLicenseNumber: string;
	clinicLicenseDate: string;
	qrSvgString: string;
	onClose: () => void;
}

export const TaxDeductionRequisitesForm: React.FC<TaxDeductionRequisitesFormProps> = ({
	selectedYear,
	setSelectedYear,
	availableYears,
	paymentsCountByYear,
	payerRelationship,
	setPayerRelationship,
	onFillFromPatient,
	payerFullName,
	setPayerFullName,
	payerInn,
	setPayerInn,
	innValidation,
	payerBirthDate,
	setPayerBirthDate,
	passportSeries,
	setPassportSeries,
	passportNumber,
	setPassportNumber,
	certificateNumber,
	setCertificateNumber,
	taxOfficeCode,
	setTaxOfficeCode,
	yearPayments,
	payments,
	targetYearSummary,
	clinicLicenseNumber,
	clinicLicenseDate,
	qrSvgString,
	onClose,
}) => {
	return (
		<>
			{/* Tax Year & Payer Defaults Selector */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Tax Year Selection */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<Calendar size={14} className="text-teal-600" />
							Налоговый период (Отчетный год):
						</span>
						<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
							Лимит Кода 01: {selectedYear >= 2024 ? "150 000 ₽" : "120 000 ₽"}
						</span>
					</div>
					<div className="flex gap-2 flex-wrap">
						{availableYears.map((yr) => {
							const count = paymentsCountByYear[yr] || 0;
							return (
								<button
									key={yr}
									type="button"
									onClick={() => setSelectedYear(yr)}
									className={`min-h-[44px] flex-1 min-w-[80px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
										selectedYear === yr
											? "bg-teal-600 text-white shadow-sm"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
									}`}
								>
									<span>{yr} год</span>
									{count > 0 && (
										<span
											className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
												selectedYear === yr
													? "bg-white/25 text-white"
													: "bg-teal-500/15 text-teal-700 dark:text-teal-300"
											}`}
										>
											{count}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>

				{/* Relationship Selector */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<UserCheck size={14} className="text-teal-600" />
							Степень родства (Код ФНС):
						</span>
						<button
							type="button"
							onClick={onFillFromPatient}
							className="text-[11px] text-teal-600 hover:underline font-bold cursor-pointer"
						>
							Заполнить из карточки
						</button>
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						{(["patient", "spouse", "parent", "child"] as const).map((r) => {
							const meta = TAX_DEDUCTION_RELATIONSHIP_MAP[r];
							return (
								<button
									key={r}
									type="button"
									onClick={() => setPayerRelationship(r)}
									className={`min-h-[44px] px-2 rounded-xl text-xs font-bold transition-all truncate cursor-pointer flex items-center justify-center gap-1.5 ${
										payerRelationship === r
											? "bg-teal-600 text-white shadow-sm"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
									}`}
								>
									<span>Код {meta.code}:</span>
									<span>{meta.shortLabelRu}</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Payer Requisites Fields */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
				<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
					Реквизиты налогоплательщика (для справки на вычет):
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div className="space-y-1">
						<label htmlFor="payer-fullname-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							ФИО плательщика:
						</label>
						<input
							id="payer-fullname-input"
							type="text"
							value={payerFullName}
							onChange={(e) => setPayerFullName(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium"
						/>
					</div>

					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<label htmlFor="payer-inn-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
								ИНН плательщика:
							</label>
							{innValidation.isValid ? (
								<span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
									<CheckCircle2 size={12} /> Корректен
								</span>
							) : (
								<span className="text-[11px] text-rose-600 font-bold flex items-center gap-0.5">
									<AlertCircle size={12} /> Ошибка
								</span>
							)}
						</div>
						<input
							id="payer-inn-input"
							type="text"
							maxLength={12}
							value={payerInn}
							onChange={(e) => setPayerInn(e.target.value)}
							placeholder="12 цифр ИНН"
							className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold ${
								innValidation.isValid
									? "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)]"
									: "border-rose-500 bg-rose-500/5"
							}`}
						/>
					</div>

					<div className="space-y-1">
						<label htmlFor="payer-bday-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Дата рождения плательщика:
						</label>
						<input
							id="payer-bday-input"
							type="date"
							value={payerBirthDate}
							onChange={(e) => setPayerBirthDate(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
						/>
					</div>
				</div>

				{/* Passport series & number */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
					<div className="space-y-1">
						<label htmlFor="passport-series-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Серия паспорта РФ:
						</label>
						<input
							id="passport-series-input"
							type="text"
							maxLength={4}
							value={passportSeries}
							onChange={(e) => setPassportSeries(e.target.value.replace(/\D/g, ""))}
							placeholder="4510"
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="passport-number-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Номер паспорта РФ:
						</label>
						<input
							id="passport-number-input"
							type="text"
							maxLength={6}
							value={passportNumber}
							onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ""))}
							placeholder="123456"
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="cert-number-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Номер справки:
						</label>
						<input
							id="cert-number-input"
							type="text"
							value={certificateNumber}
							onChange={(e) => setCertificateNumber(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="tax-office-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Код ИФНС (КодНО):
						</label>
						<input
							id="tax-office-input"
							type="text"
							maxLength={4}
							value={taxOfficeCode}
							onChange={(e) => setTaxOfficeCode(e.target.value)}
							placeholder="7701"
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
						/>
					</div>
				</div>
			</div>

			{/* Real-Time Calculation Breakdown Card OR Honest Empty State */}
			{yearPayments.length === 0 ? (
				<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
					<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
						<Receipt className="w-6 h-6" />
					</div>
					<div className="space-y-1.5 max-w-md mx-auto">
						<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
							Нет подтвержденных оплат за {selectedYear} год для формирования справки на вычет
						</h4>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
							{payments.length === 0
								? "В карточке пациента отсутствуют оплаченные счета. Справка для налогового вычета формируется автоматически при наличии фискальных чеков."
								: `За ${selectedYear} год оплаченных счетов не найдено. Выберите другой налоговый период выше или закройте окно.`}
						</p>
					</div>
					<div className="flex items-center justify-center gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
						>
							Закрыть
						</button>
					</div>
				</div>
			) : (
				<div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 border border-teal-500/30 space-y-4">
					<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
						<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-800 dark:text-teal-200">
							<Coins size={16} className="text-teal-600" />
							Расчет сумм вычета по Приказу 824@ за {selectedYear} год:
						</span>
						<span className="text-xs text-[var(--muted,#64748b)]">
							Чеков за {selectedYear} г.: {targetYearSummary.receiptsCount}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{/* Code 01 */}
						<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
								Код 01 (Обычное лечение)
							</div>
							<div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">
								{(targetYearSummary.code01Kopecks / 100).toLocaleString("ru-RU", {
									minimumFractionDigits: 2,
								})}{" "}
								₽
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								Лимит: {targetYearSummary.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽ / год
							</div>
						</div>

						{/* Code 02 */}
						<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<div className="text-[11px] font-bold uppercase text-rose-500">
								Код 02 (Дорогостоящее)
							</div>
							<div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
								{(targetYearSummary.code02Kopecks / 100).toLocaleString("ru-RU", {
									minimumFractionDigits: 2,
								})}{" "}
								₽
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								Имплантация / без лимита
							</div>
						</div>

						{/* Estimated Refund */}
						<div className="p-3 rounded-xl bg-teal-600 text-white space-y-1 shadow-sm">
							<div className="text-[11px] font-bold uppercase opacity-90">
								Возврат НДФЛ 13% (к выплате)
							</div>
							<div className="text-xl font-black font-mono">
								{targetYearSummary.refund13EstimateRub.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] opacity-80">
								(15% для дохода свыше 5 млн ₽: {targetYearSummary.refund15EstimateRub.toLocaleString("ru-RU")} ₽)
							</div>
						</div>
					</div>

					{/* QR Verification preview & In-words preview */}
					<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between gap-4">
						<div className="space-y-1 text-xs">
							<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<ShieldCheck size={16} className="text-emerald-600" />
								Сумма к вычету прописью:
							</div>
							<div className="font-serif italic text-slate-700 dark:text-slate-300">
								{amountToWordsRu(targetYearSummary.totalKopecks)}
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								Лицензия клиники: {clinicLicenseNumber} от {clinicLicenseDate} г.
							</div>
						</div>
						<div
							className="w-16 h-16 shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-900 shadow-xs"
							dangerouslySetInnerHTML={{ __html: qrSvgString }}
							title="QR-код моментальной проверки подлинности справки в ФНС"
						/>
					</div>
				</div>
			)}
		</>
	);
};
