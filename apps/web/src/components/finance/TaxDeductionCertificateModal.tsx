import React, { useState, useMemo } from "react";
import {
	FileText,
	X,
	FileCode,
	ListOrdered,
	Users,
} from "lucide-react";
import {
	calculateTaxDeductionSummary,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	downloadFnsBatchTaxXmlFile,
	downloadFnsBatchNoMedoplXmlFile,
	extractTaxYearFromDate,
	generateFnsTaxDeductionXml,
	generateFamilyTaxDeductionBatch,
	generateTaxCertificateQrSvg,
	normalizePaymentsForTaxCertificate,
	renderOfficialTaxCertificateKnd1151156Html,
	renderTaxDeductionBatchCertificateHtml,
	validateRussianInn,
	validateRussianPassport,
	type FamilyMemberPayerConfig,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
} from "./taxDeductionEngine";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { TaxDeductionFamilyTab } from "./TaxDeductionFamilyTab";
import { TaxDeductionChecksTab } from "./TaxDeductionChecksTab";
import { TaxDeductionXmlTab } from "./TaxDeductionXmlTab";
import { TaxDeductionModalFooter } from "./TaxDeductionModalFooter";
import { TaxDeductionRequisitesForm } from "./TaxDeductionRequisitesForm";

export { TaxDeductionFamilyTab } from "./TaxDeductionFamilyTab";
export { TaxDeductionChecksTab } from "./TaxDeductionChecksTab";
export { TaxDeductionXmlTab } from "./TaxDeductionXmlTab";
export { TaxDeductionModalFooter } from "./TaxDeductionModalFooter";
export { TaxDeductionRequisitesForm } from "./TaxDeductionRequisitesForm";

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
	patientId,
	autoFetchPayments: _autoFetchPayments,
	clinicName: propClinicName = "ООО «Стоматологическая клиника»",
	clinicInn: propClinicInn = "",
	clinicKpp: propClinicKpp = "",
	clinicOgrn: propClinicOgrn = "",
	clinicLicenseNumber: propClinicLicenseNumber = "",
	clinicLicenseDate: propClinicLicenseDate = "",
	clinicAddress: propClinicAddress = "",
	chiefDoctorName: propChiefDoctorName = "Руководитель клиники",
}) => {
	const appLogic = useOptionalAppLogicContext();
	const clinicProfile = appLogic?.clinic;

	const clinicName = propClinicName || clinicProfile?.legalName || clinicProfile?.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = propClinicInn || clinicProfile?.inn || "";
	const clinicKpp = propClinicKpp || clinicProfile?.kpp || "";
	const clinicOgrn = propClinicOgrn || clinicProfile?.ogrn || "";
	const clinicLicenseNumber = propClinicLicenseNumber || clinicProfile?.medicalLicenseNumber || "";
	const clinicLicenseDate = propClinicLicenseDate || clinicProfile?.medicalLicenseIssuedAt || "";
	const clinicAddress = propClinicAddress || clinicProfile?.address || "";
	const chiefDoctorName =
		propChiefDoctorName && propChiefDoctorName !== "Руководитель клиники"
			? propChiefDoctorName
			: (clinicProfile as { chiefDoctorName?: string } | undefined)?.chiefDoctorName || "";

	const currentYear = new Date().getFullYear();
	const [activeTab, setActiveTab] = useState<"form" | "checks" | "family" | "xml">("form");
	const [selectedYear, setSelectedYear] = useState<number>(() => {
		if (propSelectedYear) return propSelectedYear;
		if (defaultTaxYear) return defaultTaxYear;
		if (payments.length > 0) {
			const paymentYears = payments
				.map((p) => extractTaxYearFromDate(p.dateIso))
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
	const [fetchedPayments, setFetchedPayments] = useState<readonly TaxDeductionPaymentItem[]>([]);
	const [_isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);

	React.useEffect(() => {
		if (isOpen && patientId && payments.length === 0) {
			setIsLoadingPayments(true);
			const headers: Record<string, string> = {
				...denteAdminSecretRequestHeaders(),
				...(appLogic?.auth?.denteClinicalReadHeaders?.() ?? {}),
			};
			fetch(`/api/documents/tax-deduction/preview/${encodeURIComponent(patientId)}?year=${selectedYear}`, {
				headers,
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.receipts && Array.isArray(data.receipts)) {
						const mapped: TaxDeductionPaymentItem[] = data.receipts
							.filter((r: any) => !r.isExcluded)
							.map((r: any) => ({
								id: r.id,
								receiptNumber: r.receiptNumber,
								fiscalDocumentNumber: r.fiscalDocumentNumber || "",
								fiscalSign: "",
								serviceName: r.serviceName,
								dateIso: r.receiptDate,
								amountRub: r.amountRub,
								taxCode: r.deductionCode === "2" ? "2" : "1",
							}));
						setFetchedPayments(mapped);
					}
				})
				.catch((err) => {
					console.warn("Failed to fetch tax deduction preview payments:", err);
				})
				.finally(() => {
					setIsLoadingPayments(false);
				});
		}
	}, [isOpen, patientId, payments.length, selectedYear, appLogic?.auth]);

	const effectivePayments = useMemo(() => {
		return payments.length > 0 ? payments : fetchedPayments;
	}, [payments, fetchedPayments]);

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
			} else if (effectivePayments.length > 0) {
				const paymentYears = effectivePayments
					.map((p) => extractTaxYearFromDate(p.dateIso))
					.filter((y) => !isNaN(y) && y > 2000);
				if (paymentYears.length > 0 && !paymentYears.includes(selectedYear)) {
					setSelectedYear(Math.max(...paymentYears));
				}
			}
		}
	}, [isOpen, patientName, patientBirthDate, patientInn, patientSnils, initialPayerSnils, propSelectedYear, defaultTaxYear, effectivePayments]);

	const availableYears = useMemo(() => {
		const baseYears = [currentYear - 2, currentYear - 1, currentYear];
		const paymentYears = effectivePayments
			.map((p) => extractTaxYearFromDate(p.dateIso))
			.filter((y) => !isNaN(y) && y > 2000);
		return Array.from(new Set([...baseYears, ...paymentYears])).sort((a, b) => a - b);
	}, [currentYear, effectivePayments]);

	const paymentsCountByYear = useMemo(() => {
		const counts: Record<number, number> = {};
		for (const p of effectivePayments) {
			const yr = extractTaxYearFromDate(p.dateIso);
			if (!isNaN(yr)) {
				counts[yr] = (counts[yr] || 0) + 1;
			}
		}
		return counts;
	}, [effectivePayments]);

	const [familyMembers] = useState<FamilyMemberPayerConfig[]>([
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
	const _passportValidation = useMemo(
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
		return calculateTaxDeductionSummary(effectivePayments);
	}, [isOpen, effectivePayments]);

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
		return normalizePaymentsForTaxCertificate(effectivePayments, selectedYear);
	}, [isOpen, effectivePayments, selectedYear]);

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
		payments: yearPayments,
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
		yearPayments,
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
		yearPayments,
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
			payments: yearPayments,
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
		yearPayments,
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

	const handlePrint = async () => {
		const params = getCertificateParams();
		const html = renderOfficialTaxCertificateKnd1151156Html(params);

		// Сохранение факта выдачи справки в историю документов пациента (POST /api/documents)
		if (
			patientId &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)
		) {
			try {
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					...(appLogic?.auth?.denteClinicalMutationHeaders ?? {}),
				};
				const validInn =
					payerInn && /^\d{10}$|^\d{12}$/.test(payerInn.trim()) ? payerInn.trim() : null;
				const validPaymentIds = yearPayments
					.map((p) => p.id)
					.filter((id) =>
						Boolean(
							id &&
								/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
						),
					);

				const payload =
					validPaymentIds.length > 0
						? {
								taxPaymentSelection: {
									selectedPaymentIds: validPaymentIds,
								},
							}
						: undefined;

				await fetch("/api/documents", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId,
						kind: "tax_deduction_certificate",
						title: `Справка для налогового вычета за ${selectedYear} г.`,
						taxYear: selectedYear,
						taxPayerInn: validInn,
						totalAmountRub: targetYearSummary.totalRub,
						payload,
					}),
				});
				showToast(`Справка за ${selectedYear} г. сохранена в документах пациента`, "success");
			} catch (err) {
				console.warn("Не удалось сохранить справку в документах пациента:", err);
			}
		}

		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Справка для налоговой (вычет 13%) за ${selectedYear} г.`,
				downloadFilename: `tax_certificate_knd1151156_${selectedYear}.html`,
			});
		} catch {
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
		}
	};

	const handleDownloadXml = () => {
		if (yearPayments.length === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки XML", "warning");
			return;
		}
		const params = getCertificateParams();
		downloadFnsTaxXmlFile(params);
		showToast(`Файл ${xmlRepresentation.fileName} успешно выгружен для отправки`, "success");
	};

	const handleDownloadNoMedoplXml = () => {
		if (yearPayments.length === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки", "warning");
			return;
		}
		const params = getCertificateParams();
		downloadFnsNoMedoplXmlFile(params);
		showToast("Электронная справка выгружена для налоговой", "success");
	};

	const handleDownloadBatchXml = () => {
		if (familyBatchResult.totalPaymentsCount === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки пакета XML", "warning");
			return;
		}
		downloadFnsBatchTaxXmlFile(familyBatchResult.batch);
		showToast(`Пакет справок (${familyBatchResult.certificatesCount} шт.) выгружен для отправки`, "success");
	};

	const handleDownloadBatchNoMedoplXml = () => {
		if (familyBatchResult.totalPaymentsCount === 0) {
			showToast("Нет подтвержденных оплат за выбранный период для выгрузки", "warning");
			return;
		}
		downloadFnsBatchNoMedoplXmlFile(familyBatchResult.batch);
		showToast(`Пакет электронных справок (${familyBatchResult.certificatesCount} шт.) выгружен для налоговой`, "success");
	};

	const handlePrintBatch = async () => {
		const html = renderTaxDeductionBatchCertificateHtml(familyBatchResult.batch);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Пакет справок для налоговой (${familyBatchResult.certificatesCount} шт.)`,
				downloadFilename: `batch_tax_certificates_${selectedYear}.html`,
			});
		} catch {
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
		}
	};

	const handleCopyXml = () => {
		navigator.clipboard.writeText(xmlRepresentation.xmlContent);
		setIsCopiedXml(true);
		showToast("XML скопирован в буфер обмена", "info");
		setTimeout(() => setIsCopiedXml(false), 2500);
	};

	const handlePrintBlank = async () => {
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
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, {
				title: `Бланк справки для налоговой`,
				downloadFilename: `blank_tax_certificate.html`,
			});
		} catch {
			const win = window.open("", "_blank");
			if (win) {
				win.document.write(html);
				win.document.close();
				win.focus();
				setTimeout(() => win.print(), 300);
			} else if (typeof window !== "undefined") {
				window.print();
			}
		}
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
									Справка для налогового вычета (13% НДФЛ)
								</h2>
								<span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-bold border border-teal-500/20">
									Вычет 13%
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
								Формат 5.01 • Разделение сумм по Коду 01 и Коду 02 • QR-верификация • Выгрузка в ТКС
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
						<span>Чеки и оказанные услуги ({yearPayments.length})</span>
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
						<TaxDeductionRequisitesForm
							selectedYear={selectedYear}
							setSelectedYear={setSelectedYear}
							availableYears={availableYears}
							paymentsCountByYear={paymentsCountByYear}
							payerRelationship={payerRelationship}
							setPayerRelationship={setPayerRelationship}
							onFillFromPatient={handleFillFromPatient}
							payerFullName={payerFullName}
							setPayerFullName={setPayerFullName}
							payerInn={payerInn}
							setPayerInn={setPayerInn}
							innValidation={innValidation}
							payerBirthDate={payerBirthDate}
							setPayerBirthDate={setPayerBirthDate}
							passportSeries={passportSeries}
							setPassportSeries={setPassportSeries}
							passportNumber={passportNumber}
							setPassportNumber={setPassportNumber}
							certificateNumber={certificateNumber}
							setCertificateNumber={setCertificateNumber}
							taxOfficeCode={taxOfficeCode}
							setTaxOfficeCode={setTaxOfficeCode}
							yearPayments={yearPayments}
							payments={effectivePayments}
							targetYearSummary={targetYearSummary}
							clinicLicenseNumber={clinicLicenseNumber}
							clinicLicenseDate={clinicLicenseDate}
							qrSvgString={qrSvgString}
							onClose={onClose}
						/>
					)}

					{activeTab === "checks" && (
						<TaxDeductionChecksTab
							selectedYear={selectedYear}
							yearPayments={yearPayments}
						/>
					)}

					{activeTab === "family" && (
						<TaxDeductionFamilyTab
							selectedYear={selectedYear}
							paymentsCount={effectivePayments.length}
							familyBatchResult={familyBatchResult}
							onClose={onClose}
							onDownloadBatchNoMedoplXml={handleDownloadBatchNoMedoplXml}
							onDownloadBatchXml={handleDownloadBatchXml}
							onPrintBatch={handlePrintBatch}
						/>
					)}

					{activeTab === "xml" && (
						<TaxDeductionXmlTab
							selectedYear={selectedYear}
							yearPaymentsCount={yearPayments.length}
							fileName={xmlRepresentation.fileName}
							xmlContent={xmlRepresentation.xmlContent}
							isCopiedXml={isCopiedXml}
							onCopyXml={handleCopyXml}
							onClose={onClose}
						/>
					)}
				</div>

				{/* Footer Actions */}
				<TaxDeductionModalFooter
					activeTab={activeTab}
					clinicName={clinicName}
					clinicInn={clinicInn}
					clinicKpp={clinicKpp}
					onClose={onClose}
					onDownloadBatchNoMedoplXml={handleDownloadBatchNoMedoplXml}
					onDownloadBatchXml={handleDownloadBatchXml}
					onPrintBatch={handlePrintBatch}
					onDownloadNoMedoplXml={handleDownloadNoMedoplXml}
					onDownloadXml={handleDownloadXml}
					onPrintBlank={handlePrintBlank}
					onPrint={handlePrint}
				/>
			</div>
		</div>
	);
};
