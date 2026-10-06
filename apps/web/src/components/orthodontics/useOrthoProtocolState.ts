import { useEffect, useState } from "react";
import type {
	AnbClass,
	AngleClass,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";
import type { ArchwireMaterial, ArchwireSection } from "./OrthoArchwireSelector";
import type { BracketSlot } from "./OrthoBracketProtocolSection";
import type {
	OrthodonticStageFilter,
	TargetArch,
	OrthodonticVisitProtocolWidgetProps,
} from "./orthoProtocolTypes";

export function useOrthoProtocolState(props: OrthodonticVisitProtocolWidgetProps) {
	const {
		currentAligner,
		totalAligners,
		currentAlignerUpper,
		currentAlignerLower,
		totalAlignersUpper,
		totalAlignersLower,
	} = props;

	// Bracket and Archwire State
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

	// Clinical Presets State
	const [activePreset, setActivePreset] = useState<
		"activation" | "wire_change" | "bonding" | "debonding" | null
	>(null);

	// Aligner Express State
	const [activeAttachmentPreset, setActiveAttachmentPreset] = useState<string | null>(null);
	const [alignerSetIssued, setAlignerSetIssued] = useState<{ count: number; days: number } | null>(null);

	// Angle & ANB Classification State
	const [angleClass, setAngleClass] = useState<AngleClass>("class_1");
	const [anbClass, setAnbClass] = useState<AnbClass>("class_1");
	const [anbAngle, setAnbAngle] = useState<number>(2.0);
	const [plateActivationTurns, setPlateActivationTurns] = useState<number>(1);

	// Occlusal & Gnathological Diagnostics State
	const [sagittalAnomaly, setSagittalAnomaly] = useState<SagittalAnomaly>("norm");
	const [sagittalGapMm, setSagittalGapMm] = useState<number>(2);
	const [verticalAnomaly, setVerticalAnomaly] = useState<VerticalAnomaly>("norm");
	const [transversalAnomaly, setTransversalAnomaly] = useState<TransversalAnomaly>("norm");
	const [tmjStatus, setTmjStatus] = useState<TmjStatus>("norm");

	// Photo Protocol & Cephalometric Analysis State
	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState<boolean>(false);
	const [isPhotoProtocolCompleted, setIsPhotoProtocolCompleted] = useState<boolean>(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);

	// Stages Filter Bar State
	const [stageFilter, setStageFilter] = useState<OrthodonticStageFilter>("all");

	// Torque & Angulation State
	const [torquePreset, setTorquePreset] = useState<string>("damon_std");
	const [angulationPreset, setAngulationPreset] = useState<string>("norm");

	// Aligner Tray Tracker State
	const [isSplitArchAligners, setIsSplitArchAligners] = useState<boolean>(
		Boolean(
			(currentAlignerUpper !== undefined && currentAlignerLower !== undefined) ||
				(totalAlignersUpper !== undefined && totalAlignersLower !== undefined),
		),
	);
	const [alignerStep, setAlignerStep] = useState<number>(currentAligner || 1);
	const [alignerTotal, setAlignerTotal] = useState<number>(totalAligners || 36);
	const [alignerStepUpper, setAlignerStepUpper] = useState<number>(
		currentAlignerUpper || currentAligner || 1,
	);
	const [alignerTotalUpper, setAlignerTotalUpper] = useState<number>(
		totalAlignersUpper || totalAligners || 36,
	);
	const [alignerStepLower, setAlignerStepLower] = useState<number>(
		currentAlignerLower || currentAligner || 1,
	);
	const [alignerTotalLower, setAlignerTotalLower] = useState<number>(
		totalAlignersLower || totalAligners || 36,
	);
	const [alignerDaysPerStep, setAlignerDaysPerStep] = useState<number>(14);

	useEffect(() => {
		if (currentAligner !== undefined && currentAligner > 0) {
			setAlignerStep(currentAligner);
			if (!isSplitArchAligners) {
				setAlignerStepUpper(currentAligner);
				setAlignerStepLower(currentAligner);
			}
		}
	}, [currentAligner, isSplitArchAligners]);

	useEffect(() => {
		if (totalAligners !== undefined && totalAligners > 0) {
			setAlignerTotal(totalAligners);
			if (!isSplitArchAligners) {
				setAlignerTotalUpper(totalAligners);
				setAlignerTotalLower(totalAligners);
			}
		}
	}, [totalAligners, isSplitArchAligners]);

	useEffect(() => {
		if (currentAlignerUpper !== undefined && currentAlignerUpper > 0) {
			setAlignerStepUpper(currentAlignerUpper);
			setIsSplitArchAligners(true);
		}
	}, [currentAlignerUpper]);

	useEffect(() => {
		if (currentAlignerLower !== undefined && currentAlignerLower > 0) {
			setAlignerStepLower(currentAlignerLower);
			setIsSplitArchAligners(true);
		}
	}, [currentAlignerLower]);

	useEffect(() => {
		if (totalAlignersUpper !== undefined && totalAlignersUpper > 0) {
			setAlignerTotalUpper(totalAlignersUpper);
		}
	}, [totalAlignersUpper]);

	useEffect(() => {
		if (totalAlignersLower !== undefined && totalAlignersLower > 0) {
			setAlignerTotalLower(totalAlignersLower);
		}
	}, [totalAlignersLower]);

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
		activeAttachmentPreset,
		setActiveAttachmentPreset,
		alignerSetIssued,
		setAlignerSetIssued,
		angleClass,
		setAngleClass,
		anbClass,
		setAnbClass,
		anbAngle,
		setAnbAngle,
		plateActivationTurns,
		setPlateActivationTurns,
		sagittalAnomaly,
		setSagittalAnomaly,
		sagittalGapMm,
		setSagittalGapMm,
		verticalAnomaly,
		setVerticalAnomaly,
		transversalAnomaly,
		setTransversalAnomaly,
		tmjStatus,
		setTmjStatus,
		isPhotoProtocolOpen,
		setIsPhotoProtocolOpen,
		isPhotoProtocolCompleted,
		setIsPhotoProtocolCompleted,
		isCephModalOpen,
		setIsCephModalOpen,
		stageFilter,
		setStageFilter,
		torquePreset,
		setTorquePreset,
		angulationPreset,
		setAngulationPreset,
		isSplitArchAligners,
		setIsSplitArchAligners,
		alignerStep,
		setAlignerStep,
		alignerTotal,
		setAlignerTotal,
		alignerStepUpper,
		setAlignerStepUpper,
		alignerTotalUpper,
		setAlignerTotalUpper,
		alignerStepLower,
		setAlignerStepLower,
		alignerTotalLower,
		setAlignerTotalLower,
		alignerDaysPerStep,
		setAlignerDaysPerStep,
	};
}
