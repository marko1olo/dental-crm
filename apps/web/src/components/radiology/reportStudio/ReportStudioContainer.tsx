/**
 * DENTE CRM — Radiology Report Studio Modal Container (Layer 4)
 * Root viewport container with mouse drag listeners and testid anchor.
 */

import React from "react";

export interface ReportStudioContainerProps {
	onMouseMove: (e: React.MouseEvent) => void;
	onMouseUp: () => void;
	children: React.ReactNode;
}

export const ReportStudioContainer: React.FC<ReportStudioContainerProps> = ({
	onMouseMove,
	onMouseUp,
	children,
}) => {
	return (
		<div
			className="radiology-report-modal"
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
			data-testid="radiology-report-studio-modal"
		>
			{children}
		</div>
	);
};
