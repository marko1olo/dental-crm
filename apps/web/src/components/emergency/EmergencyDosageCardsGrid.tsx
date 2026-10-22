/**
 * Emergency Dosage Cards Grid (Layer 4)
 * Real-time weight-adjusted dosage cards for essential resuscitation drugs.
 */

import React from 'react';
import type { EmergencyScenarioId } from './emergencyRescuePresets';
import type { calculateAllEmergencyDosages, calculateLipidRescueDoses } from './emergencyRescueEngine';
import { EmergencyDrugCardItem } from './emergencyModules/EmergencyDrugCardItem';
import './emergencyDosages.css';

export interface EmergencyDosageCardsGridProps {
	activeScenarioId?: EmergencyScenarioId;
	patientWeightKg: number;
	patientAgeYears: number;
	allDosages: ReturnType<typeof calculateAllEmergencyDosages>;
	lipidRescueData?: ReturnType<typeof calculateLipidRescueDoses>;
}

export function EmergencyDosageCardsGrid({
	activeScenarioId,
	allDosages,
	lipidRescueData,
}: EmergencyDosageCardsGridProps) {
	const isLast = activeScenarioId === 'local_anesthetic_toxicity';

	return (
		<div className="emergency-dosage-cards-grid">
			{isLast && lipidRescueData ? (
				<>
					<EmergencyDrugCardItem
						isPrimary
						name="Липидная эмульсия 20% (Липофундин)"
						priorityBadge="Антидот"
						priorityClass="first-line"
						doseVal={`${lipidRescueData.bolusVolumeMl} мл`}
						doseSub="(болюс за 1–2 мин)"
						route={`В/В инфузия: ${lipidRescueData.infusionRateMlPerHour} мл/час (${lipidRescueData.infusionRateMlPerMin} мл/мин)`}
						note={`Макс доза: ${lipidRescueData.maxTotalDoseMl} мл (12 мл/кг)`}
					/>
					<EmergencyDrugCardItem
						name="Диазепам 0.5% (Реланиум)"
						priorityBadge="При судорогах"
						doseVal={`${allDosages.diazepam_relanium.calculatedDoseMg} мг`}
						doseSub={`(${allDosages.diazepam_relanium.calculatedVolumeMl} мл)`}
						route="В/В медленно (не более 2.5 мг/мин)"
						note="Купирование судорожного синдрома"
					/>
				</>
			) : null}

			<EmergencyDrugCardItem
				isPrimary
				name="Адреналин 0.1% (Эпинефрин)"
				priorityBadge="1-я линия"
				priorityClass="first-line"
				doseVal={`${allDosages.adrenaline_epi_01.calculatedVolumeMl} мл`}
				doseSub={`(${allDosages.adrenaline_epi_01.calculatedDoseMg} мг)`}
				route="В/М в среднюю треть переднебоковой поверхности бедра"
				note="1-я линия при анафилаксии. Повтор через 5–15 мин при гипотонии."
			/>

			<EmergencyDrugCardItem
				name="Преднизолон 30 мг/мл (ГКС)"
				priorityBadge="2-я линия"
				doseVal={`${allDosages.prednisolone_30mg.calculatedDoseMg} мг`}
				doseSub={`(${allDosages.prednisolone_30mg.calculatedVolumeMl} мл / ${allDosages.prednisolone_30mg.numberOfAmpoules} амп.)`}
				route="В/В струйно медленно за 2–3 мин на 10 мл 0.9% NaCl (или в/м)"
				note="Профилактика второй волны шока."
			/>

			<EmergencyDrugCardItem
				name="Сальбутамол аэрозоль 100 мкг"
				priorityBadge="Бронходилататор"
				doseVal="2–4 дозы"
				doseSub="(ингаляционно)"
				route="Ингаляция через рот (желательно со спейсером)"
				note="При остром бронхоспазме и приступе удушья."
			/>

			<EmergencyDrugCardItem
				name="Нитроглицерин 0.5 мг"
				priorityBadge="ОКС"
				doseVal="0.5 мг"
				doseSub="(1 таб. / спрей)"
				route="Сублингвально строго сидя (при АД сист > 100)"
				note="При давящей боли за грудиной и подозрении на инфаркт."
			/>

			<EmergencyDrugCardItem
				name="Супрастин 2% (Хлоропирамин)"
				priorityBadge="Антигистамин"
				doseVal={`${allDosages.suprastin_2_percent.calculatedVolumeMl} мл`}
				doseSub={`(${allDosages.suprastin_2_percent.calculatedDoseMg} мг)`}
				route="В/М глубоко"
				note="Вводить строго ПОСЛЕ адреналина и стабилизации давления!"
			/>

			<EmergencyDrugCardItem
				name="Глюкоза (Декстроза) 40%"
				priorityBadge="Гипогликемия"
				doseVal={`${allDosages.glucose_dextrose_40.calculatedVolumeMl} мл`}
				doseSub="(в/в струйно)"
				route="В/В струйно медленно"
				note="До восстановления сознания при гипогликемической коме."
			/>
		</div>
	);
}
