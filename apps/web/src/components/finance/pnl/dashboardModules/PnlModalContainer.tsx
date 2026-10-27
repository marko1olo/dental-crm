import type React from "react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";

export interface PnlModalContainerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly header: ReactNode;
	readonly kpiCards?: ReactNode | undefined;
	readonly desktopContent?: ReactNode | undefined;
	readonly mobileContent?: ReactNode | undefined;
	readonly footer?: ReactNode | undefined;
	readonly loading: boolean;
	readonly hasReport: boolean;
}

export const PnlModalContainer: React.FC<PnlModalContainerProps> = ({
	isOpen,
	onClose,
	header,
	kpiCards,
	desktopContent,
	mobileContent,
	footer,
	loading,
	hasReport,
}) => {
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="pnl-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="pnl-modal-dialog"
				role="dialog"
				aria-modal="true"
				aria-label="Управленческий отчет P&L"
			>
				{header}
				{kpiCards}

				<div className="pnl-content">
					{loading && !hasReport ? (
						<div className="pnl-loading-state">
							<RefreshCw size={24} className="animate-spin text-blue-600 mb-2" />
							<span>Формирование отчета P&L по кассам и статьям...</span>
						</div>
					) : (
						<>
							<div className="pnl-desktop-view">{desktopContent}</div>
							<div className="pnl-mobile-view-wrapper">{mobileContent}</div>
						</>
					)}
				</div>

				{footer}
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
