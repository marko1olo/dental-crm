export type MedicalWasteClass = "class_a" | "class_b" | "class_g";

export interface MedicalWasteRecord {
	id: string;
	organizationId: string;
	roomNumber: string;
	wasteClass: MedicalWasteClass;
	weightKg: number;
	packageType: "yellow_bag_sealed" | "puncture_resistant_container" | "white_bag_sealed" | "mercury_safe_container";
	collectedByStaffId: string;
	collectedAt: Date;
	isDisposed: boolean;
	disposalManifestId?: string;
}

export interface MedicalWasteDisposalManifest {
	manifestNumber: string;
	organizationId: string;
	contractorName: string;
	contractorLicenseNumber: string;
	dispatchedAt: Date;
	totalWeightKg: number;
	breakdownByClass: Record<MedicalWasteClass, { weightKg: number; packagesCount: number }>;
	recordIds: string[];
	authorizedRepresentativeFio: string;
}

export class MedicalWasteDisposalService {
	/**
	 * Валидация и регистрация партии медицинских отходов (СанПиН 2.1.3684-21)
	 */
	public static validateWasteRecord(record: MedicalWasteRecord): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (record.weightKg <= 0 || record.weightKg > 50) {
			errors.push("Вес отходов должен быть положительным и не превышать 50 кг на один пакет/контейнер.");
		}

		// Для класса Б обязательна желтая тара или непрокалываемый контейнер
		if (
			record.wasteClass === "class_b" &&
			record.packageType !== "yellow_bag_sealed" &&
			record.packageType !== "puncture_resistant_container"
		) {
			errors.push("Отходы Класса Б (эпидемиологически опасные) требуют желтый герметичный пакет или непрокалываемый контейнер.");
		}

		// Для класса Г обязательна спец. тара
		if (record.wasteClass === "class_g" && record.packageType !== "mercury_safe_container") {
			errors.push("Отходы Класса Г (токсикологические) требуют специальный сертифицированный герметичный контейнер.");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Формирование Акта передачи отходов лицензированной компании по утилизации
	 */
	public static generateDisposalManifest(
		organizationId: string,
		records: readonly MedicalWasteRecord[],
		contractorName: string,
		contractorLicenseNumber: string,
		authorizedRepresentativeFio: string,
		manifestDate: Date = new Date(),
	): MedicalWasteDisposalManifest {
		const activeRecords = records.filter((r) => r.organizationId === organizationId && !r.isDisposed);

		const breakdown: Record<MedicalWasteClass, { weightKg: number; packagesCount: number }> = {
			class_a: { weightKg: 0, packagesCount: 0 },
			class_b: { weightKg: 0, packagesCount: 0 },
			class_g: { weightKg: 0, packagesCount: 0 },
		};

		let totalWeight = 0;
		for (const r of activeRecords) {
			breakdown[r.wasteClass].weightKg = Number((breakdown[r.wasteClass].weightKg + r.weightKg).toFixed(2));
			breakdown[r.wasteClass].packagesCount += 1;
			totalWeight = Number((totalWeight + r.weightKg).toFixed(2));
		}

		const dateStr = manifestDate.toISOString().slice(0, 10).replace(/-/g, "");
		const manifestNumber = `WASTE-${dateStr}-${activeRecords.length}`;

		return {
			manifestNumber,
			organizationId,
			contractorName,
			contractorLicenseNumber,
			dispatchedAt: manifestDate,
			totalWeightKg: totalWeight,
			breakdownByClass: breakdown,
			recordIds: activeRecords.map((r) => r.id),
			authorizedRepresentativeFio,
		};
	}
}
