import React, { useState, useMemo } from "react";
import {
	FileText,
	Printer,
	Download,
	X,
	UserCheck,
	AlertCircle,
	CheckCircle2,
	Coins,
	Calendar,
	Building,
} from "lucide-react";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	calculateTaxDeductionSummary,
	downloadFnsTaxXmlFile,
	renderTaxDeductionCertificateHtml,
	validateRussianInn,
	validateRussianPassport,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "./taxDeductionEngine";
import { showToast } from "../GlobalToast";

export interface TaxDeductionCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly payments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
}

export const TaxDeductionCertificateModal: React.FC<TaxDeductionCertificateModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнов Алексей Викторович",
	patientBirthDate = "1985-05-12",
	patientInn = "",
	payments = [
		{
			id: "pay-1",
			dateIso: "2024-03-15T10:00:00Z",
			receiptNumber: "001",
			fiscalDocumentNumber: "101",
			fiscalSign: "987654321",
			serviceName: "Лечение кариеса и пульпита (Терапия)",
			code804n: "A16.07.002.001",
			amountRub: 50000,
			taxCode: "1",
		},
		{
			id: "pay-2",
			dateIso: "2024-06-20T14:30:00Z",
			receiptNumber: "002",
			fiscalDocumentNumber: "102",
			fiscalSign: "987654322",
			serviceName: "Дентальная имплантация Nobel Biocare",
			code804n: "A16.07.054.001",
			amountRub: 150000,
			taxCode: "2",
		},
		{
			id: "pay-3",
			dateIso: "2025-02-10T12:00:00Z",
			receiptNumber: "003",
			fiscalDocumentNumber: "103",
			fiscalSign: "987654323",
			serviceName: "Ортодонтическое лечение",
			code804n: "A16.07.048",
			amountRub: 80000,
			taxCode: "1",
		},
	],
	clinicName = "ООО «ДЕНТЕ КЛИНИКА»",
	clinicInn = "7707083893",
	clinicLicenseNumber = "ЛО41-01137-77/00368421",
	clinicLicenseDate = "12.10.2021",
	clinicAddress = "г. Москва, ул. Стоматологическая, д. 10",
	chiefDoctorName = "Иванов Иван Иванович",
}) => {
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(2024);
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>(patientInn || "500100732259");
	const [payerBirthDate, setPayerBirthDate] = useState<string>(patientBirthDate);
	const [passportSeries, setPassportSeries] = useState<string>("4510");
	const [passportNumber, setPassportNumber] = useState<string>("123456");
	const [certificateNumber, setCertificateNumber] = useState<string>("842");

	// Validation checks
	const innValidation = useMemo(() => validateRussianInn(payerInn), [payerInn]);
	const passportValidation = useMemo(
		() => validateRussianPassport(`${passportSeries}${passportNumber}`),
		[passportSeries, passportNumber]
	);

	// Multi-year summary calculation
	const calculationResult = useMemo(
		() => calculateTaxDeductionSummary(payments),
		[payments]
	);

	const targetYearSummary = useMemo(() => {
		return (
			calculationResult.yearsSummary.find((y) => y.taxYear === selectedYear) || {
				taxYear: selectedYear,
				code01Rub: 0,
				code01Kopecks: 0,
				code02Rub: 0,
				code02Kopecks: 0,
				totalRub: 0,
				totalKopecks: 0,
				receiptsCount: 0,
				refund13EstimateRub: 0,
				refund15EstimateRub: 0,
			}
		);
	}, [calculationResult, selectedYear]);

	if (!isOpen) return null;

	const handleFillFromPatient = () => {
		setPayerFullName(patientName);
		setPayerBirthDate(patientBirthDate);
		if (patientInn) setPayerInn(patientInn);
		setPayerRelationship("patient");
		showToast("Данные плательщика заполнены из карточки пациента", "info");
	};

	const getCertificateParams = () => ({
		certificateNumber,
		issueDateIso: new Date().toISOString(),
		taxYear: selectedYear,
		taxOfficeCode: "7701",
		clinic: {
			legalName: clinicName,
			inn: clinicInn,
			kpp: "770101001",
			ogrn: "1027700132195",
			licenseNumber: clinicLicenseNumber,
			licenseDate: clinicLicenseDate,
			address: clinicAddress,
			chiefDoctorName,
		},
		payer: {
			fullName: payerFullName,
			inn: payerInn,
			birthDate: payerBirthDate,
			identityDocumentSeries: passportSeries,
			identityDocumentNumber: passportNumber,
			relationship: payerRelationship,
		},
		patient: {
			fullName: patientName,
			birthDate: patientBirthDate,
			inn: patientInn,
		},
		payments,
	});

	const handlePrint = () => {
		const params = getCertificateParams();
		const html = renderTaxDeductionCertificateHtml(params);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => {
				win.print();
			}, 300);
		}
	};

	const handleDownloadXml = () => {
		const params = getCertificateParams();
		downloadFnsTaxXmlFile(params);
		showToast("XML-файл справки 824@ успешно выгружен для ЛК ФНС", "success");
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<FileText className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold m-0 flex items-center gap-2">
								Справка для налогового вычета (Приказ ФНС № ЕД-7-11/824@)
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								КНД 1151156 • Разделение сумм по Коду 01 и Коду 02 • Выгрузка XML в ЛК ФНС
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть модальное окно справки"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
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
									Выбран: {selectedYear} год
								</span>
							</div>
							<div className="flex gap-2">
								{[2024, 2025, 2026].map((yr) => (
									<button
										key={yr}
										type="button"
										onClick={() => setSelectedYear(yr)}
										className={`min-h-[44px] flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
											selectedYear === yr
												? "bg-teal-600 text-white shadow-sm"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
										}`}
									>
										{yr} год
									</button>
								))}
							</div>
						</div>

						{/* Relationship Selector */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
									<UserCheck size={14} className="text-teal-600" />
									Родство плательщика с пациентом:
								</span>
								<button
									type="button"
									onClick={handleFillFromPatient}
									className="text-[11px] text-teal-600 hover:underline font-bold cursor-pointer"
								>
									Заполнить из карточки
								</button>
							</div>
							<div className="grid grid-cols-2 gap-1.5">
								{(["patient", "spouse", "parent", "child"] as const).map((r) => (
									<button
										key={r}
										type="button"
										onClick={() => {
											setPayerRelationship(r);
											if (r === "patient") {
												setPayerFullName(patientName);
												setPayerBirthDate(patientBirthDate);
											}
										}}
										className={`min-h-[44px] px-2 rounded-xl text-xs font-bold transition-all truncate cursor-pointer ${
											payerRelationship === r
												? "bg-teal-600 text-white shadow-sm"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
										}`}
									>
										{TAX_DEDUCTION_RELATIONSHIP_MAP[r].labelRu.split(" ")[0]}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Payer Requisites Fields */}
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Реквизиты налогоплательщика (для справки):
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
										innValidation.isValid ? "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)]" : "border-rose-500 bg-rose-500/5"
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
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
						</div>
					</div>

					{/* Real-Time Calculation Breakdown Card */}
					<div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 border border-teal-500/30 space-y-4">
						<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
							<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-800 dark:text-teal-200">
								<Coins size={16} className="text-teal-600" />
								Расчет сумм вычета по Приказу 824@ за {selectedYear} год:
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">
								Чеков в базе: {targetYearSummary.receiptsCount}
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							{/* Code 01 */}
							<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<div className="text-[11px] font-bold uppercase text-slate-500">
									Код 01 (Обычное лечение)
								</div>
								<div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">
									{(targetYearSummary.code01Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									Лимит: 150 000 ₽ / год
								</div>
							</div>

							{/* Code 02 */}
							<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<div className="text-[11px] font-bold uppercase text-rose-500">
									Код 02 (Дорогостоящее)
								</div>
								<div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
									{(targetYearSummary.code02Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">
									Имплантация, без лимита
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
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						{clinicName} • ИНН {clinicInn}
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadXml}
							className="min-h-[44px] px-4 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Download size={16} />
							<span>Выгрузить XML в ЛК ФНС</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Printer size={16} />
							<span>Печать справки КНД 1151156</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

