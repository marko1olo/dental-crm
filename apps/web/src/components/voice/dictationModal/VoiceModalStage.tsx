/**
 * VoiceModalStage.tsx — Сцена записи с кнопкой SmartMic и легковесным CSS/SVG VU-метром.
 * Мандат 8ap: Ноль Canvas-симуляторов! Строго <= 120 строк по Мандату 8b.
 */

import { Mic, MicOff } from "lucide-react";
import { voiceMeterHeights } from "../../workspaceActions/voiceMeter";

interface VoiceModalStageProps {
	isListening: boolean;
	isProcessing: boolean;
	audioVolume: number;
	onToggleListening: () => void;
}

const VU_BARS_COUNT = 16;

export function VoiceModalStage({
	isListening,
	isProcessing,
	audioVolume,
	onToggleListening,
}: VoiceModalStageProps) {
	const meterBars = voiceMeterHeights(isListening ? audioVolume : 0, VU_BARS_COUNT);

	return (
		<div className="dnt-voice-rec-stage">
			<button
				type="button"
				onClick={onToggleListening}
				disabled={false}
				className={`dnt-voice-mic-button ${isListening ? "dnt-voice-mic-button--listening" : ""} ${isProcessing ? "dnt-voice-mic-button--processing" : ""}`}
				aria-pressed={isListening}
				aria-label={isListening ? "Остановить запись" : "Начать запись"}
				title={isListening ? "Остановить запись" : "Начать запись"}
			>
				{isListening ? <MicOff size={34} aria-hidden="true" /> : <Mic size={34} aria-hidden="true" />}
			</button>

			<div>
				<div className="dnt-voice-rec-status-label">
					{isListening ? "Слушаю врача..." : isProcessing ? "Подключение микрофона..." : "Нажмите для начала голосовой диктовки"}
				</div>
				<div className="dnt-voice-rec-status-sub">
					{isListening
						? "Говорите команды (например: «Зуб 46 кариес дентина, анестезия убистезин»)"
						: "Автоматическое распознавание номеров зубов, диагнозов и дневника приёма"}
				</div>
			</div>

			{/* Легковесный CSS/SVG VU-метр без нагрузки на GPU и батарею ноутбука врача */}
			<div className="dnt-voice-vu-container" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
				<div className="dnt-voice-meter-bars" aria-hidden="true">
					{meterBars.map((height, idx) => (
						<div
							key={`meter-bar-${idx}`}
							className={`dnt-voice-meter-bar ${isListening && height > 25 ? "dnt-voice-meter-bar--active" : ""}`}
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
