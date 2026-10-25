import { useState } from "react";
import type { ArchwireMaterial, ArchwireSection } from "../OrthoArchwireSelector";
import type { BracketSlot } from "../OrthoBracketProtocolSection";
import type {
	OrthodonticStageFilter,
	TargetArch,
	OrthoClinicalPresetId,
} from "../orthoProtocolTypes";

export function useApplianceState() {
	const [bracketSlot, setBracketSlot] = useState<BracketSlot>("0.022");
	const [bracketSystem, setBracketSystem] = useState<string>("damon_q2");
	const [archwireMaterial, setArchwireMaterial] = useState<ArchwireMaterial>("CuNiTi");
	const [archwireSection, setArchwireSection] = useState<ArchwireSection>(".016");
	const [targetArch, setTargetArch] = useState<TargetArch>("both");
	const [elasticScheme, setElasticScheme] = useState<string>("class_ii");
	const [elasticSize, setElasticSize] = useState<string>("kangaroo_1_4");
	const [elasticWear, setElasticWear] = useState<string>("22 часа/сутки");
	const [selectedActions, setSelectedActions] = useState<string[]>(["wire_change"]);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([
		16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26,
		46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36,
	]);
	const [powerChainSpan, setPowerChainSpan] = useState<string>("13-23");
	const [powerChainType, setPowerChainType] = useState<string>("short");
	const [notes, setNotes] = useState<string>("Пациент жалоб не предъявляет. Гигиена удовлетворительная.");
	const [activePreset, setActivePreset] = useState<OrthoClinicalPresetId | null>(null);
	const [stageFilter, setStageFilter] = useState<OrthodonticStageFilter>("all");
	const [torquePreset, setTorquePreset] = useState<string>("damon_std");
	const [angulationPreset, setAngulationPreset] = useState<string>("norm");

	return {
		bracketSlot,
		setBracketSlot,
		bracketSystem,
		setBracketSystem,
		archwireMaterial,
		setArchwireMaterial,
		archwireSection,
		setArchwireSection,
		targetArch,
		setTargetArch,
		elasticScheme,
		setElasticScheme,
		elasticSize,
		setElasticSize,
		elasticWear,
		setElasticWear,
		selectedActions,
		setSelectedActions,
		selectedTeeth,
		setSelectedTeeth,
		powerChainSpan,
		setPowerChainSpan,
		powerChainType,
		setPowerChainType,
		notes,
		setNotes,
		activePreset,
		setActivePreset,
		stageFilter,
		setStageFilter,
		torquePreset,
		setTorquePreset,
		angulationPreset,
		setAngulationPreset,
	};
}
