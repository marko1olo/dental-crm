/**
 * SelfCheckinSomaticSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Renders the Somatic Health Questionnaire step:
 * - 1-Click Physiological Norm application & instant finish
 * - Real-time risk alerts preview (cardio, sulfites, bleeding, asthma)
 * - Quick allergy chips for penicillin, lidocaine, aspirin, sulfites
 * - Cardiovascular, coagulation, diabetes, and pregnancy safety checks
 */

import React, { memo } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCircle2,
	Droplets,
	HeartPulse,
	Plus,
	ShieldAlert,
	X,
	Zap,
} from "lucide-react";
import type {
	SomaticQuestionnaireData,
	SomaticRiskAlert,
	evaluateSomaticRisks,
} from "./SomaticQuestionnaireEngine";

export interface SelfCheckinSomaticSectionProps {
	readonly somaticData: SomaticQuestionnaireData;
	readonly setSomaticData: React.Dispatch<React.SetStateAction<SomaticQuestionnaireData>>;
	readonly isNormApplied: boolean;
	readonly quickAllergies: {
		readonly lidocaine: boolean;
		readonly penicillin: boolean;
		readonly aspirin: boolean;
		readonly sulfites: boolean;
	};
	readonly onToggleQuickAllergy: (key: "lidocaine" | "penicillin" | "aspirin" | "sulfites") => void;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onApplyPhysiologicalNormAndFinish: () => void;
	readonly onCompleteCheckin: () => void;
	readonly allergyDetails: string;
	readonly setAllergyDetails: (val: string) => void;
	readonly cardioDetails: string;
	readonly setCardioDetails: (val: string) => void;
	readonly coagulationDetails: string;
	readonly setCoagulationDetails: (val: string) => void;
	readonly riskEvaluation: ReturnType<typeof evaluateSomaticRisks>;
	readonly isSubmitting: boolean;
}

