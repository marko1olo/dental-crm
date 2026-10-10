import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * ИНТЕГРАЦИЯ СКАННЕРА 804н В РАЗДЕЛ НАСТРОЕК «ЦЕНЫ И УСЛУГИ» (SettingsPricesTab)
 *
 * Проверяет реализацию бесшовного импорта прейскуранта (Минздрав 804н) в соответствии с ТЗ:
 * 1. Кнопка «Импорт прейскуранта (Excel/CSV/Текст)» в строгом 1-строчном тулбаре
 * 2. Компактная область Drag-and-drop (Dropzone) с поддержкой .xlsx, .csv и буфера обмена
 * 3. 3 стратегии разрешения коллизий (update_existing, skip_duplicates, create_new)
 * 4. Связка с двухпанельным окном сопоставления PriceListMappingDiffView
 * 5. Транзакционная фиксация через POST /api/pricelist/scan-and-import (commit: true)
 * 6. Мгновенное реактивное обновление справочника клиники через refreshDashboard
 */

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, "..", "components", "settings", "SettingsPricesTab.tsx");
const pricesTabDir = join(here, "..", "components", "settings", "pricesTab");
let source = readFileSync(sourcePath, "utf8");
if (existsSync(pricesTabDir)) {
	for (const file of readdirSync(pricesTabDir)) {
		if (/\.(tsx|ts)$/.test(file)) {
			source += `\n${readFileSync(join(pricesTabDir, file), "utf8")}`;
		}
	}
}

function withoutComments(code: string): string {
	return code
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[\t ]*\/\/.*$/gm, "");
}

const cleanCode = withoutComments(source);

describe("Интеграция нативного сканнера прейскуранта 804н в SettingsPricesTab", () => {
	it("кнопка вызова импорта прейскуранта присутствует в тулбаре и имеет правильный data-testid", () => {
		assert.ok(
			cleanCode.includes('data-testid="btn-native-pricelist-import"'),
			"Кнопка 'btn-native-pricelist-import' отсутствует в разметке тулбара SettingsPricesTab",
		);
		assert.ok(
			cleanCode.includes("Импорт прейскуранта (Excel/CSV/Текст)"),
			"Подпись кнопки не содержит требуемый текст 'Импорт прейскуранта (Excel/CSV/Текст)'",
		);
	});

	it("компактная зона Dropzone имеет data-testid и поддерживает drag-and-drop", () => {
		assert.ok(
			cleanCode.includes('data-testid="native-pricelist-dropzone-banner"'),
			"Дропзона с data-testid='native-pricelist-dropzone-banner' не найдена",
		);
		assert.ok(
			cleanCode.includes("onDragOver") && cleanCode.includes("onDrop"),
			"Дропзона не обрабатывает события drag-and-drop (onDragOver / onDrop)",
		);
	});

	it("поддерживаются форматы Excel (.xlsx, .xls) и CSV, а также вставка текста", () => {
		assert.ok(
			cleanCode.includes(".xlsx") && cleanCode.includes(".csv"),
			"В дропзоне не указаны поддерживаемые расширения .xlsx и .csv",
		);
		assert.ok(
			cleanCode.includes('scannerMode === "file"') && cleanCode.includes('scannerMode === "text"'),
			"Отсутствует переключатель между режимом файла и режимом вставки текста",
		);
		assert.ok(
			cleanCode.includes('data-testid="native-pricelist-text-input"'),
			"Текстовое поле ввода для вставки из буфера не имеет data-testid='native-pricelist-text-input'",
		);
	});

	it("присутствует селектор 3 стратегий коллизий с дефолтом update_existing для врача", () => {
		assert.ok(
			cleanCode.includes('value="update_existing"'),
			"Отсутствует стратегия 'update_existing' (Обновить цены существующих услуг)",
		);
		assert.ok(
			cleanCode.includes('value="skip_duplicates"'),
			"Отсутствует стратегия 'skip_duplicates' (Пропускать дубликаты)",
		);
		assert.ok(
			cleanCode.includes('value="create_new"'),
			"Отсутствует стратегия 'create_new' (Создавать как новые позиции)",
		);
		assert.ok(
			cleanCode.includes('useState<PricelistCollisionStrategy>("update_existing")'),
			"Стратегия по умолчанию не установлена в 'update_existing'",
		);
	});

	it("содержит вызов сканирования POST /api/pricelist/scan-and-import с commit: false", () => {
		assert.ok(
			cleanCode.includes('"/api/pricelist/scan-and-import"') ||
			cleanCode.includes("`/api/pricelist/scan-and-import`"),
			"Отсутствует обращение к эндпоинту /api/pricelist/scan-and-import",
		);
		assert.ok(
			cleanCode.includes("commit: false"),
			"Отсутствует вызов предварительного сканирования с параметром commit: false",
		);
	});

	it("монтирует компонент двухпанельного диффа PriceListMappingDiffView при наличии результатов", () => {
		assert.ok(
			cleanCode.includes("<PriceListMappingDiffView"),
			"Компонент PriceListMappingDiffView не монтируется в дереве JSX",
		);
		assert.ok(
			cleanCode.includes("onApply={handleCommitPricelistDiff}"),
			"Обработчик подтверждения импорта handleCommitPricelistDiff не передан в onApply",
		);
	});

	it("при подтверждении диффа отправляет транзакционный запрос с commit: true и обновляет справочник", () => {
		assert.ok(
			cleanCode.includes("commit: true"),
			"Отсутствует параметр commit: true при финальной фиксации импортированных услуг",
		);
		assert.ok(
			cleanCode.includes("refreshDashboard()"),
			"После успешного импорта отсутствует реактивный вызов refreshDashboard() для обновления каталога без перезагрузки страницы",
		);
	});

	it("пустое состояние каталога содержит прямую ссылку на запуск нативного сканнера", () => {
		assert.ok(
			cleanCode.includes("setIsNativeScannerDropzoneOpen(true)"),
			"Пустой каталог не открывает дропзону сканнера в 1 клик",
		);
	});
});
