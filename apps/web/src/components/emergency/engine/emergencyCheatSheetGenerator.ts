/**
 * Emergency SMP 112 Dispatch Cheat Sheet Generator (Layer 2)
 * Instant telephone cheat sheet for reading to emergency dispatchers.
 */

import type { EmergencyIncidentInput } from '../emergencyModules/emergencyIncidentTypes';
import { EMERGENCY_SCENARIOS } from '../emergencyRescuePresets';

export function generateSmpDispatchCheatSheet(input: EmergencyIncidentInput): string {
	const scenario = EMERGENCY_SCENARIOS[input.scenarioId];
	const accessDetails = [
		input.entranceNumber ? `подъезд/вход ${input.entranceNumber}` : '',
		input.floorNumber ? `этаж ${input.floorNumber}` : '',
		input.intercomCode ? `домофон/код ${input.intercomCode}` : '',
	].filter(Boolean).join(', ');

	const addressLine = `${input.clinicAddress}, Кабинет № ${input.cabinetNumber || '1'}${accessDetails ? ` (${accessDetails})` : ''}.`;

	return (
		`[ЭКСТРЕННО] ТЕКСТ ДЛЯ ДИСПЕТЧЕРА СКОРОЙ ПОМОЩИ (103 / 112):\n\n` +
		`1. АДРЕС: ${addressLine}\n` +
		`2. КТО ВЫЗЫВАЕТ: Врач-стоматолог ${input.doctorFullName}, клиника «${input.clinicName}».\n` +
		`3. ПАЦИЕНТ: ${input.patientFullName}, ${input.patientAgeYears} лет (${input.patientGender === 'male' ? 'мужчина' : 'женщина'}), вес ${input.patientWeightKg} кг.\n` +
		`4. ЧТО СЛУЧИЛОСЬ: ${scenario.nameRu} (${scenario.icd10Code}).\n` +
		`5. СОСТОЯНИЕ: АД ${input.initialVitals.bpSystolic}/${input.initialVitals.bpDiastolic} мм рт. ст., Пульс ${input.initialVitals.hr} уд/мин, SpO2 ${input.initialVitals.spo2}%, Сознание: ${input.initialVitals.consciousnessRu}.\n` +
		`6. ЧТО УЖЕ ВВЕДЕНО: ${scenario.actionSteps[2]?.dosageHintRu || 'Начата реанимационная терапия по приказу МЗ РФ'}.\n` +
		`7. ТРЕБУЕТСЯ: Экстренная реанимационная бригада!`
	);
}
