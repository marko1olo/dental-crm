/**
 * @file TelephonyActiveCallHud.tsx
 * @description Layer 4: Presentation subcomponent for active call in-flight controls.
 * Features call duration timer, line toggles, Hold, Mute, Transfer panel, and End call CTA.
 */

import {
	Mic,
	MicOff,
	Pause,
	PhoneForwarded,
	PhoneOff,
	Play,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { formatDurationTimer } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import type { TelephonyActiveCallHudProps } from "./types";

export function TelephonyActiveCallHud({
	isCallAnswered,
	elapsedSeconds,
	isHeld,
	onToggleHold,
	isMuted,
	onToggleMute,
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSetTransferType,
	onStartTransfer,
	onEndCall,
	activeLineId,
	onSwitchLine,
	line1,
	line2,
}: TelephonyActiveCallHudProps) {
	const [transferExt, setTransferExt] = useState("");
	const transferInputRef = useRef<HTMLInputElement | null>(null);

	const handleConfirmTransfer = () => {
		if (!transferExt.trim()) {
			transferInputRef.current?.focus();
			showToast("Укажите добавочный номер врача (например, 101)", "warning");
			return;
		}
		onStartTransfer(transferExt.trim(), transferType);
		setTransferExt("");
	};

	return (
		<div className="dnt-hud-card" data-testid="telephony-active-call-hud">
			{/* Action Control Buttons (Hold, Mute, Transfer, Hangup) */}
			<div className="dnt-hud-controls-grid">
				<button
					type="button"
					onClick={onToggleHold}
					className={`dnt-hud-btn ${isHeld ? "dnt-hud-btn--active-amber" : ""}`}
					title={isHeld ? "Снять с удержания" : "Поставить на удержание"}
				>
					{isHeld ? <Play size={15} /> : <Pause size={15} />}
					<span>{isHeld ? "В эфир" : "Удержание"}</span>
				</button>

				<button
					type="button"
					onClick={onToggleMute}
					className={`dnt-hud-btn ${isMuted ? "dnt-hud-btn--active-rose" : ""}`}
					title={isMuted ? "Включить микрофон" : "Отключить микрофон"}
				>
					{isMuted ? <MicOff size={15} /> : <Mic size={15} />}
					<span>{isMuted ? "Звук выкл" : "Микрофон"}</span>
				</button>

				<button
					type="button"
					onClick={onToggleTransferPanel}
					className={`dnt-hud-btn ${showTransferPanel ? "dnt-hud-btn--active-teal" : ""}`}
					title="Перевести звонок врачу или в регистратуру"
				>
					<PhoneForwarded size={15} />
					<span>Перевод</span>
				</button>

				<button
					type="button"
					onClick={onEndCall}
					className="dnt-hud-btn dnt-hud-btn--danger"
					title="Завершить вызов"
				>
					<PhoneOff size={15} />
					<span>Сбросить</span>
				</button>
			</div>

			{/* Call Transfer Slide-down Drawer Panel */}
			{showTransferPanel && (
				<div className="dnt-transfer-drawer">
					<div className="dnt-segmented-group">
						<button
							type="button"
							onClick={() => onSetTransferType("blind")}
							className={`dnt-status-chip ${
								transferType === "blind" ? "dnt-status-chip--active" : ""
							}`}
						>
							Прямой перевод
						</button>
						<button
							type="button"
							onClick={() => onSetTransferType("attended")}
							className={`dnt-status-chip ${
								transferType === "attended" ? "dnt-status-chip--active" : ""
							}`}
						>
							С консультацией
						</button>
					</div>

					<div className="flex items-center gap-2 mt-2">
						<input
							ref={transferInputRef}
							type="text"
							value={transferExt}
							onChange={(e) => setTransferExt(e.target.value)}
							placeholder="Внутренний номер (101, 102...)"
							className="dnt-text-input flex-1"
						/>
						<button
							type="button"
							onClick={handleConfirmTransfer}
							className="dnt-cta-primary"
						>
							<PhoneForwarded size={14} />
							<span>Перевести</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
