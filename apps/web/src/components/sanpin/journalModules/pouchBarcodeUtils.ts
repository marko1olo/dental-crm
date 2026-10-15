/**
 * apps/web/src/components/sanpin/journalModules/pouchBarcodeUtils.ts
 *
 * Утилиты нормализации и проверки штрихкодов стерилизационных пакетов.
 */

export function normalizePouchBarcode(input: string): string {
	const trimmed = input.trim();
	if (/^\d{4}$/.test(trimmed)) {
		return `KP-${trimmed}0`;
	}
	if (/^\d{5}$/.test(trimmed)) {
		return `KP-${trimmed}`;
	}
	return trimmed;
}
