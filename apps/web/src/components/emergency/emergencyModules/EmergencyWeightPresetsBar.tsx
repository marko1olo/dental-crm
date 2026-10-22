/**
 * Emergency Weight Presets Bar (Layer 4)
 * 1-click weight chips for instantaneous dose recalculation.
 */

import React from 'react';

interface EmergencyWeightPresetsBarProps {
	patientWeightKg: number;
	patientAgeYears: number;
	onSelectWeight: (weight: number, age: number) => void;
}

export function EmergencyWeightPresetsBar({
	patientWeightKg,
	patientAgeYears,
	onSelectWeight,
}: EmergencyWeightPresetsBarProps) {
	return (
		<div className="emergency-kit-weight-bar">
			<div className="emergency-kit-weight-label">
				<span>Масса тела для расчёта доз:</span>
				<strong>{patientWeightKg} кг ({patientAgeYears < 18 ? "ребёнок" : "взрослый"}, {patientAgeYears} л)</strong>
			</div>
			<div className="emergency-quick-weight-presets" role="group" aria-label="Быстрый выбор массы для расчета доз">
				<button
					type="button"
					className={`emergency-weight-chip ${patientWeightKg === 15 ? 'active' : ''}`}
					onClick={() => onSelectWeight(15, 4)}
					data-testid="preset-weight-15"
					title="Ребенок (15 кг, 4 года)"
				>
					15 кг (ребёнок)
				</button>
				<button
					type="button"
					className={`emergency-weight-chip ${patientWeightKg === 45 ? 'active' : ''}`}
					onClick={() => onSelectWeight(45, 14)}
					data-testid="preset-weight-45"
					title="Подросток (45 кг, 14 лет)"
				>
					45 кг (подросток)
				</button>
				<button
					type="button"
					className={`emergency-weight-chip ${patientWeightKg === 70 ? 'active' : ''}`}
					onClick={() => onSelectWeight(70, 35)}
					data-testid="preset-weight-70"
					title="Взрослый стандартный (70 кг)"
				>
					70 кг (взрослый)
				</button>
				<button
					type="button"
					className={`emergency-weight-chip ${patientWeightKg === 90 ? 'active' : ''}`}
					onClick={() => onSelectWeight(90, 50)}
					data-testid="preset-weight-90"
					title="Взрослый крупный (90 кг)"
				>
					90 кг (крупный)
				</button>
			</div>
		</div>
	);
}
