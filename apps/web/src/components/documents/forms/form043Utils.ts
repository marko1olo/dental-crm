import type { CpitnIndex, FullForm043uPayload, OralMucosaStatus } from "@dental/shared";

export const DEFAULT_CPITN: CpitnIndex = {
	sextant18_14: "0_healthy",
	sextant13_23: "0_healthy",
	sextant24_28: "0_healthy",
	sextant48_44: "0_healthy",
	sextant43_33: "0_healthy",
	sextant34_38: "0_healthy",
	treatmentNeedCategory: "0_none",
};

export const DEFAULT_ORAL_MUCOSA: OralMucosaStatus = {
	color: "pale_pink_normal",
	moisture: "normal",
	pathologicalElements: null,
	gingivalPapillae: "normal_pointed",
	bleedingPBI: "grade_0",
	tongueStatus: "Язык чистый, влажный, сосочки выражены умеренно",
	regionalLymphNodes: "Подчелюстные и шейные лимфоузлы не увеличены, мягкоэластичные, подвижные, безболезненные при пальпации",
	tmjFunction: "Открывание рта в полном объеме (>40 мм), свободное, безболезненное, девиации и щелчков в ВНЧС нет",
};

export const openPrintWindow = (html: string): void => {
	if (typeof window === "undefined") return;
	const w = window.open("", "_blank");
	if (w) {
		w.document.write(html);
		w.document.close();
		w.focus();
		w.print();
	} else {
		window.print();
	}
};
