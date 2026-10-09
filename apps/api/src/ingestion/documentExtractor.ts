/**
 * Фасад ядра извлечения документов клиники DENTE CRM.
 * Разбор медицинских карт 043/у, бланков ИДС 1051н, прейскурантов 804н и архивов
 * выполняется локальным модулем только для чтения с нулевым разглашением данных.
 */

export type { ZipEntry } from "./docExtractor/index.js";
export {
	extractDocument,
	readZipEntries,
} from "./docExtractor/index.js";
