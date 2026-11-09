/**
 * apps/web/src/components/settings/owner/OwnerPriceListSection.tsx
 *
 * Секция управления прейскурантом услуг для владельца клиники.
 * Мандаты: 8b (<= 80 строк), 8aq (Монтирование в живой UI), SSOT канонического каталога.
 * Инварианты:
 * - Все финансовые расчеты строго в целочисленных копейках (integer kopecks).
 * - Ноль мультяшных эмодзи (строго Lucide иконки).
 * - Единый SSOT прейскуранта клиники.
 */

import React from "react";
import { SettingsPricesTab } from "../SettingsPricesTab";

export function OwnerPriceListSection() {
	return (
		<section className="settings-section" data-testid="owner-pricelist-section">
			<SettingsPricesTab />
		</section>
	);
}

// Семантический алиас для обратной совместимости
export const OwnerPriceList804nSection = OwnerPriceListSection;
