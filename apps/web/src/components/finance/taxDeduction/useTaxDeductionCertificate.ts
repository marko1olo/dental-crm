import { useState, useMemo, useEffect } from "react";
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
	type TaxDeductionYearSummary,
} from "../taxDeductionEngine";
import { showToast } from "../../GlobalToast";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { hardwarePrinter } from "../../../services/hardware/HardwarePrinter.js";
import type {
	TaxDeductionCertificateModalProps,
	TaxDeductionTab,
} from "./types";

export function useTaxDeductionCertificate(props: TaxDeductionCertificateModalProps) {
	const {
		isOpen,
		patientName = "",
		patientBirthDate = "",
		patientInn = "",
		patientSnils = "",
		payerSnils: initialPayerSnils = "",
		payments = [],
		selectedYear: propSelectedYear,
		defaultTaxYear,
		patientId,
		clinicName: propClinicName = "ООО «Стоматологическая клиника»",
		clinicInn: propClinicInn = "",
		clinicKpp: propClinicKpp = "",
		clinicOgrn: propClinicOgrn = "",
		clinicLicenseNumber: propClinicLicenseNumber = "",
		clinicLicenseDate: propClinicLicenseDate = "",
		clinicAddress: propClinicAddress = "",
		chiefDoctorName: propChiefDoctorName = "Руководитель клиники",
	} = props;

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
	const [activeTab, setActiveTab] = useState<TaxDeductionTab>("form");
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
	const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);

	useEffect(() => {
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
		if (payments.length > 0) return payments;
		if (fetchedPayments.length > 0) return fetchedPayments;
		if (
			typeof window !== "undefined" &&
			(window.location.search.includes("demo=true") || window.location.hash.includes("demo=true"))
		) {
			return [
				{
					id: "demo-pmt-1",
					receiptNumber: "ЧЕК-00104",
					fiscalDocumentNumber: "98124",
					fiscalSign: "384910291",
					serviceName: "Лечение глубокого кариеса зуба 2.6 с установкой светоотверждаемой пломбы",
					dateIso: `${selectedYear}-03-15T10:30:00Z`,
					amountRub: 14500,
					taxCode: "1" as const,
				},
				{
					id: "demo-pmt-2",
					receiptNumber: "ЧЕК-00142",
					fiscalDocumentNumber: "98205",
					fiscalSign: "384910402",
					serviceName: "Дентальная имплантация системы Straumann (код 02 - дорогостоящее лечение)",
					dateIso: `${selectedYear}-06-20T14:00:00Z`,
					amountRub: 85000,
					taxCode: "2" as const,
				},
				{
					id: "demo-pmt-3",
					receiptNumber: "ЧЕК-00210",
					fiscalDocumentNumber: "98380",
					fiscalSign: "384910515",
					serviceName: "Профессиональная гигиена полости рта AirFlow",
					dateIso: `${selectedYear}-10-04T12:15:00Z`,
					amountRub: 6500,
					taxCode: "1" as const,
				},
			];
		}
		return [];
	}, [payments, fetchedPayments, selectedYear]);

	useEffect(() => {
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

	const innValidation = useMemo(() => validateRussianInn(payerInn), [payerInn]);
	const passportValidation = useMemo(
		() => validateRussianPassport(`${passportSeries}${passportNumber}`),
		[passportSeries, passportNumber]
	);

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

	const targetYearSummary: TaxDeductionYearSummary = useMemo(() => {
		const emptySummary: TaxDeductionYearSummary = {
			taxYear: selectedYear,
			code01Rub: 0,
			code01Kopecks: 0,
			code02Rub: 0,
			code02Kopecks: 0,
			totalRub: 0,
			totalKopecks: 0,
			receiptsCount: 0,
			code01StatutoryLimitRub: selectedYear >= 2024 ? 150000 : 120000,
			code01StatutoryLimitKopecks: (selectedYear >= 2024 ? 150000 : 120000) * 100,
			code01EligibleRub: 0,
			code01EligibleKopecks: 0,
			refund13EstimateRub: 0,
			refund13EstimateKopecks: 0,
			refund15EstimateRub: 0,
			refund15EstimateKopecks: 0,
		};
		if (!isOpen) {
			return emptySummary;
		}
		return (
			calculationResult.yearsSummary.find((y) => y.taxYear === selectedYear) || emptySummary
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
		const rawSvg = generateTaxCertificateQrSvg(params, { size: 120, margin: 1 });
		return rawSvg
			.replace(/fill="#ffffff"/gi, 'fill="var(--paper, #ffffff)"')
			.replace(/fill="#000000"/gi, 'fill="var(--ink, #0f172a)"');
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
			} else if (typeof window !== "undefined") {
				window.print();
			}
		}
	};

	return {
		clinicName,
		clinicInn,
		clinicKpp,
		clinicLicenseNumber,
		clinicLicenseDate,
		activeTab,
		setActiveTab,
		selectedYear,
		setSelectedYear,
		availableYears,
		paymentsCountByYear,
		payerRelationship,
		setPayerRelationship,
		payerFullName,
		setPayerFullName,
		payerInn,
		setPayerInn,
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
		innValidation,
		passportValidation,
		yearPayments,
		effectivePayments,
		targetYearSummary,
		qrSvgString,
		xmlRepresentation,
		isCopiedXml,
		familyBatchResult,
		isLoadingPayments,
		handleFillFromPatient,
		handlePrint,
		handlePrintBlank,
		handlePrintBatch,
		handleDownloadXml,
		handleDownloadNoMedoplXml,
		handleDownloadBatchXml,
		handleDownloadBatchNoMedoplXml,
		handleCopyXml,
	};
}
