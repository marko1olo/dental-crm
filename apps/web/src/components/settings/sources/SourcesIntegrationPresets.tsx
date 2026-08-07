import type { IntegrationPreset } from "@dental/shared";
import { Database } from "lucide-react";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import {
	integrationCapabilityLabels,
	integrationCategoryLabels,
	integrationStatusLabels,
} from "../../../workspaceUiLabels";
import { humanizeIntegrationInput } from "../SettingsViewHelpers";

/*
 * ЗАМЕР, КОТОРЫЙ ОТМЕНИЛ ПРЕДЫДУЩУЮ ПОПЫТКУ. Первая правка этого пакета объявила
 * контракт как `Pick<ReturnType<typeof useSettingsDerivations>, ...>` и утверждала,
 * что несуществующее имя станет ошибкой TS2344. ЭТО НЕВЕРНО. Копия файла с ключом
 * `"totallyBogusKeyName"` в `Pick` компилируется МОЛЧА; канарейка
 * (`const x: number = "строка"`) в той же копии ошибку даёт, значит копия в программе.
 * Причина: `ReturnType<typeof useSettingsDerivations>` и
 * `ReturnType<typeof useAppLogicContext>` РАВНЫ `any` — проверено предикатом
 * `type IsAny<T> = 0 extends 1 & T ? "ANY" : "NOT_ANY"`: присваивание `"NOT_ANY"`
 * отвергается, присваивание `"ANY"` проходит для обоих типов. `keyof any` — это
 * `string | number | symbol`, поэтому `Pick` по `any` принимает любой ключ, а
 * `noImplicitAny: false` в tsconfig.base гасит любое предупреждение об этом.
 *
 * ОТСЮДА ДВА ПРАВИЛА ФАЙЛА.
 *
 * 1. Подписи — не состояние. `integrationCapabilityLabels`,
 *    `integrationCategoryLabels`, `integrationStatusLabels` — константы
 *    `workspaceUiLabels`; `useAppLogic` импортирует их (строки 904-906) и возвращает
 *    без изменений (строки 14065-14067), локализации по пути нет. Прямой импорт даёт
 *    `Record<IntegrationCapability, string>` и родню вместо `any`, а опечатка в имени
 *    становится ошибкой TS2305 на импорте.
 *
 * 2. Единственное настоящее состояние здесь — `dashboard`, и оно читается через
 *    ЯВНО ОБЪЯВЛЕННЫЙ структурный тип, а не через `Pick` по `any`. Явный тип
 *    проверяет чтения ВНУТРИ компонента даже когда источник `any`: обращение к полю,
 *    которого в типе нет, — ошибка TS2339. Это и есть та проверка, которой не было.
 *    Оговорка честности: раз источник `any`, само присваивание компилятором не
 *    verifiable — форма ниже сверена с `clinicSettingsSchema` в `packages/shared`
 *    (`integrationPresets: z.array(integrationPresetSchema)`) вручную.
 *
 * ЧТО БЫЛО СЛОМАНО ПО СУТИ. Файл читал `integrationPresets` прямо из мешка пропсов,
 * а такого поля нет ни в возврате `useAppLogic` (return на строке 13771), ни в
 * возврате `useSettingsDerivations` (return на строке 2254) — есть только
 * `dashboard.clinicSettings.integrationPresets`. Под `as any` чтение давало
 * `undefined`, `?? []` превращало его в пустой массив, и `.preset-grid` рендерился
 * БЕЗ ЕДИНОЙ КАРТОЧКИ: заголовок над пустым местом, ни ошибки в компиляторе, ни
 * ошибки в консоли. Ещё девятнадцать имён читались тем же способом, до разметки
 * доходило четыре.
 */
type SourcesIntegrationPresetsContract = {
	dashboard:
		| { clinicSettings?: { integrationPresets?: IntegrationPreset[] } }
		| null
		| undefined;
};

/*
 * `preset.riskLevel` — это `"low" | "medium" | "high"` из `integrationPresetSchema`,
 * и раньше он печатался в русскую строку как есть: «риск low». Тип
 * `Record<IntegrationPreset["riskLevel"], string>` держит карту полной: добавится
 * уровень в схему — здесь будет ошибка, а не английское слово на экране. Карта живёт
 * рядом с разметкой по образцу `WaitlistDrawer`; в `workspaceUiLabels` её не выносим,
 * этот файл держит другой пакет волны.
 */
const integrationPresetRiskLabels: Record<
	IntegrationPreset["riskLevel"],
	string
> = {
	low: "низкий",
	medium: "средний",
	high: "высокий",
};

export function SourcesIntegrationPresets() {
	const derivations: SourcesIntegrationPresetsContract =
		useSettingsDerivations();
	const integrationPresets: IntegrationPreset[] =
		derivations.dashboard?.clinicSettings?.integrationPresets ?? [];

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
									{preset.vendor} · {integrationCategoryLabels[preset.category]}{" "}
									· риск {integrationPresetRiskLabels[preset.riskLevel]}
								</p>
							</div>
							<span>{integrationStatusLabels[preset.status]}</span>
						</summary>
						<section
							className="preset-capabilities"
							aria-label="Что переносит источник"
						>
							{preset.capabilities.slice(0, 6).map((capability) => (
								<span key={capability}>
									{integrationCapabilityLabels[capability]}
								</span>
							))}
						</section>
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
