import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import type { SampleKraftBarcode } from "./types.js";

function getDynamicSampleBarcodes(): readonly SampleKraftBarcode[] {
	const now = new Date();
	const packDateIso = now.toISOString().slice(0, 10);
	const dateDigits = packDateIso.replace(/-/g, "").slice(2);
	const fullDateDigits = packDateIso.replace(/-/g, "");
	const expDate = new Date(now.getTime() + 50 * 24 * 3600 * 1000);
	const expDateIso = expDate.toISOString().slice(0, 10);

	return [
		{
			label: "Терапевтический лоток (50 сут.)",
			barcode: `KB${dateDigits}0001`,
			badge: "Терапия",
			description: "Стандартный смотровой лоток в самоклеящемся крафт-пакете",
		},
		{
			label: "Эндодонтический набор (134°C / Класс 5)",
			barcode: `ENDO-TRAY-${now.getFullYear()}`,
			badge: "Эндодонтия",
			description:
				"Стерильный эндодонтический лоток с химическим интегратором 5 класса",
		},
		{
			label: "Хирургический набор экстракционный",
			barcode: `SURG-TRAY-${now.getFullYear()}`,
			badge: "Хирургия",
			description:
				"Хирургические элеваторы и щипцы в двойной стерильной упаковке",
		},
		{
			label: "2D DataMatrix (АК-01, Цикл №3)",
			barcode: `KB-${fullDateDigits}-01#1|АК-01|CYC3|${packDateIso}|${expDateIso}|NURSE-01|set_therapeutic_tray`,
			badge: "DataMatrix 2D",
			description: "Полный машиночитаемый паспорт стерилизации DataMatrix 2D",
		},
		{
			label: "Просроченный пакет (Мягкий допуск острая боль)",
			barcode: "KB2401010001",
			badge: "Просрочен",
			description: "Тест обнаружения нарушения с мягким допуском",
		},
	];
}

export const SAMPLE_TEST_BARCODES: readonly SampleKraftBarcode[] =
	getDynamicSampleBarcodes();

export function getSampleKraftBarcodes(
	isDemo = isDemoShowcaseMode(),
): readonly SampleKraftBarcode[] {
	return isDemo ? SAMPLE_TEST_BARCODES : [];
}
