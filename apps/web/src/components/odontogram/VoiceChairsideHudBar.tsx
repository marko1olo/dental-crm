/**
 * VoiceChairsideHudBar.tsx — Floating HUD for Hands-Free Chairside Sterile Voice Protocol.
 * Complies with Apple HIG touch targets (>= 44x44px), Natural Thumb Zone, Mandate 8b <= 120 lines.
 */
import React from "react";
import { Check, Mic, MicOff, X } from "lucide-react";
import { useVoiceChairsideSterileProtocol } from "../../hooks/useVoiceChairsideSterileProtocol";
import "./VoiceChairsideHudBar.css";

export function VoiceChairsideHudBar() {
	const { isListening, transcript, lastActionResult, isHudVisible, toggleListening, dismissHud } =
		useVoiceChairsideSterileProtocol();

	if (!isHudVisible && !isListening) return null;

	return (
		<aside
			role="status"
			aria-label="Голосовой протокол у кресла DENTE"
			data-testid="voice-chairside-hud-bar"
			className={`dente-voice-hud-bar ${isListening ? "dente-voice-hud-bar--listening" : ""}`}
		>
			{/* Pulsing Mic Indicator — Touch Target >= 44x44px for Nitrile Gloves (Apple HIG / Mandate 8ze) */}
			<button
				type="button"
				onClick={() => toggleListening()}
				title={isListening ? "Остановить прослушивание (F8)" : "Включить стерильный микрофон (F8)"}
				aria-label={isListening ? "Остановить прослушивание" : "Включить стерильный микрофон"}
				style={{
					display: "flex", alignItems: "center", justifyContent: "center",
					minWidth: 44, minHeight: 44, width: 44, height: 44, borderRadius: 22,
					background: isListening ? "var(--teal, #0d9488)" : "var(--paper-subtle, #374151)",
					color: isListening ? "#ffffff" : "var(--ink-muted, #9ca3af)",
					border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
					boxShadow: isListening ? "0 0 14px var(--teal, #0d9488)" : "none",
					transition: "all 0.15s ease",
				}}
			>
				{isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
			</button>

			{/* Status / Transcript / Result text */}
			<div className="dente-voice-hud-text">
				{isListening ? (
					transcript ? (
						<span style={{ fontStyle: "italic", color: "var(--ink)" }}>«{transcript}»</span>
					) : (
						<span style={{ color: "var(--teal)" }}>Слушаю врача...</span>
					)
				) : lastActionResult ? (
					<span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--teal)" }}>
						<Check size={14} />
						<span style={{ fontWeight: 500 }}>{lastActionResult.summaryText || "Команда применена"}</span>
					</span>
				) : (
					<span style={{ color: "var(--ink-muted)" }}>Стерильный режим</span>
				)}
			</div>

			{/* Quick Shortcut Badge (Desktop Only) */}
			<span
				className="dente-voice-hud-shortcut"
				style={{
					padding: "2px 6px", fontSize: 11, fontWeight: 600, borderRadius: 4,
					background: "var(--paper, #111827)", color: "var(--ink-muted, #9ca3af)",
					border: "1px solid var(--line, #374151)", letterSpacing: "0.5px", flexShrink: 0,
				}}
			>
				F8
			</span>

			{/* Close Button — Touch Target >= 44x44px (Apple HIG / Mandate 8ze) */}
			<button
				type="button"
				onClick={dismissHud}
				title="Скрыть панель (Esc)"
				aria-label="Скрыть панель"
				style={{
					display: "flex", alignItems: "center", justifyContent: "center",
					minWidth: 44, minHeight: 44, width: 44, height: 44,
					background: "transparent", color: "var(--ink-muted, #9ca3af)",
					border: "none", cursor: "pointer", borderRadius: 22, padding: 0, flexShrink: 0,
				}}
			>
				<X size={18} />
			</button>
		</aside>
	);
}
