import React from "react";
import type { MedicalCardForm043uData } from "../emr043Types";
import type { calculateDmftIndex, calculateCpitnIndex } from "../emr043Math";
import type { RecordTabType } from "./recordModalTypes";
import { generatePrintableHtml043 } from "../emr043HtmlPrint";
import { Form043PassportTab } from "./tabs/RecordPassportTab";
import { Form043AnamnesisTab } from "./tabs/RecordAnamnesisTab";
import { Form043OdontogramTab } from "./tabs/RecordOdontogramTab";
import { Form043DiariesTab } from "./tabs/RecordDiariesTab";
import { Form043EpicrisisTab } from "./tabs/RecordEpicrisisTab";

interface RecordModalBodyProps {
	activeTab: RecordTabType;
	formData: MedicalCardForm043uData;
	zoomScale: number;
	effectiveIsDraft: boolean;
	ageText: string;
	dmft: ReturnType<typeof calculateDmftIndex>;
	cpitn: ReturnType<typeof calculateCpitnIndex>;
	onApplyNorm: () => void;
	onOpenProtocolGenerator?: (() => void) | undefined;
	onOpenInternalProtocolGenerator: () => void;
}

export const RecordModalBody: React.FC<RecordModalBodyProps> = React.memo(function RecordModalBody(props) {
	return (
		<main className="emr043-body">
			{props.activeTab === "overview" && (
				<div className="emr043-preview-container" style={{ flexDirection: "column", alignItems: "center" }}>
					<div
						className="emr043-a4-sheet print-paper-sheet pro-a4-physical-sheet"
						data-paper-sheet="true"
						data-preserve-white="true"
						style={{ transform: `scale(${props.zoomScale})`, transformOrigin: "top center" }}
						dangerouslySetInnerHTML={{
							__html: generatePrintableHtml043(props.formData, {
								isLocked: !props.effectiveIsDraft,
								isDraft: props.effectiveIsDraft,
								status: props.effectiveIsDraft ? "draft" : "signed",
							}),
						}}
					/>
				</div>
			)}
			{props.activeTab === "passport" && <Form043PassportTab formData={props.formData} ageText={props.ageText} />}
			{props.activeTab === "anamnesis" && <Form043AnamnesisTab formData={props.formData} onApplyNorm={props.onApplyNorm} />}
			{props.activeTab === "odontogram" && <Form043OdontogramTab formData={props.formData} dmft={props.dmft} cpitn={props.cpitn} onApplyNorm={props.onApplyNorm} />}
			{props.activeTab === "diaries" && (
				<Form043DiariesTab
					formData={props.formData}
					onOpenProtocolGenerator={props.onOpenProtocolGenerator}
					onOpenInternalProtocolGenerator={props.onOpenInternalProtocolGenerator}
				/>
			)}
			{props.activeTab === "epicrisis" && <Form043EpicrisisTab formData={props.formData} />}
		</main>
	);
});
