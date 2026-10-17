/**
 * @file TelephonyActiveCallHud.tsx
 * @description Layer 4: Presentation subcomponent for active call in-flight controls.
 * Features call duration timer, line toggles, Hold, Mute, Transfer panel, and End call CTA.
 */

import { Mic, MicOff, Pause, PhoneForwarded, PhoneOff, Play } from "lucide-react";
import React from "react";
import { TelephonyActiveCallHudTransfer } from "./TelephonyActiveCallHudTransfer";
import type { TelephonyActiveCallHudProps } from "./types";

export function TelephonyActiveCallHud({
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
}: TelephonyActiveCallHudProps) {
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
				<TelephonyActiveCallHudTransfer
					transferType={transferType}
					onSetTransferType={onSetTransferType}
					onStartTransfer={onStartTransfer}
				/>
			)}
		</div>
	);
}
