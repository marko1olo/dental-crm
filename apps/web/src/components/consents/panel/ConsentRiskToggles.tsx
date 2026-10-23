import React from "react";

export interface ConsentRiskTogglesProps {
	planAndRisksAccepted?: boolean | undefined;
	setPlanAndRisksAccepted?: ((accepted: boolean) => void) | undefined;
	alternativesUnderstood?: boolean | undefined;
	setAlternativesUnderstood?: ((understood: boolean) => void) | undefined;
}

export const ConsentRiskToggles: React.FC<ConsentRiskTogglesProps> = ({
	planAndRisksAccepted,
	setPlanAndRisksAccepted,
	alternativesUnderstood,
	setAlternativesUnderstood,
}) => {
	if (!setPlanAndRisksAccepted) return null;

	return (
		<div className="flex flex-col gap-2 pt-0.5">
			<label
				className={`consent-ios-toggle-card ${planAndRisksAccepted ? "active" : ""}`}
				data-testid="toggle-consent-plan-risks"
			>
				<input
					type="checkbox"
					className="consent-ios-checkbox"
					checked={planAndRisksAccepted}
					onChange={(e) => setPlanAndRisksAccepted(e.target.checked)}
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-snug">
						Согласен с предложенным планом лечения и возможными рисками
					</span>
					<span className="text-[11px] text-muted mt-0.5">
						Информированное добровольное согласие на медицинское вмешательство
					</span>
				</div>
			</label>

			{setAlternativesUnderstood && (
				<label
					className={`consent-ios-toggle-card ${alternativesUnderstood ? "active" : ""}`}
					data-testid="toggle-consent-alternatives"
				>
					<input
						type="checkbox"
						className="consent-ios-checkbox"
						checked={alternativesUnderstood}
						onChange={(e) => setAlternativesUnderstood(e.target.checked)}
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-snug">
							С альтернативными методами лечения и стоимостью ознакомлен
						</span>
						<span className="text-[11px] text-muted mt-0.5">
							Разъяснены последствия отказа и гарантийные обязательства клиники
						</span>
					</div>
				</label>
			)}
		</div>
	);
};
