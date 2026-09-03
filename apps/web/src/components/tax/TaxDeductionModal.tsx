/**
 * apps/web/src/components/tax/TaxDeductionModal.tsx
 *
 * DENTE Dental CRM — 1-Click 13% NDFL Tax Deduction Certificate (КНД 1151156).
 * Compliant with Order of FNS Russia No. ЕА-7-11/824@, Article 219 of the Tax Code of the Russian Federation,
 * and Decree of the Government of the Russian Federation No. 458 (Treatment codes 01 and 02).
 *
 * NOTE: Payer INN is strictly OPTIONAL for physical persons (identified via Russian Federation passport).
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	Check,
	CheckCircle2,
	Coins,
	Copy,
	Download,
	FileSpreadsheet,
	FileText,
	Info,
	Printer,
	QrCode,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateExactTaxSplitKopecks,
	downloadFnsNoMedoplXmlFile,
	downloadFnsTaxXmlFile,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsTaxDeductionXml,
	generateTaxCertificateQrSvg,
	printTaxCertificateKnd1151156,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
	validateRussianInn,
	validateRussianPassport,
	validateRussianSnils,
} from "../billing/tax/fnsTaxDeductionEngine";

export interface TaxDeductionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly payerSnils?: string | undefined;
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

export const TaxDeductionModal: React.FC<TaxDeductionModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнов Алексей Викторович",
	patientBirthDate = "1985-05-12",
	patientInn = "",
	patientSnils = "",
	payerSnils: initialPayerSnils = "",
	payments = [],
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7707083893",
	clinicKpp = "770101001",
	clinicOgrn = "1027700132195",
	clinicLicenseNumber = "ЛО41-01137-77/00368421",
	clinicLicenseDate = "12.10.2021",
	clinicAddress = "г. Москва, ул. Большая Стоматологическая, д. 12",
	chiefDoctorName = "Барабаш Сергей Владимирович",
}) => {
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(currentYear);
	const [activeTab, setActiveTab] = useState<"certificate" | "calc" | "checks" | "xml">("certificate");
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>(patientInn);
	const [payerBirthDate, setPayerBirthDate] = useState<string>(patientBirthDate);
	const [payerSnils, setPayerSnils] = useState<string>(initialPayerSnils);
	const [passportSeries, setPassportSeries] = useState<string>("4510");
	const [passportNumber, setPassportNumber] = useState<string>("123456");
	const [certificateNumber, setCertificateNumber] = useState<string>(
		`${currentYear}-${Math.floor(100 + Math.random() * 900)}`,
	);
	const [taxOfficeCode, setTaxOfficeCode] = useState<string>("7701");
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);

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
		return payments.filter(
			(p) => new Date(p.dateIso).getFullYear() === selectedYear,
		);
	}, [isOpen, payments, selectedYear]);

	const innValidation = useMemo(() => {
		if (!payerInn.trim()) return { isValid: true, errorMessageRu: undefined };
		return validateRussianInn(payerInn);
	}, [payerInn]);

	const passportValidation = useMemo(
		() => validateRussianPassport(`${passportSeries}${passportNumber}`),
		[passportSeries, passportNumber],
	);

	const certParams: TaxDeductionCertificateParams = useMemo(() => ({
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
			inn: payerInn.trim() || undefined,
			birthDate: payerBirthDate,
			identityDocumentSeries: passportSeries,
			identityDocumentNumber: passportNumber,
			relationship: payerRelationship,
			snils: payerSnils.trim() || undefined,
		},
		patient: {
			fullName: patientName,
			birthDate: patientBirthDate,
			inn: patientInn.trim() || undefined,
			snils: patientSnils.trim() || undefined,
		},
		payments,
	}), [
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
		payerSnils,
		patientName,
		patientBirthDate,
		patientInn,
		patientSnils,
		payments,
	]);

	const xmlRepresentation = useMemo(() => {
		if (!isOpen) return { fileName: "", fileId: "", xmlContent: "" };
		return generateFnsTaxDeductionXml(certParams);
	}, [isOpen, certParams]);

	const qrSvgString = useMemo(() => {
		if (!isOpen) return "";
		return generateTaxCertificateQrSvg(certParams, { size: 96, margin: 1 });
	}, [isOpen, certParams]);

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
		if (patientSnils) setPayerSnils(patientSnils);
		setPayerRelationship("patient");
		showToast("Реквизиты плательщика заполнены из карточки пациента", "info");
	};

	const handlePrint = () => {
		printTaxCertificateKnd1151156(certParams);
		showToast("Бланк справки КНД 1151156 отправлен на печать", "success");
	};

	const handleDownloadXml = () => {
		downloadFnsTaxXmlFile(certParams);
		showToast(`Файл ${xmlRepresentation.fileName} выгружен для ТКС`, "success");
	};

	const handleDownloadNoMedopl = () => {
		downloadFnsNoMedoplXmlFile(certParams);
		showToast("Файл NO_MEDOPL (Формат 5.01) выгружен для ФНС", "success");
	};

	const handleCopyXml = () => {
		if (navigator.clipboard) {
			void navigator.clipboard.writeText(xmlRepresentation.xmlContent);
			setIsCopiedXml(true);
			showToast("XML скопирован в буфер обмена", "success");
			setTimeout(() => setIsCopiedXml(false), 2000);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tax-modal-title"
		>
			<div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col">
				{/* Top Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-600/20">
							<FileSpreadsheet size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="tax-modal-title" className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
									Справка для налогового вычета 13% НДФЛ
								</h2>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
									КНД 1151156
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> • Приказ ФНС РФ № ЕА-7-11/824@
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* 1-Click Fast Actions Toolbar */}
				<div className="px-4 sm:px-6 py-2.5 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-2.5">
					{/* Year Selector Chips */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">Отчетный год:</span>
						{[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
							<button
								key={yr}
								type="button"
								onClick={() => setSelectedYear(yr)}
								className={`min-h-[44px] px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
									selectedYear === yr
										? "bg-teal-600 text-white shadow-sm"
										: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-teal-400"
								}`}
							>
								{yr} год
							</button>
						))}
					</div>

					{/* 1-Click Print & Export */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
						>
							<Printer size={15} />
							<span>Печать бланка КНД 1151156 (1 клик)</span>
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="px-4 sm:px-6 pt-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex gap-2 overflow-x-auto">
					{[
						{ key: "certificate", label: "Реквизиты и печать", icon: FileText },
						{ key: "calc", label: `Расчет вычета 13% (${exactSplit.totalRub.toLocaleString("ru-RU")} ₽)`, icon: Coins },
						{ key: "checks", label: `Чеки за ${selectedYear} г. (${yearPayments.length})`, icon: Sparkles },
						{ key: "xml", label: "XML для ФНС (ТКС)", icon: ShieldCheck },
					].map((tab) => {
						const Icon = tab.icon;
						return (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key as typeof activeTab)}
								className={`min-h-[44px] px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === tab.key
										? "border-teal-600 text-teal-700 dark:text-teal-300 bg-[var(--paper,#ffffff)]"
										: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								<Icon size={14} />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>

				{/* Tab Contents */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
					{activeTab === "certificate" && (
						<div className="space-y-4">
							{/* Official Info Banner */}
							<div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-2.5">
								<Info size={18} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
								<div className="text-xs space-y-0.5">
									<p className="font-bold text-[var(--ink,#0f172a)] m-0">
										ИНН физического лица не является обязательным для выдачи справки КНД 1151156
									</p>
									<p className="text-[var(--muted,#64748b)] m-0">
										В соответствии с Приказом ФНС РФ № ЕА-7-11/824@ гражданин идентифицируется по паспортным данным (серия, номер и дата рождения). Блокировка печати или выдачи справки при отсутствии ИНН категорически запрещена.
									</p>
								</div>
							</div>

							{/* Payer Requisites */}
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
								<div className="flex items-center justify-between flex-wrap gap-2">
									<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
										Налогоплательщик (плательщик по справке):
									</span>
									<button
										type="button"
										onClick={handleFillFromPatient}
										className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-teal-700 dark:text-teal-300 hover:border-teal-400 flex items-center gap-1.5 cursor-pointer"
									>
										<UserCheck size={14} />
										<span>Он же (пациент)</span>
									</button>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="space-y-1">
										<label htmlFor="tax-payer-fullname" className="text-xs font-bold text-[var(--ink,#0f172a)]">ФИО плательщика:</label>
										<input
											id="tax-payer-fullname"
											type="text"
											value={payerFullName}
											onChange={(e) => setPayerFullName(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium"
										/>
									</div>

									<div className="space-y-1">
										<div className="flex items-center justify-between">
											<label htmlFor="tax-payer-inn" className="text-xs font-bold text-[var(--ink,#0f172a)]">ИНН (необязательно):</label>
											{payerInn.trim() ? (
												innValidation.isValid ? (
													<span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5"><CheckCircle2 size={12} /> Валиден</span>
												) : (
													<span className="text-xs text-amber-600 font-bold flex items-center gap-0.5"><AlertCircle size={12} /> Проверьте</span>
												)
											) : (
												<span className="text-xs text-[var(--muted,#64748b)]">По паспорту РФ</span>
											)}
										</div>
										<input
											id="tax-payer-inn"
											type="text"
											maxLength={12}
											value={payerInn}
											onChange={(e) => setPayerInn(e.target.value.replace(/\D/g, ""))}
											placeholder="12 цифр (по желанию)"
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
										/>
									</div>

									<div className="space-y-1">
										<label htmlFor="tax-payer-bday" className="text-xs font-bold text-[var(--ink,#0f172a)]">Дата рождения:</label>
										<input
											id="tax-payer-bday"
											type="date"
											value={payerBirthDate}
											onChange={(e) => setPayerBirthDate(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										/>
									</div>
								</div>

								{/* Passport & Certificate Number */}
								<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
									<div className="space-y-1">
										<label htmlFor="tax-passport-series" className="text-xs font-bold text-[var(--ink,#0f172a)]">Серия паспорта (4 цифры):</label>
										<input
											id="tax-passport-series"
											type="text"
											maxLength={4}
											value={passportSeries}
											onChange={(e) => setPassportSeries(e.target.value.replace(/\D/g, ""))}
											placeholder="4510"
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="tax-passport-num" className="text-xs font-bold text-[var(--ink,#0f172a)]">Номер паспорта (6 цифр):</label>
										<input
											id="tax-passport-num"
											type="text"
											maxLength={6}
											value={passportNumber}
											onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ""))}
											placeholder="123456"
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="tax-cert-num" className="text-xs font-bold text-[var(--ink,#0f172a)]">Номер справки:</label>
										<input
											id="tax-cert-num"
											type="text"
											value={certificateNumber}
											onChange={(e) => setCertificateNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
										/>
									</div>
									<div className="space-y-1">
										<label htmlFor="tax-office-code" className="text-xs font-bold text-[var(--ink,#0f172a)]">Код ИФНС:</label>
										<input
											id="tax-office-code"
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

							{/* Summary Snapshot Card */}
							<div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 flex flex-wrap items-center justify-between gap-4">
								<div className="space-y-1">
									<span className="text-xs font-bold text-[var(--muted,#64748b)]">Всего оплачено за {selectedYear} год:</span>
									<div className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
										{exactSplit.totalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<div className="text-xs text-[var(--muted,#64748b)] flex items-center gap-3">
										<span>Код 01 (стандартное): <strong>{exactSplit.code01Rub.toLocaleString("ru-RU")} ₽</strong></span>
										<span>•</span>
										<span>Код 02 (дорогостоящее): <strong>{exactSplit.code02Rub.toLocaleString("ru-RU")} ₽</strong></span>
									</div>
								</div>

								<div className="text-right space-y-1">
									<span className="text-xs font-bold text-[var(--muted,#64748b)]">К возврату пациенту (13% НДФЛ):</span>
									<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
										{exactSplit.refund13Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<span className="text-[11px] text-[var(--muted,#64748b)] block">
										По ст. 219 Налогового кодекса РФ
									</span>
								</div>
							</div>
						</div>
					)}

					{activeTab === "calc" && (
						<div className="space-y-3">
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
								<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
									Структура налогового вычета за {selectedYear} год
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)] m-0">
									С 01.01.2024 лимит социального вычета по коду 01 увеличен до 150 000 ₽ (ранее 120 000 ₽). По коду 02 (дорогостоящее лечение: имплантация, костная пластика, синус-лифтинг по ПП РФ №458) лимит не применяется — вычет возвращается со всей суммы!
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
									<span className="text-xs font-bold text-teal-800 dark:text-teal-200">Код услуги 01 (Обычное лечение):</span>
									<div className="text-xl font-bold font-mono text-teal-700 dark:text-teal-300">
										{exactSplit.code01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Лимит базы: {exactSplit.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽ • Возврат 13%: {(exactSplit.code01EligibleRub * 0.13).toLocaleString("ru-RU")} ₽
									</p>
								</div>

								<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
									<span className="text-xs font-bold text-rose-800 dark:text-rose-200">Код услуги 02 (Дорогостоящее лечение):</span>
									<div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
										{exactSplit.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Без ограничений лимита • Возврат 13%: {(exactSplit.code02Rub * 0.13).toLocaleString("ru-RU")} ₽
									</p>
								</div>
							</div>
						</div>
					)}

					{activeTab === "checks" && (
						<div className="space-y-3">
							<div className="overflow-x-auto rounded-2xl border border-[var(--line,#e2e8f0)]">
								<table className="w-full text-xs text-left border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-bold">
										<tr>
											<th className="p-3">№</th>
											<th className="p-3">Дата</th>
											<th className="p-3">Чек / ФД</th>
											<th className="p-3">Наименование услуги</th>
											<th className="p-3">Код 804н</th>
											<th className="p-3 text-center">Код вычета</th>
											<th className="p-3 text-right">Сумма (руб.)</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] font-medium">
										{yearPayments.length > 0 ? (
											yearPayments.map((pay, idx) => {
												const cat =
													pay.taxCode ||
													resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName);
												return (
													<tr key={pay.id || idx} className="hover:bg-[var(--paper-soft,#f8fafc)]">
														<td className="p-3">{idx + 1}</td>
														<td className="p-3 font-mono">{pay.dateIso.slice(0, 10)}</td>
														<td className="p-3 font-mono">№{pay.receiptNumber || pay.fiscalDocumentNumber || idx + 1}</td>
														<td className="p-3">{pay.serviceName}</td>
														<td className="p-3 font-mono text-[var(--muted,#64748b)]">{pay.code804n || "—"}</td>
														<td className="p-3 text-center">
															<span
																className={`px-2 py-0.5 rounded-md font-bold text-xs ${
																	cat === "2"
																		? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
																		: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
																}`}
															>
																Код 0{cat}
															</span>
														</td>
														<td className="p-3 text-right font-mono font-bold whitespace-nowrap">
															{pay.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
														</td>
													</tr>
												);
											})
										) : (
											<tr>
												<td colSpan={7} className="p-6 text-center text-[var(--muted,#64748b)]">
													За {selectedYear} год не найдено оплаченных чеков пациента.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{activeTab === "xml" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase">
									Файл: {xmlRepresentation.fileName}
								</span>
								<button
									type="button"
									onClick={handleCopyXml}
									className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold flex items-center gap-1.5 hover:border-teal-400 cursor-pointer"
								>
									{isCopiedXml ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
									<span>{isCopiedXml ? "Скопировано" : "Скопировать XML"}</span>
								</button>
							</div>

							<pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs max-h-80 overflow-auto border border-slate-800 leading-relaxed">
								{xmlRepresentation.xmlContent}
							</pre>
						</div>
					)}
				</div>

				{/* Footer Controls */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
						<ShieldCheck size={16} className="text-teal-600" />
						<span>Форма КНД 1151156 • Без требования ИНН с физлиц</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadNoMedopl}
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:border-teal-400 transition-colors flex items-center gap-1.5 cursor-pointer"
						>
							<Download size={14} />
							<span>NO_MEDOPL XML</span>
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
							className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-teal-700 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
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

export default TaxDeductionModal;
