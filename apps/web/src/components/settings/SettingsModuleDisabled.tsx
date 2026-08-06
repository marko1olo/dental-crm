import { ArrowRight, ToggleLeft } from "lucide-react";

import { openSettingsTab, settingsTabTitle } from "./settingsDeepLink";
import {
	MODULES_SETTINGS_TAB,
	type SettingsModuleGate,
} from "./settingsModuleGate";

/**
 * Модуль выключен, а панель под него открыли по адресу.
 *
 * ЧТО БЫЛО СЛОМАНО — ЭТО «ПЕРЕКЛЮЧАТЕЛЬ, КОТОРЫЙ НИЧЕГО НЕ ВЫКЛЮЧАЕТ».
 *
 * Кнопка вкладки и сама панель спрашивали разное. Список вкладок в SettingsView
 * отсеивает «Правила» при выключенном `hasClinicalRules` и «Страховые» при
 * выключенном `hasInsuranceCoPay`, а панели под этими вкладками были смонтированы
 * без проверки признака вовсе:
 *
 *     {settingsTab === "rules" ? <SettingsRulesTab /> : null}
 *     {settingsTab === "insurance" ? <InsuranceContractsPanel /> : null}
 *
 * `settingsTabFromHash` пропускает «rules» и «insurance» — они есть в списке
 * вкладок. Значит панель открывалась по адресу `#settings/rules` при выключенном
 * модуле: кнопки нет, а панель работает.
 *
 * И это не только про набранный вручную адрес. Владелец выключает «Клинические
 * правила» на вкладке «Модули», нажимает «Назад» — и снова видит полностью
 * рабочий экран правил, который только что выключил. Ровно тот случай, когда
 * переключатель меняет вид меню и не выключает ничего по существу.
 *
 * ЧТО СТАЛО. Панель спрашивает тот же признак, из того же источника
 * (`useWorkspaceProfile`), которым отсеивается кнопка её вкладки, и при
 * выключенном модуле показывает это место — с объяснением, что именно выключено,
 * и переходом туда, где включается. Пустой экран или тупик здесь не годятся:
 * человек пришёл по своей ссылке и должен понять, почему тут ничего нет.
 *
 * Соседние три вкладки («Отзывы и NPS», «Сценарии», «Отчёты») свой признак
 * проверяют прямо на монтировании в SettingsView — но там при выключенном модуле
 * под нажатой кнопкой оставалась пустота. Здесь пустоты нет.
 */
export function SettingsModuleDisabled({ gate }: { gate: SettingsModuleGate }) {
	const modulesTabTitle = settingsTabTitle(MODULES_SETTINGS_TAB);

	return (
		<div className="profile-studio-container animate-fade-in">
			<div
				className="profile-section-card"
				role="status"
				style={{ maxWidth: 720, margin: "24px auto" }}
			>
				<div className="profile-section-header">
					<div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
						<ToggleLeft size={24} aria-hidden="true" />
					</div>
					<div className="profile-section-title">
						<h3>Модуль «{gate.moduleTitle}» выключен</h3>
						<p>
							Поэтому этот экран не работает, и кнопки к нему нет в списке
							настроек слева. Вы попали сюда по прямой ссылке или кнопкой
							«Назад».
						</p>
					</div>
				</div>

				<div className="profile-form-grid">
					<div className="profile-form-group full-width">
						<p style={{ margin: 0 }}>{gate.whatItDoes}</p>
						<p style={{ marginTop: "10px", marginBottom: 0 }}>
							Данные, которые уже заведены, не удалены — они снова появятся
							здесь, как только модуль включат.
						</p>
					</div>

					<div
						className="profile-form-group full-width"
						style={{ marginTop: "4px" }}
					>
						<button
							className="primary-button"
							type="button"
							onClick={() => openSettingsTab(MODULES_SETTINGS_TAB)}
							style={{
								alignSelf: "flex-start",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							Включить на вкладке «{modulesTabTitle}»
							<ArrowRight size={16} aria-hidden="true" />
						</button>
						<span className="profile-form-hint" style={{ marginTop: "6px" }}>
							Там перечислены все модули клиники — найдите «{gate.moduleTitle}»
							и включите переключатель.
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
