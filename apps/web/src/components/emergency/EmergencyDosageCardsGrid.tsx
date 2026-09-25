import React from "react";
import { Syringe } from "lucide-react";
import { EmergencyScenarioId } from "./emergencyRescuePresets";
import {
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
} from "./emergencyRescueEngine";

export interface EmergencyDosageCardsGridProps {
	activeScenarioId: EmergencyScenarioId;
	patientWeightKg: number;
	patientAgeYears: number;
	allDosages: ReturnType<typeof calculateAllEmergencyDosages>;
	lipidRescueData: ReturnType<typeof calculateLipidRescueDoses>;
}

export function EmergencyDosageCardsGrid({
	activeScenarioId,
	patientWeightKg,
	patientAgeYears,
	allDosages,
	lipidRescueData,
}: EmergencyDosageCardsGridProps) {
	return (
		<div className="emergency-dosage-banner">
			<div className="emergency-dosage-header">
				<div className="emergency-dosage-title">
					<Syringe size={18} />
					<span>Экстренные дозировки препаратов</span>
				</div>
				<div className="emergency-dosage-patient-tag">
					Масса: {patientWeightKg} кг • {patientAgeYears < 18 ? "Детский возраст" : "Взрослый"} ({patientAgeYears} л)
				</div>
			</div>

			<div className="emergency-dosage-cards-grid">
				{activeScenarioId === "anaphylactic_shock" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Адреналин 0.1% (Эпинефрин)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">1-я линия</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{allDosages.adrenaline_epi_01.calculatedVolumeMl} мл</span>
								<span className="emergency-drug-dose-sub">({allDosages.adrenaline_epi_01.calculatedDoseMg} мг)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/М в среднюю треть бедра</span>
							</div>
							<div className="emergency-drug-note">
								Повтор через 5 мин при сохранении гипотонии
							</div>
						</div>

						<div className="emergency-drug-card">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Преднизолон (ГКС)</span>
								</div>
								<span className="emergency-drug-priority-badge second-line">2-я линия</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{allDosages.prednisolone_30mg.calculatedDoseMg} мг</span>
								<span className="emergency-drug-dose-sub">({allDosages.prednisolone_30mg.calculatedVolumeMl} мл / {allDosages.prednisolone_30mg.numberOfAmpoules} амп.)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/В струйно медленно за 2–3 мин</span>
							</div>
							<div className="emergency-drug-note">
								На 10 мл 0.9% NaCl для профилактики 2-й волны шока
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "local_anesthetic_toxicity" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Липидная эмульсия 20% (Липофундин)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">Антидот</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{lipidRescueData.bolusVolumeMl} мл</span>
								<span className="emergency-drug-dose-sub">(болюс за 1–2 мин)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/В инфузия: {lipidRescueData.infusionRateMlPerHour} мл/час ({lipidRescueData.infusionRateMlPerMin} мл/мин)</span>
							</div>
							<div className="emergency-drug-note">
								Макс доза: {lipidRescueData.maxTotalDoseMl} мл (12 мл/кг)
							</div>
						</div>

						<div className="emergency-drug-card">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Диазепам 0.5% (Реланиум)</span>
								</div>
								<span className="emergency-drug-priority-badge second-line">При судорогах</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{allDosages.diazepam_relanium.calculatedDoseMg} мг</span>
								<span className="emergency-drug-dose-sub">({allDosages.diazepam_relanium.calculatedVolumeMl} мл)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/В медленно за 2–3 мин</span>
							</div>
							<div className="emergency-drug-note">
								Готовность к ИВЛ мешком Амбу
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "hypertensive_crisis" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Каптоприл (Капотен)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">1-я линия</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">25 мг</span>
								<span className="emergency-drug-dose-sub">(1 таблетка)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Сублингвально (под язык)</span>
							</div>
							<div className="emergency-drug-note">
								Снижение АД не более чем на 20–25% за 1–2 часа
							</div>
						</div>

						<div className="emergency-drug-card">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Моксонидин (Физиотенз)</span>
								</div>
								<span className="emergency-drug-priority-badge second-line">Альтернатива</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">0.2 мг</span>
								<span className="emergency-drug-dose-sub">(1 таблетка)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Сублингвально (под язык)</span>
							</div>
							<div className="emergency-drug-note">
								Контроль АД и ЧСС каждые 10 минут
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "angina_myocardial_infarction" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Нитроглицерин 0.5 мг</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">ОКС</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">0.5 мг</span>
								<span className="emergency-drug-dose-sub">(1 таб / 1 доза спрея)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Под язык строго сидя (при АД сист &gt; 100)</span>
							</div>
							<div className="emergency-drug-note">
								Противопоказан при АД &lt; 100 и приеме ингибиторов ФДЭ-5!
							</div>
						</div>

						<div className="emergency-drug-card">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Аспирин (АСК)</span>
								</div>
								<span className="emergency-drug-priority-badge second-line">Антиагрегант</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">250–325 мг</span>
								<span className="emergency-drug-dose-sub">(разжевать)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Разжевать и проглотить</span>
							</div>
							<div className="emergency-drug-note">
								Без кишечнорастворимой оболочки
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "bronchospasm_asthma" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Сальбутамол (Вентолин)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">Ингаляция</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">2–4 дозы</span>
								<span className="emergency-drug-dose-sub">(200–400 мкг)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Через спейсер с задержкой дыхания</span>
							</div>
							<div className="emergency-drug-note">
								Повторить через 15–20 мин при необходимости
							</div>
						</div>

						<div className="emergency-drug-card">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Преднизолон (ГКС)</span>
								</div>
								<span className="emergency-drug-priority-badge second-line">Парентерально</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{allDosages.prednisolone_30mg.calculatedDoseMg} мг</span>
								<span className="emergency-drug-dose-sub">({allDosages.prednisolone_30mg.calculatedVolumeMl} мл)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/В медленно или В/М</span>
							</div>
							<div className="emergency-drug-note">
								При тяжелом удушье / астматическом статусе
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "hypoglycemia_diabetic" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Глюкоза 40% (Декстроза)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">В/В струйно</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">{allDosages.glucose_dextrose_40.calculatedVolumeMl} мл</span>
								<span className="emergency-drug-dose-sub">({(allDosages.glucose_dextrose_40.calculatedVolumeMl * 0.4).toFixed(0)} г глюкозы)</span>
							</div>
							<div className="emergency-drug-route">
								<span>В/В струйно до восстановления сознания</span>
							</div>
							<div className="emergency-drug-note">
								При сохранении сознания: теплый сладкий чай / сахар
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "syncope_collapse" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Аммиак 10% (Нашатырный спирт)</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">Рефлекторно</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">Пары на ватке</span>
								<span className="emergency-drug-dose-sub">(1–2 сек на 2 см)</span>
							</div>
							<div className="emergency-drug-route">
								<span>Ингаляционно + положение Тренделенбурга</span>
							</div>
							<div className="emergency-drug-note">
								При брадикардии/гипотонии: Кордиамин 2 мл п/к или в/м
							</div>
						</div>
					</>
				)}

				{activeScenarioId === "accidental_swallowing" && (
					<>
						<div className="emergency-drug-card primary">
							<div className="emergency-drug-card-header">
								<div className="emergency-drug-name">
									<span>Прием Геймлиха</span>
								</div>
								<span className="emergency-drug-priority-badge first-line">При асфиксии</span>
							</div>
							<div className="emergency-drug-dose-highlight">
								<span className="emergency-drug-dose-val">5 толчков</span>
								<span className="emergency-drug-dose-sub">(вверх в эпигастрий)</span>
							</div>
							<div className="emergency-drug-route">
								<span>До восстановления проходимости</span>
							</div>
							<div className="emergency-drug-note">
								При попадании в ЖКТ: РВОТУ НЕ ВЫЗЫВАТЬ! Рентген/ФГДС.
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
