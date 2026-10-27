import { useState, useMemo, useCallback } from "react";
import type {
	VisitDiaryEntry043,
	ClinicalDiarySynthesisRequest,
	ToothSurface,
	StatutoryAnestheticDrug,
	LocalAnesthesiaType,
} from "../emrProtocolEngine";
import {
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	deduceBlackClassFromSurfaces,
	formatStatutorySoapSummary,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
} from "../emrProtocolEngine";
import type { EmrProtocolGeneratorModalProps, EmrProtocolTabMode, EmrEndoStage } from "./types";

export function useEmrProtocolGeneratorState(props: EmrProtocolGeneratorModalProps) {
	const { initialIcd10Code, initialSpecialty, initialToothNumber, odontogramTeeth = [], initialSurfaces, doctorFullName, doctorSpecialty, onApplyDiary, onApplyBatchDiaries, onClose } = props;

	const [selectedPresetCode, setSelectedPresetCode] = useState<string>(() => {
		if (initialIcd10Code) {
			if (initialIcd10Code === "K08.1" && initialSpecialty === "orthopedics") return "K08.1_ORTHO";
			if (STATUTORY_EMR_PROTOCOL_CATALOG[initialIcd10Code] || COMPANION_ICD10_CODES[initialIcd10Code]) return initialIcd10Code;
		}
		return "K02.1";
	});

	const [targetTooth, setTargetTooth] = useState<string>(() => {
		if (initialToothNumber) return String(initialToothNumber);
		const firstPath = odontogramTeeth?.find((t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent");
		return firstPath ? String(firstPath.toothNumber) : "16";
	});

	const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>(() => {
		if (initialSurfaces && initialSurfaces.length > 0) return [...initialSurfaces];
		return ["occlusal"];
	});

	const [selectedCanals, setSelectedCanals] = useState<number>(3);
	const [selectedEndoStage, setSelectedEndoStage] = useState<EmrEndoStage>("single_visit_complete");
	const [selectedAnesthesiaDrug, setSelectedAnesthesiaDrug] = useState<StatutoryAnestheticDrug>("septanest_1_100000");
	const [selectedAnesthesiaTechnique, setSelectedAnesthesiaTechnique] = useState<LocalAnesthesiaType>("infiltration");
	const [selectedAnesthesiaDoseMl, setSelectedAnesthesiaDoseMl] = useState<number>(1.7);
	const [doctorNameInput, setDoctorNameInput] = useState<string>(doctorFullName || "");
	const [doctorSpecialtyInput, setDoctorSpecialtyInput] = useState<string>(doctorSpecialty || "Врач-стоматолог-терапевт");
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<EmrProtocolTabMode>("preview");

	const blackCavityClass = useMemo(() => deduceBlackClassFromSurfaces(targetTooth, selectedSurfaces), [targetTooth, selectedSurfaces]);

	const synthesizedDiary = useMemo<VisitDiaryEntry043>(() => {
		const req: ClinicalDiarySynthesisRequest = {
			toothNumber: targetTooth ? parseInt(targetTooth, 10) || targetTooth : null,
			icd10Code: selectedPresetCode,
			surfaces: selectedSurfaces,
			blackClass: blackCavityClass,
			rootCanalsCount: selectedCanals,
			endoVisitStage: selectedEndoStage,
			doctorFullName: doctorNameInput,
			doctorSpecialty: doctorSpecialtyInput,
			dateStr: new Date().toISOString().split("T")[0] || null,
			timeStr: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			customAnesthesia: {
				drug: selectedAnesthesiaDrug,
				doseMl: selectedAnesthesiaDoseMl,
				doseCarpules: Math.max(1, Math.round((selectedAnesthesiaDoseMl / 1.7) * 10) / 10),
				technique: selectedAnesthesiaTechnique,
			},
		};
		return synthesizeClinicalDiary(req);
	}, [targetTooth, selectedPresetCode, selectedSurfaces, blackCavityClass, selectedCanals, selectedEndoStage, doctorNameInput, doctorSpecialtyInput, selectedAnesthesiaDrug, selectedAnesthesiaDoseMl, selectedAnesthesiaTechnique]);

	const complianceReport = useMemo(() => validateForm043uCompliance(synthesizedDiary), [synthesizedDiary]);
	const formattedSoapText = useMemo(() => formatStatutorySoapSummary(synthesizedDiary), [synthesizedDiary]);

	const handleCopyToClipboard = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(formattedSoapText).then(() => {
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 2500);
			}).catch(() => {});
		}
	}, [formattedSoapText]);

	const handleApply = useCallback(() => {
		if (onApplyDiary) onApplyDiary(synthesizedDiary);
		onClose();
	}, [onApplyDiary, synthesizedDiary, onClose]);

	const handleBatchSynthesizeFromFormula = useCallback(() => {
		if (!odontogramTeeth || odontogramTeeth.length === 0) return;
		const diaries = synthesizeDiariesFromOdontogram(odontogramTeeth, { fullName: doctorNameInput, specialty: doctorSpecialtyInput }, new Date().toISOString().split("T")[0]);
		if (onApplyBatchDiaries && diaries.length > 0) onApplyBatchDiaries(diaries);
		else if (onApplyDiary && diaries.length > 0 && diaries[0]) onApplyDiary(diaries[0]);
		onClose();
	}, [odontogramTeeth, doctorNameInput, doctorSpecialtyInput, onApplyBatchDiaries, onApplyDiary, onClose]);

	const toggleSurface = useCallback((surface: ToothSurface) => {
		setSelectedSurfaces((prev) => prev.includes(surface) ? (prev.length === 1 ? ["occlusal"] : prev.filter((s) => s !== surface)) : [...prev, surface]);
	}, []);

	return {
		selectedPresetCode, setSelectedPresetCode, targetTooth, setTargetTooth, selectedSurfaces, setSelectedSurfaces,
		selectedCanals, setSelectedCanals, selectedEndoStage, setSelectedEndoStage,
		selectedAnesthesiaDrug, setSelectedAnesthesiaDrug, selectedAnesthesiaTechnique, setSelectedAnesthesiaTechnique,
		selectedAnesthesiaDoseMl, setSelectedAnesthesiaDoseMl, doctorNameInput, setDoctorNameInput,
		doctorSpecialtyInput, setDoctorSpecialtyInput, isCopied, activeTab, setActiveTab,
		blackCavityClass, synthesizedDiary, complianceReport, formattedSoapText,
		handleCopyToClipboard, handleApply, handleBatchSynthesizeFromFormula, toggleSurface,
	};
}
