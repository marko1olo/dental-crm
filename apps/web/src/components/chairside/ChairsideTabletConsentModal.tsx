import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Copy,
	Delete,
	FileCheck,
	FileText,
	Fingerprint,
	KeyRound,
	Lock,
	Phone,
	Printer,
	RefreshCw,
	Send,
	ShieldCheck,
	Smartphone,
	Tablet,
	User,
	UserCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	type ChairsideClinicalContext,
	type ChairsideClinicProfile,
	type ChairsideConsentPackage,
	type ChairsideDoctorProfile,
	type ChairsideDocument,
	type ChairsideDocumentType,
	type ChairsidePatientProfile,
	type ChairsideTreatmentItem,
	type CreateChairsidePackageParams,
	calculateEstimateTotalKopecks,
	createChairsideConsentPackage,
	formatKopecksToRubles,
	formatRussianDateTime,
	hashDoctorPin,
	maskRussianPhone,
	sendChairsideSmsOtpToPatient,
	signPackageWithSmsPep,
	verifyChairsideSmsOtp,
	verifyDoctorPin,
} from "./chairsideConsentEngine.js";
import "./chairsideConsent.css";

export interface ChairsideTabletConsentModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialPackage?: ChairsideConsentPackage | undefined;
	patient?: ChairsidePatientProfile | undefined;
	doctor?: ChairsideDoctorProfile | undefined;
	clinic?: Partial<ChairsideClinicProfile> | undefined;
	treatmentItems?: ChairsideTreatmentItem[] | undefined;
	clinicalContext?: Partial<ChairsideClinicalContext> | undefined;
	doctorPin?: string | undefined;
	initialMode?: "doctor" | "patient" | undefined;
	onConsentPackageSigned?: (signedPkg: ChairsideConsentPackage) => void | undefined;
	onConsentConfirmed?: (confirmation: {
		packageId: string;
		form043uCard: string;
		integrityHash: string;
		totalEstimateKopecks: number;
		signedAt: string;
		phoneMasked: string;
	}) => void | undefined;
}

