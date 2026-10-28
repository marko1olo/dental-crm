/**
 * VoiceChairsideHudBar.tsx — Floating HUD for Hands-Free Chairside Sterile Voice Protocol.
 * Complies with Apple HIG touch targets (>= 44x44px), Natural Thumb Zone, Mandate 8b.
 */
import React from "react";
import { AlertCircle, Check, Mic, MicOff, X } from "lucide-react";
import { useVoiceChairsideSterileProtocol } from "../../hooks/useVoiceChairsideSterileProtocol";
import "./VoiceChairsideHudBar.css";

export function VoiceChairsideHudBar() {
	const {
		isListening,
		transcript,
		lastActionResult,
		errorMessage,
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
			className={`dente-voice-hud-bar ${isListening ? "dente-voice-hud-bar--listening" : ""}`}
		>
			{/* Pulsing Mic Indicator — Touch Target >= 44x44px for Nitrile Gloves (Apple HIG / Mandate 8ze) */}
			<button
				type="button"
				onClick={() => toggleListening()}
				title={isListening ? "Остановить прослушивание (F8)" : "Включить стерильный микрофон (F8)"}
				aria-label={isListening ? "Остановить прослушивание" : "Включить стерильный микрофон"}
				className={`dente-voice-hud-mic-btn ${isListening ? "dente-voice-hud-mic-btn--active" : ""}`}
			>
				{isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
			</button>

			{/* Status / Transcript / Result text / Error */}
			<div className="dente-voice-hud-text">
				{isListening ? (
					transcript ? (
						<span className="dente-voice-hud-transcript">«{transcript}»</span>
					) : (
						<span className="dente-voice-hud-listening-label">Слушаю врача...</span>
					)
				) : errorMessage ? (
					<span className="dente-voice-hud-error" title={errorMessage}>
						<AlertCircle size={15} className="shrink-0" />
						<span className="dente-voice-hud-error-msg">{errorMessage}</span>
					</span>
				) : lastActionResult ? (
					<span className="dente-voice-hud-result">
						<Check size={14} className="shrink-0" />
						<span className="dente-voice-hud-result-text">
							{lastActionResult.summaryText || "Команда применена"}
						</span>
					</span>
				) : (
					<span
						className="dente-voice-hud-idle"
						title="Стерильный голосовой режим (F8 / Alt+V)"
					>
						Нажмите F8 или говорите
					</span>
				)}
			</div>

			{/* Quick Shortcut Badge (Desktop Only) */}
			<span className="dente-voice-hud-shortcut" title="Горячая клавиша: педаль F8 или Alt+V">
				F8
			</span>

			{/* Close Button — Touch Target >= 44x44px (Apple HIG / Mandate 8ze) */}
			<button
				type="button"
				onClick={dismissHud}
				title="Скрыть панель (Esc)"
				aria-label="Скрыть панель"
				className="dente-voice-hud-close-btn"
			>
				<X size={18} />
			</button>
		</aside>
	);
}
