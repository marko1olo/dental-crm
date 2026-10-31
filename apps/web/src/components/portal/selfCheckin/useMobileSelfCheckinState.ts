/**
 * useMobileSelfCheckinState.ts
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Dedicated State Machine Hook for Mobile Self-Checkin Flow:
 * - Handles steps: phone_auth -> consents -> somatic -> completed
 * - Manages statutory consents, digital signatures & physiological norm
 * - Handles backend synchronization (/api/portal/self-checkin)
 * - Zero blocking alerts, Mandate 8e physiological norm compliance
 */

import { useMemo, useState } from "react";
import { generateQrCodeSvg } from "@dental/shared";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	type StatutoryConsentItem,
	DEFAULT_CONSENTS,
} from "./SelfCheckinConsentsSection";
import {
	createPhysiologicalNormSomaticQuestionnaire,
	evaluateSomaticRisks,
	INITIAL_SOMATIC_QUESTIONNAIRE,
	type SomaticQuestionnaireData,
} from "./SomaticQuestionnaireEngine";

export type CheckinStep = "phone_auth" | "consents" | "somatic" | "completed";

export interface UseMobileSelfCheckinStateProps {
	readonly patientId?: string | undefined;
	readonly initialPhone?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly appointmentTime?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly queueTicket?: string | undefined;
	readonly initialStep?: CheckinStep | undefined;
	readonly onCheckinSuccess?: ((result: {
		patientId: string;
		signedConsents: string[];
		somaticProfile: ReturnType<typeof evaluateSomaticRisks>;
		queueTicket?: string | undefined;
		visitStatus?: string | undefined;
	}) => void) | undefined;
}

