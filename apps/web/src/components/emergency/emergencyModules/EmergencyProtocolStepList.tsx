/**
 * Russian Dental Emergency Clinical Protocols & Resuscitation Suite
 * Layer 4: Emergency Protocol Step List (Checklist of resuscitation actions per Order 786n / 1079n / FAR)
 */

import React from 'react';
import { Activity, Check, Syringe } from 'lucide-react';
import type { EmergencyActionStep } from '../emergencyRescuePresets';
import type { EmergencyProtocolStepListProps } from './emergencyRescueTypes';

export function EmergencyProtocolStepList({
	actionSteps,
	completedStepIds,
	onToggleStep,
}: EmergencyProtocolStepListProps): React.ReactElement {
	return (
		<div className="emergency-section-box">
			<h3 className="emergency-section-title">
				<Activity size={18} />
				Шаговый чек-лист реанимационных действий (Минздрав РФ)
			</h3>

			<div className="emergency-checklist">
				{actionSteps.map((step: EmergencyActionStep) => {
					const isCompleted = !!completedStepIds[step.id];
					const timeCompleted = completedStepIds[step.id];

					return (
						<div
							key={step.id}
							className={`emergency-step-item ${step.isCritical ? 'critical' : ''} ${isCompleted ? 'completed' : ''}`}
							onClick={() => onToggleStep(step.id)}
						>
							<input
								type="checkbox"
								className="emergency-step-checkbox"
								checked={isCompleted}
								onChange={() => onToggleStep(step.id)}
								onClick={(e) => e.stopPropagation()}
							/>

							<div className="emergency-step-content">
								<div className="emergency-step-header">
									<div className="emergency-step-title">
										{step.order}. {step.titleRu}
									</div>
									{isCompleted && (
										<span className="emergency-step-time-badge">
											<Check size={11} className="inline mr-0.5" />
											{timeCompleted}
										</span>
									)}
								</div>

								<div className="emergency-step-description min-w-0">
									{step.descriptionRu}
								</div>

								{step.dosageHintRu && (
									<div className="emergency-step-dosage-hint min-w-0">
										<Syringe size={13} className="inline mr-1" style={{ color: 'var(--ok-fg)' }} /> {step.dosageHintRu}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
