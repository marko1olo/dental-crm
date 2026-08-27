/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION PRESETS & SAMPLE BARCODES
 * Эталонные наборы и тестовые штрихкоды для быстрой проверки и работы в 1 клик.
 * ============================================================================
 */

export interface SampleKraftBarcode {
	readonly label: string;
	readonly barcode: string;
	readonly badge: string;
	readonly description?: string;
}

export const SAMPLE_TEST_BARCODES: readonly SampleKraftBarcode[] = [
	{
		label: "Терапевтический лоток (50 сут.)",
		barcode: "KB2608250001",
		badge: "Терапия",
		description: "Стандартный смотровой лоток в самоклеящемся крафт-пакете",
	},
	{
		label: "Эндодонтический набор (134°C / Класс 5)",
		barcode: "ENDO-TRAY-2026",
		badge: "Эндодонтия",
		description: "Стерильный эндодонтический лоток с химическим интегратором 5 класса",
	},
	{
		label: "Хирургический набор экстракционный",
		barcode: "SURG-TRAY-2026",
		badge: "Хирургия",
		description: "Хирургические элеваторы и щипцы в двойной стерильной упаковке",
	},
	{
		label: "2D DataMatrix (АК-01, Цикл №3)",
		barcode: "KB-20260826-01#1|АК-01|CYC3|2026-08-26|2026-10-15|NURSE-01|set_therapeutic_tray",
		badge: "DataMatrix 2D",
		description: "Полный машиночитаемый паспорт стерилизации DataMatrix 2D",
	},
	{
		label: "Просроченный пакет (Тест СанПиН)",
		barcode: "KB2401010001",
		badge: "Просрочен",
		description: "Тест обнаружения нарушения п. 3632 СанПиН 3.3686-21",
	},
];
