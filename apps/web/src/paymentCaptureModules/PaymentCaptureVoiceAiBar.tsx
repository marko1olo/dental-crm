import { Bot } from "lucide-react";
import React from "react";
import { DictationHints } from "../DictationHints";
import { SmartMicrophoneButton } from "../components/SmartMicrophoneButton";
import { SmartParsePreview } from "../SmartParsePreview";
import { textToNumbers } from "../lib/stringUtils";

export type PaymentCaptureVoiceAiBarProps = {
	smartInputText: string;
	setSmartInputText: React.Dispatch<React.SetStateAction<string>>;
	showHints: boolean;
	setShowHints: React.Dispatch<React.SetStateAction<boolean>>;
	showSmartPreview: boolean;
	setShowSmartPreview: React.Dispatch<React.SetStateAction<boolean>>;
	// biome-ignore lint/suspicious/noExplicitAny: AI parsed schema
	smartParsedData: any;
	handleSmartDictation: (text: string) => void;
};

export function PaymentCaptureVoiceAiBar({
	smartInputText,
	setSmartInputText,
	showHints,
	setShowHints,
	showSmartPreview,
	setShowSmartPreview,
	smartParsedData,
	handleSmartDictation,
}: PaymentCaptureVoiceAiBarProps) {
	return (
		<>
			<div
				className="smart-ai-booking payment-smart-ai-booking col-span-full"
				style={{
					gridColumn: "1 / -1",
					marginBottom: "2px",
					border: "1px solid var(--line-strong)",
					boxShadow: "0 2px 8px rgba(13, 148, 136, 0.05)",
					borderRadius: "8px",
					padding: "3px 8px",
					background: "var(--paper)",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: "6px",
					minHeight: "30px",
				}}
			>
				<Bot size={15} color="var(--teal-dark)" className="shrink-0" />
				<div style={{ position: "relative", flex: 1, minWidth: 0 }}>
					<input
						type="text"
						value={smartInputText}
						placeholder="Пример: Оплата 5000 картой..."
						onFocus={() => setShowHints(true)}
						onBlur={() => setTimeout(() => setShowHints(false), 200)}
						onChange={(e) => setSmartInputText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && smartInputText.trim()) {
								e.preventDefault();
								handleSmartDictation(smartInputText);
							}
						}}
						style={{
							width: "100%",
							border: "none",
							background: "transparent",
							outline: "none",
							fontSize: "11.5px",
							paddingRight: "6px",
							boxSizing: "border-box",
							fontFamily: "inherit",
							color: "var(--ink)",
						}}
					/>
					<DictationHints isVisible={showHints && !smartInputText} type="payment" />
				</div>
				<SmartMicrophoneButton
					context="payment"
					onResult={(t) => {
						const normalized = textToNumbers(t);
						setSmartInputText(normalized);
						handleSmartDictation(normalized);
					}}
					style={{ color: "var(--teal-dark)", background: "transparent", border: "none" }}
					className="icon-button"
				/>
			</div>

			{showSmartPreview && smartParsedData && (
				<div className="col-span-full" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
					<SmartParsePreview
						parsedData={smartParsedData}
						rawText={smartInputText}
						type="visit"
						isVisible={showSmartPreview}
						onClose={() => setShowSmartPreview(false)}
						onApply={() => setShowSmartPreview(false)}
						onManual={() => setShowSmartPreview(false)}
					/>
				</div>
			)}
		</>
	);
}
