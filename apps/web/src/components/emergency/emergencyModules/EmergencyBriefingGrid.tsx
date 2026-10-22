/**
 * Emergency Briefing Grid (Layer 4)
 * 4 rapid operational briefing cards for emergency dispatch.
 */

import React from 'react';
import { MapPin, Phone, User, AlertTriangle } from 'lucide-react';
import type { EmergencyScenario } from '../emergencyRescuePresets';

interface EmergencyBriefingGridProps {
	clinicAddress?: string | undefined;
	cabinetNumber?: string | undefined;
	accessDetails?: string | undefined;
	clinicPhone?: string | undefined;
	doctorFullName?: string | undefined;
	patientFullName?: string | undefined;
	patientAgeYears?: number | undefined;
	patientGender?: 'male' | 'female' | undefined;
	patientWeightKg?: number | undefined;
	activeScenario: EmergencyScenario;
}

export function EmergencyBriefingGrid({
	clinicAddress = 'г. Москва, ул. Клиническая, д. 10',
	cabinetNumber = '1',
	accessDetails = '',
	clinicPhone = 'Не указан',
	doctorFullName = 'Врач-стоматолог',
	patientFullName = 'Пациент',
	patientAgeYears = 35,
	patientGender = 'male',
	patientWeightKg = 70,
	activeScenario,
}: EmergencyBriefingGridProps) {
	return (
		<div className="emergency-briefing-grid">
			<div className="emergency-briefing-card address-card">
				<div className="emergency-briefing-label">
					<MapPin size={16} />
					<span>Точный адрес клиники</span>
				</div>
				<div className="emergency-briefing-value">
					{clinicAddress || 'г. Москва, ул. Клиническая, д. 10'}
				</div>
				<div className="emergency-briefing-sub">
					Кабинет № {cabinetNumber || '1'}{accessDetails ? ` (${accessDetails})` : ''}
				</div>
			</div>

			<div className="emergency-briefing-card phone-card">
				<div className="emergency-briefing-label">
					<Phone size={16} />
					<span>Телефон клиники</span>
				</div>
				<div className="emergency-briefing-value">
					{clinicPhone || 'Не указан'}
				</div>
				<div className="emergency-briefing-sub">
					Врач: {doctorFullName || 'Врач-стоматолог'}
				</div>
			</div>

			<div className="emergency-briefing-card patient-card">
				<div className="emergency-briefing-label">
					<User size={16} />
					<span>Пациент</span>
				</div>
				<div className="emergency-briefing-value">
					{patientFullName || 'Пациент'}
				</div>
				<div className="emergency-briefing-sub">
					{patientAgeYears} лет • {patientGender === 'male' ? 'Мужчина' : 'Женщина'} • {patientWeightKg} кг
				</div>
			</div>

			<div className="emergency-briefing-card status-card">
				<div className="emergency-briefing-label">
					<AlertTriangle size={16} />
					<span>Повод к вызову скорой</span>
				</div>
				<div className="emergency-briefing-value alert-color">
					{activeScenario.nameRu} ({activeScenario.icd10Code})
				</div>
				<div className="emergency-briefing-sub">
					Введено: Адреналин 0.5 мл в/м (бедро), Преднизолон 90 мг в/в
				</div>
			</div>
		</div>
	);
}
