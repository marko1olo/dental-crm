/**
 * AnesthesiaOnsetTimerWidget.tsx — Live Onset Countdown Timer for Dental Anesthesia
 * Standards: Минздрав РФ, СтАР
 */

import React from 'react';
import { Pause, Play, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';
import { TechniqueSpecification } from './anesthesiaTechniqueTypes';

export interface AnesthesiaOnsetTimerWidgetProps {
	readonly currentTechnique: TechniqueSpecification;
	readonly timerSecondsLeft: number;
	readonly isTimerRunning: boolean;
	readonly timerCompleted: boolean;
	readonly soundEnabled: boolean;
	readonly onToggleSound: () => void;
	readonly onToggleTimer: () => void;
	readonly onAddMinute: () => void;
	readonly onResetTimer: () => void;
}

export const AnesthesiaOnsetTimerWidget: React.FC<AnesthesiaOnsetTimerWidgetProps> = ({
	currentTechnique,
	timerSecondsLeft,
	isTimerRunning,
	timerCompleted,
	soundEnabled,
	onToggleSound,
	onToggleTimer,
	onAddMinute,
	onResetTimer,
}) => {
	const minutes = Math.floor(timerSecondsLeft / 60);
	const seconds = timerSecondsLeft % 60;
	const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

	return (
		<div
			className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
				timerCompleted
					? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30'
					: isTimerRunning
						? 'bg-blue-950/20 border-blue-500/50'
						: 'bg-zinc-900/50 border-zinc-800'
			}`}
		>
			<div className="flex items-center justify-between w-full text-xs font-semibold text-zinc-300">
				<div className="flex items-center gap-1.5">
					<Timer className="w-4 h-4 text-blue-400" />
					<span>Таймер наступления блокады:</span>
				</div>
				<button
					type="button"
					onClick={onToggleSound}
					className="p-1 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
					title={soundEnabled ? 'Звук включен' : 'Звук выключен'}
				>
					{soundEnabled ? (
						<Volume2 className="w-4 h-4 text-emerald-400" />
					) : (
						<VolumeX className="w-4 h-4" />
					)}
				</button>
			</div>

			{/* Giant Digital Readout */}
			<div className="flex flex-col items-center">
				<div
					className={`text-4xl sm:text-5xl font-black font-mono tracking-wider ${
						timerCompleted
							? 'text-emerald-400 animate-pulse'
							: isTimerRunning
								? 'text-blue-400'
								: 'text-zinc-300'
					}`}
				>
					{formattedTime}
				</div>
				<div className="text-[11px] text-zinc-400 mt-1 text-center">
					{timerCompleted
						? '🎉 Анестезия наступила! Можно препарировать'
						: isTimerRunning
							? `Ожидание диффузии: ${currentTechnique.shortNameRu}`
							: `Рекомендовано: ${Math.round(currentTechnique.onsetMinutes.defaultWaitTimeSec / 60)} мин`}
				</div>
			</div>

			{/* Timer Controls */}
			<div className="flex items-center gap-2 w-full">
				<button
					type="button"
					onClick={onToggleTimer}
					className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-[44px] ${
						isTimerRunning
							? 'bg-amber-600 hover:bg-amber-500 text-white'
							: 'bg-blue-600 hover:bg-blue-500 text-white'
					}`}
				>
					{isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
					<span>{isTimerRunning ? 'Пауза' : 'Запустить таймер'}</span>
				</button>

				<button
					type="button"
					onClick={onAddMinute}
					className="p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
					title="+1 минута"
				>
					+1м
				</button>

				<button
					type="button"
					onClick={onResetTimer}
					className="p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
					title="Сброс таймера"
				>
					<RotateCcw className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
