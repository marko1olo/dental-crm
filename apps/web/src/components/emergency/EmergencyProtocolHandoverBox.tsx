import React from "react";
import { Check, Copy, FileText, Printer } from "lucide-react";

export interface EmergencyProtocolHandoverBoxProps {
	activeProtocolTab: "act" | "cheatsheet";
	setActiveProtocolTab: (tab: "act" | "cheatsheet") => void;
	completedStepsCount: number;
	totalStepsCount: number;
	generatedActText: string;
	generatedCheatSheetText: string;
	onApplyToDiary?: ((actText: string) => void) | undefined;
	isCopiedAct: boolean;
	isCopiedCheatSheet: boolean;
	onApplyToForm043: () => void;
	onCopyAct: () => void;
	onPrintEmergencyAct: () => void;
	onCopyRelativeNotice: () => void;
	onCopyCheatSheet: () => void;
}

export function EmergencyProtocolHandoverBox({
	activeProtocolTab,
	setActiveProtocolTab,
	completedStepsCount,
	totalStepsCount,
	generatedActText,
	generatedCheatSheetText,
	onApplyToDiary,
	isCopiedAct,
	isCopiedCheatSheet,
	onApplyToForm043,
	onCopyAct,
	onPrintEmergencyAct,
	onCopyRelativeNotice,
	onCopyCheatSheet,
}: EmergencyProtocolHandoverBoxProps) {
	return (
		<div className="emergency-protocol-box">
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", minWidth: 0 }}>
				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button
						type="button"
						className={`emergency-protocol-tab-btn ${activeProtocolTab === "act" ? "active-act" : ""}`}
						onClick={() => setActiveProtocolTab("act")}
					>
						Акт 043/у
					</button>
					<button
						type="button"
						className={`emergency-protocol-tab-btn ${activeProtocolTab === "cheatsheet" ? "active-cheatsheet" : ""}`}
						onClick={() => setActiveProtocolTab("cheatsheet")}
					>
						Шпаргалка 112
					</button>
				</div>

				<span className="truncate min-w-0 text-right" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
					Шагов выполнено: {completedStepsCount} из {totalStepsCount}
				</span>
			</div>

			{activeProtocolTab === "act" ? (
				<textarea
					readOnly
					className="emergency-protocol-textarea"
					value={generatedActText}
				/>
			) : (
				<textarea
					readOnly
					className="emergency-protocol-textarea"
					value={generatedCheatSheetText}
				/>
			)}

			{/* Actions: <= 2 buttons per row by Miller Law */}
			<div className="emergency-protocol-actions">
				{activeProtocolTab === "act" ? (
					<>
						{/* Row 1: Primary Clinical Action (043/у or Copy) & Ambulance Print (Mandate 8e, Miller Law <= 2) */}
						<div className="emergency-protocol-action-row primary-actions">
							{onApplyToDiary ? (
								<button
									type="button"
									className="emergency-copy-act-btn teal"
									onClick={onApplyToForm043}
									title="Вставить протокол оказания экстренной помощи в дневник карты 043/у"
								>
									<FileText size={16} />
									<span>Вставить в карту 043/у</span>
								</button>
							) : (
								<button
									type="button"
									className="emergency-copy-act-btn"
									onClick={onCopyAct}
								>
									{isCopiedAct ? <Check size={16} /> : <Copy size={16} />}
									<span>{isCopiedAct ? "Скопировано!" : "Копировать Акт"}</span>
								</button>
							)}
							<button
								type="button"
								className="emergency-copy-act-btn primary"
								onClick={onPrintEmergencyAct}
								data-testid="emergency-print-act-btn"
								title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"
							>
								<Printer size={16} />
								<span>Печать Акта (СМП)</span>
							</button>
						</div>

						{/* Row 2: Secondary Handover & Messenger Notification (Miller Law <= 2) */}
						<div className="emergency-protocol-action-row secondary-actions">
							{onApplyToDiary && (
								<button
									type="button"
									className="emergency-copy-act-btn secondary"
									onClick={onCopyAct}
									title="Скопировать текст Акта в буфер обмена"
								>
									{isCopiedAct ? <Check size={16} /> : <Copy size={16} />}
									<span>{isCopiedAct ? "Скопировано!" : "Копировать Акт"}</span>
								</button>
							)}
							<button
								type="button"
								className="emergency-copy-act-btn surface"
								onClick={onCopyRelativeNotice}
								data-testid="emergency-copy-relative-notice-btn"
								title="Скопировать экстренное извещение для родственников в WhatsApp/Telegram"
							>
								<Copy size={16} />
								<span>Извещение родственникам</span>
							</button>
						</div>
					</>
				) : (
					<button
						type="button"
						className="emergency-copy-act-btn danger"
						onClick={onCopyCheatSheet}
						data-testid="emergency-copy-cheatsheet-btn"
					>
						{isCopiedCheatSheet ? <Check size={16} /> : <Copy size={16} />}
						<span>{isCopiedCheatSheet ? "Скопировано для звонка!" : "Копировать шпаргалку 112"}</span>
					</button>
				)}
			</div>
		</div>
	);
}