export function useMobileSelfCheckinState(props: UseMobileSelfCheckinStateProps) {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(props.patientId || "");

	const [serverPatientName, setServerPatientName] = useState<string | null>(null);
	const [serverDoctorName, setServerDoctorName] = useState<string | null>(null);
	const [serverAppointmentTime, setServerAppointmentTime] = useState<string | null>(null);
	const [serverCabinetName, setServerCabinetName] = useState<string | null>(null);
	const [serverQueueTicket, setServerQueueTicket] = useState<string | null>(null);

	const effectivePhone =
		props.initialPhone !== undefined
			? props.initialPhone
			: isDemo
				? "+7 (913) 770-41-99"
				: "";
	const effectivePatientName =
		serverPatientName ||
		(props.patientName !== undefined
			? props.patientName
			: isDemo
				? "Смирнова Анна Викторовна"
				: "");
	const effectiveDoctorName =
		serverDoctorName ||
		(props.doctorName !== undefined
			? props.doctorName
			: isDemo
				? "Д-р Воронова Е. С. (Терапевт-микроскопист)"
				: "");
	const effectiveAppointmentTime =
		serverAppointmentTime ||
		(props.appointmentTime !== undefined
			? props.appointmentTime
			: isDemo
				? "Сегодня в 14:30 (Кабинет 3)"
				: "");
	const effectiveQueueTicket =
		serverQueueTicket ||
		(props.queueTicket !== undefined
			? props.queueTicket
			: isDemo
				? "Талон № А-07"
				: "");

	const [step, setStep] = useState<CheckinStep>(props.initialStep || "phone_auth");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Consents State
	const [consents, setConsents] = useState<StatutoryConsentItem[]>(DEFAULT_CONSENTS);
	const [activeConsentIndex, setActiveConsentIndex] = useState(0);
	const [consentNotice, setConsentNotice] = useState<string | null>(null);

	// Somatic State
	const [somaticData, setSomaticData] = useState<SomaticQuestionnaireData>(INITIAL_SOMATIC_QUESTIONNAIRE);
	const [isNormApplied, setIsNormApplied] = useState(false);
	const [allergyDetails, setAllergyDetails] = useState("");
	const [cardioDetails, setCardioDetails] = useState("");
	const [coagulationDetails, setCoagulationDetails] = useState("");
	const [quickAllergies, setQuickAllergies] = useState({
		lidocaine: false,
		penicillin: false,
		aspirin: false,
		sulfites: false,
	});

	// Phone digits
	const defaultLast4 = useMemo(() => {
		const digits = (effectivePhone || "").replace(/\D/g, "");
		return digits.slice(-4) || (isDemo ? "4199" : "");
	}, [effectivePhone, isDemo]);
	const [phoneDigits, setPhoneDigits] = useState(defaultLast4);
	const [showOptionalDocs, setShowOptionalDocs] = useState(false);

	const displayQueueTicket = useMemo(() => {
		return effectiveQueueTicket || (isDemo ? "Талон № А-07" : "Талон терминала");
	}, [effectiveQueueTicket, isDemo]);

	const doctorWaitMessage = useMemo(() => {
		const docShort = effectiveDoctorName?.includes("(")
			? (effectiveDoctorName.split("(")[0]?.trim() || effectiveDoctorName)
			: (effectiveDoctorName || "");
		const effectiveDoctor = docShort || (isDemo ? "Д-р Смирнова" : "Лечащий врач");
		const cabMatch = effectiveAppointmentTime.match(/Кабинет\s*(\d+)/i);
		const cabNum = props.cabinetName || serverCabinetName || (cabMatch ? cabMatch[1] : "");
		const floorInfo = effectiveAppointmentTime.includes("этаж") ? "" : (cabNum ? " (2 этаж)" : "");
		const cabInfo = cabNum ? ` в кабинете №${cabNum}${floorInfo}` : "";
		return `${effectiveDoctor} ожидает вас${cabInfo}`;
	}, [effectiveDoctorName, effectiveAppointmentTime, props.cabinetName, serverCabinetName, isDemo]);

	const checkinCode = useMemo(() => {
		const raw = `${effectivePatientName || "PATIENT"}-${effectiveAppointmentTime || "TIME"}`;
		let hash = 0;
		for (let i = 0; i < raw.length; i++) {
			hash = (hash * 31 + raw.charCodeAt(i)) & 0x7fffffff;
		}
		const suffix = ((hash % 9000) + 1000).toString();
		return `CK-${new Date().getFullYear()}-${suffix}`;
	}, [effectivePatientName, effectiveAppointmentTime]);

	const checkinQrSvg = useMemo(() => {
		const verifyUrl = `https://dente.clinic/checkin/verify?ticket=${encodeURIComponent(checkinCode)}`;
		return generateQrCodeSvg(verifyUrl, {
			size: 84,
			margin: 1,
			title: `Талон чекина ${checkinCode}`,
		});
	}, [checkinCode]);

	const riskEvaluation = evaluateSomaticRisks({
		...somaticData,
		allergies: { ...somaticData.allergies, details: allergyDetails },
		cardiovascular: { ...somaticData.cardiovascular, details: cardioDetails },
		coagulation: { ...somaticData.coagulation, details: coagulationDetails },
	});

	const submitCheckinToBackend = async (payload: {
		signed: StatutoryConsentItem[];
		somatic: SomaticQuestionnaireData;
		evaluatedRisks: ReturnType<typeof evaluateSomaticRisks>;
		isEmergency?: boolean;
	}) => {
		setIsSubmitting(true);
		setAuthError(null);
		try {
			const endpoint = payload.isEmergency ? "/api/portal/kiosk/emergency-checkin" : "/api/portal/self-checkin";
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					phoneLast4: phoneDigits,
					patientPhone: props.initialPhone,
					patientId: props.patientId,
					signedConsents: payload.signed.filter((c) => c.isSigned).map((c) => c.id),
					somaticProfile: payload.evaluatedRisks,
					isEmergency: Boolean(payload.isEmergency),
				}),
			});
			if (res.ok) {
				const json = await res.json();
				if (json?.patientName) setServerPatientName(json.patientName);
				if (json?.doctorName) setServerDoctorName(json.doctorName);
				if (json?.appointmentTime) setServerAppointmentTime(json.appointmentTime);
				if (json?.cabinetName) setServerCabinetName(json.cabinetName);
				if (json?.queueTicket) setServerQueueTicket(json.queueTicket);

				setStep("completed");
				props.onCheckinSuccess?.({
					patientId: json?.patientId || props.patientId || "",
					signedConsents: payload.signed.filter((c) => c.isSigned).map((c) => c.id),
					somaticProfile: payload.evaluatedRisks,
					queueTicket: json?.queueTicket || displayQueueTicket,
					visitStatus: json?.visitStatus || (payload.isEmergency ? "⚡ В холле / Ожидает экстренного врача" : "В холле / Ожидает приёма"),
				});
				return;
			}
			const err = await res.json().catch(() => null);
			if (err?.message) setAuthError(err.message);
		} catch {
			// In demo/test mode or offline kiosk, fallback gracefully
		} finally {
			setIsSubmitting(false);
		}

		setStep("completed");
		props.onCheckinSuccess?.({
			patientId: props.patientId || "",
			signedConsents: payload.signed.filter((c) => c.isSigned).map((c) => c.id),
			somaticProfile: payload.evaluatedRisks,
			queueTicket: payload.isEmergency ? "Талон № Э-01" : displayQueueTicket,
			visitStatus: payload.isEmergency ? "⚡ В холле / Ожидает экстренного врача" : "В холле / Ожидает приёма",
		});
	};

	const handleApplyPhysiologicalNorm = () => {
		setSomaticData(createPhysiologicalNormSomaticQuestionnaire());
		setAllergyDetails("");
		setCardioDetails("");
		setCoagulationDetails("");
		setQuickAllergies({ lidocaine: false, penicillin: false, aspirin: false, sulfites: false });
		setIsNormApplied(true);
	};

	const handleOneTouchCheckin = () => {
		setAuthError(null);
		const signed = consents.map((c) => ({ ...c, isSigned: true, signedAtIso: new Date().toISOString() }));
		setConsents(signed);
		void submitCheckinToBackend({ signed, somatic: somaticData, evaluatedRisks: riskEvaluation });
	};

	const handleEmergencyCheckin = () => {
		const normData = createPhysiologicalNormSomaticQuestionnaire();
		const evaluatedNorm = evaluateSomaticRisks(normData);
		void submitCheckinToBackend({ signed: consents, somatic: normData, evaluatedRisks: evaluatedNorm, isEmergency: true });
	};

	const handleApplyPhysiologicalNormAndFinish = () => {
		handleApplyPhysiologicalNorm();
		const normData = createPhysiologicalNormSomaticQuestionnaire();
		const evaluatedNorm = evaluateSomaticRisks(normData);
		void submitCheckinToBackend({ signed: consents, somatic: normData, evaluatedRisks: evaluatedNorm });
	};

	const handleCompleteCheckin = () => {
		void submitCheckinToBackend({ signed: consents, somatic: somaticData, evaluatedRisks: riskEvaluation });
	};

	const handleSignCurrentConsent = (signatureSvgCustom?: string) => {
		const updated = [...consents];
		const current = updated[activeConsentIndex];
		if (current) {
			current.isSigned = true;
			current.signatureSvg =
				signatureSvgCustom ||
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ЭЛЕКТРОННО</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Код SMS / Киоск • ${phoneDigits ? `***-**-${phoneDigits}` : "+7 (***) ***-**-**"}</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${new Date().toLocaleString("ru-RU")}</text></svg>`;
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

	const handleSignCurrentConsentWithPaper = () => {
		const updated = [...consents];
		const current = updated[activeConsentIndex];
		if (current) {
			current.isSigned = true;
			current.signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">НА БУМАГЕ (СТОЙКА РЕГИСТРАЦИИ)</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">Подшито в медицинскую карту пациента</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${new Date().toLocaleString("ru-RU")}</text></svg>`;
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

	const handleSignAllConsentsWithPep = () => {
		const dtStr = new Date().toLocaleString("ru-RU");
		const signed = consents.map((c) => ({
			...c,
			isSigned: true,
			signatureSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ЭЛЕКТРОННО</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Код SMS / Киоск • ${phoneDigits ? `***-**-${phoneDigits}` : "+7 (***) ***-**-**"}</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${dtStr}</text></svg>`,
			signedAtIso: new Date().toISOString(),
		}));
		setConsents(signed);
		setConsentNotice(null);
		setStep("somatic");
	};

	const handleToggleQuickAllergy = (key: "lidocaine" | "penicillin" | "aspirin" | "sulfites") => {
		const nextVal = !quickAllergies[key];
		const updatedQuick = { ...quickAllergies, [key]: nextVal };
		setQuickAllergies(updatedQuick);
		const hasAnyAllergy = updatedQuick.lidocaine || updatedQuick.penicillin || updatedQuick.aspirin || updatedQuick.sulfites;
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
				hasBleedingDisorder: updatedQuick.aspirin ? true : prev.coagulation.hasBleedingDisorder,
				details: updatedQuick.aspirin ? (prev.coagulation.details || "Аспирин / НПВС (риск кровотечений)") : (prev.coagulation.details || ""),
			},
		}));
	};

	return {
		step,
		setStep,
		isSubmitting,
		authError,
		setAuthError,
		effectivePatientName,
		effectiveDoctorName,
		effectiveAppointmentTime,
		displayQueueTicket,
		doctorWaitMessage,
		checkinCode,
		checkinQrSvg,
		phoneDigits,
		setPhoneDigits,
		showOptionalDocs,
		setShowOptionalDocs,
		consents,
		activeConsentIndex,
		setActiveConsentIndex,
		consentNotice,
		setConsentNotice,
		allConsentsSigned: consents.every((c) => c.isSigned),
		effectivePhone,
		somaticData,
		setSomaticData,
		isNormApplied,
		allergyDetails,
		setAllergyDetails,
		cardioDetails,
		setCardioDetails,
		coagulationDetails,
		setCoagulationDetails,
		quickAllergies,
		riskEvaluation,
		handleApplyPhysiologicalNorm,
		handleOneTouchCheckin,
		handleEmergencyCheckin,
		handleApplyPhysiologicalNormAndFinish,
		handleCompleteCheckin,
		handleSignCurrentConsent,
		handleSignCurrentConsentWithPaper,
		handleSignAllConsentsWithPep,
		handleToggleQuickAllergy,
	};
}
