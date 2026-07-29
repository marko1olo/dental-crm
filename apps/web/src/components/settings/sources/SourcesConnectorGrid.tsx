import { ImageIcon } from "lucide-react";
import { imagingSourceLabels } from "../../../imagingUiLabels";
import { imagingConnectorCards } from "../../../settingsStaticData";

/*
 * ЗАМЕР, КОТОРЫЙ ОТМЕНИЛ ПРЕДЫДУЩУЮ ПОПЫТКУ. Первая правка этого пакета объявила
 * контракт как `Pick<ReturnType<typeof useSettingsDerivations>, ...>` и утверждала,
 * что несуществующее имя станет ошибкой TS2344. ЭТО НЕВЕРНО, и вот чем проверено:
 * копия файла с ключом `"totallyBogusKeyName"` в `Pick` компилируется молча, а
 * канарейка (`const x: number = "строка"`) в той же копии ошибку даёт — значит файл
 * в программе, а не пропущен. Причина: `ReturnType<typeof useSettingsDerivations>` и
 * `ReturnType<typeof useAppLogicContext>` РАВНЫ `any` (проверено предикатом
 * `0 extends 1 & T`: ветка `"NOT_ANY"` не присваивается, ветка `"ANY"` присваивается).
 * `keyof any` — это `string | number | symbol`, поэтому `Pick` по `any` принимает
 * любой ключ. При `noImplicitAny: false` в tsconfig.base компилятор об этом молчит.
 *
 * ПОЭТОМУ ЗДЕСЬ НЕТ МЕШКА ПРОПСОВ ВООБЩЕ. `imagingConnectorCards` и
 * `imagingSourceLabels` — не состояние, а константы модуля: `useAppLogic` импортирует
 * их из `settingsStaticData` и `imagingUiLabels` (строки 820 и 772) и возвращает
 * без изменений (строки 14020 и 14034), никакой локализации по пути нет. Импорт
 * напрямую даёт настоящие типы `ImagingConnectorCard[]` и
 * `Record<ImagingSourceKind, string>` вместо `any`, а опечатка в имени становится
 * ошибкой TS2305 на импорте — то есть проверка, которой мешок пропсов не давал.
 *
 * Что было до пакета: семнадцать имён читались из
 * `Object.assign({}, appLogic, derivations) as any` и «отмывались» через
 * промежуточные `const typed*`; разметка ниже использует два. Измерено
 * `npx tsc -p apps/web/tsconfig.json --noEmit --noUnusedLocals`: 29 TS6133 в этом
 * файле, из них 17 — мёртвые локали `typed*`.
 */
export function SourcesConnectorGrid() {
	return (
		<section className="connector-grid" aria-label="Интеграции снимков">
			{imagingConnectorCards.map((connector) => (
				<article key={connector.title}>
					<ImageIcon aria-hidden="true" />
					<div>
						<h3>{connector.title}</h3>
						<p>{connector.detail}</p>
						<span>{imagingSourceLabels[connector.source]}</span>
					</div>
				</article>
			))}
		</section>
	);
}
