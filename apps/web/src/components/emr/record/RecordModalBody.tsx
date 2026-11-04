import React from "react";
import type { MedicalRecordData, ClinicalVisitDiaryEntry, Form043VisitDiaryEntry } from "../types/recordDataTypes";
import type { calculateDmftIndex, calculateCpitnIndex } from "../clinicalDiaryMath";
import type { RecordTabType } from "./recordModalTypes";
import { generateMedicalRecordPrintHtml } from "../clinicalDiaryMath";
import { RecordPassportTab } from "./tabs/RecordPassportTab";
import { RecordAnamnesisTab } from "./tabs/RecordAnamnesisTab";
import { RecordOdontogramTab } from "./tabs/RecordOdontogramTab";
import { RecordDiariesTab } from "./tabs/RecordDiariesTab";
import { RecordEpicrisisTab } from "./tabs/RecordEpicrisisTab";

interface RecordModalBodyProps {
	activeTab: RecordTabType;
	formData: MedicalRecordData;
	zoomScale: number;
	effectiveIsDraft: boolean;
	ageText: string;
	dmft: ReturnType<typeof calculateDmftIndex>;
	cpitn: ReturnType<typeof calculateCpitnIndex>;
	onApplyNorm: () => void;
	onOpenProtocolGenerator?: (() => void) | undefined;
	onOpenInternalProtocolGenerator: () => void;
	onAddDiary?: ((entry: ClinicalVisitDiaryEntry) => void) | undefined;
	onDeleteDiary?: ((index: number) => void) | undefined;
}

export const RecordModalBody: React.FC<RecordModalBodyProps> = React.memo(function RecordModalBody(props) {
	return (
		<main className="emr-studio-body emr043-body">
			{props.activeTab === "overview" && (
				<div className="emr043-preview-container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
					<div
						className="emr043-a4-sheet print-paper-sheet pro-a4-physical-sheet"
						data-paper-sheet="true"
						data-preserve-white="true"
						style={{ transform: `scale(${props.zoomScale})`, transformOrigin: "top center" }}
						dangerouslySetInnerHTML={{
							__html: generateMedicalRecordPrintHtml(props.formData, {
								isLocked: !props.effectiveIsDraft,
								isDraft: props.effectiveIsDraft,
								status: props.effectiveIsDraft ? "draft" : "signed",
							}),
						}}
					/>
				</div>
			)}
			{props.activeTab === "passport" && <RecordPassportTab formData={props.formData} ageText={props.ageText} />}
			{props.activeTab === "anamnesis" && <RecordAnamnesisTab formData={props.formData} onApplyNorm={props.onApplyNorm} />}
			{props.activeTab === "odontogram" && <RecordOdontogramTab formData={props.formData} dmft={props.dmft} cpitn={props.cpitn} onApplyNorm={props.onApplyNorm} />}
			{props.activeTab === "diaries" && (
				<RecordDiariesTab
					formData={props.formData}
					onOpenProtocolGenerator={props.onOpenProtocolGenerator}
					onOpenInternalProtocolGenerator={props.onOpenInternalProtocolGenerator}
					onAddDiary={props.onAddDiary}
					onDeleteDiary={props.onDeleteDiary}
				/>
			)}
			{props.activeTab === "epicrisis" && <RecordEpicrisisTab formData={props.formData} />}
		</main>
	);
});
