import { ImageIcon } from "lucide-react";
import { useSettingsDerivations } from "../../../useSettingsDerivations";

/*
 * Контракт сетки коннекторов: `Pick` по типу возврата хука, а НЕ `as any`.
 *
 * Что здесь было и почему это чинится отдельным пакетом. Файл читал семнадцать
 * имён из `Object.assign({}, appLogic, derivations) as any`, а разметка ниже
 * использует ДВА: `imagingConnectorCards` и `imagingSourceLabels`. Остальные
 * пятнадцать имён «отмывались» через промежуточные `const typed*` — этого хватало,
 * чтобы имя выглядело использованным, хотя до экрана оно не доходило.
 *
 * Под `as any` чтение отсутствующего поля бесплатно: компилятор не проверяет ни
 * наличие, ни тип. Поэтому семнадцать мёртвых локалей `typed*` жили в файле, а
 * гейт молчал.
 *
 * `Pick` возвращает проверку на место: имени, которого нет в возврате
 * `useSettingsDerivations`, компилятор не даст — TS2344 на ключе. Пустой экран
 * превращается в ошибку сборки, а это единственная разница, которая здесь важна.
 */
type SourcesConnectorGridContract = Pick<
	ReturnType<typeof useSettingsDerivations>,
	"imagingConnectorCards" | "imagingSourceLabels"
>;

export function SourcesConnectorGrid() {
	const {
		imagingConnectorCards,
		imagingSourceLabels,
	}: SourcesConnectorGridContract = useSettingsDerivations();

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
