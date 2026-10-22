import { useCallback } from "react";
import {
	formatFullSoapFromProtocol,
	type OutpatientProtocolTemplate,
	type PopulateTemplateParams,
} from "@dental/shared";
import { buildPopulatedProtocolValues } from "./soapProtocolPopulateEngine";
import type { VisitSoapNoteValues } from "./types";

interface ApplyProtocolParams {
	readonly selectedTooth: number | null;
	readonly selectedSurfaces: string;
	readonly values: VisitSoapNoteValues;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly setIsCorrectionMode: (val: boolean) => void;
	readonly setIsTemplatesOpen: (val: boolean) => void;
	readonly setPreviewProtocol: (proto: OutpatientProtocolTemplate | null) => void;
	readonly setSaveStatus: React.Dispatch<React.SetStateAction<"idle" | "saving" | "saved">> | ((status: "idle" | "saving" | "saved") => void);
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onApplyFullDiary?: ((fullText: string) => void) | undefined;
}

export function useVisitSoapApplyProtocol({
	selectedTooth,
	selectedSurfaces,
	values,
	setValues,
	isLocked,
	isCorrectionMode,
	setIsCorrectionMode,
	setIsTemplatesOpen,
	setPreviewProtocol,
	setSaveStatus,
	saveDraftToStorage,
	onSave,
	onChange,
	onApplyFullDiary,
}: ApplyProtocolParams) {
	const handleApplyProtocol = useCallback(
		(protocol: OutpatientProtocolTemplate, mode: "replace" | "append" = "replace") => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
			const targetTooth = selectedTooth ?? protocol.defaultTooth ?? 16;
			const params: PopulateTemplateParams = {
				toothNumber: targetTooth,
				surfaces: selectedSurfaces || undefined,
			};

			const nextValues = buildPopulatedProtocolValues(protocol, params, values, isLocked, mode);
			setValues(nextValues);
			setSaveStatus("saved");
			saveDraftToStorage(nextValues);
			onSave?.(nextValues);
			onChange?.(nextValues);

			if (mode === "replace") {
				const formattedFull = formatFullSoapFromProtocol(protocol, params);
				onApplyFullDiary?.(formattedFull);
			}

			setIsTemplatesOpen(false);
			setPreviewProtocol(null);
		},
		[
			selectedTooth,
			selectedSurfaces,
			values,
			isLocked,
			isCorrectionMode,
			setIsCorrectionMode,
			setIsTemplatesOpen,
			setPreviewProtocol,
			setValues,
			setSaveStatus,
			saveDraftToStorage,
			onSave,
			onChange,
			onApplyFullDiary,
		],
	);

	return { handleApplyProtocol };
}
