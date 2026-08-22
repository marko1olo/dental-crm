import React, { useState } from "react";
import { SignaturePadCanvas } from "./SignaturePadCanvas";
import {
	INITIAL_SOMATIC_QUESTIONNAIRE,
	type SomaticQuestionnaireData,
	type SomaticRiskAlert,
	evaluateSomaticRisks,
} from "./SomaticQuestionnaireEngine";
import "./selfCheckin.css";

export interface MobileSelfCheckinModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialPhone?: string;
	patientName?: string;
	clinicName?: string;
	doctorName?: string;
	appointmentTime?: string;
	onCheckinSuccess?: (result: {
		patientId: string;
		signedConsents: string[];
		somaticProfile: ReturnType<typeof evaluateSomaticRisks>;
	}) => void;
}

type CheckinStep = "phone_auth" | "consents" | "somatic" | "completed";

interface StatutoryConsentItem {
	id: string;
	code: string;
	titleRu: string;
	categoryRu: string;
	statutoryBasis: string;
	summaryRu: string;
	fullTextRu: string;
	isSigned: boolean;
	signatureSvg?: string;
	signedAtIso?: string;
}

const DEFAULT_CONSENTS: StatutoryConsentItem[] = [
	{
		id: "ids_treatment",
		code: "ИДС-ТЕР-01",
		titleRu: "Информированное согласие на стоматологическое лечение",
		categoryRu: "Терапия и диагностика",
		statutoryBasis: "323-ФЗ ст. 20",
		summaryRu:
			"Согласие на проведение клинического осмотра, инструментальной диагностики, препарирования полостей и постановки реставраций.",
		fullTextRu:
			"Я, пациент клиники, даю информированное добровольное согласие на виды медицинских вмешательств в соответствии со ст. 20 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации». Мне разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинского вмешательства, его последствия, а также предполагаемые результаты.",
		isSigned: false,
	},
	{
		id: "ids_anesthesia",
		code: "ИДС-АНЕСТ-01",
		titleRu: "Информированное согласие на местное обезболивание",
		categoryRu: "Анестезия",
		statutoryBasis: "323-ФЗ ст. 20",
		summaryRu:
			"Согласие на инфильтрационную и проводниковую анестезию современными карпульными препаратами (Артикаин, Мепивакаин).",
		fullTextRu:
			"Я подтверждаю, что сообщил врачу полные и достоверные сведения о перенесенных заболеваниях, наличии аллергических реакций на медикаменты, заболеваниях сердца, сосудов, свертываемости крови и принимаемых препаратах. Согласен на проведение местного обезболивания.",
		isSigned: false,
	},
	{
		id: "pd_152",
		code: "ПДН-152",
		titleRu: "Согласие на обработку персональных данных",
		categoryRu: "Персональные данные",
		statutoryBasis: "152-ФЗ",
		summaryRu:
			"Согласие на сбор, хранение и обработку персональных данных и сведений, составляющих врачебную тайну, в рамках оказания медпомощи.",
		fullTextRu:
			"В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» подтверждаю свое согласие на обработку клиникой моих персональных данных и медицинских сведений в целях ведения электронной медицинской карты и оказания стоматологических услуг.",
		isSigned: false,
	},
];

