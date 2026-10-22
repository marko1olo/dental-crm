import type React from "react";
import type {
	OutpatientProtocolTemplate,
	OutpatientSpecialty,
} from "@dental/shared";
import type { ChairsideSmartProtocolKey } from "../clinicalVisitWorkflow";

export interface VisitSoapNoteValues {
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	icd10?: string | undefined;
}

export interface VisitSoapEditorProps {
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialValues?: VisitSoapNoteValues | undefined;
	readonly activeTooth?: number | null | undefined;
	readonly onSelectActiveTooth?: ((tooth: number) => void) | undefined;
	readonly onSave?: ((values: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((values: VisitSoapNoteValues) => void) | undefined;
	readonly onApplyFullDiary?: ((fullDiaryText: string) => void) | undefined;
	readonly isLocked?: boolean | undefined;
	readonly className?: string | undefined;
	readonly autoFocusField?: "complaint" | "treatmentPlan" | null | undefined;
	readonly isTemplatesOpen?: boolean | undefined;
	readonly onToggleTemplates?: ((open: boolean) => void) | undefined;
}

export interface UnsavedDraftNoticeState {
	draftValues: VisitSoapNoteValues;
	timeStr: string;
}

export interface SoapToolbarProps {
	selectedTooth: number | null;
	onSelectTooth: (tooth: number | null) => void;
	selectedSurfaces: string;
	onChangeSurfaces: (surfaces: string) => void;
	isLocked: boolean;
	isCorrectionMode: boolean;
	onEnableCorrection: () => void;
	isTemplatesOpen: boolean;
	onToggleTemplates: () => void;
	onApplyNorm: () => void;
	activeViewMode: "fields" | "full_text";
	onChangeViewMode: (mode: "fields" | "full_text") => void;
	copied: boolean;
	onCopyFullText: () => void;
	onExplicitSave: () => void;
	isSoapMoreOpen: boolean;
	onToggleSoapMore: (open: boolean | ((prev: boolean) => boolean)) => void;
	soapMoreRef: React.RefObject<HTMLDivElement | null>;
	saveStatus: "idle" | "saving" | "saved" | "error";
	unsavedDraftNotice: UnsavedDraftNoticeState | null;
	onRestoreDraft: () => void;
	onDiscardDraft: () => void;
}

export interface SoapTemplatesDrawerProps {
	isTemplatesOpen: boolean;
	onClose: () => void;
	activeSpecialty: OutpatientSpecialty | "all";
	onSelectSpecialty: (spec: OutpatientSpecialty | "all") => void;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	protocols: OutpatientProtocolTemplate[];
	templatesLimit: number;
	onShowMore: () => void;
	onApplyProtocol: (
		protocol: OutpatientProtocolTemplate,
		mode: "replace" | "append",
	) => void;
	previewProtocol: OutpatientProtocolTemplate | null;
	onSetPreviewProtocol: (protocol: OutpatientProtocolTemplate | null) => void;
}

export interface SoapFieldsEditorProps {
	values: VisitSoapNoteValues;
	onFieldChange: (field: keyof VisitSoapNoteValues, val: string) => void;
	onInputFocus: (
		e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => void;
	onInputBlur: () => void;
	selectedTooth: number | null;
	isIcd10SelectorOpen: boolean;
	onToggleIcd10Selector: (open: boolean | ((prev: boolean) => boolean)) => void;
	onApplyExpressProtocol: (preset: ChairsideSmartProtocolKey) => void;
}

export interface SoapFullTextViewProps {
	values: VisitSoapNoteValues;
	selectedTooth: number | null;
	isLocked: boolean;
	isCorrectionMode: boolean;
}

export type SoapSaveStatus = "idle" | "saving" | "saved" | "error";
