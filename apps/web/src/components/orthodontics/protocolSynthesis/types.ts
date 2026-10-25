import type {
	AnbClass,
	AngleClass,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";
import type { ArchwireMaterial, ArchwireSection } from "../OrthoArchwireSelector";
import type { BracketSlot } from "../OrthoBracketProtocolSection";
import type { TargetArch } from "../orthoProtocolTypes";

export interface SynthesizeProtocolParams {
	patientName: string;
	notes: string;
	angleClass: AngleClass;
	anbClass: AnbClass;
	anbAngle: number;
	sagittalAnomaly: SagittalAnomaly;
	sagittalGapMm: number;
	verticalAnomaly: VerticalAnomaly;
	transversalAnomaly: TransversalAnomaly;
	tmjStatus: TmjStatus;
	isPhotoProtocolCompleted: boolean;
	bracketSlot: BracketSlot;
	bracketSystem: string;
	archwireMaterial: ArchwireMaterial;
	archwireSection: ArchwireSection;
	targetArch: TargetArch;
	elasticScheme: string;
	elasticSize: string;
	elasticWear: string;
	selectedActions: string[];
	selectedTeeth: number[];
	powerChainSpan: string;
	powerChainType: string;
	activePreset: string | null;
	activeAttachmentPreset: string | null;
	alignerSetIssued: { count: number; days: number } | null;
	plateActivationTurns: number;
	torquePreset: string;
	angulationPreset: string;
	isSplitArchAligners: boolean;
	alignerStep: number;
	alignerTotal: number;
	alignerStepUpper: number;
	alignerTotalUpper: number;
	alignerStepLower: number;
	alignerTotalLower: number;
	alignerProgressPercent: number;
	nextAlignerDateStr: string;
	alignerDaysPerStep: number;
}