export const ChairsideTabletConsentModal: React.FC<ChairsideTabletConsentModalProps> = ({
	isOpen,
	onClose,
	initialPackage,
	patient,
	doctor,
	clinic,
	treatmentItems,
	clinicalContext,
	doctorPin = "1234",
	initialMode = "doctor",
	onConsentPackageSigned,
	onConsentConfirmed,
}) => {
	const [pkg, setPkg] = useState<ChairsideConsentPackage>(() => {
		if (initialPackage) return initialPackage;
		return createChairsideConsentPackage({
			patient: patient || {
				fullName: "Иванова Анна Сергеевна",
				birthDate: "14.05.1988",
				passport: "Паспорт РФ 4510 № 123456",
				phone: "+7 (916) 777-88-12",
				snils: "123-456-789 00",
				cardNumber: "043/у-7842",
			},
			doctor: doctor || {
				fullName: "Барабаш Сергей Владимирович",
				specialty: "Врач-стоматолог-терапевт, ортопед",
			},
			clinic,
			clinicalContext: clinicalContext || {
				diagnosisIcd: "K02.1 Кариес дентина, K04.0 Пульпит",
				teeth: ["16", "17"],
			},
			treatmentItems: treatmentItems || [
				{
					id: "trt-1",
					serviceCode: "A16.07.002.001",
					title: "Препарирование и механическая обработка кариозной полости зуба 1.6",
					toothNumber: "16",
					stageTitle: "Этап 1: Терапия",
					quantity: 1,
					unitPriceKopecks: 350000,
					discountPercent: 0,
					totalKopecks: 350000,
				},
				{
					id: "trt-2",
					serviceCode: "A16.07.008.002",
					title: "Эстетическая реставрация зуба 1.6 светоотверждаемым нанокомпозитом",
					toothNumber: "16",
					stageTitle: "Этап 1: Терапия",
					quantity: 1,
					unitPriceKopecks: 650000,
					discountPercent: 0,
					totalKopecks: 650000,
				},
				{
					id: "trt-3",
					serviceCode: "A16.07.030.001",
					title: "Эндодонтическое лечение 3-х корневых каналов зуба 1.7 под микроскопом",
					toothNumber: "17",
					stageTitle: "Этап 2: Эндодонтия",
					quantity: 1,
					unitPriceKopecks: 1450000,
					discountPercent: 5,
					totalKopecks: 1377500,
				},
			],
			exitPin: doctorPin,
		});
	});

	const [mode, setMode] = useState<"doctor" | "patient">(initialMode);
	const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

	// SMS-PEP State
	const [patientPhone, setPatientPhone] = useState<string>(() => pkg.patient.phone || "+7 (916) 777-88-12");
	const [otpInput, setOtpInput] = useState<string>("");
	const [otpError, setOtpError] = useState<string | null>(null);
	const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(300);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [copiedHash, setCopiedHash] = useState<boolean>(false);
	const [isSuccessModal, setIsSuccessModal] = useState<boolean>(false);

	// Doctor PIN State
	const [isPinModalOpen, setIsPinModalOpen] = useState(false);
	const [enteredPin, setEnteredPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);

	const otpInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (isOpen) {
			if (initialPackage) {
				setPkg(initialPackage);
				setPatientPhone(initialPackage.patient.phone || "+7 (916) 777-88-12");
			} else {
				const freshPkg = createChairsideConsentPackage({
					patient: patient || {
						fullName: "Иванова Анна Сергеевна",
						birthDate: "14.05.1988",
						passport: "Паспорт РФ 4510 № 123456",
						phone: "+7 (916) 777-88-12",
						snils: "123-456-789 00",
						cardNumber: "043/у-7842",
					},
					doctor: doctor || {
						fullName: "Барабаш Сергей Владимирович",
						specialty: "Врач-стоматолог-терапевт, ортопед",
					},
					clinic,
					clinicalContext: clinicalContext || {
						diagnosisIcd: "K02.1 Кариес дентина, K04.0 Пульпит",
						teeth: ["16", "17"],
					},
					treatmentItems: treatmentItems || pkg.treatmentItems,
					exitPin: doctorPin,
				});
				setPkg(freshPkg);
				setPatientPhone(freshPkg.patient.phone || "+7 (916) 777-88-12");
			}
			setMode(initialMode);
			setActiveDocIndex(0);
			setOtpInput("");
			setOtpError(null);
			setIsPinModalOpen(false);
			setEnteredPin("");
			setPinError(null);
			setIsSuccessModal(false);
		}
	}, [isOpen, initialPackage, patient, doctor, clinic, clinicalContext, treatmentItems, doctorPin, initialMode]);

	// Countdown timer for SMS OTP (5 minutes)
	useEffect(() => {
		if (!pkg.smsOtp || pkg.status === "signed") return;

		const interval = setInterval(() => {
			const now = Date.now();
			const diff = Math.max(0, Math.floor((pkg.smsOtp!.expiresAt - now) / 1000));
			setTimeLeftSeconds(diff);
			if (diff === 0) {
				setOtpError("Срок действия СМС-кода (5 минут) истек. Запросите новый код.");
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [pkg.smsOtp, pkg.status]);

	// ESC handler
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (mode === "patient") {
					setIsPinModalOpen(true);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, mode, onClose]);

	// Doctor sends SMS to patient
	const handleSendSms = () => {
		const updated = sendChairsideSmsOtpToPatient(pkg, patientPhone);
		setPkg(updated);
		setOtpInput("");
		setOtpError(null);
		setTimeLeftSeconds(300);
		setTimeout(() => {
			otpInputRef.current?.focus();
		}, 100);
	};

	// Patient inputs OTP digits
	const handleOtpChange = (val: string) => {
		const clean = val.replace(/\D/g, "").slice(0, 4);
		setOtpInput(clean);
		setOtpError(null);

		// Auto-sign when 4 digits are completed
		if (clean.length === 4 && pkg.smsOtp) {
			handleConfirmOtp(clean);
		}
	};

	// Verification and signing
	const handleConfirmOtp = (codeToVerify?: string) => {
		const code = codeToVerify || otpInput;
		if (code.length !== 4) {
			setOtpError("Введите 4-значный код из СМС");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = signPackageWithSmsPep(pkg, {
				inputCode: code,
				form043uChartNumber: pkg.patient.cardNumber || "043/у",
			});

			if (result.success && result.signedPackage) {
				setPkg(result.signedPackage);
				setIsSuccessModal(true);

				if (onConsentPackageSigned) {
					onConsentPackageSigned(result.signedPackage);
				}

				if (onConsentConfirmed && result.signedPackage.signature) {
					onConsentConfirmed({
						packageId: result.signedPackage.packageId,
						form043uCard: result.signedPackage.patient.cardNumber || "043/у",
						integrityHash: result.signedPackage.signature.integrityHash,
						totalEstimateKopecks: result.signedPackage.totalEstimateKopecks,
						signedAt: result.signedPackage.signature.signedAtIso,
						phoneMasked: result.signedPackage.signature.phoneMasked,
					});
				}
			} else {
				setOtpError(result.error || "Неверный код подтверждения");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// Doctor PIN keypad handlers
	const handlePinDigit = (digit: string) => {
		if (enteredPin.length >= 6) return;
		const nextPin = enteredPin + digit;
		setEnteredPin(nextPin);
		setPinError(null);

		if (nextPin.length >= 4) {
			if (verifyDoctorPin(nextPin, pkg.exitPinHash)) {
				setIsPinModalOpen(false);
				setEnteredPin("");
				setPinError(null);
				setMode("doctor");
			} else if (nextPin.length === 4) {
				setPinError("Неверный PIN-код врача");
			}
		}
	};

	const handlePinBackspace = () => {
		setEnteredPin((prev) => prev.slice(0, -1));
		setPinError(null);
	};

	const handleCopyHash = () => {
		if (pkg.signature?.integrityHash) {
			navigator.clipboard.writeText(pkg.signature.integrityHash);
			setCopiedHash(true);
			setTimeout(() => setCopiedHash(false), 2000);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	if (!isOpen) return null;

	const activeDoc = pkg.documents[activeDocIndex] || pkg.documents[0];
	const isLastDoc = activeDocIndex === pkg.documents.length - 1;
	const isSigned = pkg.status === "signed" && Boolean(pkg.signature);

	const formattedTimer = `${String(Math.floor(timeLeftSeconds / 60)).padStart(2, "0")}:${String(timeLeftSeconds % 60).padStart(2, "0")}`;

	const modalMarkup = (
		<div className="chairside-overlay" onClick={() => mode === "doctor" && onClose()} role="dialog" aria-modal="true">
			<div
				className={`chairside-container ${mode === "patient" ? "patient-mode" : ""}`}
				onClick={(e) => e.stopPropagation()}
			>
				<header className={`chairside-header ${mode === "patient" ? "patient" : ""}`}>
					<div className="chairside-header-info">
						<div className="chairside-badge-row">
							<span className={`chairside-pill ${mode === "patient" ? "patient-pill" : ""}`}>
								<ShieldCheck size={16} />
								{mode === "patient" ? "Планшет пациента • ПЭП 63-ФЗ / 1051н" : "Режим врача • Пакет ИДС (ПЭП 63-ФЗ)"}
							</span>
							<span className="chairside-pill card-pill">
								Карта: {pkg.patient.cardNumber || "043/у"}
							</span>
						</div>
						<h2 className={`chairside-title ${mode === "patient" ? "patient" : ""}`}>
							{mode === "patient" ? "Подписание согласий по СМС (63-ФЗ)" : "Кресельное подписание согласий (Chairside PEP)"}
						</h2>
					</div>

					<div className="chairside-header-actions">
						{mode === "patient" ? (
							<button
								type="button"
								className="chairside-btn sm secondary"
								onClick={() => setIsPinModalOpen(true)}
								title="Защищено PIN-кодом врача. Нажмите для выхода."
								aria-label="Режим врача"
							>
								<Lock size={16} />
								<span>Режим врача</span>
							</button>
						) : (
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="chairside-btn sm primary"
									onClick={() => {
										setMode("patient");
										setActiveDocIndex(0);
									}}
									title="Передать планшет пациенту в кресле"
								>
									<Tablet size={16} />
									<span>Передать планшет пациенту</span>
								</button>
								<button
									type="button"
									className="chairside-btn sm secondary"
									onClick={onClose}
									aria-label="Закрыть"
								>
									<X size={20} />
								</button>
							</div>
						)}
					</div>
				</header>

				<nav className="chairside-tabs-bar" aria-label="Документы пакета">
					{pkg.documents.map((doc, idx) => {
						const isActive = idx === activeDocIndex;
						return (
							<button
								key={doc.type}
								type="button"
								className={`chairside-tab-btn ${isActive ? "active" : ""} ${doc.isSigned ? "signed" : ""}`}
								onClick={() => setActiveDocIndex(idx)}
							>
								<span>{idx + 1}. {doc.title}</span>
								{doc.isSigned && <CheckCircle2 size={16} className="text-ok-fg" />}
							</button>
						);
					})}
				</nav>

				<main className={`chairside-body ${mode === "patient" ? "patient-body" : ""}`}>
					{mode === "doctor" && (
						<div className="chairside-meta-banner">
							<div className="chairside-meta-cell">
								<span className="chairside-meta-label">Пациент</span>
								<span className="chairside-meta-val">{pkg.patient.fullName}</span>
								<span className="text-xs text-muted">д.р. {pkg.patient.birthDate}</span>
							</div>
							<div className="chairside-meta-cell">
								<span className="chairside-meta-label">Лечащий врач</span>
								<span className="chairside-meta-val">{pkg.doctor.fullName}</span>
								<span className="text-xs text-muted">{pkg.doctor.specialty}</span>
							</div>
							<div className="chairside-meta-cell">
								<span className="chairside-meta-label">Диагноз (МКБ-10)</span>
								<span className="chairside-meta-val">{pkg.clinicalContext.diagnosisIcd}</span>
							</div>
							<div className="chairside-meta-cell">
								<span className="chairside-meta-label">Сумма сметы (копейки)</span>
								<span className="chairside-meta-val text-[var(--teal-dark)] font-extrabold">
									{formatKopecksToRubles(pkg.totalEstimateKopecks)}
								</span>
								<span className="text-xs text-muted">{pkg.treatmentItems.length} позиций</span>
							</div>
						</div>
					)}

					{mode === "patient" && (
						<div className="chairside-patient-notice">
							<UserCheck size={28} className="text-[var(--teal-dark)] shrink-0" />
							<p className="chairside-notice-text">
								Уважаемый(ая) <b>{pkg.patient.fullName}</b>! Пожалуйста, ознакомьтесь с условиями медицинского вмешательства (ИДС 1051н), согласием на обработку персональных данных (152-ФЗ) и сметой плана лечения. Для подписания документов введите 4-значный код подтверждения из СМС.
							</p>
						</div>
					)}

					<div className="chairside-paper-sheet">
						<h3 className="chairside-sheet-title">{activeDoc?.title}</h3>
						<p className="chairside-sheet-basis">{activeDoc?.statutoryBasis}</p>

						{activeDoc?.sections.map((sec) => (
							<section key={sec.id} className="chairside-section">
								<h4 className="chairside-section-h">{sec.title}</h4>
								<p className="chairside-section-p">{sec.content}</p>
								{sec.bullets && sec.bullets.length > 0 && (
									<ul className="chairside-bullets">
										{sec.bullets.map((b, bIdx) => (
											<li key={bIdx}>{b}</li>
										))}
									</ul>
								)}
							</section>
						))}

						{activeDoc?.type === "treatment_estimate" && (
							<div className="flex flex-col gap-3 mt-2">
								<div className="chairside-estimate-table-wrap">
									<table className="chairside-estimate-table">
										<thead>
											<tr>
												<th style={{ width: 30, textAlign: "center" }}>№</th>
												<th>Наименование медицинской услуги</th>
												<th style={{ width: 60, textAlign: "center" }}>Зуб</th>
												<th style={{ width: 50, textAlign: "center" }}>Кол-во</th>
												<th style={{ width: 100, textAlign: "right" }}>Цена</th>
												<th style={{ width: 70, textAlign: "center" }}>Скидка</th>
												<th style={{ width: 110, textAlign: "right" }}>Сумма</th>
											</tr>
										</thead>
										<tbody>
											{pkg.treatmentItems.map((it, idx) => (
												<tr key={it.id}>
													<td style={{ textAlign: "center" }}>{idx + 1}</td>
													<td>
														<div className="font-bold">{it.title}</div>
														<div className="text-xs text-muted">
															Код 804н: {it.serviceCode} {it.stageTitle ? `• ${it.stageTitle}` : ""}
														</div>
													</td>
													<td style={{ textAlign: "center" }}>
														{it.toothNumber ? (
															<span className="chairside-tooth-badge">{it.toothNumber}</span>
														) : (
															"—"
														)}
													</td>
													<td style={{ textAlign: "center" }}>{it.quantity}</td>
													<td style={{ textAlign: "right" }}>{formatKopecksToRubles(it.unitPriceKopecks)}</td>
													<td style={{ textAlign: "center" }}>
														{it.discountPercent && it.discountPercent > 0 ? `${it.discountPercent}%` : "—"}
													</td>
													<td style={{ textAlign: "right", fontWeight: 800 }}>
														{formatKopecksToRubles(it.totalKopecks)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								<div className="chairside-total-panel">
									<div className="chairside-total-row">
										<span className="font-extrabold text-sm uppercase">ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</span>
										<span className="chairside-total-sum">{formatKopecksToRubles(pkg.totalEstimateKopecks)}</span>
									</div>
									<div className="chairside-total-words">
										Сумма прописью: {pkg.totalEstimateWords}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* SMS-PEP SIGNING BLOCK (STRICT 63-FZ / 323-FZ) */}
					{!isSigned && (
						<div className="chairside-sms-pep-card">
							<div className="chairside-sms-header">
								<div className="flex items-center gap-2">
									<Smartphone size={22} className="text-[var(--teal,#0d9488)]" />
									<div>
										<h4 className="font-extrabold text-base m-0">
											Подписание простой электронной подписью (ПЭП по 63-ФЗ)
										</h4>
										<p className="text-xs text-muted m-0">
											Код подтверждения отправляется на номер пациента и заверяет весь пакет документов
										</p>
									</div>
								</div>
								{pkg.smsOtp && (
									<div className="chairside-timer-badge">
										<Clock size={14} />
										<span>Код действует: {formattedTimer}</span>
									</div>
								)}
							</div>

							<div className="chairside-sms-body">
								{!pkg.smsOtp ? (
									<div className="chairside-phone-step">
										<div className="flex flex-col gap-1 w-full max-w-sm">
											<label htmlFor="patient-phone-input" className="text-xs font-bold text-muted">
												Номер телефона пациента для СМС-кода:
											</label>
											<div className="flex items-center gap-2">
												<div className="chairside-phone-input-box">
													<Phone size={16} className="text-muted" />
													<input
														id="patient-phone-input"
														type="tel"
														className="chairside-input"
														value={patientPhone}
														onChange={(e) => setPatientPhone(e.target.value)}
														placeholder="+7 (999) 000-00-00"
													/>
												</div>
												<button
													type="button"
													className="chairside-btn primary"
													onClick={handleSendSms}
												>
													<Send size={18} />
													<span>Отправить СМС с кодом</span>
												</button>
											</div>
										</div>
									</div>
								) : (
									<div className="chairside-otp-step">
										<div className="chairside-otp-info">
											<span className="text-sm font-semibold">
												СМС с 4-значным кодом отправлено на номер: <b>{pkg.smsOtp.phoneMasked}</b>
											</span>
											<button
												type="button"
												className="chairside-btn sm secondary text-xs py-1 px-2"
												onClick={handleSendSms}
												title="Отправить код повторно"
											>
												<RefreshCw size={14} />
												<span>Выслать код повторно</span>
											</button>
										</div>

										<div className="chairside-otp-form">
											<div className="flex flex-col gap-2">
												<label htmlFor="chairside-otp-input" className="text-xs font-bold text-muted">
													Введите 4 цифры из СМС:
												</label>
												<div className="flex items-center gap-3">
													<input
														id="chairside-otp-input"
														ref={otpInputRef}
														type="text"
														inputMode="numeric"
														pattern="[0-9]*"
														maxLength={4}
														className="chairside-otp-input"
														value={otpInput}
														onChange={(e) => handleOtpChange(e.target.value)}
														placeholder="••••"
														autoFocus
													/>
													<button
														type="button"
														className="chairside-btn primary lg"
														onClick={() => handleConfirmOtp()}
														disabled={otpInput.length !== 4 || isSubmitting}
													>
														<FileCheck size={20} />
														<span>Подтвердить и подписать (63-ФЗ)</span>
													</button>
												</div>
											</div>

											{otpError && (
												<div className="chairside-otp-error">
													<AlertTriangle size={16} />
													<span>{otpError}</span>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* OFFICIAL LEGAL PEP STAMP (WHEN SIGNED) */}
					{isSigned && pkg.signature && (
						<div className="chairside-pep-stamp-box">
							<div className="stamp-header">
								<div className="flex items-center gap-2">
									<ShieldCheck size={20} className="text-ok-fg" />
									<span className="stamp-main-title">
										ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)
									</span>
								</div>
								<span className="stamp-law-badge">63-ФЗ ст. 5, 6 • 323-ФЗ ст. 20</span>
							</div>

							<div className="stamp-content-grid">
								<div className="stamp-col">
									<div><b>Подписант (Пациент):</b> {pkg.signature.signedByFullName}</div>
									<div><b>Телефон:</b> {pkg.signature.phoneMasked}</div>
									<div><b>Код подтвержден:</b> {pkg.signature.otpCodeConfirmed} (СМС-код 4 знака)</div>
								</div>
								<div className="stamp-col">
									<div><b>Дата и время:</b> {pkg.signature.signedAtFormatted}</div>
									<div><b>Медицинская карта 043/у:</b> {pkg.signature.form043uRecordId}</div>
									<div><b>Пакет документов:</b> {pkg.signature.documentsDigest}</div>
								</div>
							</div>

							<div className="stamp-hash-row">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="font-bold text-xs text-muted">Хэш документа (SHA-256):</span>
									<span className="chairside-hash-text">{pkg.signature.integrityHash}</span>
								</div>
								<button
									type="button"
									className="chairside-btn sm secondary py-1 px-3 text-xs shrink-0"
									onClick={handleCopyHash}
								>
									{copiedHash ? <Check size={14} className="text-ok-fg" /> : <Copy size={14} />}
									<span>{copiedHash ? "Скопировано" : "Копировать SHA-256"}</span>
								</button>
							</div>
						</div>
					)}
				</main>

				<footer className={`chairside-footer ${mode === "patient" ? "patient-footer" : ""}`}>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="chairside-btn secondary"
							onClick={handlePrint}
							title="Распечатать бумажный бланк (А4)"
						>
							<Printer size={18} />
							<span>Печать (А4)</span>
						</button>

						{activeDocIndex > 0 && (
							<button
								type="button"
								className="chairside-btn secondary"
								onClick={() => setActiveDocIndex((prev) => prev - 1)}
							>
								<ChevronLeft size={18} />
								<span>Предыдущий документ</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-3">
						{!isLastDoc && (
							<button
								type="button"
								className="chairside-btn secondary"
								onClick={() => setActiveDocIndex((prev) => prev + 1)}
							>
								<span>Следующий документ</span>
								<ChevronRight size={18} />
							</button>
						)}

						{isSigned ? (
							<button
								type="button"
								className="chairside-btn primary"
								onClick={mode === "patient" ? () => setIsPinModalOpen(true) : onClose}
							>
								<Check size={18} />
								<span>Завершить и закрыть</span>
							</button>
						) : !pkg.smsOtp ? (
							<button
								type="button"
								className="chairside-btn primary lg"
								onClick={handleSendSms}
							>
								<Send size={20} />
								<span>Отправить СМС с кодом пациенту</span>
							</button>
						) : (
							<button
								type="button"
								className="chairside-btn primary lg"
								onClick={() => handleConfirmOtp()}
								disabled={otpInput.length !== 4 || isSubmitting}
							>
								<FileCheck size={20} />
								<span>Подтвердить и подписать (63-ФЗ)</span>
							</button>
						)}
					</div>
				</footer>
			</div>

			{/* DOCTOR PIN SECURITY MODAL */}
			{isPinModalOpen && (
				<div className="chairside-pin-modal-overlay" onClick={() => setIsPinModalOpen(false)}>
					<div className="chairside-pin-box" onClick={(e) => e.stopPropagation()}>
						<div className="flex flex-col items-center gap-1 text-center">
							<Lock size={32} className="text-[var(--teal,#0d9488)]" />
							<h3 className="font-extrabold text-lg m-0">Вход для врача</h3>
							<p className="text-xs text-muted m-0">
								Введите 4-значный PIN-код врача для разблокировки интерфейса
							</p>
						</div>

						<div className="chairside-pin-display">
							{[0, 1, 2, 3].map((i) => (
								<div
									key={i}
									className={`chairside-pin-dot ${i < enteredPin.length ? "filled" : ""}`}
								/>
							))}
						</div>

						{pinError && (
							<div className="text-xs font-bold text-[var(--bad-fg)] flex items-center gap-1">
								<AlertTriangle size={14} />
								<span>{pinError}</span>
							</div>
						)}

						<div className="chairside-pin-numpad">
							{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
								<button
									key={num}
									type="button"
									className="chairside-pin-num-btn"
									onClick={() => handlePinDigit(num)}
								>
									{num}
								</button>
							))}
							<button
								type="button"
								className="chairside-pin-num-btn text-sm"
								onClick={() => setIsPinModalOpen(false)}
							>
								Отмена
							</button>
							<button
								type="button"
								className="chairside-pin-num-btn"
								onClick={() => handlePinDigit("0")}
							>
								0
							</button>
							<button
								type="button"
								className="chairside-pin-num-btn text-sm"
								onClick={handlePinBackspace}
								title="Стереть"
							>
								<Delete size={20} />
							</button>
						</div>
					</div>
				</div>
			)}

			{/* SUCCESS CONFIRMATION MODAL */}
			{isSuccessModal && (
				<div className="chairside-pin-modal-overlay" onClick={() => setIsSuccessModal(false)}>
					<div className="chairside-pin-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
						<div className="chairside-success-icon">
							<CheckCircle2 size={48} />
						</div>
						<h3 className="font-extrabold text-xl m-0 text-center">Пакет документов успешно подписан!</h3>
						<p className="text-sm text-muted text-center m-0">
							ИДС (1051н), согласие 152-ФЗ и смета плана лечения надежно заверены простой электронной подписью (ПЭП по 63-ФЗ) и привязаны к карте Формы 043/у <b>{pkg.patient.cardNumber}</b>.
						</p>
						<div className="w-full bg-[var(--paper-soft)] p-3 rounded-lg border border-[var(--line)] text-xs flex flex-col gap-1">
							<div><b>Подписант:</b> {pkg.patient.fullName}</div>
							<div><b>Телефон:</b> {pkg.signature?.phoneMasked}</div>
							<div><b>Дата:</b> {pkg.signature?.signedAtFormatted}</div>
							<div className="font-mono text-[10px] text-[var(--teal-dark)] truncate">
								<b>SHA-256:</b> {pkg.signature?.integrityHash}
							</div>
						</div>
						<button
							type="button"
							className="chairside-btn primary w-full"
							onClick={() => {
								setIsSuccessModal(false);
								if (mode === "patient") {
									setIsPinModalOpen(true);
								} else {
									onClose();
								}
							}}
						>
							<span>Продолжить</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalMarkup;
	}

	return createPortal(modalMarkup, document.body);
};
