import React from "react";
import { Printer } from "lucide-react";
import { generateSickLeavePatientMemoHtml } from "../sickLeaveElnEngine";
import type { ElnPrintPreviewDrawerProps } from "./types";

export function ElnPrintPreviewDrawer({
	formState,
	patientData,
	onPrintMemo
}: ElnPrintPreviewDrawerProps) {
	return (
		<div className="sick-leave-body">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h4 className="sick-leave-section-title">
					<Printer size={16} />
					Печатный талон-памятка пациенту (Формат А5)
				</h4>
				<button type="button" className="sick-leave-btn primary" onClick={onPrintMemo}>
					<Printer size={16} />
					Распечатать памятку (А5/А4)
				</button>
			</div>
			<div
				className="sick-leave-memo-preview-wrap"
				dangerouslySetInnerHTML={{
					__html: generateSickLeavePatientMemoHtml(formState, patientData)
				}}
			/>
		</div>
	);
}
