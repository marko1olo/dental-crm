import { Zap } from "lucide-react";
import React from "react";

export interface ConsentFloatingBottomBarProps {
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	isSigningReady: boolean;
	onConfirmSign: () => void;
}

export const ConsentFloatingBottomBar: React.FC<ConsentFloatingBottomBarProps> = ({
	activeMode,
	packageDocsCount,
	isSubmitting,
	isSigningReady,
	onConfirmSign,
}) => {
	return (
		<div className="consent-floating-bottom-bar">
			<button
				type="button"
				className="consent-mobile-primary-cta"
				data-testid="btn-confirm-sign-mobile"
				onClick={onConfirmSign}
				disabled={isSubmitting}
				style={{
					background: "var(--teal)",
					cursor: isSubmitting ? "wait" : "pointer",
					opacity: isSubmitting ? 0.75 : 1,
				}}
			>
				<Zap size={20} />
				<span>
					{activeMode === "packages"
						? `Подтвердить пакет (${packageDocsCount} док.)`
						: "Подтвердить согласие (1 клик)"}
				</span>
			</button>
		</div>
	);
};
