import React from "react";
import {
	AlertTriangle,
	Heart,
	ShieldAlert,
	Activity,
} from "lucide-react";
import { DentalSyringe } from "../../icons/DentalIcons";
import type { AnesthesiaSafetyAllergyHudProps } from "./types";

export function AnesthesiaSafetyAllergyHud({
	patientWeightKg,
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	selectedDrugId,
	selectedDrugInfo,
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
	onOpenEmergencyProtocol,
	onOpenAspirationJournal,
	disabled = false,
}: AnesthesiaSafetyAllergyHudProps) {
	return (
		<>
			{/* ── Top Bar: Title & Somatic Tags & Weight & Configure ── */}
			<div className="anesthesia-quick-bar-header">
				<div className="anesthesia-quick-bar-title">
					<DentalSyringe size={16} className="anesthesia-icon-accent shrink-0" />
					<span className="font-bold text-xs sm:text-sm">{`Анестезия (МДД по массе тела ${patientWeightKg} кг):`}</span>
					{isCardioRisk && (
						<span className="anesthesia-cardio-tag" title="Кардиоваскулярный риск: лимит адреналина 0.04 мг">
							<Heart size={12} className="text-amber-500" />
							<span>ССЗ: Скандонест / лимит 0.04 мг</span>
						</span>
					)}
					{takesBetaBlockers && (
						<span className="anesthesia-cardio-tag" title="Пациент принимает бета-блокаторы: строгий лимит адреналина 0.04 мг">
							<Activity size={12} className="text-red-500" />
							<span>Бета-блокаторы: лимит 0.04 мг</span>
						</span>
					)}
					{(hasSulfiteAllergy || hasBronchialAsthma) && (
						<span className="anesthesia-allergy-tag" title="Аллергия на сульфиты / астма: запрещены растворы с адреналином (E223)">
							<AlertTriangle size={12} className="text-red-500" />
							<span>Без сульфитов (E223)</span>
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{onOpenEmergencyProtocol && (
						<button
							type="button"
							onClick={onOpenEmergencyProtocol}
							className="px-3 py-2 min-h-[48px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs animate-pulse"
							title="Экстренная помощь: Анафилаксия, LAST (липиды 20%), шок (112)"
							data-testid="btn-anesthesia-quick-emergency"
						>
							<ShieldAlert size={14} />
							<span>Шок / LAST 112</span>
						</button>
					)}
					{onOpenAspirationJournal && (
						<button
							type="button"
							onClick={onOpenAspirationJournal}
							className="px-3 py-2 min-h-[44px] rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1 transition-colors cursor-pointer"
							title="Открыть подробный журнал проводниковой анестезии и аспирационной пробы"
							data-testid="btn-anesthesia-quick-journal"
						>
							<span>Журнал пробы</span>
						</button>
					)}
					<span className="text-[11px] text-[var(--muted)]">Выбор дозировки</span>
				</div>
			</div>

			{/* ── Cardio Risk Warning Badge for 1:100 000 Epinephrine ── */}
			{isCardioRisk && (selectedDrugId === "articaine_1_100k" || selectedDrugId === "lidocaine_1_100k") && (
				<div
					className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-xs font-medium"
					role="alert"
					data-testid="anesthesia-cardio-100k-warning-badge"
				>
					<div className="flex items-center gap-2">
						<AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
						<span>
							<strong>Внимание, кардио-риск!</strong> Высокая концентрация адреналина 1:100 000 не рекомендуется при ССЗ (ИБС, гипертония II-III ст, аритмии, инфаркт, бета-блокаторы). Лимит адреналина: строго <strong>0.04 мг</strong> (макс. 2 карпулы). Препарат выбора — <strong>Мепивакаин 3% (Скандонест) без адреналина</strong>.
						</span>
					</div>
					<button
						type="button"
						onClick={() => onSelectDrug("mepivacaine_plain")}
						className="px-2.5 py-1 min-h-[44px] rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
						title="Переключиться на Мепивакаин 3% (Скандонест)"
						data-testid="btn-switch-to-mepivacaine"
					>
						Выбрать Скандонест 3%
					</button>
				</div>
			)}

			{/* ── Soft Ambient Warning for Somatic Risks (Mandate 8e: Non-blocking doctor autonomy) ── */}
			{((hasSulfiteAllergy || hasBronchialAsthma) && !selectedDrugInfo.isAdrenalineFree) && (
				<div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-200 text-xs font-medium" role="status">
					<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Внимание: выбранный препарат содержит сульфиты (E223). Рекомендован Скандонест 3% (без адреналина). Введение разрешено по клиническому решению врача.</span>
				</div>
			)}

			{/* Safety Alert Stopper / Confirmation Banner (Mandate 8e: 0 disabled buttons, soft confirmation) */}
			{safetyWarning && (
				<div className="anesthesia-safety-stopper-alert" role="alert">
					<div className="stopper-alert-content">
						<ShieldAlert size={20} className="stopper-icon text-amber-500 shrink-0" />
						<div>
							<div className="stopper-title">{safetyWarning.title}</div>
							<div className="stopper-text">{safetyWarning.text}</div>
						</div>
					</div>
					<div className="stopper-actions">
						<button
							type="button"
							className="stopper-btn-switch min-h-[44px]"
							onClick={() => {
								onDismissWarning();
								onSelectDrug("mepivacaine_plain");
								onConfirmWarningOverride(1.0);
							}}
							title="Быстро переключиться на безопасный Мепивакаин 3% без вазоконстриктора"
						>
							Ввести Скандонест 3% (безопасно)
						</button>
						<button
							type="button"
							disabled={disabled}
							data-testid="btn-anesthesia-confirm-override"
							className="px-3 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer active:scale-98 shadow-xs"
							onClick={() => {
								const count = safetyWarning.carpulesCount ?? 1.0;
								onDismissWarning();
								onConfirmWarningOverride(count);
							}}
							title="Применить клиническое суждение врача и внести препарат в протокол 043/у"
						>
							Всё равно внести (врачебное решение)
						</button>
						<button
							type="button"
							className="stopper-btn-dismiss min-h-[44px]"
							onClick={onDismissWarning}
						>
							Закрыть
						</button>
					</div>
				</div>
			)}
		</>
	);
}
