import type { IntegrationPreset } from "@dental/shared";
import { Database } from "lucide-react";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import { humanizeIntegrationInput } from "../SettingsViewHelpers";

/*
 * Контракт панели пресетов: `Pick` по типу возврата хука, а НЕ `as any`.
 *
 * Что здесь было. Файл читал девятнадцать имён из
 * `Object.assign({}, appLogic, derivations) as any`, а разметка использует ЧЕТЫРЕ.
 * Пятнадцать лишних «отмывались» через промежуточные `const typed*`.
 *
 * И одно из тех четырёх было хуже мёртвого. `integrationPresets` НЕ является полем
 * возврата ни `useAppLogic`, ни `useSettingsDerivations` — там есть только
 * `dashboard.clinicSettings.integrationPresets`. Под `as any` чтение
 * несуществующего поля давало `undefined`, `?? []` превращало его в пустой массив,
 * и `.preset-grid` рендерился БЕЗ ЕДИНОЙ карточки. Ни одной ошибки, ни в
 * компиляторе, ни в консоли: панель просто молча показывала заголовок над пустым
 * местом. Так же читали это поле `SourcesConnectorGrid` и `SourcesDicomCapability`.
 *
 * Отсюда правило файла: источник пресетов — типизированный путь по `dashboard`,
 * тот же, которым пользуются `SettingsView` и `SettingsImportsTab`. Опечатка в нём
 * теперь ошибка компиляции, а не пустая сетка.
 */
type SourcesIntegrationPresetsContract = Pick<
	ReturnType<typeof useSettingsDerivations>,
	| "dashboard"
	| "integrationCapabilityLabels"
	| "integrationCategoryLabels"
	| "integrationStatusLabels"
>;

export function SourcesIntegrationPresets() {
	const {
		dashboard,
		integrationCapabilityLabels,
		integrationCategoryLabels,
		integrationStatusLabels,
	}: SourcesIntegrationPresetsContract = useSettingsDerivations();
	const integrationPresets: IntegrationPreset[] =
		dashboard?.clinicSettings?.integrationPresets ?? [];

	return (
		<section
			className="integration-presets"
			aria-label="Пресеты миграции и внешних систем"
		>
			<div className="import-copy">
				<Database aria-hidden="true" />
				<div>
					<p className="eyebrow">Источники данных</p>
					<h2>
						Старая программа, таблица, бумага и снимки идут через один понятный
						предпросмотр
					</h2>
					<p>
						Это не кнопки для врача. Это карта миграции для владельца или
						администратора: что можно разобрать сейчас, где нужна карта полей, а
						где потребуется отдельное подключение.
					</p>
				</div>
			</div>
			<div className="preset-grid">
				{integrationPresets.map((preset) => (
					<details
						className={`preset-card preset-${preset.status}`}
						key={preset.id}
						open={preset.status === "usable_now"}
					>
						<summary className="preset-card-head">
							<div>
								<strong>{preset.title}</strong>
								<p>
									{preset.vendor} · {integrationCategoryLabels[preset.category]} ·
									риск {preset.riskLevel}
								</p>
							</div>
							<span>{integrationStatusLabels[preset.status]}</span>
						</summary>
						<div
							className="preset-capabilities"
							aria-label="Что переносит источник"
						>
							{preset.capabilities.slice(0, 6).map((capability) => (
								<span key={capability}>
									{integrationCapabilityLabels[capability]}
								</span>
							))}
						</div>
						<ul>
							{preset.migrationNotes.slice(0, 2).map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
						<small>
							Вход:{" "}
							{preset.supportedInputs
								.slice(0, 4)
								.map(humanizeIntegrationInput)
								.join(", ")}
						</small>
					</details>
				))}
			</div>
		</section>
	);
}
