import { useEffect, useMemo, useState } from "react";
import { estimatePediatricWeightKg } from "@dental/shared";
import type { FranklRating, ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";
import type { PediatricDentitionMode, ToothClinicalFinding } from "../PediatricTeethChart";
import { DEFAULT_LEGAL_REPRESENTATIVE, DEFAULT_PEDIATRIC_SOMATIC_NORM, type LegalRepresentativeData, type PediatricSomaticStatus } from "../PediatricSomaticAndLegalRep";
import type { PediatricAnesthesiaCalculationResult } from "../PediatricAnesthesiaCalculator";
import { DEFAULT_SEDATION_STATE, FRANKL_EXPRESS_ITEMS, PEDIATRIC_PROTOCOL_PRESETS, PEDIATRIC_TEETH_NAMES, isValidFdiTooth } from "./constants";
import type { FranklExpressItem, PediatricProtocolDefinition, PediatricProtocolId, PediatricSedationState, VisitPediatricProtocolWidgetProps } from "./types";

export function usePediatricWidgetState(props: VisitPediatricProtocolWidgetProps) {
	const { activeTooth = 54, activeSurfaces, initialFranklRating = 3, patientAgeYears = 6, patientWeightKg, representativeFullName, representativePhone, patientPhone, representativeRole, initialShowDetails = false } = props;

	const effectiveWeightKg = useMemo(() => (typeof patientWeightKg === "number" && patientWeightKg > 0 ? patientWeightKg : estimatePediatricWeightKg(patientAgeYears)), [patientWeightKg, patientAgeYears]);
	const effectiveTooth = useMemo(() => (activeTooth && isValidFdiTooth(activeTooth) ? (patientAgeYears < 6 && (activeTooth < 51 || activeTooth > 85) ? 54 : activeTooth) : 54), [activeTooth, patientAgeYears]);
	const anatomicalToothName = useMemo(() => PEDIATRIC_TEETH_NAMES[effectiveTooth] ?? `Зуб ${effectiveTooth}`, [effectiveTooth]);

	const [currentTooth, setCurrentTooth] = useState<number>(effectiveTooth);
	useEffect(() => { setCurrentTooth(effectiveTooth); }, [effectiveTooth]);

	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>(patientAgeYears >= 12 ? "permanent" : patientAgeYears >= 6 ? "mixed" : "primary");
	useEffect(() => { setDentitionMode(patientAgeYears >= 12 ? "permanent" : patientAgeYears >= 6 ? "mixed" : "primary"); }, [patientAgeYears]);

	const [toothFindings, setToothFindings] = useState<Record<number, ToothClinicalFinding>>({});
	const [resorptionStages, setResorptionStages] = useState<Record<number, ResorptionStagePercent>>({});
	const [somaticStatus, setSomaticStatus] = useState<PediatricSomaticStatus>(DEFAULT_PEDIATRIC_SOMATIC_NORM);
	const [somaticText, setSomaticText] = useState<string>("");

	const [representative, setRepresentative] = useState<LegalRepresentativeData>(() => ({
		...DEFAULT_LEGAL_REPRESENTATIVE,
		fullName: representativeFullName || "",
		phone: representativePhone || patientPhone || "",
		...(representativeRole ? { role: representativeRole as any } : {}),
	}));
	const [representativeText, setRepresentativeText] = useState<string>("");

	const [anesthesiaCalculation, setAnesthesiaCalculation] = useState<PediatricAnesthesiaCalculationResult | null>(null);
	const [anesthesiaText, setAnesthesiaText] = useState<string>("");
	const [sedation, setSedation] = useState<PediatricSedationState>(DEFAULT_SEDATION_STATE);
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [activePresetId, setActivePresetId] = useState<PediatricProtocolId>("caries_primary");

	const isInvasiveProtocol = useMemo(() => ["caries_primary", "pulpotomy_primary", "extraction_primary_exfoliation", "standard_crown"].includes(activePresetId), [activePresetId]);
	const activePreset = useMemo<PediatricProtocolDefinition>(() => PEDIATRIC_PROTOCOL_PRESETS.find((p) => p.id === activePresetId) ?? (PEDIATRIC_PROTOCOL_PRESETS[0] as PediatricProtocolDefinition), [activePresetId]);

	const [franklRating, setFranklRating] = useState<FranklRating>(initialFranklRating);
	const activeFrankl = useMemo<FranklExpressItem>(() => FRANKL_EXPRESS_ITEMS.find((f) => f.rating === franklRating) ?? (FRANKL_EXPRESS_ITEMS[2] as FranklExpressItem), [franklRating]);

	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => (activeSurfaces && activeSurfaces.length > 0 ? [...activeSurfaces] : ["O"]));
	useEffect(() => { if (activeSurfaces && activeSurfaces.length > 0) setSelectedSurfaces([...activeSurfaces]); }, [activeSurfaces]);

	const [selectedMaterial, setSelectedMaterial] = useState<string>(activePreset.defaultMaterial);
	const [showDetailsAccordion, setShowDetailsAccordion] = useState<boolean>(initialShowDetails);
	const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);

	const [orthoFrenulumNormal, setOrthoFrenulumNormal] = useState<boolean>(true);
	const [orthoNasalBreathing, setOrthoNasalBreathing] = useState<boolean>(true);
	const [orthoNoHarmfulHabits, setOrthoNoHarmfulHabits] = useState<boolean>(true);

	return {
		effectiveWeightKg, effectiveTooth, anatomicalToothName,
		currentTooth, setCurrentTooth,
		dentitionMode, setDentitionMode,
		toothFindings, setToothFindings,
		resorptionStages, setResorptionStages,
		somaticStatus, setSomaticStatus, somaticText, setSomaticText,
		representative, setRepresentative, representativeText, setRepresentativeText,
		anesthesiaCalculation, setAnesthesiaCalculation, anesthesiaText, setAnesthesiaText,
		sedation, setSedation, isDiplomaModalOpen, setIsDiplomaModalOpen,
		activePresetId, setActivePresetId, isInvasiveProtocol, activePreset,
		franklRating, setFranklRating, activeFrankl,
		selectedSurfaces, setSelectedSurfaces, selectedMaterial, setSelectedMaterial,
		showDetailsAccordion, setShowDetailsAccordion, isMemoModalOpen, setIsMemoModalOpen,
		orthoFrenulumNormal, setOrthoFrenulumNormal, orthoNasalBreathing, setOrthoNasalBreathing, orthoNoHarmfulHabits, setOrthoNoHarmfulHabits,
	};
}
