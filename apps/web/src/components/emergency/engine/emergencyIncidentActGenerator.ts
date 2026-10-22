/**
 * Emergency Incident Act Generator (Layer 2)
 * Generates official Russian Form 043/u incident act for ambulance handover.
 */

import type { EmergencyIncidentInput } from '../emergencyModules/emergencyIncidentTypes';
import { EMERGENCY_SCENARIOS } from '../emergencyRescuePresets';

export function generateEmergencyIncidentAct(input: EmergencyIncidentInput): string {
	const scenario = EMERGENCY_SCENARIOS[input.scenarioId];
	const startDate = typeof input.incidentStartTime === 'string'
		? new Date(input.incidentStartTime)
		: input.incidentStartTime;
	const formattedDate = startDate.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	const formattedTime = startDate.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

	const vitalsInit = input.initialVitals;
	const vitalsFinal = input.finalVitals || input.initialVitals;

	let actText = `АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ ПРИ НЕОТЛОЖНОМ СОСТОЯНИИ\n`;
	actText += `(Вкладыш в медицинскую карту стоматологического пациента 043/у)\n`;
	actText += `================================================================================\n\n`;

	actText += `1. ОБЩИЕ СВЕДЕНИЯ:\n`;
	actText += `   - Медицинская организация: ${input.clinicName || 'Стоматологическая клиника'}\n`;
	actText += `   - Адрес клиники: ${input.clinicAddress || 'г. Москва, ул. Клиническая, д. 10'}\n`;
	if (input.entranceNumber || input.floorNumber || input.intercomCode) {
		const accessParts: string[] = [];
		if (input.entranceNumber) accessParts.push(`подъезд/вход ${input.entranceNumber}`);
		if (input.floorNumber) accessParts.push(`этаж ${input.floorNumber}`);
		if (input.intercomCode) accessParts.push(`домофон/код: ${input.intercomCode}`);
		actText += `   - Ориентиры для СМП: ${accessParts.join(', ')}\n`;
	}
	actText += `   - Стоматологический кабинет №: ${input.cabinetNumber || '1'}\n`;
	actText += `   - Дата и точное время происшествия: ${formattedDate} в ${formattedTime}\n`;
	actText += `   - Врач-стоматолог: ${input.doctorFullName || 'Врач-стоматолог'}\n`;
	if (input.assistantFullName) {
		actText += `   - Ассистент врача: ${input.assistantFullName}\n`;
	}
	actText += `   - Пациент: ${input.patientFullName || 'Ф.И.О. пациента'}, ${input.patientAgeYears} лет, пол: ${input.patientGender === 'male' ? 'мужской' : 'женский'}, вес: ${input.patientWeightKg} кг\n`;
	actText += `   - Номер амбулаторной карты: ${input.medCardNumber || '043/у-б/н'}\n\n`;

	actText += `2. ДИАГНОЗ НЕОТЛОЖНОГО СОСТОЯНИЯ:\n`;
	actText += `   - Клинический диагноз: ${scenario.nameRu} (${scenario.subtitleRu})\n`;
	actText += `   - Код по МКБ-10: ${scenario.icd10Code} (${scenario.icd10NameRu})\n`;
	actText += `   - Законодательное основание: ${scenario.statutoryLegalBasisRu}\n\n`;

	actText += `3. ИСХОДНЫЙ ВИТАЛЬНЫЙ СТАТУС В МОМЕНТ НАЧАЛА РЕАКЦИИ:\n`;
	actText += `   - Артериальное давление: ${vitalsInit.bpSystolic}/${vitalsInit.bpDiastolic} мм рт. ст.\n`;
	actText += `   - Частота сердечных сокращений (ЧСС): ${vitalsInit.hr} уд/мин\n`;
	actText += `   - Сатурация кислорода (SpO2): ${vitalsInit.spo2}%\n`;
	actText += `   - Частота дыхательных движений (ЧДД): ${vitalsInit.rr} в мин\n`;
	actText += `   - Уровень сознания: ${vitalsInit.consciousnessRu}\n`;
	if (vitalsInit.glucoseMmolL !== undefined) {
		actText += `   - Глюкоза капиллярной крови: ${vitalsInit.glucoseMmolL} ммоль/л\n`;
	}
	actText += `\n`;

	actText += `4. ПРОТОКОЛ ПРОВЕДЕННЫХ РЕАНИМАЦИОННЫХ И НЕОТЛОЖНЫХ МЕРОПРИЯТИЙ:\n`;
	if (input.completedSteps && input.completedSteps.length > 0) {
		input.completedSteps.forEach((step, idx) => {
			actText += `   ${idx + 1}. [${step.timestamp}] ${step.stepTitleRu}\n`;
			if (step.administeredMedicationRu) {
				actText += `      Введено: ${step.administeredMedicationRu}\n`;
			}
			if (step.doseDetailsRu) {
				actText += `      Дозировка/путь: ${step.doseDetailsRu}\n`;
			}
		});
	} else {
		actText += `   - Реанимационные мероприятия проведены в полном объеме согласно протоколу.\n`;
	}
	actText += `\n`;

	actText += `5. СВЯЗЬ СО СЛУЖБОЙ СКОРОЙ МЕДИЦИНСКОЙ ПОМОЩИ (СМП):\n`;
	const smpCallStr = input.smpCallTime ? (typeof input.smpCallTime === 'string' ? input.smpCallTime : input.smpCallTime.toLocaleTimeString('ru-RU')) : '103/112 вызвана';
	const smpArrStr = input.smpArrivalTime ? (typeof input.smpArrivalTime === 'string' ? input.smpArrivalTime : input.smpArrivalTime.toLocaleTimeString('ru-RU')) : 'Прибыла';
	actText += `   - Время вызова бригады СМП: ${smpCallStr}\n`;
	actText += `   - Время прибытия бригады СМП: ${smpArrStr}\n`;
	actText += `   - Номер наряда / бригады СМП: ${input.smpBrigadeNumber || 'Наряд СМП № ___'}\n\n`;

	actText += `6. ВИТАЛЬНЫЙ СТАТУС ПРИ ПЕРЕДАЧЕ БРИГАДЕ СМП / ЗАВЕРШЕНИИ:\n`;
	actText += `   - Артериальное давление: ${vitalsFinal.bpSystolic}/${vitalsFinal.bpDiastolic} мм рт. ст.\n`;
	actText += `   - Частота сердечных сокращений: ${vitalsFinal.hr} уд/мин\n`;
	actText += `   - SpO2: ${vitalsFinal.spo2}%\n`;
	actText += `   - ЧДД: ${vitalsFinal.rr} в мин\n`;
	actText += `   - Состояние сознания: ${vitalsFinal.consciousnessRu}\n`;
	actText += `   - Исход / Решение: ${input.patientOutcomeRu}\n`;
	if (input.handoverNotesRu) {
		actText += `   - Особые отметки врача: ${input.handoverNotesRu}\n`;
	}
	actText += `\n`;

	actText += `ПОДПИСИ:\n`;
	actText += `Врач-стоматолог: ____________________ / ${input.doctorFullName || 'Ф.И.О.'} /\n`;
	if (input.assistantFullName) {
		actText += `Ассистент врача: ____________________ / ${input.assistantFullName} /\n`;
	}
	actText += `Врач бригады СМП: ____________________ / Ф.И.О., роспись /\n`;
	actText += `Главный врач клиники: ____________________ / Подпись, печать /\n`;

	return actText;
}
