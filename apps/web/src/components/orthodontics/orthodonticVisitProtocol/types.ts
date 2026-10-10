import type React from "react";
import type {
	AnbClass,
	AnbClassOption,
	AngleClass,
	AngleClassOption,
	WorkhorseArchwireOption,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";
import type {
	OrthodonticStageFilter,
	TargetArch,
	OrthodonticService804n,
	CalculateOrthoServicesParams,
	OrthodonticVisitProtocolWidgetProps,
	OrthodonticPatientMemoParams,
} from "../orthoProtocolTypes";
import type {
	BracketSlot,
	AlignerAttachmentPreset,
} from "../OrthoBracketProtocolSection";

export type {
	AnbClass,
	AnbClassOption,
	AngleClass,
	AngleClassOption,
	WorkhorseArchwireOption,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
	OrthodonticStageFilter,
	TargetArch,
	OrthodonticService804n,
	CalculateOrthoServicesParams,
	OrthodonticVisitProtocolWidgetProps,
	OrthodonticPatientMemoParams,
	BracketSlot,
	AlignerAttachmentPreset,
};

export type ArchwireMaterial = "NiTi" | "CuNiTi" | "SS" | "TMA";

export type ArchwireSection =
	| ".012"
	| ".014"
	| ".016"
	| ".018"
	| ".020"
	| ".014x.025"
	| ".016x.022"
	| ".016x.025"
	| ".017x.025"
	| ".018x.025"
	| ".019x.025"
	| ".021x.025";

export interface TorquePresetOption {
	id: string;
	label: string;
	shortLabel: string;
	u1Torque: string;
	l1Torque: string;
	desc: string;
}

export interface AngulationPresetOption {
	id: string;
	label: string;
	shortLabel: string;
}

export interface ElasticSchemeOption {
	id: string;
	label: string;
	desc: string;
}

export interface ElasticSizeOption {
	id: string;
	label: string;
	strength: string;
}

export interface ClinicalActionOption {
	id: string;
	label: string;
}

export interface ArchwireSelectorProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly setArchwireMaterial: (material: ArchwireMaterial) => void;
	readonly archwireSection: ArchwireSection;
	readonly setArchwireSection: (section: ArchwireSection) => void;
	readonly onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
	readonly torquePreset: string;
	readonly setTorquePreset: (presetId: string) => void;
	readonly angulationPreset: string;
	readonly setAngulationPreset: (presetId: string) => void;
}

export interface ElasticTractionMatrixProps {
	readonly elasticScheme: string;
	readonly setElasticScheme: (scheme: string) => void;
	readonly elasticSize: string;
	readonly setElasticSize: (size: string) => void;
	readonly onElasticSizeInteraction?: (() => void) | undefined;
}

export interface OrthodonticActivationNotesProps {
	readonly notes: string;
	readonly setNotes: React.Dispatch<React.SetStateAction<string>>;
	readonly selectedActions: string[];
	readonly onToggleAction?: ((actionId: string) => void) | undefined;
	readonly powerChainSpan?: string | undefined;
	readonly powerChainType?: string | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly onQuickPhraseInsert?: ((phrase: string) => void) | undefined;
}

export interface OrthodonticProtocolFooterProps {
	readonly generatedProtocol: string;
	readonly onPrintOrthodonticCard: () => void;
	readonly onCopyClipboard: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onApplyToVisitNote: () => void;
	readonly onClose: () => void;
	readonly calculatedServicesCount: number;
	readonly nextAlignerDateStr?: string | undefined;
}
