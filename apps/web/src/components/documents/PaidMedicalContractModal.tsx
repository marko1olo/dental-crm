import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	FileCheck,
	FileText,
	Info,
	Lock,
	MapPin,
	PenTool,
	Printer,
	QrCode,
	ShieldCheck,
	Smartphone,
	Sparkles,
	User,
	X,
} from "lucide-react";
import {
	type PaidContractData,
	type PaidContractServiceItem,
	type PaidContractValidationResult,
	createDefaultPaidContract,
	formatKopecksToRubAndKop,
	generatePaidContractHtml,
	generatePaidContractIntegrityHash,
	generatePaidContractText,
	generateSmsSignOtp,
	validatePaidContract736,
	verifySmsSignOtp,
} from "./paidContractEngine";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";
import { printBlankMedicalContract } from "../patient/blankContractPrint";
import "./paidMedicalContract.css";

export interface PaidMedicalContractModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<PaidContractData> | undefined;
	patient?: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		cardNumber?: string | null | undefined;
		passport?: string | null | undefined;
		address?: string | null | undefined;
		phone?: string | null | undefined;
		snils?: string | null | undefined;
	} | null | undefined;
	clinicInfo?: {
		fullName?: string | null | undefined;
		shortName?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		ogrn?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		phone?: string | null | undefined;
		bankName?: string | null | undefined;
		bik?: string | null | undefined;
		checkingAccount?: string | null | undefined;
		corrAccount?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	treatmentPlanSummary?: string | null | undefined;
	totalAmountKopecks?: number | undefined;
	services?: PaidContractServiceItem[] | undefined;
	onContractSaved?: ((contract: PaidContractData) => void) | undefined;
}

type ModalTab = "editor" | "signature" | "preview";

