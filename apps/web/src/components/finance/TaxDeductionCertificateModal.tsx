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
	QrCode,
	FileCode,
	ListOrdered,
	Copy,
	Check,
	ShieldCheck,
	Users,
	Receipt,
} from "lucide-react";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	amountToWordsRu,
	calculateTaxDeductionSummary,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	downloadFnsBatchTaxXmlFile,
	downloadFnsBatchNoMedoplXmlFile,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionXml,
	generateFamilyTaxDeductionBatch,
	generateTaxCertificateQrSvg,
	renderOfficialTaxCertificateKnd1151156Html,
	renderTaxDeductionBatchCertificateHtml,
	resolveTaxDeductionCategoryShared,
	validateRussianInn,
	validateRussianPassport,
	type FamilyMemberPayerConfig,
	type TaxDeductionCertificateParams,
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
	readonly patientSnils?: string | undefined;
	readonly payerSnils?: string | undefined;
	readonly payments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly selectedYear?: number | undefined;
	readonly defaultTaxYear?: number | undefined;
	readonly patientId?: string | undefined;
	readonly autoFetchPayments?: boolean | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
}

export const TaxDeductionCertificateModal: React.FC<TaxDeductionCertificateModalProps> = ({
	isOpen,
	onClose,
	patientName = "",
	patientBirthDate = "",
	patientInn = "",
	patientSnils = "",
	payerSnils: initialPayerSnils = "",
	payments = [],
	selectedYear: propSelectedYear,
	defaultTaxYear,
	patientId: _patientId,
	autoFetchPayments: _autoFetchPayments,
	clinicName = "ООО «Стоматологическая клиника»",
	clinicInn = "",
	clinicKpp = "",
	clinicOgrn = "",
	clinicLicenseNumber = "",
	clinicLicenseDate = "",
	clinicAddress = "",
	chiefDoctorName = "Руководитель клиники",
}) => {
	const currentYear = new Date().getFullYear();
	const [activeTab, setActiveTab] = useState<"form" | "checks" | "family" | "xml">("form");
	const [selectedYear, setSelectedYear] = useState<number>(() => {
		if (propSelectedYear) return propSelectedYear;
		if (defaultTaxYear) return defaultTaxYear;
		if (payments.length > 0) {
			const paymentYears = payments
				.map((p) => new Date(p.dateIso).getFullYear())
				.filter((y) => !isNaN(y) && y > 2000);
			if (paymentYears.length > 0) {
				return Math.max(...paymentYears);
			}
		}
		return currentYear;
	});
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>(patientInn);
	const [payerBirthDate, setPayerBirthDate] = useState<string>(patientBirthDate);
	const [payerSnils, setPayerSnils] = useState<string>(initialPayerSnils);
	const [patientSnilsState, setPatientSnilsState] = useState<string>(patientSnils);
	const [passportSeries, setPassportSeries] = useState<string>("");
	const [passportNumber, setPassportNumber] = useState<string>("");
	const [certificateNumber, setCertificateNumber] = useState<string>("1");
	const [taxOfficeCode, setTaxOfficeCode] = useState<string>("7701");
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);

	React.useEffect(() => {
		if (isOpen) {
			if (patientName) setPayerFullName(patientName);
			if (patientBirthDate) setPayerBirthDate(patientBirthDate);
			if (patientInn) setPayerInn(patientInn);
			if (patientSnils) setPatientSnilsState(patientSnils);
			if (initialPayerSnils) setPayerSnils(initialPayerSnils);
			if (propSelectedYear) {
				setSelectedYear(propSelectedYear);
			} else if (defaultTaxYear) {
				setSelectedYear(defaultTaxYear);
			} else if (payments.length > 0) {
				const paymentYears = payments
					.map((p) => new Date(p.dateIso).getFullYear())
					.filter((y) => !isNaN(y) && y > 2000);
				if (paymentYears.length > 0 && !paymentYears.includes(selectedYear)) {
					setSelectedYear(Math.max(...paymentYears));
				}
			}
		}
	}, [isOpen, patientName, patientBirthDate, patientInn, patientSnils, initialPayerSnils, propSelectedYear, defaultTaxYear, payments]);

	const availableYears = useMemo(() => {
		const baseYears = [currentYear - 2, currentYear - 1, currentYear];
		const paymentYears = payments
			.map((p) => new Date(p.dateIso).getFullYear())
			.filter((y) => !isNaN(y) && y > 2000);
		return Array.from(new Set([...baseYears, ...paymentYears])).sort((a, b) => a - b);
	}, [currentYear, payments]);

	const paymentsCountByYear = useMemo(() => {
		const counts: Record<number, number> = {};
		for (const p of payments) {
			const yr = new Date(p.dateIso).getFullYear();
			if (!isNaN(yr)) {
				counts[yr] = (counts[yr] || 0) + 1;
			}
		}
		return counts;
	}, [payments]);
	const [familyMembers, setFamilyMembers] = useState<FamilyMemberPayerConfig[]>([
		{
			id: "spouse",
			relationship: "spouse",
			person: {
				fullName: "Супруг(а) пациента",
				inn: "",
				birthDate: "",
				identityDocumentSeries: "",
				identityDocumentNumber: "",
			},
		},
		{
			id: "parent",
			relationship: "parent",
			person: {
				fullName: "Родитель пациента",
				inn: "",
				birthDate: "",
				identityDocumentSeries: "",
				identityDocumentNumber: "",
			},
		},
		{
			id: "child",
			relationship: "child",
			person: {
				fullName: "Ребенок / подопечный",
				inn: "",
				birthDate: "",
				identityDocumentSeries: "",
				identityDocumentNumber: "",
			},
		},
	]);

	// Validation checks
	const innValidation = useMemo(() => validateRussianInn(payerInn), [payerInn]);
	const passportValidation = useMemo(
		() => validateRussianPassport(`${passportSeries}${passportNumber}`),
		[passportSeries, passportNumber]
	);

	// Multi-year summary calculation
	const calculationResult = useMemo(() => {
		if (!isOpen) {
			return {
				yearsSummary: [],
				grandTotalCode01Rub: 0,
				grandTotalCode01Kopecks: 0,
				grandTotalCode02Rub: 0,
				grandTotalCode02Kopecks: 0,
				grandTotalRub: 0,
				grandTotalKopecks: 0,
				grandTotalRefund13Rub: 0,
				grandTotalRefund15Rub: 0,
				totalReceiptsCount: 0,
				totalAmountInWordsRu: "",
			};
		}
		return calculateTaxDeductionSummary(payments);
	}, [isOpen, payments]);

	const targetYearSummary = useMemo(() => {
		if (!isOpen) {
			return {
				taxYear: selectedYear,
				code01Rub: 0,
				code01Kopecks: 0,
				code02Rub: 0,
				code02Kopecks: 0,
				totalRub: 0,
				totalKopecks: 0,
				receiptsCount: 0,
				code01StatutoryLimitRub: selectedYear >= 2024 ? 150000 : 120000,
				code01EligibleRub: 0,
				refund13EstimateRub: 0,
				refund15EstimateRub: 0,
			};
		}
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
				code01StatutoryLimitRub: selectedYear >= 2024 ? 150000 : 120000,
				code01EligibleRub: 0,
				refund13EstimateRub: 0,
				refund15EstimateRub: 0,
			}
		);
	}, [isOpen, calculationResult, selectedYear]);

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
			snils: payerSnils?.trim() || undefined,
		},
		patient: {
			fullName: patientName,
			birthDate: patientBirthDate,
			inn: patientInn,
			snils: patientSnilsState?.trim() || undefined,
		},
		payments,
	});

	const xmlRepresentation = useMemo(() => {
		if (!isOpen) {
			return { fileName: "", xmlContent: "" };
		}
		const params = getCertificateParams();
		return generateFnsTaxDeductionXml(params);
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

	const qrSvgString = useMemo(() => {
		if (!isOpen) return "";
		const params = getCertificateParams();
		return generateTaxCertificateQrSvg(params, { size: 120, margin: 1 });
	}, [
		isOpen,
		certificateNumber,
		selectedYear,
		clinicInn,
		payerInn,
		payments,
	]);

	const familyBatchResult = useMemo(() => {
		if (!isOpen) {
			return {
				batch: {
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
					certificates: [],
				},
				summaries: [],
				grandTotalRub: 0,
				grandTotalKopecks: 0,
				grandTotalCode01Rub: 0,
				grandTotalCode01Kopecks: 0,
				grandTotalCode02Rub: 0,
				grandTotalCode02Kopecks: 0,
				grandTotalRefund13Rub: 0,
				grandTotalRefund13Kopecks: 0,
				grandTotalRefund15Rub: 0,
				grandTotalRefund15Kopecks: 0,
				certificatesCount: 0,
				totalPaymentsCount: 0,
			};
		}

		return generateFamilyTaxDeductionBatch({
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
			taxYear: selectedYear,
			taxOfficeCode,
			patient: {
				fullName: patientName,
				inn: patientInn,
				birthDate: patientBirthDate,
				identityDocumentSeries: passportSeries,
				identityDocumentNumber: passportNumber,
			},
			familyMembers,
			payments,
			startCertificateNumber: certificateNumber,
		});
	}, [
		isOpen,
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
		patientName,
		patientInn,
		patientBirthDate,
		passportSeries,
		passportNumber,
		familyMembers,
		payments,
		certificateNumber,
	]);

	if (!isOpen) return null;

	const handleFillFromPatient = () => {
		setPayerFullName(patientName);
		setPayerBirthDate(patientBirthDate);
		if (patientInn) setPayerInn(patientInn);
		setPayerRelationship("patient");
		showToast("Данные плательщика заполнены из карточки пациента", "info");
	};

	const handlePrint = () => {
		const params = getCertificateParams();
		const html = renderOfficialTaxCertificateKnd1151156Html(params);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => {
				win.print();
			}, 300);
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleDownloadXml = () => {
		if (yearPayments.length === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки XML", "warning");
			return;
		}
		const params = getCertificateParams();
		downloadFnsTaxXmlFile(params);
		showToast(`Файл ${xmlRepresentation.fileName} успешно выгружен для ТКС`, "success");
	};

	const handleDownloadNoMedoplXml = () => {
		if (yearPayments.length === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки NO_MEDOPL", "warning");
			return;
		}
		const params = getCertificateParams();
		downloadFnsNoMedoplXmlFile(params);
		showToast("Файл NO_MEDOPL (Формат 5.01) выгружен для ФНС", "success");
	};

	const handleDownloadBatchXml = () => {
		if (familyBatchResult.totalPaymentsCount === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки пакета XML", "warning");
			return;
		}
		downloadFnsBatchTaxXmlFile(familyBatchResult.batch);
		showToast(`Пакетный реестр XML (${familyBatchResult.certificatesCount} справок) выгружен для ТКС`, "success");
	};

	const handleDownloadBatchNoMedoplXml = () => {
		if (familyBatchResult.totalPaymentsCount === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки NO_MEDOPL", "warning");
			return;
		}
		downloadFnsBatchNoMedoplXmlFile(familyBatchResult.batch);
		showToast(`Пакетный файл NO_MEDOPL 5.01 (${familyBatchResult.certificatesCount} справок) выгружен для ФНС`, "success");
	};

	const handlePrintBatch = () => {
		const html = renderTaxDeductionBatchCertificateHtml(familyBatchResult.batch);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => {
				win.print();
			}, 300);
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleCopyXml = () => {
		navigator.clipboard.writeText(xmlRepresentation.xmlContent);
		setIsCopiedXml(true);
		showToast("XML скопирован в буфер обмена", "info");
		setTimeout(() => setIsCopiedXml(false), 2500);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
			<div className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<FileText className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base sm:text-lg font-bold m-0 flex items-center gap-1.5">
									Справка об оплате медицинских услуг (Приказ ФНС № ЕА-7-11/824@)
								</h2>
								<span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-bold border border-teal-500/20">
									КНД 1151156
								</span>
								<span
									data-testid="tax-certificate-stamp-badge"
									className="px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase"
									style={{
										background: yearPayments.length > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
										color: yearPayments.length > 0 ? "#059669" : "#64748b",
										borderColor: yearPayments.length > 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(100, 116, 139, 0.3)",
									}}
								>
									{yearPayments.length > 0 ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Формат 5.01 (КНД 1184043) • Разделение сумм по Коду 01 и Коду 02 • QR-верификация • Выгрузка в ТКС
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

				{/* Tabs Bar */}
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
						<span>Реквизиты и Справка А4</span>
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
						<span>Чеки 54-ФЗ и 804н ({yearPayments.length})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("family")}
						className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
							activeTab === "family"
								? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)] rounded-t-xl"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<Users size={16} />
						<span>Пакетная выгрузка (Семья)</span>
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
						<span>Реестр XML 5.01 (ТКС)</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
					{activeTab === "form" && (
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

							{/* Payer Requisites Fields */}
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
								<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
									Реквизиты налогоплательщика (для справки КНД 1151156):
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
											Нет подтвержденных оплат за {selectedYear} год для формирования справки КНД 1151156
										</h4>
										<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
											{payments.length === 0
												? "В карточке пациента отсутствуют оплаченные счета по 54-ФЗ. Справка для налогового вычета формируется автоматически при наличии фискальных чеков."
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
					)}

					{activeTab === "checks" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
									Кассовые чеки по 54-ФЗ и разделение по Номенклатуре 804н за {selectedYear} год:
								</span>
								<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
									Всего чеков: {yearPayments.length} шт.
								</span>
							</div>

							{yearPayments.length === 0 ? (
								<div className="p-8 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center space-y-2">
									<Receipt className="w-8 h-8 text-[var(--muted,#64748b)] mx-auto opacity-50" />
									<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
										Нет кассовых чеков по 54-ФЗ за {selectedYear} год
									</div>
									<p className="text-[11px] text-[var(--muted,#64748b)] max-w-sm mx-auto m-0">
										Кассовые чеки с фискальными признаками документов (ФД и ФПД) появятся здесь автоматически после фискализации оплаты.
									</p>
								</div>
							) : (
								<div className="border border-[var(--line,#e2e8f0)] rounded-2xl overflow-hidden bg-[var(--paper,#ffffff)]">
									<table className="w-full text-xs text-left border-collapse">
										<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] font-bold text-[var(--muted,#64748b)]">
											<tr>
												<th className="p-3">№</th>
												<th className="p-3">Дата чека</th>
												<th className="p-3">Чек / ФД</th>
												<th className="p-3">ФПД</th>
												<th className="p-3">Наименование услуги</th>
												<th className="p-3">Код 804н</th>
												<th className="p-3">Код вычета</th>
												<th className="p-3 text-right">Сумма (руб.)</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line,#e2e8f0)] font-medium">
											{yearPayments.map((p, idx) => {
												const code = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
												const isCode02 = code === "2";
												return (
													<tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
														<td className="p-3 font-mono text-[var(--muted,#64748b)]">{idx + 1}</td>
														<td className="p-3 font-mono">{p.dateIso.slice(0, 10)}</td>
														<td className="p-3 font-mono font-bold">
															{p.receiptNumber} / ФД №{p.fiscalDocumentNumber}
														</td>
														<td className="p-3 font-mono text-[11px] text-[var(--muted,#64748b)]">
															{p.fiscalSign}
														</td>
														<td className="p-3 max-w-[220px] truncate min-w-0" title={p.serviceName}>{p.serviceName}</td>
														<td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-300">
															{p.code804n || "—"}
														</td>
														<td className="p-3">
															<span
																className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
																	isCode02
																		? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
																		: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
																}`}
															>
																{isCode02 ? "Код 02 (Дорогостоящее)" : "Код 01 (Стандартное)"}
															</span>
														</td>
														<td className="p-3 text-right font-mono font-bold text-sm">
															{p.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{activeTab === "family" && (
						<div className="space-y-6">
							{familyBatchResult.totalPaymentsCount === 0 ? (
								<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
									<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
										<Users className="w-6 h-6" />
									</div>
									<div className="space-y-1.5 max-w-md mx-auto">
										<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
											Нет оплат за {selectedYear} год для распределения между членами семьи
										</h4>
										<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
											{payments.length === 0
												? "В карточке пациента отсутствуют подтвержденные чеки по 54-ФЗ. Пакет справок на возврат НДФЛ для родственников формируется при наличии оплат."
												: `За ${selectedYear} год чеков не найдено. Выберите другой налоговый период в переключателе годов.`}
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
								<>
									{/* Family Banner */}
									<div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="px-2.5 py-0.5 rounded-md bg-teal-600 text-white text-[11px] font-bold tracking-wide">
													ПАКЕТ КНД 1151156 • {selectedYear} ГОД
												</span>
												<span className="text-xs font-mono text-[var(--muted,#64748b)]">
													Справок в пакете: {familyBatchResult.certificatesCount} шт.
												</span>
											</div>
											<h3 className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
												Пакет справок на возврат НДФЛ для всей семьи
											</h3>
											<p className="text-xs text-[var(--muted,#64748b)] m-0">
												Разделение сумм по Коду 01 (обычное лечение) и Коду 02 (дорогостоящее: имплантация, синус-лифтинг, остеопластика) с копеечной точностью.
											</p>
										</div>
										<div className="p-3.5 rounded-xl bg-[var(--paper,#ffffff)] border border-teal-500/40 text-right shadow-xs">
											<div className="text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] font-bold">
												Суммарный возврат 13% семьи
											</div>
											<div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
												+{familyBatchResult.grandTotalRefund13Rub.toLocaleString("ru-RU")} ₽
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
												Всего расходов: {familyBatchResult.grandTotalRub.toLocaleString("ru-RU")} ₽
											</div>
										</div>
									</div>

									{/* Summary Breakdown Cards */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
											<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Код 01 (Обычное лечение)</div>
											<div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300 mt-1">
												{familyBatchResult.grandTotalCode01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
												Лимит: {selectedYear >= 2024 ? "150 000" : "120 000"} ₽ / чел.
											</div>
										</div>
										<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
											<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Код 02 (Дорогостоящее лечение)</div>
											<div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
												{familyBatchResult.grandTotalCode02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
												Без ограничений (п. 4 Пост. № 458)
											</div>
										</div>
										<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
											<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Чеков в базе за {selectedYear} г.</div>
											<div className="text-lg font-bold font-mono text-[var(--ink,#0f172a)] mt-1">
												{familyBatchResult.totalPaymentsCount} шт.
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
												54-ФЗ с фискальными номерами и ФПД
											</div>
										</div>
									</div>

									{/* Family Certificates Table */}
									<div className="space-y-3">
										<div className="flex items-center justify-between flex-wrap gap-2">
											<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 flex items-center gap-2">
												<Users size={16} className="text-teal-600" />
												<span>Справки по членам семьи (плательщикам)</span>
											</h4>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={handleDownloadBatchNoMedoplXml}
													className="min-h-[38px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 cursor-pointer"
													title="Выгрузить пакет NO_MEDOPL 5.01"
												>
													<Download size={14} />
													<span>NO_MEDOPL (5.01)</span>
												</button>
												<button
													type="button"
													onClick={handleDownloadBatchXml}
													className="min-h-[38px] px-3.5 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-500/10 cursor-pointer"
												>
													<Download size={14} />
													<span>Пакет XML (ТКС)</span>
												</button>
												<button
													type="button"
													onClick={handlePrintBatch}
													className="min-h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
												>
													<Printer size={14} />
													<span>Печать пакета А4</span>
												</button>
											</div>
										</div>

										<div className="rounded-2xl border border-[var(--line,#e2e8f0)] overflow-hidden bg-[var(--paper,#ffffff)] shadow-xs">
											<table className="w-full text-left border-collapse text-xs">
												<thead>
													<tr className="border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] font-bold text-[var(--muted,#64748b)]">
														<th className="p-3">Степень родства</th>
														<th className="p-3">Налогоплательщик (ФИО)</th>
														<th className="p-3 text-center">№ Справки</th>
														<th className="p-3 text-center">Чеков</th>
														<th className="p-3 text-right">Код 01 (Руб)</th>
														<th className="p-3 text-right">Код 02 (Руб)</th>
														<th className="p-3 text-right">Всего расходов</th>
														<th className="p-3 text-right font-bold text-emerald-600">Возврат 13%</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
													{familyBatchResult.summaries.map((s) => (
														<tr key={s.relationship} className="hover:bg-teal-500/5 transition-colors">
															<td className="p-3 font-semibold">
																<span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
																	{TAX_DEDUCTION_RELATIONSHIP_MAP[s.relationship].shortLabelRu}
																</span>
															</td>
															<td className="p-3 font-bold text-[var(--ink,#0f172a)]">{s.payerFullName}</td>
															<td className="p-3 text-center font-mono font-bold text-teal-700 dark:text-teal-300">
																№ {s.certificateNumber}
															</td>
															<td className="p-3 text-center font-mono">{s.receiptsCount}</td>
															<td className="p-3 text-right font-mono">
																{s.code01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
															</td>
															<td className="p-3 text-right font-mono font-bold text-rose-700 dark:text-rose-300">
																{s.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
															</td>
															<td className="p-3 text-right font-mono font-bold">
																{s.totalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
															</td>
															<td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
																+{s.refund13EstimateRub.toLocaleString("ru-RU")} ₽
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</>
							)}
						</div>
					)}

					{activeTab === "xml" && (
						<div className="space-y-3">
							{yearPayments.length === 0 ? (
								<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
									<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
										<Receipt className="w-6 h-6" />
									</div>
									<div className="space-y-1.5 max-w-md mx-auto">
										<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
											Нет данных за {selectedYear} год для генерации реестра XML (КНД 1184043)
										</h4>
										<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
											Электронный реестр для ФНС формируется на основании фискальных чеков за выбранный налоговый период.
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
								<>
									<div className="flex items-center justify-between">
										<div>
											<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
												Электронный XML-реестр сведений (КНД 1184043, Формат 5.01)
											</span>
											<span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
												Имя файла: {xmlRepresentation.fileName}
											</span>
										</div>
										<div className="flex gap-2">
											<button
												type="button"
												onClick={handleCopyXml}
												className="min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 cursor-pointer"
											>
												{isCopiedXml ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
												<span>{isCopiedXml ? "Скопировано" : "Копировать XML"}</span>
											</button>
										</div>
									</div>

									<div className="relative">
										<pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[340px] border border-slate-800">
											{xmlRepresentation.xmlContent}
										</pre>
									</div>
								</>
							)}
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						{clinicName} • ИНН {clinicInn} • КПП {clinicKpp}
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
						>
							Закрыть
						</button>
						{activeTab === "family" ? (
							<>
								<button
									type="button"
									onClick={handleDownloadBatchNoMedoplXml}
									className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
									title="Скачать файл NO_MEDOPL Формат 5.01"
								>
									<Download size={15} />
									<span>NO_MEDOPL (5.01)</span>
								</button>
								<button
									type="button"
									onClick={handleDownloadBatchXml}
									className="min-h-[44px] px-4 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Download size={16} />
									<span>Выгрузить пакет XML (ТКС)</span>
								</button>
								<button
									type="button"
									onClick={handlePrintBatch}
									className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Printer size={16} />
									<span>Печать пакета справок (А4)</span>
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									onClick={handleDownloadNoMedoplXml}
									className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
									title="Скачать файл NO_MEDOPL Формат 5.01"
								>
									<Download size={15} />
									<span>NO_MEDOPL (5.01)</span>
								</button>
								<button
									type="button"
									onClick={handleDownloadXml}
									className="min-h-[44px] px-4 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Download size={16} />
									<span>Выгрузить XML (ТКС)</span>
								</button>
								<button
									type="button"
									data-testid="btn-tax-print-blank"
									onClick={() => {
										const blankParams: TaxDeductionCertificateParams = {
											...getCertificateParams(),
											payments: [],
											payer: {
												fullName: payerFullName || "________________________________________",
												inn: payerInn || "____________",
												birthDate: payerBirthDate || "«___» _________ _____ г.",
												relationship: payerRelationship,
											},
											patient: {
												fullName: patientName || "________________________________________",
												birthDate: patientBirthDate || "«___» _________ _____ г.",
												inn: patientInn || "____________",
											},
										};
										const html = renderOfficialTaxCertificateKnd1151156Html(blankParams);
										const win = window.open("", "_blank");
										if (win) {
											win.document.write(html);
											win.document.close();
											win.focus();
											setTimeout(() => win.print(), 300);
										} else if (typeof window !== "undefined") {
											window.print();
										}
									}}
									className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
									title="Печать чистого бланка справки КНД 1151156 со строками «________» для ручного заполнения"
								>
									<Printer size={15} />
									<span>Бланк («________»)</span>
								</button>
								<button
									type="button"
									onClick={handlePrint}
									className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								>
									<Printer size={16} />
									<span>Печать справки КНД 1151156 (А4)</span>
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
