export interface AmalgamSeparatorRecord {
	id: string;
	organizationId: string;
	lastMaintenanceDate: Date;
	installationDate: Date;
	mercuryRetentionRate: number; // Percentage
	isFunctional: boolean;
	notes?: string;
}

export interface SilverFixerRecord {
	id: string;
	organizationId: string;
	volumeLiters: number;
	silverContentGramsPerLiter: number; // 3-5 g/l is normal
	collectionDate: Date;
	isDispatchedForRecovery: boolean;
}

export interface SilverRecoveryManifest {
	manifestNumber: string;
	organizationId: string;
	contractorName: string;
	dispatchedAt: Date;
	totalSilverRecoveredGrams: number;
	amalgamContainersCount: number;
	recordsProcessedIds: string[];
	authorizedRepresentativeFio: string;
}

export class SilverRecoveryTrackerService {
	/**
	 * Валидация амальгамосепаратора
	 */
	public static validateSeparator(record: AmalgamSeparatorRecord): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (record.mercuryRetentionRate < 95) {
			errors.push("Норма задержки ртути должна быть не менее 95%.");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Расчет извлеченного серебра из фиксажа
	 */
	public static calculateSilverContent(record: SilverFixerRecord): number {
		return Number((record.volumeLiters * record.silverContentGramsPerLiter).toFixed(2));
	}

	/**
	 * Формирование акта передачи на лицензированную аффинажную переработку
	 */
	public static generateRecoveryManifest(
		organizationId: string,
		fixerRecords: SilverFixerRecord[],
		amalgamContainersCount: number,
		contractorName: string,
		authorizedRepresentativeFio: string,
		manifestDate: Date = new Date(),
	): SilverRecoveryManifest {
		const activeFixerRecords = fixerRecords.filter((r) => r.organizationId === organizationId && !r.isDispatchedForRecovery);

		let totalSilver = 0;
		for (const r of activeFixerRecords) {
			totalSilver += this.calculateSilverContent(r);
		}

		const dateStr = manifestDate.toISOString().slice(0, 10).replace(/-/g, "");
		const manifestNumber = `SILVER-REC-${dateStr}-${activeFixerRecords.length}`;

		return {
			manifestNumber,
			organizationId,
			contractorName,
			dispatchedAt: manifestDate,
			totalSilverRecoveredGrams: Number(totalSilver.toFixed(2)),
			amalgamContainersCount,
			recordsProcessedIds: activeFixerRecords.map((r) => r.id),
			authorizedRepresentativeFio,
		};
	}
}
