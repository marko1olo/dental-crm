/**
 * VoiceChairsideHudBar.tsx — Floating HUD for Hands-Free Chairside Sterile Voice Protocol.
 *
 * Allows dentist in nitrile gloves to see real-time recognized clinical actions.
 * Complies with DENTE Design System (monochrome base + teal accent, 32px height, 8px radius).
 *
 * Rules: DESIGNER_VISUAL_INQUISITION_BIBLE.md, frontend.md, <500 lines.
 */

import React from "react";
import { Check, Mic, MicOff, Volume2, X } from "lucide-react";
import { useVoiceChairsideSterileProtocol } from "../../hooks/useVoiceChairsideSterileProtocol";

export function VoiceChairsideHudBar() {
	const {
		isListening,
		transcript,
		lastActionResult,
		isHudVisible,
		toggleListening,
		dismissHud,
	} = useVoiceChairsideSterileProtocol();

	if (!isHudVisible && !isListening) return null;

	return (
		<aside
			role="status"
			aria-label="Голосовой протокол у кресла DENTE"
			data-testid="voice-chairside-hud-bar"
			style={{
				position: "fixed",
				top: 16,
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 99990,
				display: "flex",
				alignItems: "center",
				gap: 12,
				height: 38,
				padding: "0 14px",
				background: "var(--paper-strong, #1f2937)",
				color: "var(--ink, #f9fafb)",
				border: isListening ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #374151)",
				borderRadius: 20,
				boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
				fontSize: 13,
				fontFamily: "inherit",
				pointerEvents: "auto",
				animation: "denteFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
			}}
		>
			{/* Pulsing Mic Indicator */}
			<button
				type="button"
				onClick={() => toggleListening()}
				title={isListening ? "Остановить прослушивание (F8)" : "Включить стерильный микрофон (F8)"}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: 26,
					height: 26,
					borderRadius: 13,
					background: isListening ? "var(--teal, #0d9488)" : "var(--paper-subtle, #374151)",
					color: isListening ? "#ffffff" : "var(--ink-muted, #9ca3af)",
					border: "none",
					cursor: "pointer",
					padding: 0,
					transition: "background 0.15s ease",
				}}
			>
				{isListening ? (
					<Mic size={14} className="animate-pulse" />
				) : (
					<MicOff size={14} />
				)}
			</button>

			{/* Status / Transcript / Result text */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					maxWidth: 480,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				{isListening && transcript ? (
					<span style={{ fontStyle: "italic", color: "var(--ink)" }}>
						«{transcript}»
					</span>
				) : lastActionResult ? (
					<span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--teal)" }}>
						<Check size={14} />
						<span style={{ fontWeight: 500 }}>{lastActionResult.summaryText || "Команда применена"}</span>
					</span>
				) : (
					<span style={{ color: "var(--ink-muted)" }}>
						{isListening
							? "Слушаю врача... Скажите «Зуб 46 кариес жевательная» (F8)"
							: "Стерильный режим готов (F8 / Alt+V)"}
					</span>
				)}
			</div>

			{/* Quick Shortcut Badge */}
			<span
				style={{
					padding: "2px 6px",
					fontSize: 11,
					fontWeight: 600,
					borderRadius: 4,
					background: "var(--paper, #111827)",
					color: "var(--ink-muted, #9ca3af)",
					border: "1px solid var(--line, #374151)",
					letterSpacing: "0.5px",
				}}
			>
				F8
			</span>

			{/* Close Button */}
			<button
				type="button"
				onClick={dismissHud}
				title="Скрыть панель (Esc)"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: 20,
					height: 20,
					background: "transparent",
					color: "var(--ink-muted)",
					border: "none",
					cursor: "pointer",
					borderRadius: 10,
					padding: 0,
				}}
			>
				<X size={14} />
			</button>
		</aside>
	);
}
