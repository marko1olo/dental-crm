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
	QrCode,
	FileCode,
	ListOrdered,
	Copy,
	Check,
	ShieldCheck,
	Percent,
	FileSpreadsheet,
	HelpCircle,
} from "lucide-react";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateExactTaxSplitKopecks,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionXml,
	generateTaxCertificateQrSvg,
	printTaxCertificateKnd1151156,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianPassport,
	validateTaxCertificateParams,
	validateFnsTaxXmlStructure,
} from "./fnsTaxDeductionEngine";
import { showToast } from "../../GlobalToast";

export interface FnsTaxDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly payments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
}

export const FnsTaxDeductionModal: React.FC<FnsTaxDeductionModalProps> = ({
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
			serviceName: "Лечение кариеса и эндодонтия (Терапия)",
			code804n: "A16.07.002.001",
			amountRub: 45000,
			taxCode: "1",
		},
		{
			id: "pay-2",
			dateIso: "2024-06-20T14:30:00Z",
			receiptNumber: "002",
			fiscalDocumentNumber: "102",
			fiscalSign: "987654322",
			serviceName: "Дентальная имплантация Nobel Biocare (Хирургия)",
			code804n: "A16.07.054.001",
			amountRub: 160000,
			taxCode: "2",
		},
		{
			id: "pay-3",
			dateIso: "2024-09-10T11:00:00Z",
			receiptNumber: "003",
			fiscalDocumentNumber: "103",
			fiscalSign: "987654323",
			serviceName: "Синус-лифтинг с костной пластикой (Аугментация)",
			code804n: "A16.07.041.002",
			amountRub: 85000,
			taxCode: "2",
		},
		{
			id: "pay-4",
			dateIso: "2025-02-10T12:00:00Z",
			receiptNumber: "004",
			fiscalDocumentNumber: "104",
			fiscalSign: "987654324",
			serviceName: "Ортодонтическая коррекция прикуса",
			code804n: "A16.07.048",
			amountRub: 90000,
			taxCode: "1",
		},
	],
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7707083893",
	clinicKpp = "770101001",
	clinicOgrn = "1027700132195",
	clinicLicenseNumber = "ЛО41-01137-77/00368421",
	clinicLicenseDate = "12.10.2021",
	clinicAddress = "г. Москва, ул. Большая Стоматологическая, д. 12",
	chiefDoctorName = "Барабаш Сергей Владимирович",
}) => {
	const [activeTab, setActiveTab] = useState<"form" | "calc" | "checks" | "xml">("form");
	const [selectedYear, setSelectedYear] = useState<number>(2024);
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>(patientInn || "500100732259");
	const [payerBirthDate, setPayerBirthDate] = useState<string>(patientBirthDate);
	const [passportSeries, setPassportSeries] = useState<string>("4510");
	const [passportNumber, setPassportNumber] = useState<string>("123456");
	const [certificateNumber, setCertificateNumber] = useState<string>("915");
	const [taxOfficeCode, setTaxOfficeCode] = useState<string>("7701");
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);

	// Validation checks
	const innValidation = useMemo(() => validateRussianInn(payerInn), [payerInn]);
	const passportValidation = useMemo(
		() => validateRussianPassport(`${passportSeries}${passportNumber}`),
		[passportSeries, passportNumber],
	);

	// Multi-year summary calculation using exact BigInt engine
	const exactSplit = useMemo(() => {
		if (!isOpen) {
			return {
				code01Kopecks: 0n,
				code01Rub: 0,
				code02Kopecks: 0n,
				code02Rub: 0,
				totalKopecks: 0n,
				totalRub: 0,
				code01StatutoryLimitKopecks: 15000000n,
				code01StatutoryLimitRub: 150000,
				code01EligibleKopecks: 0n,
				code01EligibleRub: 0,
				refund13Kopecks: 0n,
				refund13Rub: 0,
				refund15Kopecks: 0n,
				refund15Rub: 0,
				isCode01Capped: false,
				receiptsCount: 0,
			};
		}
		return calculateExactTaxSplitKopecks(payments, selectedYear);
	}, [isOpen, payments, selectedYear]);

	const yearPayments = useMemo(() => {
		if (!isOpen) return [];
		return payments.filter((p) => new Date(p.dateIso).getFullYear() === selectedYear);
	}, [isOpen, payments, selectedYear]);

	const getCertificateParams = (): TaxDeductionCertificateParams => ({
		certificateNumber,
		issueDateIso: new Date().toISOString(),
		taxYear: selectedYear,
		taxOfficeCode,
		clinic: {
			legalName: clinicName,
			inn: clinicInn,
			kpp: clinicKpp,
			ogrn: clinicOgrn,
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

	const certParams = useMemo(() => {
		if (!isOpen) return null;
		return getCertificateParams();
	}, [
		isOpen,
		certificateNumber,
		selectedYear,
		taxOfficeCode,
		clinicName,
		clinicInn,
		clinicKpp,
		clinicOgrn,
		clinicLicenseNumber,
		clinicLicenseDate,
		clinicAddress,
		chiefDoctorName,
		payerFullName,
		payerInn,
		payerBirthDate,
		passportSeries,
		passportNumber,
		payerRelationship,
		patientName,
		patientBirthDate,
		patientInn,
		payments,
	]);

	const validationResult = useMemo(() => {
		if (!certParams) return { isValid: true, errors: [], warnings: [] };
		return validateTaxCertificateParams(certParams);
	}, [certParams]);

	const xmlRepresentation = useMemo(() => {
		if (!certParams) return { fileName: "", fileId: "", xmlContent: "" };
		return generateFnsTaxDeductionXml(certParams);
	}, [certParams]);

	const xmlValidation = useMemo(() => {
		if (!xmlRepresentation.xmlContent) return { isValid: true, errors: [] };
		return validateFnsTaxXmlStructure(xmlRepresentation.xmlContent);
	}, [xmlRepresentation]);

	const qrSvgString = useMemo(() => {
		if (!certParams) return "";
		return generateTaxCertificateQrSvg(certParams, { size: 100, margin: 1 });
	}, [certParams]);

	const barcodeSvgString = useMemo(() => {
		if (!isOpen) return "";
		return generateFnsFormKnd1151156BarcodeSvg({
			certificateNumber,
			taxYear: selectedYear,
			height: 36,
			width: 170,
		});
	}, [isOpen, certificateNumber, selectedYear]);

	if (!isOpen) return null;

	const handleFillFromPatient = () => {
		setPayerFullName(patientName);
		setPayerBirthDate(patientBirthDate);
		if (patientInn) setPayerInn(patientInn);
		setPayerRelationship("patient");
		showToast("Реквизиты плательщика подставлены из карточки пациента", "info");
	};

	const handlePrint = () => {
		if (!certParams) return;
		printTaxCertificateKnd1151156(certParams);
	};

	const handleDownloadXml = () => {
		if (!certParams) return;
		downloadFnsTaxXmlFile(certParams);
		showToast(`XML файл ${xmlRepresentation.fileName} выгружен для ФНС / ТКС`, "success");
	};

	const handleDownloadNoMedopl = () => {
		if (!certParams) return;
		downloadFnsNoMedoplXmlFile(certParams);
		showToast("Файл NO_MEDOPL 5.01 выгружен", "success");
	};

	const handleCopyXml = () => {
		navigator.clipboard.writeText(xmlRepresentation.xmlContent);
		setIsCopiedXml(true);
		showToast("XML скопирован в буфер обмена", "info");
		setTimeout(() => setIsCopiedXml(false), 2000);
	};

	// Calculate percentage of 150 000 statutory limit for Code 01
	const limitPct = Math.min(100, Math.round((exactSplit.code01Rub / exactSplit.code01StatutoryLimitRub) * 100));

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
			<div className="w-full max-w-5xl max-h-[94vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<FileText className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base sm:text-lg font-bold m-0 flex items-center gap-1.5">
									Справка для налогового вычета ФНС РФ (Приказ № ЕА-7-11/824@)
								</h2>
								<span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-bold border border-teal-500/20">
									КНД 1151156
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Код 01 (лимит 150 000 ₽) • Код 02 (дорогостоящее без лимита по ПП РФ № 458) • QR-код • Выгрузка XML
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть окно справки ФНС"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tabs Navigation */}
				<div className="px-4 sm:px-6 pt-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex gap-2">
					<button
						type="button"
						onClick={() => setActiveTab("form")}
						className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
							activeTab === "form"
								? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)] rounded-t-xl"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<FileText size={16} />
						<span>Реквизиты и Бланк А4</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("calc")}
						className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
							activeTab === "calc"
								? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)] rounded-t-xl"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<Coins size={16} />
						<span>Расчет вычета 13&nbsp;% / 15&nbsp;%</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("checks")}
						className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
							activeTab === "checks"
								? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)] rounded-t-xl"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<ListOrdered size={16} />
						<span>Чеки 54-ФЗ ({yearPayments.length})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("xml")}
						className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
							activeTab === "xml"
								? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)] rounded-t-xl"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<FileCode size={16} />
						<span>Экспорт XML 5.01</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
					{activeTab === "form" && (
						<>
							{/* Selectors Row */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Year Selector */}
								<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
											<Calendar size={14} className="text-teal-600" />
											Отчетный год:
										</span>
										<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
											Лимит Кода 01: {selectedYear >= 2024 ? "150 000 ₽" : "120 000 ₽"}
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
											Степень родства (Код ФНС):
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
										{(["patient", "spouse", "parent", "child"] as const).map((r) => {
											const meta = TAX_DEDUCTION_RELATIONSHIP_MAP[r];
											return (
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

							{/* Payer Requisites */}
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
								<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
									Реквизиты налогоплательщика:
								</span>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="space-y-1">
										<label htmlFor="modal-payer-fullname" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											ФИО плательщика:
										</label>
										<input
											id="modal-payer-fullname"
											type="text"
											value={payerFullName}
											onChange={(e) => setPayerFullName(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium"
										/>
									</div>

									<div className="space-y-1">
										<div className="flex items-center justify-between">
											<label htmlFor="modal-payer-inn" className="text-xs font-bold text-[var(--ink,#0f172a)]">
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
											id="modal-payer-inn"
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
										<label htmlFor="modal-payer-bday" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											Дата рождения плательщика:
										</label>
										<input
											id="modal-payer-bday"
											type="date"
											value={payerBirthDate}
											onChange={(e) => setPayerBirthDate(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										/>
									</div>
								</div>

								{/* Passport details & Document number */}
								<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
									<div className="space-y-1">
										<label htmlFor="modal-passport-series" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											Серия паспорта:
										</label>
										<input
											id="modal-passport-series"
											type="text"
											maxLength={4}
											value={passportSeries}
											onChange={(e) => setPassportSeries(e.target.value.replace(/\D/g, ""))}
											placeholder="4510"
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="modal-passport-num" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											Номер паспорта:
										</label>
										<input
											id="modal-passport-num"
											type="text"
											maxLength={6}
											value={passportNumber}
											onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ""))}
											placeholder="123456"
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="modal-cert-num" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											Номер справки:
										</label>
										<input
											id="modal-cert-num"
											type="text"
											value={certificateNumber}
											onChange={(e) => setCertificateNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="modal-tax-office" className="text-xs font-bold text-[var(--ink,#0f172a)]">
											Код ИФНС:
										</label>
										<input
											id="modal-tax-office"
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

							{/* Summary Snapshot Box */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/30 space-y-1">
									<div className="text-xs font-bold text-teal-800 dark:text-teal-200">
										Код 01 (Обычное лечение)
									</div>
									<div className="text-xl font-bold font-mono text-teal-700 dark:text-teal-300">
										{exactSplit.code01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)]">
										Лимит: {exactSplit.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽
									</div>
								</div>

								<div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/30 space-y-1">
									<div className="text-xs font-bold text-rose-800 dark:text-rose-200">
										Код 02 (Дорогостоящее)
									</div>
									<div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
										{exactSplit.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)]">
										Без лимита (ПП РФ № 458)
									</div>
								</div>

								<div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 space-y-1">
									<div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
										Возврат 13% НДФЛ
									</div>
									<div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
										{exactSplit.refund13Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)]">
										ИТОГО расходов: {exactSplit.totalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
								</div>
							</div>
						</>
					)}

					{activeTab === "calc" && (
						<div className="space-y-6">
							{/* Statutory Limit Progress */}
							<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Использование годового лимита по Коду 01 ({selectedYear} год):
									</span>
									<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
										{exactSplit.code01Rub.toLocaleString("ru-RU")} / {exactSplit.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽ ({limitPct}%)
									</span>
								</div>
								<div className="w-full bg-[var(--line,#e2e8f0)] h-3 rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-300 ${
											exactSplit.isCode01Capped ? "bg-amber-500" : "bg-teal-600"
										}`}
										style={{ width: `${limitPct}%` }}
									/>
								</div>
								{exactSplit.isCode01Capped && (
									<div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
										<AlertCircle size={14} className="shrink-0" />
										<span>
											Расходы по Коду 01 превышают {exactSplit.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽. Вычет будет рассчитан исходя из предельной суммы {exactSplit.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽ (ст. 219 НК РФ).
										</span>
									</div>
								)}
							</div>

							{/* Detailed Table */}
							<div className="overflow-x-auto rounded-2xl border border-[var(--line,#e2e8f0)]">
								<table className="w-full text-xs text-left border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-bold">
										<tr>
											<th className="p-3">Код услуги</th>
											<th className="p-3">Категория медицинских услуг</th>
											<th className="p-3 text-right">Сумма расходов</th>
											<th className="p-3 text-right">Сумма к вычету</th>
											<th className="p-3 text-right">Возврат 13%</th>
											<th className="p-3 text-right">Возврат 15%</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] font-medium">
										<tr>
											<td className="p-3 font-bold text-teal-700 dark:text-teal-300">Код 01</td>
											<td className="p-3">Терапевтическое, ортодонтическое, эндодонтическое лечение, гигиена</td>
											<td className="p-3 text-right font-mono font-bold">{exactSplit.code01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
											<td className="p-3 text-right font-mono">{exactSplit.code01EligibleRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
											<td className="p-3 text-right font-mono font-bold text-emerald-600">
												{(Number((exactSplit.code01EligibleKopecks * 13n + 50n) / 100n) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
											<td className="p-3 text-right font-mono text-slate-500">
												{(Number((exactSplit.code01EligibleKopecks * 15n + 50n) / 100n) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
										</tr>
										<tr>
											<td className="p-3 font-bold text-rose-700 dark:text-rose-300">Код 02</td>
											<td className="p-3">Дорогостоящие услуги (дентальная имплантация, костная пластика, синус-лифтинг)</td>
											<td className="p-3 text-right font-mono font-bold">{exactSplit.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
											<td className="p-3 text-right font-mono">{exactSplit.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
											<td className="p-3 text-right font-mono font-bold text-emerald-600">
												{(Number((exactSplit.code02Kopecks * 13n + 50n) / 100n) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
											<td className="p-3 text-right font-mono text-slate-500">
												{(Number((exactSplit.code02Kopecks * 15n + 50n) / 100n) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
										</tr>
										<tr className="bg-[var(--paper-soft,#f8fafc)] font-bold">
											<td colSpan={2} className="p-3 text-right">ИТОГО ЗА {selectedYear} ГОД:</td>
											<td className="p-3 text-right font-mono text-base text-teal-800 dark:text-teal-200">
												{exactSplit.totalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
											<td className="p-3 text-right font-mono">
												{(exactSplit.code01EligibleRub + exactSplit.code02Rub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
											<td className="p-3 text-right font-mono text-base text-emerald-700 dark:text-emerald-300">
												{exactSplit.refund13Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
											<td className="p-3 text-right font-mono text-slate-600">
												{exactSplit.refund15Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					)}

					{activeTab === "checks" && (
						<div className="space-y-4">
							<div className="overflow-x-auto rounded-2xl border border-[var(--line,#e2e8f0)]">
								<table className="w-full text-xs text-left border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-bold">
										<tr>
											<th className="p-3">№</th>
											<th className="p-3">Дата</th>
											<th className="p-3">Чек №</th>
											<th className="p-3">ФД / ФПД</th>
											<th className="p-3">Наименование услуги</th>
											<th className="p-3">Код 804н</th>
											<th className="p-3 text-center">Код вычета</th>
											<th className="p-3 text-right">Сумма (руб.)</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] font-medium">
										{yearPayments.map((pay, idx) => {
											const cat = pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName);
											return (
												<tr key={pay.id || idx} className="hover:bg-[var(--paper-soft,#f8fafc)]">
													<td className="p-3">{idx + 1}</td>
													<td className="p-3 font-mono">{pay.dateIso.slice(0, 10)}</td>
													<td className="p-3 font-mono">{pay.receiptNumber}</td>
													<td className="p-3 font-mono text-[11px] text-[var(--muted,#64748b)]">
														ФД: {pay.fiscalDocumentNumber || "—"} / ФПД: {pay.fiscalSign || "—"}
													</td>
													<td className="p-3">{pay.serviceName}</td>
													<td className="p-3 font-mono text-[11px]">{pay.code804n || "—"}</td>
													<td className="p-3 text-center">
														<span
															className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
																cat === "2"
																	? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
																	: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
															}`}
														>
															Код 0{cat}
														</span>
													</td>
													<td className="p-3 text-right font-mono font-bold">
														{pay.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{activeTab === "xml" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
										Файл: {xmlRepresentation.fileName}
									</span>
									{xmlValidation.isValid ? (
										<span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
											XML валиден (Формат 5.01)
										</span>
									) : (
										<span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
											Ошибки в структуре XML
										</span>
									)}
								</div>
								<button
									type="button"
									onClick={handleCopyXml}
									className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold flex items-center gap-1.5 hover:border-teal-400 cursor-pointer"
								>
									{isCopiedXml ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
									<span>{isCopiedXml ? "Скопировано" : "Скопировать XML"}</span>
								</button>
							</div>

							<pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] max-h-80 overflow-auto border border-slate-800 leading-relaxed">
								{xmlRepresentation.xmlContent}
							</pre>
						</div>
					)}
				</div>

				{/* Footer Controls */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<ShieldCheck size={16} className="text-teal-600" />
						<span>Приказ ФНС РФ № ЕА-7-11/824@ • Форма КНД 1151156</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadNoMedopl}
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:border-teal-400 transition-colors flex items-center gap-1.5 cursor-pointer"
						>
							<Download size={14} />
							<span>NO_MEDOPL</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadXml}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300 border border-teal-600/30 text-xs sm:text-sm font-bold hover:bg-teal-600/20 transition-colors flex items-center gap-2 cursor-pointer"
						>
							<Download size={16} />
							<span>Скачать XML (ТКС)</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-teal-700 transition-colors flex items-center gap-2 cursor-pointer"
						>
							<Printer size={16} />
							<span>Печать бланка КНД 1151156</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
