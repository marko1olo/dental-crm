/**
 * Russian Dental Emergency Clinical Protocols & Resuscitation Suite
 * Layer 4: Emergency Patient Vitals & Demographics Section with 1-Click Weight Presets
 */

import React from 'react';
import { User } from 'lucide-react';
import type { EmergencyVitalsSectionProps } from './emergencyRescueTypes';
// Emergency CSS unified in EmergencyRescueModal.css

export function EmergencyVitalsSection({
	patientWeightKg,
	setPatientWeightKg,
	patientAgeYears,
	setPatientAgeYears,
	vitals,
	setVitals,
}: EmergencyVitalsSectionProps): React.ReactElement {
	return (
		<div className="emergency-section-box">
			<h3 className="emergency-section-title">
				<User size={18} />
				Параметры пациента и витальные показатели
			</h3>

			<div className="emergency-vitals-grid">
				<div className="emergency-input-group">
					<label className="emergency-input-label">Вес (кг)</label>
					<input type="number" className="emergency-input-field" value={patientWeightKg} min={5} max={200} onChange={(e) => setPatientWeightKg(Number(e.target.value) || 70)} />
				</div>
				<div className="emergency-input-group">
					<label className="emergency-input-label">Возраст (лет)</label>
					<input type="number" className="emergency-input-field" value={patientAgeYears} min={1} max={110} onChange={(e) => setPatientAgeYears(Number(e.target.value) || 35)} />
				</div>
				<div className="emergency-input-group">
					<label className="emergency-input-label">АД (мм рт. ст.)</label>
					<input type="text" className="emergency-input-field" value={`${vitals.bpSystolic}/${vitals.bpDiastolic}`} onChange={(e) => {
						const parts = e.target.value.split('/');
						setVitals((prev) => ({ ...prev, bpSystolic: Number(parts[0]) || prev.bpSystolic, bpDiastolic: Number(parts[1]) || prev.bpDiastolic }));
					}} />
				</div>
				<div className="emergency-input-group">
					<label className="emergency-input-label">ЧСС (уд/мин)</label>
					<input type="number" className="emergency-input-field" value={vitals.hr} onChange={(e) => setVitals((prev) => ({ ...prev, hr: Number(e.target.value) || prev.hr }))} />
				</div>
				<div className="emergency-input-group">
					<label className="emergency-input-label">SpO2 (%)</label>
					<input type="number" className="emergency-input-field" value={vitals.spo2} min={50} max={100} onChange={(e) => setVitals((prev) => ({ ...prev, spo2: Number(e.target.value) || prev.spo2 }))} />
				</div>
			</div>

			{/* 1-Click Weight Presets for Instant Recalculation (Mandate 8e Autonomy) */}
			<div className="emergency-quick-weight-presets" role="group" aria-label="Быстрый выбор массы для расчета доз">
				<button type="button" className={`emergency-weight-chip ${patientWeightKg === 15 ? 'active' : ''}`} onClick={() => { setPatientWeightKg(15); setPatientAgeYears(4); }} data-testid="preset-weight-15" title="Ребенок (15 кг, 4 года)">
					15 кг (ребёнок)
				</button>
				<button type="button" className={`emergency-weight-chip ${patientWeightKg === 45 ? 'active' : ''}`} onClick={() => { setPatientWeightKg(45); setPatientAgeYears(14); }} data-testid="preset-weight-45" title="Подросток (45 кг, 14 лет)">
					45 кг (подросток)
				</button>
				<button type="button" className={`emergency-weight-chip ${patientWeightKg === 70 ? 'active' : ''}`} onClick={() => { setPatientWeightKg(70); setPatientAgeYears(35); }} data-testid="preset-weight-70" title="Взрослый стандартный (70 кг)">
					70 кг (взрослый)
				</button>
				<button type="button" className={`emergency-weight-chip ${patientWeightKg === 90 ? 'active' : ''}`} onClick={() => { setPatientWeightKg(90); setPatientAgeYears(50); }} data-testid="preset-weight-90" title="Взрослый крупный (90 кг)">
					90 кг (крупный)
				</button>
			</div>
		</div>
	);
}
