/**
 * apps/web/src/components/sanpin/journalModules/sanpinJournalTypes.ts
 *
 * Layer 0: Data contracts, TypeScript types, and default presets for
 * SanPin 3.3686-21 Sterilization Journal & Form 257/u.
 */

export interface SanPinCycleEntry {
	id: string;
	date: string;
	time: string;
	cycleNumber: number;
	autoclaveCode: string;
	autoclaveModel: string;
	temperatureC: number;
	pressureBar: number;
	durationMin: number;
	regimeName: string;
	indicatorClass: "4" | "5" | "6";
	colorBefore: string;
	colorBeforeHex: string;
	colorAfter: string;
	colorAfterHex: string;
	isIndicatorNorm: boolean;
	pouchCodes: string[];
	itemsSummary: string;
	operatorName: string;
	status: "passed" | "warning" | "failed";
	batchSize?: number;
	batchBarcode?: string;
	psoStatus?: "norm" | "defect" | "none";
	kraftPouchesCount?: number;
}

export type SanPinJournalPeriod = "day" | "week" | "month";

export const DEFAULT_CYCLES: SanPinCycleEntry[] = [
	{
		id: "cyc-2026-10-08-03",
		date: "2026-10-08",
		time: "08:30",
		cycleNumber: 3,
		autoclaveCode: "АК-01",
		autoclaveModel: "Melag Vacuklav 23B+",
		temperatureC: 134.4,
		pressureBar: 2.15,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "5",
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["KP-84920", "KP-84921", "KB2608250001"],
		itemsSummary: "Наконечники турбинные NSK Ti-Max, лотки терапевтические, боры",
		operatorName: "Иванова А. С. (ЦСО)",
		status: "passed",
		batchSize: 25,
		batchBarcode: "BAT-134-20261008-01",
		psoStatus: "norm",
		kraftPouchesCount: 25,
	},
	{
		id: "cyc-2026-10-08-02",
		date: "2026-10-08",
		time: "07:45",
		cycleNumber: 2,
		autoclaveCode: "АК-01",
		autoclaveModel: "Melag Vacuklav 23B+",
		temperatureC: 134.1,
		pressureBar: 2.12,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "5",
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["КП-0925-14", "КП-0925-15"],
		itemsSummary: "Хирургические элеваторы, пинцеты, шприцы карпульные стерильные",
		operatorName: "Иванова А. С. (ЦСО)",
		status: "passed",
		batchSize: 15,
		batchBarcode: "BAT-134-20261008-02",
		psoStatus: "norm",
		kraftPouchesCount: 15,
	},
	{
		id: "cyc-2026-10-07-04",
		date: "2026-10-07",
		time: "17:15",
		cycleNumber: 4,
		autoclaveCode: "АК-02",
		autoclaveModel: "W&H Lina 17",
		temperatureC: 134.2,
		pressureBar: 2.14,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "4",
		colorBefore: "Светло-желтый",
		colorBeforeHex: "#fff9c4",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["KP-84880", "KP-84881", "KP-84882"],
		itemsSummary: "Ортодонтические щипцы, зеркала для фотопротокола, лотки",
		operatorName: "Петрова Е. В. (ЦСО)",
		status: "passed",
		batchSize: 30,
		batchBarcode: "BAT-134-20261007-04",
		psoStatus: "norm",
		kraftPouchesCount: 30,
	},
];

export interface SanPinSterilizationJournalProps {
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
	readonly initialFilterAutoclave?: string | undefined;
	readonly className?: string | undefined;
	readonly onOpenEquipmentModal?: (() => void) | undefined;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
}
