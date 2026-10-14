/**
 * Russian Dental Emergency Rescue & Resuscitation HUD Modal (Минздрав РФ / ФАР / СтАР)
 * Layer 5: Canonical Master Coordinator & Presentation Facade (<= 250 lines)
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertOctagon, PhoneCall, X, ShieldAlert } from 'lucide-react';
import { EmergencyScenarioId, EMERGENCY_SCENARIOS } from './emergencyRescuePresets';
import { EmergencyDosageCardsGrid } from './EmergencyDosageCardsGrid';
import { EmergencyProtocolHandoverBox } from './EmergencyProtocolHandoverBox';
import {
	type EmergencyRelativeNoticeParams,
	formatEmergencyRelativeNotice,
	type EmergencyRescueModalProps
} from './emergencyModules/emergencyRescueTypes';
import { EmergencyProtocolStepList } from './emergencyModules/EmergencyProtocolStepList';
import { EmergencyResuscitationTools } from './emergencyModules/EmergencyResuscitationTools';
import { EmergencyVitalsSection } from './emergencyModules/EmergencyVitalsSection';
import { useEmergencyRescueLogic } from './emergencyModules/useEmergencyRescueLogic';
import './emergencyRescue.css';

export { EmergencyDosageCardsGrid, EmergencyProtocolHandoverBox };
export { formatEmergencyRelativeNotice };
export { calculateAllEmergencyDosages } from './emergencyRescueEngine';
export type { EmergencyRelativeNoticeParams, EmergencyRescueModalProps };

/**
 * ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА
 * УКЛАДКА ЭКСТРЕННОЙ ПОМОЩИ (ПРИКАЗ МЗ РФ № 786н / 1144н)
 */
const SCENARIO_SHORT_NAMES: Record<EmergencyScenarioId, string> = {
	anaphylactic_shock: 'Анафилаксия',
	local_anesthetic_toxicity: 'Токсичность анестетиков',
	syncope_collapse: 'Обморок / Коллапс',
	hypertensive_crisis: 'Гипертонический криз',
	angina_myocardial_infarction: 'Стенокардия',
	bronchospasm_asthma: 'Бронхоспазм',
	hypoglycemia_diabetic: 'Гипогликемия',
	accidental_swallowing: 'Аспирация',
};

