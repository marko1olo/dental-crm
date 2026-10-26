import React from "react";
import { ScannerDocumentStage } from "./ScannerDocumentStage";
import { ScannerPatientIntakePanel } from "./ScannerPatientIntakePanel";
import { useScannerCockpit } from "./useScannerCockpit";

export function ScannerDocumentWorkspace() {
	const cockpit = useScannerCockpit();

	return (
		<div className="scanner-grid-layout" data-testid="scanner-documents-workspace">
			{/* Left Column: Viewport, Presets, Filters & Capture Controls */}
			<ScannerDocumentStage cockpit={cockpit} />

			{/* Right Column: Patient Intake, OCR Inspector & Primary CTA */}
			<ScannerPatientIntakePanel cockpit={cockpit} />
		</div>
	);
}

export default ScannerDocumentWorkspace;
