import React from 'react';
import { Gauge, Thermometer, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AutoclaveCycleDefinition } from './autoclavePresets';

export interface AutoclaveSensorGaugeProps {
	cycle: AutoclaveCycleDefinition;
	currentTemperature: number;
	currentPressure: number;
	elapsedPlateauMinutes: number;
	isCycleActive: boolean;
	cycleStage: 'standby' | 'fractionated_vacuum' | 'heating' | 'sterilization_plateau' | 'venting' | 'vacuum_drying' | 'complete' | 'aborted';
}

export function AutoclaveSensorGauge({
	cycle,
	currentTemperature,
	currentPressure,
	elapsedPlateauMinutes,
	isCycleActive,
	cycleStage
}: AutoclaveSensorGaugeProps) {
	const isTempOk =
		currentTemperature >= cycle.temperatureToleranceCelsius.min &&
		currentTemperature <= cycle.temperatureToleranceCelsius.max;

	const isPressureOk =
		currentPressure >= cycle.pressureToleranceBar.min &&
		currentPressure <= cycle.pressureToleranceBar.max;

	const plateauPercent = Math.min(100, Math.round((elapsedPlateauMinutes / cycle.plateauTimeMinutes) * 100));

	const stageLabelsRu: Record<string, string> = {
		standby: 'Ожидание запуска',
		fractionated_vacuum: `Фракционированный вакуум (3-5 пульсаций)`,
		heating: 'Нагрев и подача насыщенного пара',
		sterilization_plateau: `Стерилизационная выдержка (${cycle.targetTemperatureCelsius}°C)`,
		venting: 'Сброс давления',
		vacuum_drying: `Вакуумная сушка (${cycle.dryingTimeMinutes} мин)`,
		complete: 'Цикл успешно завершен',
		aborted: 'Аварийная остановка'
	};

	return (
		<div className="autoclave-gauges-container">
			{/* Temperature Gauge Panel */}
			<div className="gauge-panel">
				<div className="gauge-title" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
					<Thermometer size={16} />
					Температура камеры (°C)
				</div>
				<div className={`gauge-val-display ${!isCycleActive ? '' : isTempOk ? 'gauge-status-ok' : 'gauge-status-warn'}`}>
					{currentTemperature.toFixed(1)}°C
				</div>
				<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', textAlign: 'center' }}>
					Номинал: {cycle.targetTemperatureCelsius}°C (Допуск: {cycle.temperatureToleranceCelsius.min}..{cycle.temperatureToleranceCelsius.max}°C)
				</div>
			</div>

			{/* Pressure Gauge Panel */}
			<div className="gauge-panel">
				<div className="gauge-title" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
					<Gauge size={16} />
					Давление пара (бар)
				</div>
				<div className={`gauge-val-display ${!isCycleActive ? '' : isPressureOk ? 'gauge-status-ok' : 'gauge-status-warn'}`}>
					{currentPressure.toFixed(2)} бар
				</div>
				<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', textAlign: 'center' }}>
					Номинал: {cycle.targetPressureBar} бар (Допуск: {cycle.pressureToleranceBar.min}..{cycle.pressureToleranceBar.max} бар)
				</div>
			</div>

			{/* Plateau Progress & Cycle Stage */}
			<div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
					<span style={{ fontWeight: 600 }}>Этап: {stageLabelsRu[cycleStage] || cycleStage}</span>
					<span>
						Выдержка: {elapsedPlateauMinutes.toFixed(1)} / {cycle.plateauTimeMinutes} мин ({plateauPercent}%)
					</span>
				</div>
				<div style={{ width: '100%', height: '8px', background: 'var(--line, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
					<div
						style={{
							height: '100%',
							width: `${plateauPercent}%`,
							background: cycleStage === 'complete' ? 'var(--ok, #10b981)' : 'var(--brand-500, #3b82f6)',
							transition: 'width 0.3s ease'
						}}
					/>
				</div>
			</div>
		</div>
	);
}
