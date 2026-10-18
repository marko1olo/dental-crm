import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { formatRadiationDose } from "../radiologyMath.js";
import {
	applyRadiologyProtocolToForm043, CBCT_DIAGNOSTIC_GOALS, CBCT_REFERRAL_PARTNERS,
	CBCT_SCAN_FOV_PROTOCOLS, type CbctDiagnosticGoal, type CbctDiagnosticGoalId,
	type CbctReferralPartner, type CbctScanFovProtocol, formatCbctReferralSummary,
	generateReferralBarcodeSvg, generateReferralQrCodeSvg,
} from "../radiologyProtocols.js";
import {
	generateRadiologyReferralHtml, printRadiologyReferralHtml,
	type ClinicalExpressPreset, type RadiologyReferralModalProps,
} from "../radiologyReferralPrintTemplate.js";

export function useRadiologyReferralController(p: RadiologyReferralModalProps) {
	const [selectedFovId, setSelectedFovId] = useState("cbct_full_jaws_16x10");
	const [selectedGoalId, setSelectedGoalId] = useState<CbctDiagnosticGoalId>("implantation");
	const [selectedPartnerId, setSelectedPartnerId] = useState("own_cabinet");
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(p.initialTeeth || []);
	const [customTeethInput, setCustomTeethInput] = useState((p.initialTeeth || []).join(", "));
	const [diagnosisIcd10, setDiagnosisIcd10] = useState(p.diary?.diagnosisIcd10 || p.initialDiagnosisIcd10 || "K08.1");
	const [clinicalNotes, setClinicalNotes] = useState(p.diary?.statusLocalis || "");
	const [referralNumber, setReferralNumber] = useState("");
	const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
	const [isPregnancyExcluded, setIsPregnancyExcluded] = useState(true);
	const [hasMetallicArtifacts, setHasMetallicArtifacts] = useState(false);
	const [isTmjOpenClosedProtocol, setIsTmjOpenClosedProtocol] = useState(true);

	const currentFov: CbctScanFovProtocol = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.id === selectedFovId) ?? CBCT_SCAN_FOV_PROTOCOLS[0]!;
	const currentGoal: CbctDiagnosticGoal = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === selectedGoalId) ?? CBCT_DIAGNOSTIC_GOALS[0]!;
	const currentPartner: CbctReferralPartner = CBCT_REFERRAL_PARTNERS.find((p) => p.id === selectedPartnerId) ?? CBCT_REFERRAL_PARTNERS[0]!;

	useEffect(() => {
		if (!p.isOpen) return;
		const curYear = new Date().getFullYear();
		setReferralNumber(`НАПР-КЛКТ-${curYear}-${Date.now().toString(36).toUpperCase().slice(-4)}`);
		if (p.initialTeeth && p.initialTeeth.length > 0) {
			setSelectedTeeth(p.initialTeeth);
			setCustomTeethInput(p.initialTeeth.join(", "));
		}
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") p.onClose(); };
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [p.isOpen, p.onClose, p.initialTeeth]);

	const handleApplyExpressPreset = (pr: ClinicalExpressPreset) => {
		setSelectedFovId(pr.fovId); setSelectedGoalId(pr.goalId); setDiagnosisIcd10(pr.icd);
		if (pr.teeth?.length) { setSelectedTeeth([...pr.teeth]); setCustomTeethInput(pr.teeth.join(", ")); }
		if (pr.note) setClinicalNotes(pr.note);
		showToast(`Применен клинический протокол: ${pr.note}`, "info", 2000);
	};

	const handleToggleTooth = (tooth: string) => {
		const u = selectedTeeth.includes(tooth) ? selectedTeeth.filter((t) => t !== tooth) : [...selectedTeeth, tooth].sort();
		setSelectedTeeth(u); setCustomTeethInput(u.join(", "));
	};

	const targetTeethDisplay = customTeethInput || (selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "По протоколу FOV");
	const referralSummary = formatCbctReferralSummary({
		referralNumber, fovProtocol: currentFov, goal: currentGoal, teeth: targetTeethDisplay,
		partner: currentPartner, doctorName: p.doctorName || "Лечащий врач", icd10: diagnosisIcd10,
	});

	const barcodeSvg = generateReferralBarcodeSvg(referralNumber, 240, 48);
	const qrPayloadData = `CT-REF:${referralNumber}|CLINIC:${p.clinicName || "Денте"}|PATIENT:${p.patient?.fullName || "Пациент"}|FOV:${currentFov.fovDimensions}|TEETH:${targetTeethDisplay}|GOAL:${currentGoal.titleRu}|DATE:${new Date().toISOString().slice(0, 10)}`;
	const qrCodeSvg = generateReferralQrCodeSvg(qrPayloadData, 96);

	const handleInsertToDiary = () => {
		applyRadiologyProtocolToForm043({
			protocol: referralSummary,
			options: { modalityLabel: `КЛКТ (${currentFov.fovDimensions})`, teethFdi: selectedTeeth.length > 0 ? selectedTeeth : undefined },
			showNotification: true, copyToClipboard: true,
		});
		p.onSuccessReferralCreated?.({ referralNumber, fov: currentFov, goal: currentGoal, teeth: targetTeethDisplay, partner: currentPartner, icd10: diagnosisIcd10 });
	};

	const handlePrint = () => {
		const html = generateRadiologyReferralHtml({
			clinic: p.clinicName || 'Стоматологическая клиника "Денте"', license: p.clinicLicense || "ЛО-77-01-019842",
			address: p.clinicAddress || "г. Москва", phone: p.clinicPhone || "+7 (495) 700-00-00", referralNumber,
			partner: currentPartner, barcodeSvg, qrCodeSvg, patientFullName: p.patient?.fullName || "Пациент",
			patientBirth: p.patient?.birthDate || "1985-05-15", patientCard: p.patient?.medicalCardNumber || p.patient?.cardNumber || "2026",
			patientPhoneStr: p.patient?.phone || "+7 (___) ___-__-__", docName: p.doctorName || "Лечащий врач",
			docSpec: p.doctorSpecialty || "Врач-стоматолог", diagnosisIcd10, goal: currentGoal, fov: currentFov,
			clinicalNotes, selectedTeeth, targetTeethDisplay, isPregnancyExcluded, hasMetallicArtifacts, isTmjOpenClosedProtocol,
		});
		printRadiologyReferralHtml(html, () => p.onSuccessReferralCreated?.({ referralNumber, fov: currentFov, goal: currentGoal, teeth: targetTeethDisplay, partner: currentPartner }));
	};

	return {
		selectedFovId, setSelectedFovId, selectedGoalId, setSelectedGoalId, selectedPartnerId, setSelectedPartnerId,
		selectedTeeth, setSelectedTeeth, customTeethInput, setCustomTeethInput, diagnosisIcd10, setDiagnosisIcd10,
		referralNumber, setReferralNumber, activeTab, setActiveTab, isPregnancyExcluded, setIsPregnancyExcluded,
		hasMetallicArtifacts, setHasMetallicArtifacts, isTmjOpenClosedProtocol, setIsTmjOpenClosedProtocol,
		currentFov, currentGoal, currentPartner, estimatedDose: formatRadiationDose(currentFov.typicalDoseMicrosv),
		targetTeethDisplay, referralSummary, barcodeSvg, qrCodeSvg,
		handleApplyExpressPreset, handleToggleTooth, handleInsertToDiary, handlePrint,
	};
}
