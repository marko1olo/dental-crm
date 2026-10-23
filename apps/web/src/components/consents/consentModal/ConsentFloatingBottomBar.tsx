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
				disabled={isSubmitting || !isSigningReady}
				style={{
					background: isSigningReady ? "var(--teal)" : "var(--muted)",
					cursor: isSigningReady ? "pointer" : "not-allowed",
					opacity: isSigningReady ? 1 : 0.65,
				}}
			>
				<Zap size={20} />
				<span>
					{isSigningReady
						? activeMode === "packages"
							? `Подтвердить пакет (${packageDocsCount} док.)`
							: "Подтвердить согласие"
						: "Ожидает росписи пальцем / бланка"}
				</span>
			</button>
		</div>
	);
};