export const SelfCheckinSomaticSection: React.FC<SelfCheckinSomaticSectionProps> = memo(({
	somaticData,
	setSomaticData,
	isNormApplied,
	quickAllergies,
	onToggleQuickAllergy,
	onApplyPhysiologicalNorm,
	onApplyPhysiologicalNormAndFinish,
	onCompleteCheckin,
	allergyDetails,
	setAllergyDetails,
	cardioDetails,
	setCardioDetails,
	coagulationDetails,
	setCoagulationDetails,
	riskEvaluation,
	isSubmitting,
}) => {
	return (
		<div className="selfcheckin-step-box">
			{/* 1-Click Physiological Norm Banner (Mandate 8e) */}
			<div
				className="selfcheckin-norm-quick-banner"
				data-testid="somatic-norm-banner"
			>
				{/* Prominent Dominant Green Button per Mandate 8e #3 */}
				<button
					type="button"
					className="selfcheckin-btn-norm-dominant"
					onClick={onApplyPhysiologicalNorm}
					data-testid="somatic-norm-dominant-btn"
					title="Заполнить весь опросник (давление, аллергии, соматика) физиологической нормой в 1 клик"
				>
					<CheckCircle2 size={26} className="selfcheckin-dominant-check-icon shrink-0" />
					<div className="selfcheckin-dominant-text-col text-left">
						<span className="selfcheckin-dominant-title block font-extrabold text-base sm:text-lg">
							✓ Чувствую себя хорошо / Соматическая норма
						</span>
						<span className="selfcheckin-dominant-sub block text-xs sm:text-sm font-normal opacity-95">
							Давление в норме, хронических патологий нет • Правьте только аллергии ниже
						</span>
					</div>
				</button>

				<div className="selfcheckin-norm-actions-row flex items-center gap-2 flex-wrap pt-1">
					<button
						type="button"
						className="selfcheckin-btn-norm-quick"
						onClick={onApplyPhysiologicalNorm}
						data-testid="somatic-norm-1click-btn"
						title="Заполнить анкету физиологической нормой: хронических заболеваний, аллергий и патологий нет"
					>
						<Zap size={16} />
						<span>Применить норму</span>
					</button>
					<button
						type="button"
						className="selfcheckin-btn-norm-finish"
						onClick={onApplyPhysiologicalNormAndFinish}
						data-testid="somatic-norm-instant-finish-btn"
						title="Заполнить нормой и сразу завершить чекин за 5 секунд"
					>
						<CheckCircle2 size={16} />
						<span className="flex items-center gap-1">
							<span>Завершить за 5 сек</span>
							<ArrowRight size={14} />
						</span>
					</button>
					{isNormApplied && (
						<span
							className="selfcheckin-norm-applied-badge ml-auto flex items-center gap-1"
							data-testid="norm-active-pill"
						>
							<Check size={12} />
							<span>Норма активна</span>
						</span>
					)}
				</div>
			</div>

			<div className="selfcheckin-somatic-intro">
				Пожалуйста, отметьте выявленные особенности здоровья (если
				имеются) для безопасного подбора анестезии и клинических
				протоколов:
			</div>

			{/* Live Risk Alerts Preview */}
			{riskEvaluation.alerts.length > 0 && (
				<div className="selfcheckin-alerts-container">
					<div className="selfcheckin-alerts-header">
						Факторы риска для лечащего врача:
					</div>
					{riskEvaluation.alerts.map((alert: SomaticRiskAlert) => (
						<div
							key={alert.id}
							className={`selfcheckin-alert-badge alert-${alert.severity}`}
						>
							<div className="selfcheckin-alert-title flex items-center gap-1.5">
								{alert.severity === "danger" ? (
									<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0 inline-block" aria-hidden="true" />
								) : (
									<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 inline-block" aria-hidden="true" />
								)}
								<span>{alert.title}</span>
							</div>
							<div className="selfcheckin-alert-msg">
								{alert.message}
							</div>
							<div className="selfcheckin-alert-action">
								<strong>Рекомендация:</strong> {alert.recommendedAction}
							</div>
						</div>
					))}
				</div>
			)}

			<div className="selfcheckin-questions-grid">
				{/* Allergies Card */}
				<div className="selfcheckin-question-card" data-testid="allergies-card">
					<div className="selfcheckin-card-title">
						<AlertCircle
							size={16}
							color="#d97706"
							style={{
								display: "inline-block",
								verticalAlign: "middle",
								marginRight: "6px",
							}}
						/>
						1. Аллергологический анамнез
					</div>

					{/* Quick Allergy Chips for Penicillin, Lidocaine, Aspirin, Sulfites */}
					<div
						className="selfcheckin-quick-allergies-block"
						data-testid="quick-allergies-block"
					>
						<div className="selfcheckin-quick-allergies-heading font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
							Пациент правит только реальные аллергии (1 касание):
						</div>
						<div className="selfcheckin-quick-allergies-grid">
							<button
								type="button"
								className={`selfcheckin-allergy-chip ${quickAllergies.penicillin ? "active" : ""}`}
								onClick={() => onToggleQuickAllergy("penicillin")}
								data-testid="allergy-chip-penicillin"
								title="Аллергия на пенициллины, амоксициллин, антибиотики"
							>
								<span className="selfcheckin-chip-icon">
									{quickAllergies.penicillin ? <X size={14} /> : <Plus size={14} />}
								</span>
								<span>Пенициллин / Антибиотики</span>
							</button>
							<button
								type="button"
								className={`selfcheckin-allergy-chip ${quickAllergies.lidocaine ? "active" : ""}`}
								onClick={() => onToggleQuickAllergy("lidocaine")}
								data-testid="allergy-chip-lidocaine"
								title="Непереносимость лидокаина, новокаина, местных анестетиков"
							>
								<span className="selfcheckin-chip-icon">
									{quickAllergies.lidocaine ? <X size={14} /> : <Plus size={14} />}
								</span>
								<span>Лидокаин / Анестетики</span>
							</button>
							<button
								type="button"
								className={`selfcheckin-allergy-chip ${quickAllergies.aspirin ? "active" : ""}`}
								onClick={() => onToggleQuickAllergy("aspirin")}
								data-testid="allergy-chip-aspirin"
								title="Аллергия на аспирин, НПВС, склонность к кровоточивости"
							>
								<span className="selfcheckin-chip-icon">
									{quickAllergies.aspirin ? <X size={14} /> : <Plus size={14} />}
								</span>
								<span>Аспирин / НПВС</span>
							</button>
							<button
								type="button"
								className={`selfcheckin-allergy-chip ${quickAllergies.sulfites ? "active" : ""}`}
								onClick={() => onToggleQuickAllergy("sulfites")}
								data-testid="allergy-chip-sulfites"
								title="Аллергия на сульфиты и консерванты в анестетиках"
							>
								<span className="selfcheckin-chip-icon">
									{quickAllergies.sulfites ? <X size={14} /> : <Plus size={14} />}
								</span>
								<span>Сульфиты / Консерванты</span>
							</button>
						</div>
					</div>

					<label className="selfcheckin-checkbox-label">
						<input
							type="checkbox"
							checked={somaticData.allergies.hasAllergies}
							onChange={(e) => {
								const checked = e.target.checked;
								setSomaticData({
									...somaticData,
									allergies: {
										...somaticData.allergies,
										hasAllergies: checked,
									},
								});
								if (!checked) {
									setAllergyDetails("");
								}
							}}
						/>
						<span>
							Имеются другие аллергические реакции на медикаменты/вещества
						</span>
					</label>

					{somaticData.allergies.hasAllergies && (
						<div className="selfcheckin-suboptions">
							<input
								type="text"
								className="selfcheckin-input selfcheckin-input-sm"
								placeholder="Укажите препараты или симптомы..."
								value={allergyDetails}
								onChange={(e) => setAllergyDetails(e.target.value)}
								data-testid="allergy-details-input"
							/>
						</div>
					)}
				</div>

				{/* Cardio Card */}
				<div className="selfcheckin-question-card">
					<div className="selfcheckin-card-title">
						<HeartPulse
							size={16}
							color="#dc2626"
							style={{
								display: "inline-block",
								verticalAlign: "middle",
								marginRight: "6px",
							}}
						/>
						2. Сердечно-сосудистая система
					</div>
					<label className="selfcheckin-checkbox-label">
						<input
							type="checkbox"
							checked={somaticData.cardiovascular.hasRisk}
							onChange={(e) =>
								setSomaticData({
									...somaticData,
									cardiovascular: {
										...somaticData.cardiovascular,
										hasRisk: e.target.checked,
									},
								})
							}
						/>
						<span>Гипертензия / Аритмия / ИБС / Инфаркт</span>
					</label>
					{somaticData.cardiovascular.hasRisk && (
						<div className="selfcheckin-suboptions">
							<label className="selfcheckin-checkbox-label">
								<input
									type="checkbox"
									checked={somaticData.cardiovascular.pacemaker}
									onChange={(e) =>
										setSomaticData({
											...somaticData,
											cardiovascular: {
												...somaticData.cardiovascular,
												pacemaker: e.target.checked,
											},
										})
									}
								/>
								<span>Установлен кардиостимулятор (ЭКС)</span>
							</label>
							<input
								type="text"
								className="selfcheckin-input selfcheckin-input-sm"
								placeholder="Обычные показатели АД (например 140/90)..."
								value={cardioDetails}
								onChange={(e) => setCardioDetails(e.target.value)}
							/>
						</div>
					)}
				</div>

				{/* Coagulation Card */}
				<div className="selfcheckin-question-card">
					<div className="selfcheckin-card-title">
						<Droplets
							size={16}
							color="#991b1b"
							style={{
								display: "inline-block",
								verticalAlign: "middle",
								marginRight: "6px",
							}}
						/>
						3. Свертываемость крови и антикоагулянты
					</div>
					<label className="selfcheckin-checkbox-label">
						<input
							type="checkbox"
							checked={somaticData.coagulation.onAnticoagulants}
							onChange={(e) =>
								setSomaticData({
									...somaticData,
									coagulation: {
										...somaticData.coagulation,
										onAnticoagulants: e.target.checked,
										hasBleedingDisorder: e.target.checked,
									},
								})
							}
						/>
						<span>
							Прием кроверазжижающих (Ксарелто, Варфарин, Аспирин)
						</span>
					</label>
					{somaticData.coagulation.onAnticoagulants && (
						<input
							type="text"
							className="selfcheckin-input selfcheckin-input-sm"
							placeholder="Название препарата и дозировка..."
							value={coagulationDetails}
							onChange={(e) => setCoagulationDetails(e.target.value)}
						/>
					)}
				</div>

				{/* Pregnancy / Diabetes Card */}
				<div className="selfcheckin-question-card">
					<div className="selfcheckin-card-title">
						<Activity
							size={16}
							color="#2563eb"
							style={{
								display: "inline-block",
								verticalAlign: "middle",
								marginRight: "6px",
							}}
						/>
						4. Диабет / Беременность
					</div>
					<div className="selfcheckin-suboptions-row">
						<label className="selfcheckin-checkbox-label">
							<input
								type="checkbox"
								checked={somaticData.diabetes.hasDiabetes}
								onChange={(e) =>
									setSomaticData({
										...somaticData,
										diabetes: {
											...somaticData.diabetes,
											hasDiabetes: e.target.checked,
										},
									})
								}
							/>
							<span>Сахарный диабет</span>
						</label>
						<label className="selfcheckin-checkbox-label">
							<input
								type="checkbox"
								checked={somaticData.pregnancy.isPregnantOrLactating}
								onChange={(e) =>
									setSomaticData({
										...somaticData,
										pregnancy: {
											...somaticData.pregnancy,
											isPregnantOrLactating: e.target.checked,
										},
									})
								}
							/>
							<span>Беременность / Лактация</span>
						</label>
					</div>
				</div>
			</div>

			<button
				type="button"
				className={`selfcheckin-btn-primary selfcheckin-btn-submit ${isNormApplied ? "selfcheckin-btn-accent" : ""}`}
				onClick={onCompleteCheckin}
				title={
					isSubmitting
						? "Сохранение анкеты здоровья..."
						: isNormApplied
							? "Завершить самочекин с физиологической нормой (5 сек)"
							: "Завершить самочекин и передать анкету врачу"
				}
				data-testid="somatic-complete-checkin-btn"
			>
				{isSubmitting ? (
					"Сохранение..."
				) : isNormApplied ? (
					<span className="flex items-center justify-center gap-1.5">
						<span>Завершить самочекин (Физиологическая норма) за 5 секунд</span>
						<ArrowRight size={16} />
					</span>
				) : (
					"Завершить самочекин и передать врачу"
				)}
			</button>
		</div>
	);
});

SelfCheckinSomaticSection.displayName = "SelfCheckinSomaticSection";