export function EmergencyRescueModal(props: EmergencyRescueModalProps): React.ReactElement | null {
	const { isOpen, onClose, onApplyToDiary } = props;
	const logic = useEmergencyRescueLogic(props);

	const [adrenalineTimerSeconds, setAdrenalineTimerSeconds] = useState<number>(300);
	const [isAdrenalineTimerRunning, setIsAdrenalineTimerRunning] = useState<boolean>(false);
	const [isAdrenalineDue, setIsAdrenalineDue] = useState<boolean>(false);

	const copyActTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyCheatSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setIsAdrenalineTimerRunning(false);
			return;
		}
		let intervalId: ReturnType<typeof setInterval> | null = null;
		if (isAdrenalineTimerRunning) {
			intervalId = setInterval(() => {
				setAdrenalineTimerSeconds((prev) => {
					if (prev <= 1) {
						setIsAdrenalineTimerRunning(false);
						setIsAdrenalineDue(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isOpen, isAdrenalineTimerRunning]);

	if (!isOpen) return null;

	return (
		<div className="emergency-modal-overlay" role="dialog" aria-modal="true">
			<div className="emergency-modal-container">
				<header className="emergency-modal-header">
					<div className="emergency-header-title-area">
						<AlertOctagon size={28} className="emergency-header-alert-icon" />
						<div>
							<h2 className="emergency-header-title" aria-label="ЭКСТРЕННЫЙ РЕАНИМАЦИОННЫЙ HUD">
								Экстренная помощь у кресла
							</h2>
							<span className="emergency-header-badge" data-statutory="786н">
								<ShieldAlert size={13} />
								Протоколы реанимации
							</span>
						</div>
					</div>
					<div className="emergency-header-actions">
						<button
							type="button"
							className="emergency-call-112-btn"
							onClick={logic.handleCallSmpCheatSheet}
							data-testid="emergency-call-112-header-btn"
							title="Шпаргалка вызова 103 / 112 (быстрое копирование для диспетчера)"
						>
							<PhoneCall size={18} />
							ВЫЗОВ СМП (103 / 112)
						</button>
						<button type="button" className="emergency-close-btn" onClick={onClose} aria-label="Закрыть">
							<X size={20} />
						</button>
					</div>
				</header>

				<div className="emergency-scenarios-strip" role="tablist" aria-label="Категории укладок неотложной помощи">
					{(Object.keys(EMERGENCY_SCENARIOS) as EmergencyScenarioId[]).map((scId) => {
						const scenario = EMERGENCY_SCENARIOS[scId];
						const isActive = scenario.id === logic.activeScenarioId;
						const shortName = SCENARIO_SHORT_NAMES[scenario.id] || scenario.nameRu;
						return (
							<button
								key={scenario.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`emergency-scenario-card ${isActive ? 'active' : ''}`}
								onClick={() => logic.setActiveScenarioId(scenario.id)}
								title={`${scenario.nameRu} (${scenario.icd10Code}) — ${scenario.subtitleRu}`}
							>
								<div className="emergency-scenario-name min-w-0">
									<span className="min-w-0">{shortName}</span>
									<span className="emergency-scenario-icd">{scenario.icd10Code}</span>
								</div>
								<div className="emergency-scenario-subtitle">{scenario.subtitleRu}</div>
							</button>
						);
					})}
				</div>

				<div className="emergency-modal-body">
					<div className="emergency-column-left">
						<EmergencyDosageCardsGrid
							activeScenarioId={logic.activeScenarioId}
							patientWeightKg={logic.patientWeightKg}
							patientAgeYears={logic.patientAgeYears}
							allDosages={logic.allDosages}
							lipidRescueData={logic.lipidRescueData}
						/>
						<EmergencyVitalsSection
							patientWeightKg={logic.patientWeightKg}
							setPatientWeightKg={logic.setPatientWeightKg}
							patientAgeYears={logic.patientAgeYears}
							setPatientAgeYears={logic.setPatientAgeYears}
							vitals={logic.vitals}
							setVitals={logic.setVitals}
						/>
						<EmergencyProtocolStepList
							actionSteps={logic.activeScenario.actionSteps}
							completedStepIds={logic.completedStepIds}
							onToggleStep={logic.handleToggleStep}
						/>
					</div>

					<div className="emergency-column-right">
						<EmergencyResuscitationTools
							adrenalineTimerSeconds={adrenalineTimerSeconds}
							isAdrenalineTimerRunning={isAdrenalineTimerRunning}
							isAdrenalineDue={isAdrenalineDue}
							onStartAdrenalineTimer={(sec) => { setAdrenalineTimerSeconds(sec); setIsAdrenalineTimerRunning(true); setIsAdrenalineDue(false); }}
							onResetAdrenalineTimer={() => { setIsAdrenalineTimerRunning(false); setIsAdrenalineDue(false); setAdrenalineTimerSeconds(300); }}
						/>
						<EmergencyProtocolHandoverBox
							activeProtocolTab={logic.activeProtocolTab}
							setActiveProtocolTab={logic.setActiveProtocolTab}
							completedStepsCount={logic.completedStepsList.length}
							totalStepsCount={logic.activeScenario.actionSteps.length}
							generatedActText={logic.generatedActText}
							generatedCheatSheetText={logic.generatedCheatSheetText}
							onApplyToDiary={onApplyToDiary}
							isCopiedAct={logic.isCopiedAct}
							isCopiedCheatSheet={logic.isCopiedCheatSheet}
							onApplyToForm043={logic.handleApplyToForm043}
							onCopyAct={logic.handleCopyAct}
							onPrintEmergencyAct={logic.handlePrintEmergencyAct}
							onCopyRelativeNotice={logic.handleCopyRelativeNotice}
							onCopyCheatSheet={logic.handleCopyCheatSheet}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