export const MobileSelfCheckinModal: React.FC<MobileSelfCheckinModalProps> = ({
	isOpen,
	onClose,
	initialPhone = "+7 (913) 770-41-99",
	patientName = "Смирнова Анна Викторовна",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	doctorName = "Д-р Воронова Е. С. (Терапевт-микроскопист)",
	appointmentTime = "Сегодня в 14:30 (Кабинет 3)",
	onCheckinSuccess,
}) => {
	const [step, setStep] = useState<CheckinStep>("phone_auth");
	const [phone, setPhone] = useState(initialPhone);
	const [otpCode, setOtpCode] = useState("");
	const [isOtpSent, setIsOtpSent] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Consents State
	const [consents, setConsents] = useState<StatutoryConsentItem[]>(DEFAULT_CONSENTS);
	const [activeConsentIndex, setActiveConsentIndex] = useState(0);
	const [currentSvgSignature, setCurrentSvgSignature] = useState("");

	// Somatic Questionnaire State
	const [somaticData, setSomaticData] = useState<SomaticQuestionnaireData>(
		INITIAL_SOMATIC_QUESTIONNAIRE,
	);
	const [allergyDetails, setAllergyDetails] = useState("");
	const [cardioDetails, setCardioDetails] = useState("");
	const [coagulationDetails, setCoagulationDetails] = useState("");

	if (!isOpen) return null;

	// OTP Request
	const handleSendOtp = () => {
		if (!phone || phone.length < 10) {
			setAuthError("Пожалуйста, введите корректный номер мобильного телефона.");
			return;
		}
		setAuthError(null);
		setIsSubmitting(true);
		setTimeout(() => {
			setIsSubmitting(false);
			setIsOtpSent(true);
			setOtpCode("4290"); // Developer/Test OTP fallback
		}, 400);
	};

	// OTP Verify
	const handleVerifyOtp = () => {
		if (otpCode.length < 4) {
			setAuthError("Введите 4-значный код подтверждения из SMS.");
			return;
		}
		setAuthError(null);
		setIsSubmitting(true);
		setTimeout(() => {
			setIsSubmitting(false);
			setStep("consents");
		}, 300);
	};

	// Consent Signature Confirm
	const handleSignCurrentConsent = () => {
		if (!currentSvgSignature) return;

		const updated = [...consents];
		const current = updated[activeConsentIndex];
		if (current) {
			current.isSigned = true;
			current.signatureSvg = currentSvgSignature;
			current.signedAtIso = new Date().toISOString();
		}
		setConsents(updated);
		setCurrentSvgSignature("");

		// Move to next consent or proceed to somatic step
		if (activeConsentIndex < consents.length - 1) {
			setActiveConsentIndex(activeConsentIndex + 1);
		} else {
			setStep("somatic");
		}
	};

	// Somatic Health Update & Submission
	const riskEvaluation = evaluateSomaticRisks({
		...somaticData,
		allergies: {
			...somaticData.allergies,
			details: allergyDetails,
		},
		cardiovascular: {
			...somaticData.cardiovascular,
			details: cardioDetails,
		},
		coagulation: {
			...somaticData.coagulation,
			details: coagulationDetails,
		},
	});

	const handleCompleteCheckin = () => {
		setIsSubmitting(true);
		setTimeout(() => {
			setIsSubmitting(false);
			setStep("completed");
			onCheckinSuccess?.({
				patientId: "patient-selfcheckin-001",
				signedConsents: consents.filter((c) => c.isSigned).map((c) => c.id),
				somaticProfile: riskEvaluation,
			});
		}, 400);
	};

	const currentConsent = consents[activeConsentIndex];
	const allConsentsSigned = consents.every((c) => c.isSigned);

	return (
		<div className="selfcheckin-modal-backdrop" onClick={onClose}>
			<div
				className="selfcheckin-modal-window"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<header className="selfcheckin-header">
					<div className="selfcheckin-header-left">
						<div className="selfcheckin-clinic-badge">
							<span className="selfcheckin-clinic-dot" />
							<span>{clinicName}</span>
						</div>
						<h2 className="selfcheckin-title">
							{step === "phone_auth" && "Вход и самочекин"}
							{step === "consents" && "Электронная подпись согласий"}
							{step === "somatic" && "Анкета здоровья и рисков"}
							{step === "completed" && "Чекин успешно пройден!"}
						</h2>
					</div>
					<button
						type="button"
						className="selfcheckin-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно самочекина"
					>
						✕
					</button>
				</header>

				{/* Progress Indicator */}
				<div className="selfcheckin-steps-bar">
					<div
						className={`selfcheckin-step-pill ${
							step === "phone_auth" ? "active" : "done"
						}`}
					>
						1. Авторизация
					</div>
					<div
						className={`selfcheckin-step-pill ${
							step === "consents"
								? "active"
								: step === "somatic" || step === "completed"
									? "done"
									: ""
						}`}
					>
						2. Согласия (ИДС)
					</div>
					<div
						className={`selfcheckin-step-pill ${
							step === "somatic" ? "active" : step === "completed" ? "done" : ""
						}`}
					>
						3. Анкета здоровья
					</div>
					<div
						className={`selfcheckin-step-pill ${
							step === "completed" ? "active" : ""
						}`}
					>
						4. Готово
					</div>
				</div>

				{/* Body Content by Step */}
				<div className="selfcheckin-content">
					{/* STEP 1: Phone OTP Auth */}
					{step === "phone_auth" && (
						<div className="selfcheckin-step-box">
							<div className="selfcheckin-welcome-card">
								<span className="selfcheckin-welcome-icon">👋</span>
								<div>
									<div className="selfcheckin-welcome-name">
										Здравствуйте, {patientName}!
									</div>
									<div className="selfcheckin-welcome-sub">
										Ваш прием: <strong>{appointmentTime}</strong> у{" "}
										<strong>{doctorName}</strong>.
									</div>
								</div>
							</div>

							<div className="selfcheckin-form-group">
								<label className="selfcheckin-label">
									Номер мобильного телефона
								</label>
								<input
									type="tel"
									className="selfcheckin-input"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+7 (___) ___-__-__"
									disabled={isOtpSent}
								/>
							</div>

							{!isOtpSent ? (
								<button
									type="button"
									className="selfcheckin-btn-primary"
									onClick={handleSendOtp}
									disabled={isSubmitting}
								>
									{isSubmitting
										? "Отправка SMS..."
										: "Получить код входа в SMS"}
								</button>
							) : (
								<div className="selfcheckin-otp-group">
									<label className="selfcheckin-label">
										Код подтверждения из SMS
									</label>
									<div className="selfcheckin-otp-input-wrapper">
										<input
											type="text"
											className="selfcheckin-input selfcheckin-otp-input"
											maxLength={6}
											value={otpCode}
											onChange={(e) => setOtpCode(e.target.value)}
											placeholder="4290"
											autoFocus
										/>
										<button
											type="button"
											className="selfcheckin-btn-primary"
											onClick={handleVerifyOtp}
											disabled={isSubmitting}
										>
											{isSubmitting ? "Проверка..." : "Войти"}
										</button>
									</div>
									<div className="selfcheckin-otp-hint">
										Код отправлен на {phone}.
									</div>
								</div>
							)}

							{authError && (
								<div className="selfcheckin-error-alert">{authError}</div>
							)}
						</div>
					)}

					{/* STEP 2: Statutory Consents with Vector Touch Signature */}
					{step === "consents" && currentConsent && (
						<div className="selfcheckin-step-box">
							<div className="selfcheckin-consent-nav">
								{consents.map((item, idx) => (
									<button
										key={item.id}
										type="button"
										className={`selfcheckin-consent-tab ${
											idx === activeConsentIndex ? "active" : ""
										} ${item.isSigned ? "signed" : ""}`}
										onClick={() => {
											setActiveConsentIndex(idx);
											setCurrentSvgSignature("");
										}}
									>
										{item.isSigned ? "✓ " : ""}
										{item.code}
									</button>
								))}
							</div>

							<div className="selfcheckin-consent-card">
								<div className="selfcheckin-consent-header">
									<span className="selfcheckin-consent-badge">
										{currentConsent.categoryRu} • {currentConsent.statutoryBasis}
									</span>
									<h3 className="selfcheckin-consent-title">
										{currentConsent.titleRu}
									</h3>
								</div>

								<div className="selfcheckin-consent-text-box">
									<p className="selfcheckin-consent-summary">
										<strong>Суть документа:</strong> {currentConsent.summaryRu}
									</p>
									<p className="selfcheckin-consent-fulltext">
										{currentConsent.fullTextRu}
									</p>
								</div>

								{/* Signature Area */}
								{currentConsent.isSigned ? (
									<div className="selfcheckin-signed-badge-box">
										<div className="selfcheckin-signed-success">
											✓ Документ подписан простой электронной подписью (63-ФЗ)
										</div>
										<div className="selfcheckin-signed-meta">
											Время: {currentConsent.signedAtIso?.slice(0, 19).replace("T", " ")} UTC
										</div>
										{currentConsent.signatureSvg && (
											<div
												className="selfcheckin-signed-preview"
												dangerouslySetInnerHTML={{
													__html: currentConsent.signatureSvg,
												}}
											/>
										)}
									</div>
								) : (
									<div className="selfcheckin-signature-block">
										<div className="selfcheckin-signature-label">
											Поставьте подпись пальцем или стилусом на экране:
										</div>
										<SignaturePadCanvas
											width={360}
											height={160}
											onSignatureChange={(svg) => setCurrentSvgSignature(svg)}
										/>
										<button
											type="button"
											className="selfcheckin-btn-primary"
											onClick={handleSignCurrentConsent}
											disabled={!currentSvgSignature}
										>
											Подтвердить подпись документа ({currentConsent.code})
										</button>
									</div>
								)}
							</div>

							{allConsentsSigned && (
								<button
									type="button"
									className="selfcheckin-btn-accent"
									onClick={() => setStep("somatic")}
								>
									Перейти к анкете здоровья ➔
								</button>
							)}
						</div>
					)}

					{/* STEP 3: Somatic Health Questionnaire */}
					{step === "somatic" && (
						<div className="selfcheckin-step-box">
							<div className="selfcheckin-somatic-intro">
								Пожалуйста, отметьте особенности здоровья для безопасного
								подбора анестезии и клинических протоколов:
							</div>

							{/* Live Risk Alerts Preview */}
							{riskEvaluation.alerts.length > 0 && (
								<div className="selfcheckin-alerts-container">
									<div className="selfcheckin-alerts-header">
										Факторы риска для лечащего врача:
									</div>
									{riskEvaluation.alerts.map((alert: SomaticRiskAlert) => (
										<div
											key={alert.id}
											className={`selfcheckin-alert-badge alert-${alert.severity}`}
										>
											<div className="selfcheckin-alert-title">
												{alert.severity === "danger" ? "🚨 " : "⚠️ "}
												{alert.title}
											</div>
											<div className="selfcheckin-alert-msg">{alert.message}</div>
											<div className="selfcheckin-alert-action">
												<strong>Рекомендация:</strong> {alert.recommendedAction}
											</div>
										</div>
									))}
								</div>
							)}

							<div className="selfcheckin-questions-grid">
								{/* Allergies Card */}
								<div className="selfcheckin-question-card">
									<div className="selfcheckin-card-title">
										🌿 1. Аллергологический анамнез
									</div>
									<label className="selfcheckin-checkbox-label">
										<input
											type="checkbox"
											checked={somaticData.allergies.hasAllergies}
											onChange={(e) =>
												setSomaticData({
													...somaticData,
													allergies: {
														...somaticData.allergies,
														hasAllergies: e.target.checked,
													},
												})
											}
										/>
										<span>Имеются аллергические реакции на медикаменты/вещества</span>
									</label>

									{somaticData.allergies.hasAllergies && (
										<div className="selfcheckin-suboptions">
											<label className="selfcheckin-checkbox-label">
												<input
													type="checkbox"
													checked={somaticData.allergies.sulfiteAllergy}
													onChange={(e) =>
														setSomaticData({
															...somaticData,
															allergies: {
																...somaticData.allergies,
																sulfiteAllergy: e.target.checked,
															},
														})
													}
												/>
												<span>Аллергия на сульфиты / консерванты</span>
											</label>
											<label className="selfcheckin-checkbox-label">
												<input
													type="checkbox"
													checked={
														somaticData.allergies.localAnestheticsAllergy
													}
													onChange={(e) =>
														setSomaticData({
															...somaticData,
															allergies: {
																...somaticData.allergies,
																localAnestheticsAllergy: e.target.checked,
															},
														})
													}
												/>
												<span>Непереносимость местных анестетиков</span>
											</label>
											<input
												type="text"
												className="selfcheckin-input selfcheckin-input-sm"
												placeholder="Укажите препараты или симптомы..."
												value={allergyDetails}
												onChange={(e) => setAllergyDetails(e.target.value)}
											/>
										</div>
									)}
								</div>

								{/* Cardio Card */}
								<div className="selfcheckin-question-card">
									<div className="selfcheckin-card-title">
										❤️ 2. Сердечно-сосудистая система
									</div>
									<label className="selfcheckin-checkbox-label">
										<input
											type="checkbox"
											checked={somaticData.cardiovascular.hasRisk}
											onChange={(e) =>
												setSomaticData({
													...somaticData,
													cardiovascular: {
														...somaticData.cardiovascular,
														hasRisk: e.target.checked,
													},
												})
											}
										/>
										<span>Гипертензия / Аритмия / ИБС / Инфаркт</span>
									</label>
									{somaticData.cardiovascular.hasRisk && (
										<div className="selfcheckin-suboptions">
											<label className="selfcheckin-checkbox-label">
												<input
													type="checkbox"
													checked={somaticData.cardiovascular.pacemaker}
													onChange={(e) =>
														setSomaticData({
															...somaticData,
															cardiovascular: {
																...somaticData.cardiovascular,
																pacemaker: e.target.checked,
															},
														})
													}
												/>
												<span>Установлен кардиостимулятор (ЭКС)</span>
											</label>
											<input
												type="text"
												className="selfcheckin-input selfcheckin-input-sm"
												placeholder="Обычные показатели АД (например 140/90)..."
												value={cardioDetails}
												onChange={(e) => setCardioDetails(e.target.value)}
											/>
										</div>
									)}
								</div>

								{/* Coagulation Card */}
								<div className="selfcheckin-question-card">
									<div className="selfcheckin-card-title">
										🩸 3. Свертываемость крови и антикоагулянты
									</div>
									<label className="selfcheckin-checkbox-label">
										<input
											type="checkbox"
											checked={somaticData.coagulation.onAnticoagulants}
											onChange={(e) =>
												setSomaticData({
													...somaticData,
													coagulation: {
														...somaticData.coagulation,
														onAnticoagulants: e.target.checked,
														hasBleedingDisorder: e.target.checked,
													},
												})
											}
										/>
										<span>Прием кроверазжижающих (Ксарелто, Варфарин, Аспирин)</span>
									</label>
									{somaticData.coagulation.onAnticoagulants && (
										<input
											type="text"
											className="selfcheckin-input selfcheckin-input-sm"
											placeholder="Название препарата и дозировка..."
											value={coagulationDetails}
											onChange={(e) => setCoagulationDetails(e.target.value)}
										/>
									)}
								</div>

								{/* Pregnancy / Diabetes Card */}
								<div className="selfcheckin-question-card">
									<div className="selfcheckin-card-title">
										🩺 4. Диабет / Беременность
									</div>
									<div className="selfcheckin-suboptions-row">
										<label className="selfcheckin-checkbox-label">
											<input
												type="checkbox"
												checked={somaticData.diabetes.hasDiabetes}
												onChange={(e) =>
													setSomaticData({
														...somaticData,
														diabetes: {
															...somaticData.diabetes,
															hasDiabetes: e.target.checked,
														},
													})
												}
											/>
											<span>Сахарный диабет</span>
										</label>
										<label className="selfcheckin-checkbox-label">
											<input
												type="checkbox"
												checked={somaticData.pregnancy.isPregnantOrLactating}
												onChange={(e) =>
													setSomaticData({
														...somaticData,
														pregnancy: {
															...somaticData.pregnancy,
															isPregnantOrLactating: e.target.checked,
														},
													})
												}
											/>
											<span>Беременность / Лактация</span>
										</label>
									</div>
								</div>
							</div>

							<button
								type="button"
								className="selfcheckin-btn-primary selfcheckin-btn-submit"
								onClick={handleCompleteCheckin}
								disabled={isSubmitting}
							>
								{isSubmitting
									? "Сохранение..."
									: "Завершить самочекин и передать врачу"}
							</button>
						</div>
					)}

					{/* STEP 4: Completed Pass */}
					{step === "completed" && (
						<div className="selfcheckin-step-box selfcheckin-completed-box">
							<div className="selfcheckin-success-badge">🎉</div>
							<h3 className="selfcheckin-completed-title">
								Самочекин успешно завершен!
							</h3>
							<p className="selfcheckin-completed-desc">
								Все согласия подписаны, анкета здоровья передана в электронную
								карту доктора <strong>{doctorName}</strong>.
							</p>

							<div className="selfcheckin-pass-card">
								<div className="selfcheckin-pass-patient">{patientName}</div>
								<div className="selfcheckin-pass-time">Прием: {appointmentTime}</div>
								<div className="selfcheckin-pass-qr">
									<div className="selfcheckin-qr-mock">
										<span className="selfcheckin-qr-icon">📱</span>
										<span>Электронный талон чекина: #CK-2026-904</span>
									</div>
								</div>
								<div className="selfcheckin-pass-status">
									✓ Врач уведомлен о вашем прибытии в клинику
								</div>
							</div>

							<button
								type="button"
								className="selfcheckin-btn-primary"
								onClick={onClose}
							>
								Закрыть
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
