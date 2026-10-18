import React from "react";
import { FileSignature, Smartphone, CheckSquare } from "lucide-react";
import type { SignatureModeTab } from "./types";

interface SignatureTabSelectorProps {
	readonly activeTab: SignatureModeTab;
	readonly setActiveTab: (tab: SignatureModeTab) => void;
}

export const SignatureTabSelector: React.FC<SignatureTabSelectorProps> = ({
	activeTab,
	setActiveTab,
}) => {
	const tabs: Array<{ id: SignatureModeTab; label: string; icon: React.ReactNode; testId: string }> = [
		{ id: "canvas", label: "Росчерк (Стилус / Палец)", icon: <FileSignature size={15} />, testId: "tab-signature-canvas" },
		{ id: "sms", label: "Код СМС / Telegram", icon: <Smartphone size={15} />, testId: "tab-signature-sms" },
		{ id: "paper", label: "Подписано на бумаге", icon: <CheckSquare size={15} />, testId: "tab-signature-paper" },
	];

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				paddingBottom: "8px",
				borderBottom: "1px solid var(--line, #e2e8f0)",
				flexWrap: "wrap",
			}}
		>
			{tabs.map((tab) => {
				const isSelected = activeTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						style={{
							height: "36px",
							minHeight: "36px",
							padding: "0 14px",
							borderRadius: "8px",
							fontSize: "12.5px",
							fontWeight: 600,
							display: "inline-flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
							border: isSelected ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
							background: isSelected ? "var(--teal, #0d9488)" : "var(--paper-soft, #f8fafc)",
							color: isSelected ? "#ffffff" : "var(--ink, #0f172a)",
							transition: "all 0.15s ease",
						}}
						data-testid={tab.testId}
					>
						{tab.icon}
						<span>{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
};
