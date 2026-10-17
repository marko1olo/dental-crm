import type React from "react";
import type { OrthoClinicalPresetId, OrthodonticStageFilter, TargetArch } from "../orthoProtocolTypes";
import type { BracketSlot } from "../OrthoBracketProtocolSection";
import type { ArchwireMaterial, ArchwireSection, WorkhorseArchwireOption } from "../OrthoArchwireSelector";
import type {
	AnbClass, AngleClass, SagittalAnomaly, VerticalAnomaly, TransversalAnomaly, TmjStatus,
} from "@dental/shared";

export interface OrthoControlsColumnProps {
	className?: string | undefined;
	stageFilter: OrthodonticStageFilter; setStageFilter: (filter: OrthodonticStageFilter) => void;
	setBracketSystem: (system: string) => void;
	setArchwireMaterial: (mat: ArchwireMaterial) => void; setArchwireSection: (sec: ArchwireSection) => void;
	selectedActions: string[]; setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;

	// Photo & Ceph
	isPhotoProtocolOpen: boolean; setIsPhotoProtocolOpen: (open: boolean) => void;
	isPhotoProtocolCompleted: boolean; onTogglePhotoProtocolCompleted: () => void;
	isCephModalOpen: boolean; setIsCephModalOpen: (open: boolean) => void;
	anbClass: AnbClass; setAnbClass: (cls: AnbClass) => void;
	anbAngle: number; setAnbAngle: (angle: number) => void; onSetAnbNorm: () => void;
	patientId?: string | undefined; patientName: string; doctorName: string; clinicName: string;
	onInsertCephToProtocol: (text: string) => void;

	// Presets
	activePreset: OrthoClinicalPresetId | null;
	onPresetActivation: () => void; onPresetWireChange: () => void; onPresetBonding: () => void;
	onPresetDebonding: () => void; onPresetLeveling?: (() => void) | undefined; onPresetSprings?: (() => void) | undefined;
	onPresetSeparationRings?: (() => void) | undefined; onPresetAlignerLabOrder: () => void;
	onPresetRetainerLabOrder: () => void; onPresetPlateLabOrder: () => void; onPresetSplintLabOrder: () => void;
	onPresetNiti014Activation?: (() => void) | undefined; onPresetPowerChainChange?: (() => void) | undefined;
	onPresetBondingBothMbt?: (() => void) | undefined; onPresetAlignerScan?: (() => void) | undefined;
	onPresetAlignerTrays1To4?: (() => void) | undefined;
	onPresetAlignerTrays5To8?: (() => void) | undefined;
	onPresetRebracket?: (() => void) | undefined;
	alignerStep: number; alignerTotal: number;

	// Diagnostics
	angleClass: AngleClass; setAngleClass: (cls: AngleClass) => void; onSetAngleClassNorm: () => void;
	sagittalAnomaly: SagittalAnomaly; setSagittalAnomaly: (anomaly: SagittalAnomaly) => void;
	sagittalGapMm: number; setSagittalGapMm: (gap: number) => void;
	verticalAnomaly: VerticalAnomaly; setVerticalAnomaly: (anomaly: VerticalAnomaly) => void;
	transversalAnomaly: TransversalAnomaly; setTransversalAnomaly: (anomaly: TransversalAnomaly) => void;
	onSetOcclusionNorm: () => void; tmjStatus: TmjStatus; setTmjStatus: (status: TmjStatus) => void; onSetTmjNorm: () => void;

	// Dental Arch
	targetArch: TargetArch; onSelectArch: (arch: TargetArch) => void;
	selectedTeeth: number[]; onToggleTooth: (tooth: number) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;

	// Bracket & Aligner Protocol
	bracketSlot: BracketSlot; setBracketSlot: (slot: BracketSlot) => void;
	bracketSystem: string; onSelectBracketSystem: (sys: string) => void;
	plateActivationTurns: number; setPlateActivationTurns: (turns: number) => void;
	activeAttachmentPreset: string | null; onSelectAttachmentPreset: (presetId: string) => void;
	isSplitArchAligners: boolean; setIsSplitArchAligners: React.Dispatch<React.SetStateAction<boolean>>;
	setAlignerStep: React.Dispatch<React.SetStateAction<number>>; setAlignerTotal: React.Dispatch<React.SetStateAction<number>>;
	alignerStepUpper: number; setAlignerStepUpper: React.Dispatch<React.SetStateAction<number>>;
	alignerTotalUpper: number; setAlignerTotalUpper: React.Dispatch<React.SetStateAction<number>>;
	alignerStepLower: number; setAlignerStepLower: React.Dispatch<React.SetStateAction<number>>;
	alignerTotalLower: number; setAlignerTotalLower: React.Dispatch<React.SetStateAction<number>>;
	alignerDaysPerStep: number; setAlignerDaysPerStep: React.Dispatch<React.SetStateAction<number>>;
	nextAlignerDateStr: string; alignerProgressPercent: number;
	onSendAlignerReminder: () => void; onIssueAlignerSet: (count: number, days: number) => void;
	onApplyAttachmentsProtocol: () => void; alignerSetIssuedCount?: number | undefined;

	// Archwire & Elastics
	archwireMaterial: ArchwireMaterial; archwireSection: ArchwireSection;
	onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
	torquePreset: string; setTorquePreset: (preset: string) => void;
	angulationPreset: string; setAngulationPreset: (preset: string) => void;
	elasticScheme: string; setElasticScheme: (scheme: string) => void;
	elasticSize: string; setElasticSize: (size: string) => void;
	onElasticSizeInteraction: () => void; onToggleAction: (actionId: string) => void;
}
