import { generateQrCodeSvg } from "@dental/shared";
import { X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	createPhysiologicalNormSomaticQuestionnaire,
	evaluateSomaticRisks,
	INITIAL_SOMATIC_QUESTIONNAIRE,
	type SomaticQuestionnaireData,
} from "./SomaticQuestionnaireEngine";
import "./selfCheckin.css";
import { AuthArtBackground } from "../../auth/AuthArtBackground";
import {
	type StatutoryConsentItem,
	DEFAULT_CONSENTS,
	SelfCheckinConsentsSection,
} from "./SelfCheckinConsentsSection";
import { SelfCheckinPhoneAuthSection } from "./SelfCheckinPhoneAuthSection";
import { SelfCheckinSomaticSection } from "./SelfCheckinSomaticSection";
import { SelfCheckinTicketSection } from "./SelfCheckinTicketSection";

export * from "./SelfCheckinConsentsSection";
export * from "./SelfCheckinPhoneAuthSection";
export * from "./SelfCheckinSomaticSection";
export * from "./SelfCheckinTicketSection";

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

export type CheckinStep = "phone_auth" | "consents" | "somatic" | "completed";

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
		const docShort = doctorName?.includes("(")
			? (doctorName.split("(")[0]?.trim() || doctorName)
			: (doctorName || "");
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

	// 1-Touch Checkin State: последние 4 цифры номера телефона
	const defaultLast4 = useMemo(() => {
		const digits = (initialPhone || "").replace(/\D/g, "");
		return digits.slice(-4) || "4199";
	}, [initialPhone]);
	const [phoneDigits, setPhoneDigits] = useState(defaultLast4);
	const [showOptionalDocs, setShowOptionalDocs] = useState(false);

	if (!isOpen) return null;

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
					: (prev.coagulation.details || ""),
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

	const allConsentsSigned = consents.every((c) => c.isSigned);

	return (
		<div className="selfcheckin-modal-backdrop" onClick={onClose}>
			<AuthArtBackground overlayAlpha={0.35} />
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
						<X size={20} />
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
						<SelfCheckinPhoneAuthSection
							patientName={patientName}
							appointmentTime={appointmentTime}
							doctorName={doctorName}
							phoneDigits={phoneDigits}
							setPhoneDigits={setPhoneDigits}
							showOptionalDocs={showOptionalDocs}
							setShowOptionalDocs={setShowOptionalDocs}
							authError={authError}
							setAuthError={setAuthError}
							isSubmitting={isSubmitting}
							onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
							onOneTouchCheckin={handleOneTouchCheckin}
							onGoToConsents={() => setStep("consents")}
							onGoToSomatic={() => setStep("somatic")}
						/>
					)}

					{/* STEP 2: Statutory Consents with Vector Touch Signature */}
					{step === "consents" && (
						<SelfCheckinConsentsSection
							consents={consents}
							activeConsentIndex={activeConsentIndex}
							onSelectConsentIndex={(idx) => {
								setActiveConsentIndex(idx);
								setConsentNotice(null);
							}}
							onSignAllConsentsWithPep={handleSignAllConsentsWithPep}
							onSignCurrentConsent={handleSignCurrentConsent}
							onSignCurrentConsentWithPaper={handleSignCurrentConsentWithPaper}
							consentNotice={consentNotice}
							allConsentsSigned={allConsentsSigned}
							onProceedToSomatic={() => setStep("somatic")}
						/>
					)}

					{/* STEP 3: Somatic Health Questionnaire */}
					{step === "somatic" && (
						<SelfCheckinSomaticSection
							somaticData={somaticData}
							setSomaticData={setSomaticData}
							isNormApplied={isNormApplied}
							quickAllergies={quickAllergies}
							onToggleQuickAllergy={handleToggleQuickAllergy}
							onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
							onApplyPhysiologicalNormAndFinish={handleApplyPhysiologicalNormAndFinish}
							onCompleteCheckin={handleCompleteCheckin}
							allergyDetails={allergyDetails}
							setAllergyDetails={setAllergyDetails}
							cardioDetails={cardioDetails}
							setCardioDetails={setCardioDetails}
							coagulationDetails={coagulationDetails}
							setCoagulationDetails={setCoagulationDetails}
							riskEvaluation={riskEvaluation}
							isSubmitting={isSubmitting}
						/>
					)}

					{/* STEP 4: Completed Pass & Queue Ticket */}
					{step === "completed" && (
						<SelfCheckinTicketSection
							displayQueueTicket={displayQueueTicket}
							patientName={patientName}
							appointmentTime={appointmentTime}
							doctorWaitMessage={doctorWaitMessage}
							checkinQrSvg={checkinQrSvg}
							checkinCode={checkinCode}
							onClose={onClose}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
