import { PenTool, Printer, Smartphone } from "lucide-react";
import React from "react";

export interface ConsentMethodTabsProps {
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentMethodTabs: React.FC<ConsentMethodTabsProps> = ({
	verificationMethod,
	setVerificationMethod,
}) => {
	return (
		<div
			className="dente-segmented-bar w-full shrink-0"
			role="tablist"
			aria-label="Способ подтверждения согласия"
		>
			<button
				type="button"
				data-testid="tab-method-tablet"
				role="tab"
				aria-selected={verificationMethod === "tablet_stylus"}
				className={`dente-segmented-item flex-1 ${
					verificationMethod === "tablet_stylus" ? "active" : ""
				}`}
				onClick={() => setVerificationMethod("tablet_stylus")}
			>
				<PenTool size={14} className="shrink-0" />
				<span className="whitespace-nowrap">
					<span className="sm:hidden">Планшет</span>
					<span className="hidden sm:inline">Подписать на планшете</span>
				</span>
			</button>

			<button
				type="button"
				data-testid="tab-method-paper"
				role="tab"
				aria-selected={verificationMethod === "paper_physical"}
				className={`dente-segmented-item flex-1 ${
					verificationMethod === "paper_physical" ? "active" : ""
				}`}
				onClick={() => setVerificationMethod("paper_physical")}
			>
				<Printer size={14} className="shrink-0" />
				<span className="whitespace-nowrap">
					<span className="sm:hidden">Бумага</span>
					<span className="hidden sm:inline">Распечатать на бумаге</span>
				</span>
			</button>

			<button
				type="button"
				data-testid="tab-method-sms"
				role="tab"
				aria-selected={verificationMethod === "sms_otp"}
				className={`dente-segmented-item flex-1 ${
					verificationMethod === "sms_otp" ? "active" : ""
				}`}
				onClick={() => setVerificationMethod("sms_otp")}
			>
				<Smartphone size={14} className="shrink-0" />
				<span className="whitespace-nowrap">
					<span className="sm:hidden">СМС</span>
					<span className="hidden sm:inline">Код из СМС</span>
				</span>
			</button>
		</div>
	);
};
