import { generateQrCodeSvg } from "@dental/shared";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Droplets,
	HeartPulse,
	ShieldAlert,
	ShieldCheck,
	Ticket,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	createPhysiologicalNormSomaticQuestionnaire,
	evaluateSomaticRisks,
	INITIAL_SOMATIC_QUESTIONNAIRE,
	PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE,
	type SomaticQuestionnaireData,
	type SomaticRiskAlert,
} from "./SomaticQuestionnaireEngine";
import "./selfCheckin.css";

export interface MobileSelfCheckinModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	initialPhone?: string;
	patientName?: string;
	clinicName?: string;
	doctorName?: string;
	appointmentTime?: string;
	cabinetName?: string;
	queueTicket?: string;
	initialStep?: CheckinStep;
	onCheckinSuccess?: (result: {
		patientId: string;
		signedConsents: string[];
		somaticProfile: ReturnType<typeof evaluateSomaticRisks>;
		queueTicket?: string;
		visitStatus?: string;
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
	patientId = "",
	initialPhone = "+7 (913) 770-41-99",
	patientName = "Смирнова Анна Викторовна",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	doctorName = "Д-р Воронова Е. С. (Терапевт-микроскопист)",
	appointmentTime = "Сегодня в 14:30 (Кабинет 3)",
	cabinetName,
	queueTicket = "Талон № А-07",
	initialStep = "phone_auth",
	onCheckinSuccess,
}) => {
	const [step, setStep] = useState<CheckinStep>(initialStep);
	const [phone, setPhone] = useState(initialPhone);
	const [otpCode, setOtpCode] = useState("");
	const [isOtpSent, setIsOtpSent] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Consents State
	const [consents, setConsents] =
		useState<StatutoryConsentItem[]>(DEFAULT_CONSENTS);
	const [activeConsentIndex, setActiveConsentIndex] = useState(0);

	// Somatic Questionnaire State
	const [somaticData, setSomaticData] = useState<SomaticQuestionnaireData>(
		INITIAL_SOMATIC_QUESTIONNAIRE,
	);
	const [isNormApplied, setIsNormApplied] = useState(false);
	const [allergyDetails, setAllergyDetails] = useState("");
	const [cardioDetails, setCardioDetails] = useState("");
	const [coagulationDetails, setCoagulationDetails] = useState("");
	const [consentNotice, setConsentNotice] = useState<string | null>(null);

	// Specific dental allergy flags (penicillin, lidocaine, aspirin, sulfites)
	const [quickAllergies, setQuickAllergies] = useState({
		lidocaine: false,
		penicillin: false,
		aspirin: false,
		sulfites: false,
	});

	const displayQueueTicket = useMemo(() => {
		return queueTicket || "Талон № А-07";
	}, [queueTicket]);

	const doctorWaitMessage = useMemo(() => {
		const docShort = doctorName.includes("(")
			? doctorName.split("(")[0].trim()
			: doctorName;
		const effectiveDoctor = docShort || "Д-р Смирнова";
		const cabMatch = appointmentTime.match(/Кабинет\s*(\d+)/i);
		const cabNum = cabinetName || (cabMatch ? cabMatch[1] : "3");
		const floorInfo = appointmentTime.includes("этаж") ? "" : " (2 этаж)";
		return `${effectiveDoctor} ожидает вас в кабинете №${cabNum}${floorInfo}`;
	}, [doctorName, appointmentTime, cabinetName]);

	const checkinCode = useMemo(() => {
		const raw = `${patientName || "PATIENT"}-${appointmentTime || "TIME"}`;
		let hash = 0;
		for (let i = 0; i < raw.length; i++) {
			hash = (hash * 31 + raw.charCodeAt(i)) & 0x7fffffff;
		}
		const suffix = ((hash % 9000) + 1000).toString();
		return `CK-${new Date().getFullYear()}-${suffix}`;
	}, [patientName, appointmentTime]);

	const checkinQrSvg = useMemo(() => {
		const verifyUrl = `https://dente.clinic/checkin/verify?ticket=${encodeURIComponent(checkinCode)}`;
		return generateQrCodeSvg(verifyUrl, {
			size: 84,
			margin: 1,
			title: `Талон чекина ${checkinCode}`,
		});
	}, [checkinCode]);

	// 1-Touch Checkin State: последние 4 цифры телефона или быстрый клик
	const defaultLast4 = useMemo(() => {
		const digits = (initialPhone || "").replace(/\D/g, "");
		return digits.slice(-4) || "4199";
	}, [initialPhone]);
	const [phoneDigits, setPhoneDigits] = useState(defaultLast4);
	const [showOptionalDocs, setShowOptionalDocs] = useState(false);

	if (!isOpen) return null;

	// OTP Request
	const handleSendOtp = () => {
		if (!phone || phone.length < 10) {
			setAuthError("Пожалуйста, введите корректный номер мобильного телефона.");
			return;
		}
		setAuthError(null);
		setIsSubmitting(false);
		setIsOtpSent(true);
	};

	// OTP Verify
	const handleVerifyOtp = () => {
		if (otpCode.length < 4) {
			setAuthError("Введите 4-значный код подтверждения из SMS.");
			return;
		}
		setAuthError(null);
		setIsSubmitting(false);
		setStep("consents");
	};

	// Consent Signature Confirm (1-Click Simple Electronic Signature PEP 63-ФЗ)
	const handleSignCurrentConsent = () => {
		const updated = [...consents];
		const current = updated[activeConsentIndex];
		if (current) {
			current.isSigned = true;
			current.signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ПЭП (63-ФЗ)</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Код SMS / Киоск • ${phoneDigits ? `***-**-${phoneDigits}` : "+7 (***) ***-**-**"}</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${new Date().toLocaleString("ru-RU")}</text></svg>`;
			current.signedAtIso = new Date().toISOString();
		}
		setConsents(updated);
		setConsentNotice(null);

		// Move to next consent or proceed to somatic step
		if (activeConsentIndex < consents.length - 1) {
			setActiveConsentIndex(activeConsentIndex + 1);
		} else {
			setStep("somatic");
		}
	};

	// Physical Paper Registration on Reception Desk (ст. 20 323-ФЗ)
	const handleSignCurrentConsentWithPaper = () => {
		const updated = [...consents];
		const current = updated[activeConsentIndex];
		if (current) {
			current.isSigned = true;
			current.signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">НА БУМАГЕ (СТОЙКА РЕГИСТРАЦИИ)</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">Подшито в карту 043/у • ст. 20 323-ФЗ</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${new Date().toLocaleString("ru-RU")}</text></svg>`;
			current.signedAtIso = new Date().toISOString();
		}
		setConsents(updated);
		setConsentNotice(null);

		if (activeConsentIndex < consents.length - 1) {
			setActiveConsentIndex(activeConsentIndex + 1);
		} else {
			setStep("somatic");
		}
	};

	// 1-Click Simple Electronic Signature (PEP 63-ФЗ) for ALL statutory consents
	const handleSignAllConsentsWithPep = () => {
		const now = new Date();
		const nowIso = now.toISOString();
		const dtStr = now.toLocaleString("ru-RU");
		const signed = consents.map((c) => ({
			...c,
			isSigned: true,
			signatureSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ПЭП (63-ФЗ)</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Код SMS / Киоск • ${phoneDigits ? `***-**-${phoneDigits}` : "+7 (***) ***-**-**"}</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${dtStr}</text></svg>`,
			signedAtIso: nowIso,
		}));
		setConsents(signed);
		setConsentNotice(null);
		setStep("somatic");
	};

	// 1-Click Physiological Norm Application (Mandate 8e)
	const handleApplyPhysiologicalNorm = () => {
		setSomaticData(createPhysiologicalNormSomaticQuestionnaire());
		setAllergyDetails("");
		setCardioDetails("");
		setCoagulationDetails("");
		setQuickAllergies({
			lidocaine: false,
			penicillin: false,
			aspirin: false,
			sulfites: false,
		});
		setIsNormApplied(true);
	};

	// Patient customizes only real dental allergies (penicillin, lidocaine, aspirin, sulfites)
	const handleToggleQuickAllergy = (
		key: "lidocaine" | "penicillin" | "aspirin" | "sulfites",
	) => {
		const nextVal = !quickAllergies[key];
		const updatedQuick = { ...quickAllergies, [key]: nextVal };
		setQuickAllergies(updatedQuick);

		const hasAnyAllergy =
			updatedQuick.lidocaine ||
			updatedQuick.penicillin ||
			updatedQuick.aspirin ||
			updatedQuick.sulfites;

		const allergyNames: string[] = [];
		if (updatedQuick.penicillin) allergyNames.push("Пенициллин / Антибиотики");
		if (updatedQuick.lidocaine) allergyNames.push("Лидокаин / Анестетики");
		if (updatedQuick.aspirin) allergyNames.push("Аспирин / НПВС");
		if (updatedQuick.sulfites) allergyNames.push("Сульфиты / Консерванты");

		const newDetails = allergyNames.join(", ");
		setAllergyDetails(newDetails);

		setSomaticData((prev) => ({
			...prev,
			allergies: {
				...prev.allergies,
				hasAllergies: hasAnyAllergy,
				localAnestheticsAllergy: updatedQuick.lidocaine,
				antibioticsAllergy: updatedQuick.penicillin,
				sulfiteAllergy: updatedQuick.sulfites,
				details: newDetails,
			},
			coagulation: {
				...prev.coagulation,
				hasBleedingDisorder: updatedQuick.aspirin
					? true
					: prev.coagulation.hasBleedingDisorder,
				details: updatedQuick.aspirin
					? prev.coagulation.details
						? prev.coagulation.details
						: "Аспирин / НПВС (риск кровотечений)"
					: prev.coagulation.details,
			},
		}));
	};

	// 1-Click Physiological Norm & Instant 5-Second Completion
	const handleApplyPhysiologicalNormAndFinish = () => {
		const normData = createPhysiologicalNormSomaticQuestionnaire();
		setSomaticData(normData);
		setAllergyDetails("");
		setCardioDetails("");
		setCoagulationDetails("");
		setQuickAllergies({
			lidocaine: false,
			penicillin: false,
			aspirin: false,
			sulfites: false,
		});
		setIsNormApplied(true);

		const evaluatedNorm = evaluateSomaticRisks(normData);
		setIsSubmitting(false);
		setStep("completed");
		onCheckinSuccess?.({
			patientId: patientId || "",
			signedConsents: consents.filter((c) => c.isSigned).map((c) => c.id),
			somaticProfile: evaluatedNorm,
			queueTicket: displayQueueTicket,
			visitStatus: "В холле / Ожидает приёма",
		});
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
		setIsSubmitting(false);
		setStep("completed");
		onCheckinSuccess?.({
			patientId: patientId || "",
			signedConsents: consents.filter((c) => c.isSigned).map((c) => c.id),
			somaticProfile: riskEvaluation,
			queueTicket: displayQueueTicket,
			visitStatus: "В холле / Ожидает приёма",
		});
	};

	const handleOneTouchCheckin = () => {
		setAuthError(null);
		setIsSubmitting(false);
		const signed = consents.map((c) => ({
			...c,
			isSigned: true,
			signedAtIso: new Date().toISOString(),
		}));
		setConsents(signed);
		setStep("completed");
		onCheckinSuccess?.({
			patientId: patientId || "",
			signedConsents: signed.map((c) => c.id),
			somaticProfile: riskEvaluation,
			queueTicket: displayQueueTicket,
			visitStatus: "В холле / Ожидает приёма",
		});
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
						1. Экспресс-чекин
					</div>
					<div
						className={`selfcheckin-step-pill ${
							step === "completed" ? "active" : ""
						}`}
					>
						2. Талон на приём
					</div>
				</div>

				{/* Body Content by Step */}
				<div className="selfcheckin-content">
					{/* STEP 1: Phone 1-Touch Auth & Instant Checkin */}
					{step === "phone_auth" && (
						<div className="selfcheckin-step-box">
							<div className="selfcheckin-welcome-card">
								<span className="selfcheckin-welcome-icon">
									<CheckCircle2 size={28} className="text-teal-600" />
								</span>
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

							<div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 my-3 space-y-3">
								<button
									type="button"
									className="selfcheckin-btn-kiosk-express w-full py-3.5 px-4 text-base font-bold flex items-center justify-center gap-3 cursor-pointer"
									onClick={() => {
										handleApplyPhysiologicalNorm();
										handleOneTouchCheckin();
									}}
									disabled={isSubmitting}
									data-testid="kiosk-express-norm-btn"
									title="Мгновенный самочекин для киоска: физиологическая норма + получение талона очереди в 1 касание"
								>
									<CheckCircle2 size={24} className="selfcheckin-kiosk-check-icon shrink-0" />
									<div className="selfcheckin-kiosk-text-col text-left">
										<span className="selfcheckin-kiosk-title block font-extrabold text-base">
											✓ Чувствую себя хорошо / Соматическая норма
										</span>
										<span className="selfcheckin-kiosk-sub block text-xs opacity-90 font-medium">
											Экспресс-чекин в 1 касание и получение талона очереди
										</span>
									</div>
								</button>

								<div className="selfcheckin-divider-or text-center text-xs font-bold text-slate-400 uppercase tracking-widest my-1">
									или подтверждение по номеру телефона
								</div>

								<label className="selfcheckin-label font-bold text-sm block">
									Последние 4 цифры номера телефона для подтверждения:
								</label>
								<input
									type="text"
									className="selfcheckin-input text-center text-xl font-mono font-black tracking-widest"
									value={phoneDigits}
									onChange={(e) =>
										setPhoneDigits(
											e.target.value.replace(/\D/g, "").slice(0, 4),
										)
									}
									placeholder="••••"
									maxLength={4}
									data-testid="one-touch-phone-input"
									autoFocus
								/>
								<button
									type="button"
									className="selfcheckin-btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2"
									onClick={() => {
										if (phoneDigits.length < 4) {
											setAuthError(
												"Пожалуйста, введите 4 последние цифры номера мобильного телефона.",
											);
											return;
										}
										handleOneTouchCheckin();
									}}
									disabled={isSubmitting}
									title={
										isSubmitting
											? "Регистрация прибытия в клинику..."
											: phoneDigits.length < 4
												? "Введите 4 последние цифры номера телефона для подтверждения прибытия"
												: "Подтвердить прибытие в клинику и получить талон"
									}
									data-testid="one-touch-checkin-btn"
								>
									<CheckCircle2 size={20} />
									<span>
										{isSubmitting
											? "Регистрация прибытия..."
											: "Я в клинике — Получить талон"}
									</span>
								</button>
								<button
									type="button"
									className="w-full py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
									onClick={handleOneTouchCheckin}
									disabled={isSubmitting}
									title={
										isSubmitting
											? "Регистрация прибытия..."
											: "Быстрый чекин по персональному QR-коду"
									}
									data-testid="qr-checkin-btn"
								>
									<Ticket size={16} />
									<span>Быстрый чекин по QR-коду из приглашения</span>
								</button>
							</div>

							<div className="mt-3">
								<button
									type="button"
									className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline text-center w-full"
									onClick={() => setShowOptionalDocs(!showOptionalDocs)}
								>
									{showOptionalDocs
										? "Скрыть нормативные документы"
										: "Нормативные документы (ИДС 323-ФЗ, 152-ФЗ) и анкета (по желанию)"}
								</button>

								{showOptionalDocs && (
									<div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs space-y-2 text-slate-600 dark:text-slate-300">
										<p>
											При чекине в 1 касание согласие на медицинское
											вмешательство (323-ФЗ) и обработку данных (152-ФЗ)
											подтверждается простой электронной подписью по номеру
											телефона (ПЭП 63-ФЗ).
										</p>
										<div className="flex flex-wrap gap-2 pt-1">
											<button
												type="button"
												className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
												onClick={() => setStep("consents")}
												title="Открыть бланки согласий для персональной росписи"
											>
												Открыть бланк подписи вручную
											</button>
											<span>·</span>
											<button
												type="button"
												className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
												onClick={() => setStep("somatic")}
												title="Открыть анкету здоровья для заполнения"
											>
												Заполнить соматическую анкету
											</button>
											<span>·</span>
											<button
												type="button"
												className="text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer flex items-center gap-1"
												onClick={() => {
													handleApplyPhysiologicalNorm();
													setStep("somatic");
												}}
												title="Открыть анкету здоровья с предзаполненной физиологической нормой (хронических патологий нет)"
											>
												<Zap size={13} />
												<span>Норма по умолчанию</span>
											</button>
										</div>
									</div>
								)}
							</div>

							{authError && (
								<div className="selfcheckin-error-alert">{authError}</div>
							)}
						</div>
					)}

					{/* STEP 2: Statutory Consents with Vector Touch Signature */}
					{step === "consents" && currentConsent && (
						<div className="selfcheckin-step-box">
							<div className="selfcheckin-consents-quick-bar">
								<button
									type="button"
									className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
									onClick={handleSignAllConsentsWithPep}
									disabled={isSubmitting}
									title={
										isSubmitting
											? "Регистрация подписей..."
											: "Подписать все 3 согласия (ИДС и ПДН) простой электронной подписью 63-ФЗ в 1 клик"
									}
									data-testid="sign-all-consents-pep-btn"
								>
									<ShieldCheck size={16} />
									<span>Подписать все согласия ПЭП (63-ФЗ) в 1 клик</span>
								</button>
							</div>

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
											setConsentNotice(null);
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
										{currentConsent.categoryRu} •{" "}
										{currentConsent.statutoryBasis}
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
											✓ Документ подтвержден и подписан
										</div>
										<div className="selfcheckin-signed-meta">
											Время:{" "}
											{currentConsent.signedAtIso
												?.slice(0, 19)
												.replace("T", " ")}{" "}
											UTC
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
										<div className="selfcheckin-legal-pep-badge">
											<ShieldCheck size={16} />
											<span>
												Простая электронная подпись (ПЭП по 63-ФЗ, ст. 20 323-ФЗ)
											</span>
										</div>
										<div className="flex flex-col gap-2 mt-3">
											<button
												type="button"
												className="selfcheckin-btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
												onClick={handleSignCurrentConsent}
												disabled={isSubmitting}
												data-testid="consent-sign-pep-single-btn"
											>
												<ShieldCheck size={18} />
												<span>Подтвердить согласие ПЭП (1 клик)</span>
											</button>
											<button
												type="button"
												className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
												onClick={handleSignCurrentConsentWithPaper}
												disabled={isSubmitting}
												data-testid="consent-sign-paper-desk-btn"
											>
												<span>Оформить на бумаге на стойке регистрации</span>
											</button>
										</div>
										{consentNotice && (
											<div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium">
												{consentNotice}
											</div>
										)}
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
							{/* 1-Click Physiological Norm Banner (Mandate 8e) */}
							<div
								className="selfcheckin-norm-quick-banner"
								data-testid="somatic-norm-banner"
							>
								{/* Prominent Dominant Green Button per Mandate 8e #3 */}
								<button
									type="button"
									className="selfcheckin-btn-norm-dominant"
									onClick={handleApplyPhysiologicalNorm}
									data-testid="somatic-norm-dominant-btn"
									title="Заполнить весь опросник (давление, аллергии, соматика) физиологической нормой в 1 клик"
								>
									<CheckCircle2 size={26} className="selfcheckin-dominant-check-icon shrink-0" />
									<div className="selfcheckin-dominant-text-col text-left">
										<span className="selfcheckin-dominant-title block font-extrabold text-base sm:text-lg">
											✓ Чувствую себя хорошо / Соматическая норма
										</span>
										<span className="selfcheckin-dominant-sub block text-xs sm:text-sm font-normal opacity-95">
											Давление в норме, хронических патологий нет • Правьте только аллергии ниже
										</span>
									</div>
								</button>

								<div className="selfcheckin-norm-actions-row flex items-center gap-2 flex-wrap pt-1">
									<button
										type="button"
										className="selfcheckin-btn-norm-quick"
										onClick={handleApplyPhysiologicalNorm}
										data-testid="somatic-norm-1click-btn"
										title="Заполнить анкету физиологической нормой: хронических заболеваний, аллергий и патологий нет"
									>
										<Zap size={16} />
										<span>Применить норму</span>
									</button>
									<button
										type="button"
										className="selfcheckin-btn-norm-finish"
										onClick={handleApplyPhysiologicalNormAndFinish}
										disabled={isSubmitting}
										data-testid="somatic-norm-instant-finish-btn"
										title="Заполнить нормой и сразу завершить чекин за 5 секунд"
									>
										<CheckCircle2 size={16} />
										<span>Завершить за 5 сек ➔</span>
									</button>
									{isNormApplied && (
										<span
											className="selfcheckin-norm-applied-badge ml-auto"
											data-testid="norm-active-pill"
										>
											✓ Норма активна
										</span>
									)}
								</div>
							</div>

							<div className="selfcheckin-somatic-intro">
								Пожалуйста, отметьте выявленные особенности здоровья (если
								имеются) для безопасного подбора анестезии и клинических
								протоколов:
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
											<div className="selfcheckin-alert-title flex items-center gap-1.5">
												{alert.severity === "danger" ? (
													<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0 inline-block" aria-hidden="true" />
												) : (
													<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 inline-block" aria-hidden="true" />
												)}
												<span>{alert.title}</span>
											</div>
											<div className="selfcheckin-alert-msg">
												{alert.message}
											</div>
											<div className="selfcheckin-alert-action">
												<strong>Рекомендация:</strong> {alert.recommendedAction}
											</div>
										</div>
									))}
								</div>
							)}

							<div className="selfcheckin-questions-grid">
								{/* Allergies Card */}
								<div className="selfcheckin-question-card" data-testid="allergies-card">
									<div className="selfcheckin-card-title">
										<AlertCircle
											size={16}
											color="#d97706"
											style={{
												display: "inline-block",
												verticalAlign: "middle",
												marginRight: "6px",
											}}
										/>
										1. Аллергологический анамнез
									</div>

									{/* Quick Allergy Chips for Penicillin, Lidocaine, Aspirin, Sulfites */}
									<div
										className="selfcheckin-quick-allergies-block"
										data-testid="quick-allergies-block"
									>
										<div className="selfcheckin-quick-allergies-heading font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
											Пациент правит только реальные аллергии (1 касание):
										</div>
										<div className="selfcheckin-quick-allergies-grid">
											<button
												type="button"
												className={`selfcheckin-allergy-chip ${quickAllergies.penicillin ? "active" : ""}`}
												onClick={() => handleToggleQuickAllergy("penicillin")}
												data-testid="allergy-chip-penicillin"
												title="Аллергия на пенициллины, амоксициллин, антибиотики"
											>
												<span className="selfcheckin-chip-icon">
													{quickAllergies.penicillin ? "✕" : "+"}
												</span>
												<span>Пенициллин / Антибиотики</span>
											</button>
											<button
												type="button"
												className={`selfcheckin-allergy-chip ${quickAllergies.lidocaine ? "active" : ""}`}
												onClick={() => handleToggleQuickAllergy("lidocaine")}
												data-testid="allergy-chip-lidocaine"
												title="Непереносимость лидокаина, новокаина, местных анестетиков"
											>
												<span className="selfcheckin-chip-icon">
													{quickAllergies.lidocaine ? "✕" : "+"}
												</span>
												<span>Лидокаин / Анестетики</span>
											</button>
											<button
												type="button"
												className={`selfcheckin-allergy-chip ${quickAllergies.aspirin ? "active" : ""}`}
												onClick={() => handleToggleQuickAllergy("aspirin")}
												data-testid="allergy-chip-aspirin"
												title="Аллергия на аспирин, НПВС, склонность к кровоточивости"
											>
												<span className="selfcheckin-chip-icon">
													{quickAllergies.aspirin ? "✕" : "+"}
												</span>
												<span>Аспирин / НПВС</span>
											</button>
											<button
												type="button"
												className={`selfcheckin-allergy-chip ${quickAllergies.sulfites ? "active" : ""}`}
												onClick={() => handleToggleQuickAllergy("sulfites")}
												data-testid="allergy-chip-sulfites"
												title="Аллергия на сульфиты и консерванты в анестетиках"
											>
												<span className="selfcheckin-chip-icon">
													{quickAllergies.sulfites ? "✕" : "+"}
												</span>
												<span>Сульфиты / Консерванты</span>
											</button>
										</div>
									</div>

									<label className="selfcheckin-checkbox-label">
										<input
											type="checkbox"
											checked={somaticData.allergies.hasAllergies}
											onChange={(e) => {
												const checked = e.target.checked;
												setSomaticData({
													...somaticData,
													allergies: {
														...somaticData.allergies,
														hasAllergies: checked,
													},
												});
												if (!checked) {
													setQuickAllergies({
														lidocaine: false,
														penicillin: false,
														aspirin: false,
														sulfites: false,
													});
													setAllergyDetails("");
												}
											}}
										/>
										<span>
											Имеются другие аллергические реакции на медикаменты/вещества
										</span>
									</label>

									{somaticData.allergies.hasAllergies && (
										<div className="selfcheckin-suboptions">
											<input
												type="text"
												className="selfcheckin-input selfcheckin-input-sm"
												placeholder="Укажите препараты или симптомы..."
												value={allergyDetails}
												onChange={(e) => setAllergyDetails(e.target.value)}
												data-testid="allergy-details-input"
											/>
										</div>
									)}
								</div>

								{/* Cardio Card */}
								<div className="selfcheckin-question-card">
									<div className="selfcheckin-card-title">
										<HeartPulse
											size={16}
											color="#dc2626"
											style={{
												display: "inline-block",
												verticalAlign: "middle",
												marginRight: "6px",
											}}
										/>
										2. Сердечно-сосудистая система
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
										<Droplets
											size={16}
											color="#991b1b"
											style={{
												display: "inline-block",
												verticalAlign: "middle",
												marginRight: "6px",
											}}
										/>
										3. Свертываемость крови и антикоагулянты
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
										<span>
											Прием кроверазжижающих (Ксарелто, Варфарин, Аспирин)
										</span>
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
										<Activity
											size={16}
											color="#2563eb"
											style={{
												display: "inline-block",
												verticalAlign: "middle",
												marginRight: "6px",
											}}
										/>
										4. Диабет / Беременность
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
								className={`selfcheckin-btn-primary selfcheckin-btn-submit ${isNormApplied ? "selfcheckin-btn-accent" : ""}`}
								onClick={handleCompleteCheckin}
								disabled={isSubmitting}
								title={
									isSubmitting
										? "Сохранение анкеты здоровья..."
										: isNormApplied
											? "Завершить самочекин с физиологической нормой (5 сек)"
											: "Завершить самочекин и передать анкету врачу"
								}
								data-testid="somatic-complete-checkin-btn"
							>
								{isSubmitting
									? "Сохранение..."
									: isNormApplied
										? "Завершить самочекин (Физиологическая норма) за 5 секунд ➔"
										: "Завершить самочекин и передать врачу"}
							</button>
						</div>
					)}

					{/* STEP 4: Completed Pass & Queue Ticket */}
					{step === "completed" && (
						<div className="selfcheckin-step-box selfcheckin-completed-box">
							{/* Green Animated Success Badge */}
							<div
								className="selfcheckin-animated-success-badge"
								data-testid="selfcheckin-animated-success-badge"
							>
								<div className="selfcheckin-success-ring">
									<CheckCircle2 size={48} className="selfcheckin-success-check-icon" />
								</div>
							</div>

							<h3 className="selfcheckin-completed-title">
								Самочекин успешно завершен!
							</h3>
							<p className="selfcheckin-completed-desc">
								Все согласия подтверждены, данные переданы лечащему врачу
							</p>

							{/* Queue Ticket Card */}
							<div className="selfcheckin-ticket-card" data-testid="queue-ticket-card">
								<div className="selfcheckin-ticket-header">
									<Ticket size={20} className="selfcheckin-ticket-icon shrink-0" />
									<span className="selfcheckin-ticket-header-label">
										Электронная очередь клиники
									</span>
								</div>

								{/* Prominent Large Queue Ticket Number */}
								<div
									className="selfcheckin-ticket-number-display"
									data-testid="queue-ticket-number"
								>
									{displayQueueTicket}
								</div>

								<div className="selfcheckin-ticket-divider" />

								<div className="selfcheckin-ticket-details w-full space-y-2">
									<div className="selfcheckin-ticket-patient-name text-center font-bold text-base text-slate-900 dark:text-slate-100">
										{patientName}
									</div>
									<div className="selfcheckin-ticket-time text-center text-xs text-slate-500 dark:text-slate-400">
										Время записи: {appointmentTime}
									</div>

									{/* Doctor & Cabinet Waiting Status */}
									<div
										className="selfcheckin-ticket-doctor-status"
										data-testid="doctor-wait-status"
									>
										<HeartPulse size={20} className="selfcheckin-ticket-doc-icon text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="selfcheckin-ticket-doc-text font-bold text-sm sm:text-base">
											{doctorWaitMessage}
										</span>
									</div>
								</div>

								{/* Reception & Assistant Schedule Notification Alert */}
								<div
									className="selfcheckin-reception-alert-badge"
									data-testid="reception-alert-badge"
								>
									<div className="selfcheckin-reception-alert-title flex items-center gap-2 font-bold text-xs sm:text-sm text-teal-800 dark:text-teal-200">
										<span className="selfcheckin-status-dot-pulse" />
										<span>
											Статус визита: <strong>В холле / Ожидает приёма</strong>
										</span>
									</div>
									<div className="selfcheckin-reception-alert-sub text-xs text-teal-700 dark:text-teal-300 mt-1">
										Оповещение передано на стойку регистрации и ассистенту в кабинет врача
									</div>
								</div>

								{/* QR Code Verification for Turnstile / Reception Desk */}
								<div className="selfcheckin-ticket-qr-section flex flex-col items-center gap-1 pt-2">
									<div
										className="selfcheckin-ticket-qr-svg"
										dangerouslySetInnerHTML={{ __html: checkinQrSvg }}
									/>
									<div className="selfcheckin-ticket-qr-caption text-xs font-semibold text-slate-500 dark:text-slate-400">
										Код талона: #{checkinCode}
									</div>
								</div>
							</div>

							<button
								type="button"
								className="selfcheckin-btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
								onClick={onClose}
								data-testid="selfcheckin-final-close-btn"
							>
								<span>Готово / Закрыть талон</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
