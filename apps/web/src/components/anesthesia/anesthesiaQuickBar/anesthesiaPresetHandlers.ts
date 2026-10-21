import type { AnestheticDrugId } from "../anesthesiaCatalog";
import type { AnesthesiaCalculationResult } from "../anesthesiaEngine";
import type { AnesthesiaQuickBarProps } from "./types";
import type { useAnesthesiaQuickBar } from "./useAnesthesiaQuickBar";

export function dispatchAnesthesiaInvoiceService(
	title: string,
	servicePriceRub: number | undefined,
	defaultPriceRub = 950,
) {
	if (typeof window !== "undefined") {
		const price = servicePriceRub ?? defaultPriceRub;
		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					service: {
						id: `anes-${Date.now()}`,
						title,
						code: "A11.07.010",
						priceRub: price,
						amountKopecks: price * 100,
					},
				},
			}),
		);
	}
}

export function createAnesthesiaPresetHandlers(
	bar: ReturnType<typeof useAnesthesiaQuickBar>,
	props: AnesthesiaQuickBarProps,
	setLastAppliedText: (text: string | null) => void,
) {
	const dispatch = (title: string, defaultPriceRub = 950) =>
		dispatchAnesthesiaInvoiceService(
			title,
			props.servicePriceRub,
			defaultPriceRub,
		);

	return {
		handleApplyUltracain200k: () => {
			if (props.disabled) return;
			bar.handleSelectDrug("articaine_1_200k");
			bar.handleApplyInfiltrationArticaine200k();
			dispatch("Анестезия инфильтрационная (Ультракаин Д-С 1:200 000)", 950);
			setLastAppliedText("Ультракаин Д-С 1:200 000 (1.7 мл)");
		},
		handleApplyUltracainForte: () => {
			if (props.disabled) return;
			bar.handleSelectDrug("articaine_1_100k");
			bar.handleApplyStandardNormPreset();
			dispatch(
				"Анестезия инфильтрационная (Ультракаин Д-С Форте 1:100 000)",
				1100,
			);
			setLastAppliedText("Ультракаин Д-С Форте 1:100 000 (1.7 мл)");
		},
		handleApplyScandonestCardio: () => {
			if (props.disabled) return;
			bar.handleSelectDrug("mepivacaine_plain");
			bar.handleApplyScandonestCardio();
			dispatch(
				"Анестезия инфильтрационная (Скандонест 3% без адреналина)",
				1050,
			);
			setLastAppliedText("Скандонест 3% без адреналина (1.8 мл)");
		},
		handleApplyNoAnesthesia: () => {
			if (props.disabled) return;
			bar.handleSelectDrug("none" as unknown as AnestheticDrugId);
			props.onApplyAnesthesia?.(
				"Анестезия: не применялась (интактно / по согласию пациента).",
				{} as unknown as AnesthesiaCalculationResult,
			);
			bar.showQuickToast("Зафиксировано: без анестезии / интактно", 2500);
			setLastAppliedText("Без анестезии / Интактно");
		},
	};
}
