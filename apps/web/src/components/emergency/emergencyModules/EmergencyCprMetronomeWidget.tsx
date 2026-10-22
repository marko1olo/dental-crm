/**
 * CPR 30:2 Metronome Widget (Layer 4)
 * Resuscitation cadence (100–120 bpm) with visual compression pulse and 30:2 breath prompt.
 */

import React from 'react';
import { Heart, Activity, Play, Square } from 'lucide-react';

interface EmergencyCprMetronomeWidgetProps {
	isMetronomeActive: boolean;
	toggleMetronome: () => void;
	bpm: number;
	setBpm: (bpm: number) => void;
	compressionCount: number;
	isBreathPhase: boolean;
	cycleCount: number;
	isVisualPulse: boolean;
}

export function EmergencyCprMetronomeWidget({
	isMetronomeActive,
	toggleMetronome,
	bpm,
	setBpm,
	compressionCount,
	isBreathPhase,
	cycleCount,
	isVisualPulse,
}: EmergencyCprMetronomeWidgetProps) {
	return (
		<div className="emergency-cpr-metronome-widget">
			<div className="emergency-cpr-metronome-top">
				<div className="emergency-cpr-metronome-indicator">
					<div className={`emergency-cpr-pulse-disc ${isVisualPulse ? 'pulsing' : ''} ${isBreathPhase ? 'breath' : ''}`}>
						<Heart size={20} className={isVisualPulse ? 'active' : ''} />
					</div>
					<div>
						<div className="emergency-cpr-cadence-title">
							Метроном СЛР (30:2)
						</div>
						<div className="emergency-cpr-cadence-subtitle">
							{isBreathPhase ? '2 ВДОХА (ИВЛ)' : `Компрессия: ${compressionCount} / 30 (цикл ${cycleCount + 1})`}
						</div>
					</div>
				</div>

				<div className="emergency-cpr-bpm-selector">
					<button
						type="button"
						className={`emergency-cpr-bpm-chip ${bpm === 100 ? 'active' : ''}`}
						onClick={() => setBpm(100)}
						title="100 компрессий в минуту (Минздрав РФ)"
					>
						100
					</button>
					<button
						type="button"
						className={`emergency-cpr-bpm-chip ${bpm === 110 ? 'active' : ''}`}
						onClick={() => setBpm(110)}
						title="110 компрессий в минуту (Оптимум AHA / ERC)"
					>
						110
					</button>
					<button
						type="button"
						className={`emergency-cpr-bpm-chip ${bpm === 120 ? 'active' : ''}`}
						onClick={() => setBpm(120)}
						title="120 компрессий в минуту"
					>
						120
					</button>
				</div>

				<button
					type="button"
					className={`emergency-cpr-toggle-btn ${isMetronomeActive ? 'running' : ''}`}
					onClick={toggleMetronome}
					data-testid="cpr-metronome-toggle-btn"
					title={isMetronomeActive ? 'Остановить метроном СЛР' : 'Запустить звуковой метроном СЛР (110 уд/мин)'}
				>
					{isMetronomeActive ? <Square size={16} /> : <Play size={16} />}
					<span>{isMetronomeActive ? 'Стоп СЛР' : 'Старт СЛР'}</span>
				</button>
			</div>

			<div className="emergency-cpr-progress-track">
				<div
					className={`emergency-cpr-progress-fill ${isBreathPhase ? 'breath' : ''}`}
					style={{ width: `${Math.min(100, (compressionCount / 30) * 100)}%` }}
				/>
			</div>
		</div>
	);
}