export function PaidMedicalContractModal({
	isOpen,
	onClose,
	initialData,
	patient,
	clinicInfo,
	doctorName,
	doctorSpecialty,
	treatmentPlanSummary,
	totalAmountKopecks,
	services,
	onContractSaved,
}: PaidMedicalContractModalProps): React.JSX.Element | null {
	const [activeTab, setActiveTab] = useState<ModalTab>("editor");
	const [contractData, setContractData] = useState<PaidContractData>(() =>
		createDefaultPaidContract({
			patientFullName: patient?.fullName || undefined,
			patientBirthDate: patient?.birthDate || undefined,
			patientPassport: patient?.passport || undefined,
			patientAddress: patient?.address || undefined,
			patientPhone: patient?.phone || undefined,
			patientSnils: patient?.snils || undefined,
			cardNumber: patient?.cardNumber || undefined,
			doctorFullName: doctorName || undefined,
			doctorSpecialty: doctorSpecialty || undefined,
			clinicFullName: clinicInfo?.fullName || undefined,
			clinicShortName: clinicInfo?.shortName || undefined,
			clinicLegalAddress: clinicInfo?.address || undefined,
			clinicActualAddress: clinicInfo?.actualAddress || undefined,
			clinicInn: clinicInfo?.inn || undefined,
			clinicKpp: clinicInfo?.kpp || undefined,
			clinicOgrn: clinicInfo?.ogrn || undefined,
			clinicLicense: clinicInfo?.licenseNumber || undefined,
			clinicPhone: clinicInfo?.phone || undefined,
			clinicBankName: clinicInfo?.bankName || undefined,
			clinicBik: clinicInfo?.bik || undefined,
			clinicCheckingAccount: clinicInfo?.checkingAccount || undefined,
			clinicCorrAccount: clinicInfo?.corrAccount || undefined,
			serviceScopeSummary: treatmentPlanSummary || undefined,
			totalAmountKopecks: totalAmountKopecks,
			services: services,
		}),
	);

	// SMS OTP Signature State
	const [smsOtpState, setSmsOtpState] = useState<{
		code: string;
		sentAt: number;
		expiresAt: number;
		phoneMasked: string;
	} | null>(null);
	const [smsInputCode, setSmsInputCode] = useState("");
	const [smsError, setSmsError] = useState<string | null>(null);
	const [smsSuccess, setSmsSuccess] = useState(false);
	const [secondsRemaining, setSecondsRemaining] = useState(0);

	// Sync when modal opens or initial parameters change
	useEffect(() => {
		if (!isOpen) return;

		const base = createDefaultPaidContract({
			patientFullName: patient?.fullName || undefined,
			patientBirthDate: patient?.birthDate || undefined,
			patientPassport: patient?.passport || undefined,
			patientAddress: patient?.address || undefined,
			patientPhone: patient?.phone || undefined,
			patientSnils: patient?.snils || undefined,
			cardNumber: patient?.cardNumber || undefined,
			doctorFullName: doctorName || undefined,
			doctorSpecialty: doctorSpecialty || undefined,
			clinicFullName: clinicInfo?.fullName || undefined,
			clinicShortName: clinicInfo?.shortName || undefined,
			clinicLegalAddress: clinicInfo?.address || undefined,
			clinicActualAddress: clinicInfo?.actualAddress || undefined,
			clinicInn: clinicInfo?.inn || undefined,
			clinicKpp: clinicInfo?.kpp || undefined,
			clinicOgrn: clinicInfo?.ogrn || undefined,
			clinicLicense: clinicInfo?.licenseNumber || undefined,
			clinicPhone: clinicInfo?.phone || undefined,
			clinicBankName: clinicInfo?.bankName || undefined,
			clinicBik: clinicInfo?.bik || undefined,
			clinicCheckingAccount: clinicInfo?.checkingAccount || undefined,
			clinicCorrAccount: clinicInfo?.corrAccount || undefined,
			serviceScopeSummary: treatmentPlanSummary || undefined,
			totalAmountKopecks: totalAmountKopecks,
			services: services,
		});

		if (initialData) {
			setContractData({
				...base,
				...initialData,
				clinic: { ...base.clinic, ...initialData.clinic },
				patient: { ...base.patient, ...initialData.patient },
				customer: { ...base.customer, ...initialData.customer },
				representative: { ...base.representative, ...initialData.representative },
				confirmedDisclosures: {
					...base.confirmedDisclosures,
					...initialData.confirmedDisclosures,
				},
			});
		} else {
			setContractData(base);
		}

		setActiveTab("editor");
		setSmsSuccess(false);
		setSmsOtpState(null);
		setSmsInputCode("");
		setSmsError(null);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		initialData,
		patient,
		clinicInfo,
		doctorName,
		doctorSpecialty,
		treatmentPlanSummary,
		totalAmountKopecks,
		services,
		onClose,
	]);

	// Timer for SMS OTP
	useEffect(() => {
		if (!smsOtpState || smsSuccess) return;

		const interval = setInterval(() => {
			const left = Math.max(0, Math.ceil((smsOtpState.expiresAt - Date.now()) / 1000));
			setSecondsRemaining(left);
			if (left <= 0) {
				clearInterval(interval);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [smsOtpState, smsSuccess]);

	// Validation
	const validationResult: PaidContractValidationResult = useMemo(
		() => validatePaidContract736(contractData, { allowBlankForPrint: true }),
		[contractData],
	);

	// Paper Signature Handler (1-Click Autonomy per PP РФ № 736 and ст. 84 323-ФЗ)
	const handleConfirmPaperSign = () => {
		const verifiedAt = Date.now();
		const signedDate = new Date(verifiedAt).toLocaleDateString("ru-RU");
		const signedContractData: PaidContractData = {
			...contractData,
			signMethod: "paper",
			signedAt: signedDate,
		};
		const hash = generatePaidContractIntegrityHash(
			signedContractData,
			"PAPER_DECREE_736",
			new Date(verifiedAt).toISOString(),
		);
		const finalContract: PaidContractData = {
			...signedContractData,
			integrityHash: hash,
			paperSignHash: hash,
		};
		setContractData(finalContract);
		if (onContractSaved) {
			onContractSaved(finalContract);
		}
		onClose();
	};

	// SMS OTP Handlers
	const handleSendSmsCode = () => {
		const phone = contractData.patient.phone;
		if (!phone) {
			setSmsError("У пациента не указан номер телефона.");
			return;
		}
		const otp = generateSmsSignOtp(phone);
		setSmsOtpState(otp);
		setSmsInputCode("");
		setSmsError(null);
		setSmsSuccess(false);
	};

	const handleVerifySmsCode = () => {
		if (!smsOtpState) return;
		const result = verifySmsSignOtp(smsInputCode, smsOtpState);
		if (result.success) {
			setSmsSuccess(true);
			setSmsError(null);
			const verifiedAt = Date.now();
			const verifiedAtIso = new Date(verifiedAt).toISOString();
			const integrityHash = generatePaidContractIntegrityHash(contractData, smsOtpState.code, verifiedAtIso);
			setContractData((prev) => ({
				...prev,
				signedAt: new Date(verifiedAt).toLocaleDateString("ru-RU"),
				smsSignDetails: {
					phone: prev.patient.phone,
					code: smsOtpState.code,
					sentAt: smsOtpState.sentAt,
					expiresAt: smsOtpState.expiresAt,
					verifiedAt,
					isVerified: true,
					smsSignHash: integrityHash,
				},
			}));
		} else {
			setSmsError(result.error || "Неверный код подтверждения.");
		}
	};

	const moneyDetails = formatKopecksToRubAndKop(contractData.totalAmountKopecks);
	const isContractSigned = Boolean(
		contractData.paperSignHash ||
		contractData.smsSignDetails?.isVerified ||
		initialData?.paperSignHash ||
		initialData?.signedAt ||
		(initialData as any)?.isSigned,
	);

	// Printing Handler
	const handlePrint = () => {
		let printHtml = generatePaidContractHtml(contractData);
		const stampText = isContractSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК (БЛАНК)";
		const stampColor = isContractSigned ? "#059669" : "#64748b";
		const stampHtml = `<div style="position: absolute; top: 12mm; right: 12mm; border: 2pt solid ${stampColor}; color: ${stampColor}; padding: 4px 10px; border-radius: 4px; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; transform: rotate(-3deg);">${stampText}</div>`;
		if (printHtml.includes('<div class="contract-sheet">')) {
			printHtml = printHtml.replace(
				'<div class="contract-sheet">',
				`<div class="contract-sheet" style="position: relative;">${stampHtml}`,
			);
		}
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					if (document.body.contains(printFrame)) {
						document.body.removeChild(printFrame);
					}
				}, 1500);
			}, 250);
		}
	};

	const handleSaveAndConfirm = () => {
		if (onContractSaved) {
			onContractSaved(contractData);
		}
		onClose();
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="paid-contract-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Договор на оказание платных медицинских услуг"
			data-testid="paid-medical-contract-modal"
		>
			<div className="paid-contract-modal-container">
				{/* ── Header ── */}
				<header className="paid-contract-header">
					<div className="paid-contract-header-left">
						<div className="paid-contract-icon-badge">
							<ShieldCheck size={22} aria-hidden="true" />
						</div>
						<div className="paid-contract-title-wrap">
							<div className="paid-contract-title-row">
								<h2 className="paid-contract-title">
									Договор на оказание платных медицинских услуг
								</h2>
								<span className="paid-contract-badge-law" title="Постановление Правительства РФ № 736 от 11.05.2023 · ст. 84 323-ФЗ">
									Официальный договор
								</span>
								<span
									data-testid="contract-stamp-badge"
									className={`badge ${isContractSigned ? "badge-success" : "badge-secondary"}`}
									style={{
										padding: "3px 8px",
										borderRadius: "4px",
										fontSize: "12px",
										fontWeight: 700,
										textTransform: "uppercase",
										background: isContractSigned ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
										color: isContractSigned ? "#059669" : "#64748b",
										border: `1px solid ${isContractSigned ? "rgba(16, 185, 129, 0.4)" : "rgba(100, 116, 139, 0.3)"}`,
									}}
								>
									{isContractSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК (БЛАНК)"}
								</span>
							</div>
							<p className="paid-contract-subtitle">
								{contractData.patient.fullName} · Договор № {contractData.contractNumber} от{" "}
								{contractData.contractDate} · Сумма: {moneyDetails.formatted}
							</p>
						</div>
					</div>

					<button
						type="button"
						className="paid-contract-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</header>

				{/* ── Navigation / Mode Toolbar ── */}
				<nav className="paid-contract-toolbar" aria-label="Разделы договора">
					<div className="paid-contract-tabs">
						<button
							type="button"
							className={`paid-contract-tab-btn ${activeTab === "editor" ? "active" : ""}`}
							onClick={() => setActiveTab("editor")}
							data-testid="tab-editor-btn"
						>
							<FileText size={15} aria-hidden="true" />
							<span>1. Редактор и условия</span>
						</button>
						<button
							type="button"
							className={`paid-contract-tab-btn ${activeTab === "signature" ? "active" : ""}`}
							onClick={() => setActiveTab("signature")}
							data-testid="tab-signature-btn"
						>
							<FileCheck size={15} aria-hidden="true" />
							<span>2. Подписание (Бумага / СМС)</span>
						</button>
						<button
							type="button"
							className={`paid-contract-tab-btn ${activeTab === "preview" ? "active" : ""}`}
							onClick={() => setActiveTab("preview")}
							data-testid="tab-preview-btn"
						>
							<Printer size={15} aria-hidden="true" />
							<span>3. Бланк А4 (ГОСТ)</span>
						</button>
					</div>

					<div
						className={`paid-contract-status-pill ${
							validationResult.isValid ? "valid" : "invalid"
						}`}
					>
						{validationResult.isValid ? (
							<>
								<CheckCircle2 size={14} aria-hidden="true" />
								<span>Все обязательные поля ПП РФ № 736 заполнены</span>
							</>
						) : (
							<>
								<AlertCircle size={14} aria-hidden="true" />
								<span>Не хватает {validationResult.missingFields.length} обязательных полей</span>
							</>
						)}
					</div>
				</nav>

				{/* ── Split Body ── */}
				<div className="paid-contract-body">
					{/* ── Left Pane: Editor / Signer / Disclosures ── */}
					<div className="paid-contract-pane-left">
						{activeTab === "editor" && (
							<>
								{/* 1. Реквизиты Договора */}
								<section className="paid-contract-section">
									<div className="paid-contract-section-header">
										<span>1. Основные реквизиты договора</span>
										<span style={{ fontSize: "11px", color: "var(--muted)" }}>
											ст. 17 ПП РФ № 736
										</span>
									</div>
									<div className="paid-contract-grid-3">
										<div className="paid-contract-field">
											<label>Номер договора</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.contractNumber}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														contractNumber: e.target.value,
													}))
												}
												placeholder="ДПМУ-2026-001"
											/>
										</div>
										<div className="paid-contract-field">
											<label>Дата договора</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.contractDate}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														contractDate: e.target.value,
													}))
												}
												placeholder="15.05.2026"
											/>
										</div>
										<div className="paid-contract-field">
											<label>Город / Населенный пункт</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.city}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														city: e.target.value,
													}))
												}
												placeholder="г. Москва"
											/>
										</div>
									</div>
								</section>

								{/* 2. Реквизиты клиники (Исполнителя) */}
								<section className="paid-contract-section">
									<div className="paid-contract-section-header">
										<span>2. Реквизиты Исполнителя (Клиники)</span>
										<span style={{ fontSize: "11px", color: "var(--teal)" }}>
											Лицензия Л041-01137
										</span>
									</div>
									<div className="paid-contract-field">
										<label>Полное наименование организации</label>
										<input
											type="text"
											className="paid-contract-input"
											value={contractData.clinic.fullName}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													clinic: { ...prev.clinic, fullName: e.target.value },
												}))
											}
										/>
									</div>
									<div className="paid-contract-grid-2">
										<div className="paid-contract-field">
											<label>Адрес места нахождения (Юридический)</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.clinic.legalAddress}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, legalAddress: e.target.value },
													}))
												}
											/>
										</div>
										<div className="paid-contract-field">
											<label>Место оказания медпомощи (Фактический)</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.clinic.actualAddress}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, actualAddress: e.target.value },
													}))
												}
											/>
										</div>
									</div>
									<div className="paid-contract-grid-3">
										<div className="paid-contract-field">
											<label>ОГРН</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.clinic.ogrn}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, ogrn: e.target.value },
													}))
												}
											/>
										</div>
										<div className="paid-contract-field">
											<label>ИНН / КПП</label>
											<input
												type="text"
												className="paid-contract-input"
												value={`${contractData.clinic.inn} / ${contractData.clinic.kpp}`}
												onChange={(e) => {
													const [inn = "", kpp = ""] = e.target.value.split("/").map((s) => s.trim());
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, inn, kpp },
													}));
												}}
											/>
										</div>
										<div className="paid-contract-field">
											<label>Лицензия на меддеятельность</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.clinic.licenseNumber}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, licenseNumber: e.target.value },
													}))
												}
											/>
										</div>
									</div>
									<div className="paid-contract-grid-2">
										<div className="paid-contract-field">
											<label>Банк и расчетный счет</label>
											<input
												type="text"
												className="paid-contract-input"
												value={`р/с ${contractData.clinic.checkingAccount} в ${contractData.clinic.bankName}`}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, bankName: e.target.value },
													}))
												}
											/>
										</div>
										<div className="paid-contract-field">
											<label>Руководитель организации</label>
											<input
												type="text"
												className="paid-contract-input"
												value={`${contractData.clinic.directorTitle}: ${contractData.clinic.directorFullName}`}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														clinic: { ...prev.clinic, directorFullName: e.target.value },
													}))
												}
											/>
										</div>
									</div>
								</section>

								{/* 3. Реквизиты Пациента */}
								<section className="paid-contract-section">
									<div className="paid-contract-section-header">
										<span>3. Реквизиты Пациента (Потребителя)</span>
										<span style={{ fontSize: "11px", color: "var(--muted)" }}>
											Карта: {contractData.patient.cardNumber || "043/у"}
										</span>
									</div>
									<div className="paid-contract-grid-2">
										<div className="paid-contract-field">
											<label>Ф.И.О. Пациента</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.patient.fullName}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														patient: { ...prev.patient, fullName: e.target.value },
													}))
												}
											/>
										</div>
										<div className="paid-contract-field">
											<label>Дата рождения</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.patient.birthDate}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														patient: { ...prev.patient, birthDate: e.target.value },
													}))
												}
											/>
										</div>
									</div>
									<div className="paid-contract-grid-3">
										<div className="paid-contract-field">
											<label>Паспорт (Серия и Номер)</label>
											<input
												type="text"
												className="paid-contract-input"
												value={`${contractData.patient.passportSeries} ${contractData.patient.passportNumber}`}
												onChange={(e) => {
													const parts = e.target.value.trim().split(" ");
													const series = parts.slice(0, -1).join(" ") || parts[0] || "";
													const num = parts.length > 1 ? parts[parts.length - 1] || "" : "";
													setContractData((prev) => ({
														...prev,
														patient: {
															...prev.patient,
															passportSeries: series,
															passportNumber: num,
														},
													}));
												}}
											/>
										</div>
										<div className="paid-contract-field">
											<label>СНИЛС</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.patient.snils}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														patient: { ...prev.patient, snils: e.target.value },
													}))
												}
												placeholder="123-456-789 00"
											/>
										</div>
										<div className="paid-contract-field">
											<label>Телефон</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.patient.phone}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														patient: { ...prev.patient, phone: e.target.value },
													}))
												}
											/>
										</div>
									</div>
									<div className="paid-contract-field">
										<label>Адрес регистрации по месту жительства</label>
										<input
											type="text"
											className="paid-contract-input"
											value={contractData.patient.registrationAddress}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													patient: {
														...prev.patient,
														registrationAddress: e.target.value,
													},
												}))
											}
										/>
									</div>
								</section>

								{/* 4. Предмет договора и состав услуг */}
								<section className="paid-contract-section">
									<div className="paid-contract-section-header">
										<span>4. Предмет договора и услуги</span>
										<span style={{ fontSize: "11px", color: "var(--teal)" }}>
											Сумма: {moneyDetails.formatted}
										</span>
									</div>
									<div className="paid-contract-field">
										<label>Основание обращения / Клинический диагноз</label>
										<textarea
											className="paid-contract-textarea"
											rows={2}
											value={contractData.clinicalReason}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													clinicalReason: e.target.value,
												}))
											}
										/>
									</div>

									<div className="paid-contract-services-editor">
										<label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
											Согласованные услуги по смете (Прейскурант клиники):
										</label>
										{contractData.services.map((srv, idx) => (
											<div className="paid-contract-service-row" key={srv.id || idx}>
												<span className="paid-contract-service-name">
													{srv.code ? <code>[{srv.code}]</code> : null} {srv.name}
												</span>
												<div className="paid-contract-service-details">
													<span>Зуб: {srv.toothOrArea || "—"}</span>
													<span>{srv.quantity} шт.</span>
													<span className="paid-contract-service-amount">
														{formatKopecksToRubAndKop(srv.totalKopecks).formatted}
													</span>
												</div>
											</div>
										))}
									</div>

									<div className="paid-contract-grid-2" style={{ marginTop: "4px" }}>
										<div className="paid-contract-field">
											<label>Начало оказания услуг</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.serviceStart}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														serviceStart: e.target.value,
													}))
												}
											/>
										</div>
										<div className="paid-contract-field">
											<label>Срок окончания оказания услуг</label>
											<input
												type="text"
												className="paid-contract-input"
												value={contractData.serviceEndOrCondition}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														serviceEndOrCondition: e.target.value,
													}))
												}
											/>
										</div>
									</div>
								</section>

								{/* 5. Обязательные правовые уведомления (ПП РФ № 736) */}
								<section className="paid-contract-section">
									<div className="paid-contract-section-header">
										<span>5. Обязательные уведомления (ПП РФ № 736)</span>
										<span style={{ fontSize: "11px", color: "var(--muted)" }}>
											п. 7, 10, 15
										</span>
									</div>

									<div className="paid-contract-field">
										<label>Уведомление о бесплатной помощи по ОМС (п. 7)</label>
										<textarea
											className="paid-contract-textarea"
											rows={2}
											value={contractData.freeCareNotice}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													freeCareNotice: e.target.value,
												}))
											}
										/>
									</div>

									<div className="paid-contract-field">
										<label>Предупреждение о несоблюдении указаний врача (п. 15)</label>
										<textarea
											className="paid-contract-textarea"
											rows={2}
											value={contractData.medicalRecommendationWarning}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													medicalRecommendationWarning: e.target.value,
												}))
											}
										/>
									</div>

									<div className="paid-contract-field">
										<label>Порядок изменения сметы и доп. услуг (п. 21)</label>
										<textarea
											className="paid-contract-textarea"
											rows={2}
											value={contractData.priceChangeRules}
											onChange={(e) =>
												setContractData((prev) => ({
													...prev,
													priceChangeRules: e.target.value,
												}))
											}
										/>
									</div>

									<div className="paid-contract-checklist" style={{ marginTop: "6px" }}>
										<label className="paid-contract-check-item">
											<input
												type="checkbox"
												checked={contractData.confirmedDisclosures.clinicInfoConfirmed}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														confirmedDisclosures: {
															...prev.confirmedDisclosures,
															clinicInfoConfirmed: e.target.checked,
														},
													}))
												}
											/>
											<span>
												Пациент до заключения договора получил сведения о клинике, лицензии и прейскуранте
											</span>
										</label>

										<label className="paid-contract-check-item">
											<input
												type="checkbox"
												checked={contractData.confirmedDisclosures.freeCareNoticeUnderstood}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														confirmedDisclosures: {
															...prev.confirmedDisclosures,
															freeCareNoticeUnderstood: e.target.checked,
														},
													}))
												}
											/>
											<span>
												Пациент письменно уведомлен о праве на получение помощи по ОМС без взимания платы
											</span>
										</label>

										<label className="paid-contract-check-item">
											<input
												type="checkbox"
												checked={contractData.confirmedDisclosures.serviceListAndPriceConfirmed}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														confirmedDisclosures: {
															...prev.confirmedDisclosures,
															serviceListAndPriceConfirmed: e.target.checked,
														},
													}))
												}
											/>
											<span>
												Перечень медицинских услуг и предварительная смета согласованы до лечения
											</span>
										</label>

										<label className="paid-contract-check-item">
											<input
												type="checkbox"
												checked={contractData.confirmedDisclosures.writtenChangesConfirmed}
												onChange={(e) =>
													setContractData((prev) => ({
														...prev,
														confirmedDisclosures: {
															...prev.confirmedDisclosures,
															writtenChangesConfirmed: e.target.checked,
														},
													}))
												}
											/>
											<span>
												Любые дополнительные платные услуги оформляются письменным доп. соглашением
											</span>
										</label>
									</div>
								</section>
							</>
						)}

						{activeTab === "signature" && (
							<section className="paid-contract-sign-container">
								<div className="paid-contract-sign-switcher">
									<button
										type="button"
										className={`paid-contract-sign-mode-btn ${
											contractData.signMethod === "paper" ? "active" : ""
										}`}
										onClick={() =>
											setContractData((prev) => ({ ...prev, signMethod: "paper" }))
										}
										data-testid="sign-mode-paper-btn"
									>
										<FileText size={15} aria-hidden="true" />
										<span>На бумаге (2 экз. по ПП РФ № 736)</span>
									</button>
									<button
										type="button"
										className={`paid-contract-sign-mode-btn ${
											contractData.signMethod === "sms_otp" ? "active" : ""
										}`}
										onClick={() =>
											setContractData((prev) => ({ ...prev, signMethod: "sms_otp" }))
										}
										data-testid="sign-mode-sms-btn"
									>
										<Smartphone size={15} aria-hidden="true" />
										<span>СМС-код (ПЭП по 63-ФЗ)</span>
									</button>
								</div>

								{contractData.signMethod === "paper" && (
									<div className="paid-contract-paper-box" data-testid="paper-sign-section">
										<div className="paid-contract-paper-banner" style={{ padding: "14px", borderRadius: "10px", background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)", marginBottom: "14px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
												<Printer size={18} color="var(--teal, #0d9488)" aria-hidden="true" />
												<span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
													Бумажный носитель (ст. 84 323-ФЗ, Постановление Правительства РФ № 736)
												</span>
											</div>
											<p style={{ fontSize: "12px", color: "var(--ink, #0f172a)", margin: "4px 0", lineHeight: 1.4 }}>
												Договор оформляется в 2 экземплярах (один выдается пациенту, второй подшивается в медицинскую карту 043/у).
											</p>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "4px" }}>
												Распечатайте договор на принтере, подпишите обе копии у пациента и подтвердите факт подписания в 1 клик.
											</div>
										</div>

										<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
											<button
												type="button"
												className="paid-contract-btn primary"
												onClick={handleConfirmPaperSign}
												data-testid="confirm-paper-contract-btn"
											>
												<CheckCircle2 size={16} aria-hidden="true" />
												<span>Подтвердить подпись на бумаге (1 клик)</span>
											</button>
											<button
												type="button"
												className="paid-contract-btn secondary"
												onClick={handlePrint}
												data-testid="print-paper-contract-btn"
											>
												<Printer size={15} aria-hidden="true" />
												<span>Печать 2 экз. на принтере</span>
											</button>
											<button
												type="button"
												className="paid-contract-btn secondary"
												onClick={() => {
													void printBlankMedicalContract(
														contractData.patient ? {
															fullName: contractData.patient.fullName,
															phone: contractData.patient.phone,
															birthDate: contractData.patient.birthDate,
															administrativeProfile: {
																identityDocument: [
																	contractData.patient.passportSeries,
																	contractData.patient.passportNumber,
																].filter(Boolean).join(" ") || undefined,
																registrationAddress: contractData.patient.registrationAddress,
																snils: contractData.patient.snils,
															},
														} : null,
														{
															doctorName: contractData.doctorFullName,
															clinicName: contractData.clinic.shortName || contractData.clinic.fullName,
															clinicAddress: contractData.clinic.legalAddress || contractData.clinic.actualAddress,
															clinicInn: contractData.clinic.inn,
															clinicOgrn: contractData.clinic.ogrn,
														}
													);
												}}
												data-testid="print-blank-paper-contract-btn"
												title="Распечатать пустой бланк договора со строками _______ для ручного заполнения пациентом до приёма (без 403-ошибок)"
											>
												<Printer size={15} aria-hidden="true" />
												<span>Печать бланка (со строками _______)</span>
											</button>
										</div>

										{contractData.signedAt && contractData.signMethod === "paper" && (
											<div
												style={{
													marginTop: "12px",
													padding: "10px 12px",
													borderRadius: "8px",
													background: "#f0fdfa",
													border: "1px solid #a7f3d0",
													color: "#065f46",
													fontSize: "12px",
													lineHeight: 1.4,
												}}
												data-testid="paper-signed-status"
											>
												<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
													<CheckCircle2 size={16} color="#059669" aria-hidden="true" />
													<span>ПОДПИСЬ НА БУМАГЕ ПОДТВЕРЖДЕНА</span>
												</div>
												<div style={{ marginTop: "4px", fontSize: "11px" }}>
													Дата подписания: <strong>{contractData.signedAt}</strong>
													{contractData.integrityHash && (
														<div style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: "10px", marginTop: "2px" }}>
															SHA-256: {contractData.integrityHash}
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								)}

								{contractData.signMethod === "sms_otp" && (
									<div className="paid-contract-sms-box">
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<Lock size={18} color="var(--teal)" aria-hidden="true" />
											<span style={{ fontSize: "13px", fontWeight: 700 }}>
												Простая электронная подпись (ПЭП) по Федеральному закону № 63-ФЗ
											</span>
										</div>

										<p style={{ fontSize: "12px", color: "var(--ink)", margin: "4px 0" }}>
											Для подписания договора будет отправлен одноразовый 4-значный SMS-код на номер{" "}
											<strong>{contractData.patient.phone}</strong>.
										</p>

										{!smsOtpState ? (
											<button
												type="button"
												className="paid-contract-btn primary"
												onClick={handleSendSmsCode}
											>
												<Smartphone size={15} aria-hidden="true" />
												<span>Отправить СМС с кодом подтверждения</span>
											</button>
										) : smsSuccess ? (
											<div
												style={{
													padding: "12px",
													borderRadius: "8px",
													background: "#f0fdfa",
													border: "1px solid #a7f3d0",
													color: "#065f46",
													fontSize: "12px",
													lineHeight: 1.4,
												}}
											>
												<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
													<CheckCircle2 size={16} color="#059669" aria-hidden="true" />
													<span>ДОГОВОР УСПЕШНО ПОДПИСАН ПЭП</span>
												</div>
												<div style={{ marginTop: "4px", fontSize: "11px" }}>
													Телефон: <strong>{smsOtpState.phoneMasked}</strong> · Время верификации:{" "}
													{new Date().toLocaleTimeString("ru-RU")}
												</div>
											</div>
										) : (
											<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
												<div className="paid-contract-sms-row">
													<input
														type="text"
														maxLength={4}
														className="paid-contract-otp-input"
														value={smsInputCode}
														onChange={(e) =>
															setSmsInputCode(e.target.value.replace(/\D/g, ""))
														}
														placeholder="0000"
														autoFocus
													/>
													<button
														type="button"
														className="paid-contract-btn primary"
														onClick={handleVerifySmsCode}
														disabled={smsInputCode.length !== 4}
													>
														<Check size={15} aria-hidden="true" />
														<span>Подтвердить подпись</span>
													</button>
												</div>

												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted)" }}>
													<span>Код отправлен на {smsOtpState.phoneMasked}</span>
													{secondsRemaining > 0 ? (
														<span>Действителен: {secondsRemaining} сек.</span>
													) : (
														<button
															type="button"
															style={{ background: "none", border: "none", color: "var(--teal)", cursor: "pointer", padding: 0 }}
															onClick={handleSendSmsCode}
														>
															Отправить повторно
														</button>
													)}
												</div>

												{smsError && (
													<div style={{ fontSize: "11px", color: "var(--bad-fg)", fontWeight: 600 }}>
														{smsError}
													</div>
												)}
											</div>
										)}
									</div>
								)}
							</section>
						)}

						{activeTab === "preview" && (
							<section className="paid-contract-section">
								<div className="paid-contract-section-header">
									<span>Параметры печати договора</span>
									<span style={{ fontSize: "11px", color: "var(--muted)" }}>
										2 экземпляра А4
									</span>
								</div>
								<p style={{ fontSize: "12px", lineHeight: 1.4, color: "var(--ink)" }}>
									Договор формируется в двух идентичных экземплярах по ГОСТ (один экземпляр выдается на руки Пациенту, второй подшивается в медицинскую карту 043/у).
								</p>
								<div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
									<button
										type="button"
										className="paid-contract-btn primary"
										onClick={handlePrint}
									>
										<Printer size={15} aria-hidden="true" />
										<span>Распечатать на принтере (Ctrl + P)</span>
									</button>
									<button
										type="button"
										className="paid-contract-btn secondary"
										onClick={() => {
											const text = generatePaidContractText(contractData);
											navigator.clipboard.writeText(text);
										}}
									>
										<Copy size={15} aria-hidden="true" />
										<span>Скопировать текст в буфер</span>
									</button>
								</div>
							</section>
						)}
					</div>

					{/* ── Right Pane: Live Printable A4 Mockup ── */}
					<div className="paid-contract-pane-right">
						<div className="paid-contract-dark-frame">
							<div className="paid-contract-a4-sheet" data-paper-sheet="true">
								{/* Header */}
								<div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5pt solid #0f172a", paddingBottom: "4px", fontSize: "9px" }}>
									<div>
										<div style={{ fontWeight: 800, fontSize: "10pt", textTransform: "uppercase" }}>
											{contractData.clinic.fullName}
										</div>
										<div style={{ color: "#475569" }}>
											{contractData.clinic.actualAddress} · Тел: {contractData.clinic.phone}
										</div>
										<div style={{ color: "#64748b", fontSize: "8px" }}>
											Лицензия: № {contractData.clinic.licenseNumber}
										</div>
									</div>
									<div style={{ textAlign: "right", color: "#64748b", fontSize: "7.5px", maxWidth: "180px", lineHeight: 1.2 }}>
										Постановление Правительства РФ № 736 от 11.05.2023 г. · ст. 84 323-ФЗ
									</div>
								</div>

								{/* Title and Stamp */}
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0" }}>
									<div style={{ flex: 1, textAlign: "center" }}>
										<div style={{ fontWeight: 800, fontSize: "11pt", textTransform: "uppercase", letterSpacing: "0.04em" }}>
											ДОГОВОР № {contractData.contractNumber}
										</div>
										<div style={{ fontSize: "8pt", color: "#475569" }}>
											на оказание платных медицинских стоматологических услуг
										</div>
									</div>
									<div
										data-testid="contract-preview-stamp"
										style={{
											padding: "2px 6px",
											border: `1.5pt solid ${isContractSigned ? "#059669" : "#64748b"}`,
											color: isContractSigned ? "#059669" : "#64748b",
											borderRadius: "3px",
											fontSize: "7pt",
											fontWeight: 800,
											textTransform: "uppercase",
											letterSpacing: "0.05em",
											whiteSpace: "nowrap",
											transform: "rotate(-2deg)",
											marginLeft: "8px",
										}}
									>
										{isContractSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК (БЛАНК)"}
									</div>
								</div>

								<div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", fontWeight: 700, borderBottom: "0.5pt solid #cbd5e1", paddingBottom: "2px" }}>
									<div>{contractData.city}</div>
									<div>«{contractData.contractDate}» г.</div>
								</div>

								{/* Requisites Short Grid */}
								<div style={{ fontSize: "8.5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", border: "0.5pt solid #cbd5e1", padding: "6px", borderRadius: "4px", background: "#f8fafc" }}>
									<div>
										<strong>Пациент:</strong> {contractData.patient.fullName}<br />
										<strong>Д.Р.:</strong> {contractData.patient.birthDate} · <strong>Тел:</strong> {contractData.patient.phone}<br />
										<strong>Паспорт:</strong> {contractData.patient.passportSeries} {contractData.patient.passportNumber}
									</div>
									<div>
										<strong>Медкарта:</strong> {contractData.patient.cardNumber || "043/у"}<br />
										<strong>Врач:</strong> {contractData.doctorFullName} ({contractData.doctorSpecialty})<br />
										<strong>СНИЛС:</strong> {contractData.patient.snils || "не указан"}
									</div>
								</div>

								{/* Service Scope Table */}
								<div style={{ margin: "4px 0" }}>
									<div style={{ fontSize: "8.5px", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>
										Согласованный перечень и стоимость медицинских услуг:
									</div>
									<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
										<thead>
											<tr style={{ background: "#f1f5f9" }}>
												<th style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", width: "20px" }}>№</th>
												<th style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "left" }}>Услуга (Номенклатура 804н)</th>
												<th style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", width: "40px" }}>Зуб</th>
												<th style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", width: "60px", textAlign: "right" }}>Сумма</th>
											</tr>
										</thead>
										<tbody>
											{contractData.services.map((s, idx) => (
												<tr key={s.id || idx}>
													<td style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "center" }}>{idx + 1}</td>
													<td style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px" }}>{s.name}</td>
													<td style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "center" }}>{s.toothOrArea || "—"}</td>
													<td style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "right", fontWeight: 700 }}>
														{formatKopecksToRubAndKop(s.totalKopecks).formatted}
													</td>
												</tr>
											))}
										</tbody>
										<tfoot>
											<tr>
												<td colSpan={3} style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "right", fontWeight: 700 }}>
													ИТОГО ПО СМЕТЕ:
												</td>
												<td style={{ border: "0.5pt solid #94a3b8", padding: "2px 4px", textAlign: "right", fontWeight: 800, background: "#f8fafc" }}>
													{moneyDetails.formatted}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{/* Statutory Notice */}
								<div style={{ border: "1pt solid #0f172a", background: "#f8fafc", padding: "4px 6px", fontSize: "7.5px", lineHeight: 1.25 }}>
									<strong>Уведомление о программе госгарантий (п. 7 ПП РФ № 736):</strong> Пациент проинформирован о возможности получения медпомощи без взимания платы по полису ОМС в государственных поликлиниках и добровольно согласен на платное лечение.
								</div>

								{/* Signatures */}
								<div style={{ marginTop: "auto", borderTop: "1.5pt solid #0f172a", paddingTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "8px" }}>
									<div>
										<strong>ИСПОЛНИТЕЛЬ:</strong><br />
										{contractData.clinic.shortName}<br />
										{contractData.clinic.directorTitle}: ___________ / {contractData.clinic.directorFullName} /<br />
										Врач: ___________ / {contractData.doctorFullName} /<br />
										М.П.
									</div>
									<div>
										<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br />
										{contractData.patient.fullName}<br />
										{contractData.signMethod === "sms_otp" && contractData.smsSignDetails?.isVerified ? (
											<div style={{ border: "1pt solid #0f766e", background: "#f0fdfa", color: "#0f766e", padding: "3px 5px", borderRadius: "3px", fontSize: "7px", marginTop: "2px", lineHeight: 1.25 }}>
												<div><strong>ПОДПИСАНО ПЭП (63-ФЗ)</strong></div>
												<div>СМС: <strong>{contractData.smsSignDetails.phone}</strong></div>
												<div style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: "6.5px" }}>
													SHA-256: {contractData.smsSignDetails.smsSignHash}
												</div>
											</div>
										) : (contractData.signMethod === "paper" || contractData.signMethod === "manual") ? (
											<div>
												<div style={{ borderBottom: "1pt solid #0f172a", minHeight: "18px", marginTop: "4px" }}></div>
												<div className="paper-sign-stamp" style={{ border: "1pt solid #0f172a", background: "#f8fafc", color: "#0f172a", padding: "3px 5px", borderRadius: "3px", fontSize: "7px", marginTop: "4px", lineHeight: 1.25 }}>
													Договор составлен в 2-х экземплярах на бумажном носителе (ст. 84 323-ФЗ, Постановление Правительства РФ № 736). Личная подпись пациента зафиксирована на бумаге и подшита в карту 043/у.
												</div>
											</div>
										) : contractData.touchSignatureBase64 ? (
											<div style={{ borderBottom: "1pt solid #0f172a", minHeight: "26px", marginTop: "2px" }}>
												<img src={contractData.touchSignatureBase64} alt="Подпись" style={{ maxHeight: "24px" }} />
											</div>
										) : (
											<div style={{ borderBottom: "1pt solid #0f172a", minHeight: "18px", marginTop: "4px" }}></div>
										)}
										<div style={{ fontSize: "7px", color: "#64748b", marginTop: "1px" }}>
											(подпись) / {contractData.patient.fullName} /
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── Footer ── */}
				<footer className="paid-contract-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
						<FileCheck size={16} color="var(--success-fg, #059669)" aria-hidden="true" />
						<span>Соответствует Постановлению Правительства РФ № 736 и ст. 84 323-ФЗ</span>
					</div>

					<div className="paid-contract-footer-actions">
						<button
							type="button"
							className="paid-contract-btn secondary"
							onClick={onClose}
						>
							Закрыть
						</button>
						<button
							type="button"
							className="paid-contract-btn secondary"
							onClick={handlePrint}
							data-testid="print-contract-btn"
						>
							<Printer size={15} aria-hidden="true" />
							<span>Печать А4 (ГОСТ)</span>
						</button>
						<button
							type="button"
							className="paid-contract-btn secondary"
							onClick={() => {
								void printBlankMedicalContract(
									contractData.patient ? {
										fullName: contractData.patient.fullName,
										phone: contractData.patient.phone,
										birthDate: contractData.patient.birthDate,
										administrativeProfile: {
											identityDocument: [
												contractData.patient.passportSeries,
												contractData.patient.passportNumber,
											].filter(Boolean).join(" ") || undefined,
											registrationAddress: contractData.patient.registrationAddress,
											snils: contractData.patient.snils,
										},
									} : null,
									{
										doctorName: contractData.doctorFullName,
										clinicName: contractData.clinic.shortName || contractData.clinic.fullName,
										clinicAddress: contractData.clinic.legalAddress || contractData.clinic.actualAddress,
										clinicInn: contractData.clinic.inn,
										clinicOgrn: contractData.clinic.ogrn,
									}
								);
							}}
							data-testid="print-blank-contract-btn"
							title="Печать чистого бланка договора со строками _______ для ручного заполнения пациентом до приёма (без 403-ошибок)"
						>
							<Printer size={15} aria-hidden="true" />
							<span>Бланк (_______)</span>
						</button>
						<button
							type="button"
							className="paid-contract-btn primary"
							onClick={handleSaveAndConfirm}
							data-testid="save-contract-btn"
						>
							<Check size={15} aria-hidden="true" />
							<span>Сохранить в медкарту</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
}

