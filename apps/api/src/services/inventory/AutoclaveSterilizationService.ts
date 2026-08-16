import { z } from "zod";

export const STERILIZATION_MODES = [
	"steam_134",
	"steam_121",
	"dry_heat_180",
] as const;
export type SterilizationMode = (typeof STERILIZATION_MODES)[number];

export const CHEMICAL_INDICATOR_CLASSES = [
	"class_4_multivariable",
	"class_5_integrator",
	"class_6_emulating",
] as const;
export type ChemicalIndicatorClass = (typeof CHEMICAL_INDICATOR_CLASSES)[number];

export const PACKAGING_TYPES = [
	"craft_pouch_sealed", // 50 days (термозапайка)
	"craft_pouch_clipped", // 20 days (скрепка/самоклейка)
	"combination_roll", // 180 days (комбинированный прозрачный рулон)
	"crepe_paper_double", // 21 days (двойная креп-бумага)
] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

export interface SterilizationCycleInput {
	organizationId: string;
	deviceName: string;
	cycleNumber: number;
	mode: SterilizationMode;
	operatorId: string;
	packagingType: PackagingType;
	trayId: string;
	trayDescription: string;
	indicatorClass: ChemicalIndicatorClass;
	indicatorPassed: boolean;
	bowieDickPassed?: boolean | null;
	vacuumLeakTestPassed?: boolean | null;
	cycleDate?: Date;
}

export interface SterilizationCycleRecord {
	barcode: string;
	organizationId: string;
	deviceName: string;
	cycleNumber: number;
	mode: SterilizationMode;
	targetTemperatureC: number;
	targetPressureBar: number | null;
	exposureDurationMinutes: number;
	operatorId: string;
	packagingType: PackagingType;
	trayId: string;
	trayDescription: string;
	indicatorClass: ChemicalIndicatorClass;
	indicatorPassed: boolean;
	bowieDickPassed: boolean | null;
	vacuumLeakTestPassed: boolean | null;
	sterilizedAt: Date;
	expiresAt: Date;
	isValid: boolean;
	validationErrors: string[];
}

export class AutoclaveSterilizationService {
	/**
	 * Получение нормативных параметров режима стерилизации по СанПиН 3.3686-21
	 */
	public static getModeParameters(mode: SterilizationMode): {
		tempC: number;
		pressureBar: number | null;
		durationMin: number;
		description: string;
	} {
		switch (mode) {
			case "steam_134":
				return {
					tempC: 134,
					pressureBar: 2.1,
					durationMin: 5,
					description: "Паровой режим 134°C, 2.1 бар, 5 мин (быстрый для цельного инструмента)",
				};
			case "steam_121":
				return {
					tempC: 121,
					pressureBar: 1.1,
					durationMin: 20,
					description: "Паровой режим 121°C, 1.1 бар, 20 мин (деликатный для полимеров и оптики)",
				};
			case "dry_heat_180":
				return {
					tempC: 180,
					pressureBar: null,
					durationMin: 60,
					description: "Воздушный сухожаровой режим 180°C, 60 мин",
				};
		}
	}

	/**
	 * Расчет срока сохранения стерильности по типу упаковки (СанПиН 3.3686-21)
	 */
	public static getPackagingShelfLifeDays(packaging: PackagingType): number {
		switch (packaging) {
			case "craft_pouch_sealed":
				return 50;
			case "craft_pouch_clipped":
				return 20;
			case "combination_roll":
				return 180;
			case "crepe_paper_double":
				return 21;
		}
	}

	/**
	 * Генерация уникального штрихкода лотка по формату STER-<CYCLE>-<YYYYMMDD>-<TRAY>
	 */
	public static generateBarcode(cycleNumber: number, date: Date, trayId: string): string {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const dd = String(date.getDate()).padStart(2, "0");
		const cleanTray = trayId.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
		return `STER-${cycleNumber}-${yyyy}${mm}${dd}-${cleanTray}`;
	}

	/**
	 * Проверка стерильности лотка на целевую дату
	 */
	public static checkTraySterility(
		expiresAt: Date,
		targetDate: Date = new Date(),
	): {
		isSterile: boolean;
		daysRemaining: number;
		status: "sterile" | "expiring_soon" | "expired";
	} {
		const diffMs = expiresAt.getTime() - targetDate.getTime();
		const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		if (daysRemaining < 0) {
			return {
				isSterile: false,
				daysRemaining,
				status: "expired",
			};
		}

		if (daysRemaining <= 3) {
			return {
				isSterile: true,
				daysRemaining,
				status: "expiring_soon",
			};
		}

		return {
			isSterile: true,
			daysRemaining,
			status: "sterile",
		};
	}

	/**
	 * Валидация и регистрация цикла стерилизации
	 */
	public static processSterilizationCycle(input: SterilizationCycleInput): SterilizationCycleRecord {
		const validationErrors: string[] = [];

		if (!input.organizationId) validationErrors.push("Не указан идентификатор организации");
		if (!input.deviceName) validationErrors.push("Не указано наименование стерилизатора/автоклава");
		if (!input.cycleNumber || input.cycleNumber <= 0) validationErrors.push("Некорректный номер цикла");
		if (!input.trayId) validationErrors.push("Не указан идентификатор лотка");
		if (!input.operatorId) validationErrors.push("Не указан оператор стерилизации (ответственная медсестра)");

		if (!input.indicatorPassed) {
			validationErrors.push("Химический индикатор стерилизации НЕ сработал (отклонение по температуре/времени)");
		}

		if (input.bowieDickPassed === false) {
			validationErrors.push("Тест Бови-Дика (Bowie-Dick) отрицательный: нарушение вакуумирования камеры");
		}

		if (input.vacuumLeakTestPassed === false) {
			validationErrors.push("Вакуум-тест герметичности камеры автоклава не пройден");
		}

		const params = this.getModeParameters(input.mode);
		const shelfLifeDays = this.getPackagingShelfLifeDays(input.packagingType);

		const cycleDate = input.cycleDate ?? new Date();
		const expiresAt = new Date(cycleDate.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
		const barcode = this.generateBarcode(input.cycleNumber, cycleDate, input.trayId);

		return {
			barcode,
			organizationId: input.organizationId,
			deviceName: input.deviceName,
			cycleNumber: input.cycleNumber,
			mode: input.mode,
			targetTemperatureC: params.tempC,
			targetPressureBar: params.pressureBar,
			exposureDurationMinutes: params.durationMin,
			operatorId: input.operatorId,
			packagingType: input.packagingType,
			trayId: input.trayId,
			trayDescription: input.trayDescription,
			indicatorClass: input.indicatorClass,
			indicatorPassed: input.indicatorPassed,
			bowieDickPassed: input.bowieDickPassed ?? null,
			vacuumLeakTestPassed: input.vacuumLeakTestPassed ?? null,
			sterilizedAt: cycleDate,
			expiresAt,
			isValid: validationErrors.length === 0,
			validationErrors,
		};
	}
}
