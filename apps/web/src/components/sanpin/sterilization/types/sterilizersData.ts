export const SANPIN_REGULATORY_META = {
	standardRu: "СанПиН 3.3686-21",
	standardTitleRu: "Санитарно-эпидемиологические требования по профилактике инфекционных болезней (Раздел IV)",
	form257TitleRu: "Журнал автоклавирования и работы стерилизаторов (паровых и воздушных)",
	form366TitleRu: "Журнал учета качества предстерилизационной очистки",
	guidelinePsoRu: "МУ 287-113 по дезинфекции, предстерилизационной очистке и стерилизации изделий медицинского назначения",
} as const;

export type SterilizerDeviceClass = "autoclave_class_b" | "autoclave_class_s" | "autoclave_class_n" | "dry_heat_air";

export interface SterilizerPreset {
	readonly id: string;
	readonly code: string;
	readonly brandModel: string;
	readonly deviceClass: SterilizerDeviceClass;
	readonly deviceClassLabelRu: string;
	readonly serialNumber: string;
	readonly chamberVolumeLiters: number;
	readonly locationRoomRu: string;
	readonly defaultRegimeId: string;
}

export const STATUTORY_STERILIZERS: readonly SterilizerPreset[] = [
	{
		id: "autoclave-melag-vacuklav-23b",
		code: "АК-01",
		brandModel: "Melag Vacuklav 23 B+ (Класс B)",
		deviceClass: "autoclave_class_b",
		deviceClassLabelRu: "Автоклав B-класса (фракционированный вакуум)",
		serialNumber: "MEL-2024-88412",
		chamberVolumeLiters: 22,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "steam_134_5min",
	},
	{
		id: "autoclave-euronda-e9-med",
		code: "АК-02",
		brandModel: "Euronda E9 Next Med (Класс B)",
		deviceClass: "autoclave_class_b",
		deviceClassLabelRu: "Автоклав B-класса (вакуумная сушка)",
		serialNumber: "EUR-E9-55102",
		chamberVolumeLiters: 24,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "steam_134_20min_prion",
	},
	{
		id: "autoclave-dac-universal",
		code: "АК-03",
		brandModel: "Dentsply Sirona DAC Universal S",
		deviceClass: "autoclave_class_s",
		deviceClassLabelRu: "Автоклав для наконечников (Класс S)",
		serialNumber: "DAC-S-9014",
		chamberVolumeLiters: 6,
		locationRoomRu: "Кабинет № 1 (Терапия)",
		defaultRegimeId: "steam_134_5min",
	},
	{
		id: "dryheat-gpk-gp20",
		code: "СХ-01",
		brandModel: "ГП-20 СПУ (Сухожаровой шкаф)",
		deviceClass: "dry_heat_air",
		deviceClassLabelRu: "Воздушный стерилизатор (Сухожар)",
		serialNumber: "SPU-20-4109",
		chamberVolumeLiters: 20,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "dry_heat_180_60min",
	},
];
