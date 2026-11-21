import { parseKopecks, sumKopecks } from "@dental/shared";
import type { TreatmentPlanStage } from "../../types";
import type { TierGeneratorContext } from "./types";

export function assembleTierStages(
	ctx: TierGeneratorContext,
	hasImplants: boolean,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const { tierId, stage1Items, stage2Items, stage3Items } = ctx;

	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1Total = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2Total = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3Total = Math.round(s3TotalKopecks / 100);

	const stage1Subtitle =
		tierId === "premium"
			? "Художественная реставрация под дентальным микроскопом, КЛКТ 3D-диагностика, швейцарская гигиена Air-Flow Plus с глицином."
			: tierId === "optimum"
				? "Лечение под оптическим увеличением, КЛКТ 3D-диагностика, профессиональная гигиена и нанокомпозиты."
				: "Базовая терапия, устранение боли, ультразвуковая гигиена и световое пломбирование.";

	const stage1Goal =
		tierId === "premium"
			? "Прецизионная санация под микроскопом, сохранение жизнеспособности зубов и безупречная микроэстетика."
			: tierId === "optimum"
				? "Устранение очагов воспаления, анатомическая реставрация и подготовка фундамента."
				: "Ликвидация болевого синдрома и санация кариозных полостей сертифицированными материалами.";

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle: stage1Subtitle,
		clinicalGoal: stage1Goal,
		items: stage1Items,
		totalRub: s1Total,
		totalKopecks: s1TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		serviceCatalogCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2Subtitle = hasImplants
		? tierId === "premium"
			? "Дентальная имплантация по навигационному 3D-шаблону с гидрофильной SLA-поверхностью ускоренной остеоинтеграции."
			: tierId === "optimum"
				? "Дентальная имплантация по 3D-шаблону. Включает период остеоинтеграции (3–6 месяцев)."
				: "Классическая двухэтапная дентальная имплантация базового уровня."
		: tierId === "premium"
			? "Атравматичная хирургическая санация под увеличением."
			: "Хирургическая санация полости рта.";

	const stage2Goal =
		tierId === "premium"
			? "Премиальная интеграция титановых опор с пожизненной гарантией и максимальным сохранением кости."
			: tierId === "optimum"
				? "Установка дентальных имплантатов проверенной системы и создание стабильного костного фундамента."
				: "Классическая интеграция опор для последующего протезирования.";

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: stage2Subtitle,
		clinicalGoal: stage2Goal,
		items: stage2Items,
		totalRub: s2Total,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2,
		serviceCatalogCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3Subtitle =
		tierId === "premium"
			? "Цифровой 3D-скан TRIOS, индивидуальные CAD/CAM абатменты, цельнокерамические виниры и коронки Katana Multi-Layer."
			: tierId === "optimum"
				? "Цифровой 3D-скан TRIOS, индивидуальные Ti-Base абатменты и премиальные коронки IPS e.max / Katana."
				: "Ортопедическое восстановление зубов металлокерамическими коронками и мостовидными протезами.";

	const stage3Goal =
		tierId === "premium"
			? "Бескомпромиссная эстетика улыбки, анатомическая точность окклюзии и долговечность 25+ лет."
			: tierId === "optimum"
				? "Анатомическое протезирование, высокая эстетика и восстановление жевательной эффективности."
				: "Восстановление целостности зубного ряда и жевательной функции базовыми конструкциями.";

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: stage3Subtitle,
		clinicalGoal: stage3Goal,
		items: stage3Items,
		totalRub: s3Total,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		serviceCatalogCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}
