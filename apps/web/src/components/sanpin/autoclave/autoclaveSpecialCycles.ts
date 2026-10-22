import type { AutoclavePackagingType } from "./autoclavePackagingRules.js";
import type { AutoclaveCycleDefinition } from "./autoclaveStandardCycles.js";

export const AUTOCLAVE_SPECIAL_CYCLES: Record<string, AutoclaveCycleDefinition> = {
	cycle_bowie_dick: {
		id: 'cycle_bowie_dick',
		nameRu: 'Вакуум-тест Боуи-Дика (Bowie-Dick Test)',
		shortLabelRu: 'Тест Боуи-Дика (3.5 мин)',
		descriptionRu: 'Ежедневный контрольный тест для проверки эффективности фракционированного вакуума и равномерности проникновения пара в пористый пакет.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 137.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.30 },
		plateauTimeMinutes: 3.5,
		totalEstimatedCycleMinutes: 30,
		vacuumPulsesCount: 3,
		dryingTimeMinutes: 5,
		applicableLoadTypesRu: [
			'Контрольный тестовый пакет Bowie-Dick (однократная загрузка в пустую камеру)'
		],
		recommendedPackaging: ['unwrapped_tray'],
		mandatoryIndicators: ['bowie_dick_pack'],
		sanpinNormRefRu: 'ГОСТ Р ИСО 11140-4, СанПиН 3.3686-21 п. 3640 (Ежедневно перед началом работы)'
	},
	cycle_helix_test: {
		id: 'cycle_helix_test',
		nameRu: 'Хеликс-тест для полых инструментов (Helix PCD)',
		shortLabelRu: 'Хеликс-тест PCD (3.5 мин)',
		descriptionRu: 'Проверка удаления воздуха из длинных узких каналов (турбинные наконечники, канюли, слюноотсосы) с помощью трубки PCD 1.5 м.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 137.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.30 },
		plateauTimeMinutes: 3.5,
		totalEstimatedCycleMinutes: 32,
		vacuumPulsesCount: 4,
		dryingTimeMinutes: 8,
		applicableLoadTypesRu: [
			'Устройство контроля процессов Helix PCD с полой трубкой 1500 мм x 2 мм'
		],
		recommendedPackaging: ['unwrapped_tray'],
		mandatoryIndicators: ['helix_pcd'],
		sanpinNormRefRu: 'ГОСТ EN 867-5, СанПиН 3.3686-21 п. 3641'
	}
};
