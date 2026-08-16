export const TOOTH_CONDITIONS = [
	"healthy",
	"caries",
	"pulpitis",
	"periodontitis",
	"filled",
	"crown",
	"extracted",
	"implant",
	"abutment",
	"bridge_pontic",
	"root_remnant",
	"missing_congenital",
] as const;
export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

export const TOOTH_SURFACES = [
	"occlusal",
	"mesial",
	"distal",
	"vestibular",
	"lingual",
] as const;
export type ToothSurface = (typeof TOOTH_SURFACES)[number];

export interface ToothState {
	fdiNumber: string; // FDI 11-48, 51-85
	condition: ToothCondition;
	surfaces?: ToothSurface[];
	mobilityGrade?: 0 | 1 | 2 | 3;
	hasRootCanalFilling?: boolean;
	notes?: string | null;
}

export interface OdontogramSnapshot {
	version: number;
	visitId?: string | null;
	recordedAt: Date;
	teeth: Record<string, ToothState>;
}

export type EvolutionChangeType =
	| "no_change"
	| "caries_detected"
	| "endodontic_treated"
	| "filling_placed"
	| "crown_installed"
	| "tooth_extracted"
	| "implant_placed"
	| "prosthetic_restored"
	| "condition_changed";

export interface ToothEvolutionChange {
	fdiNumber: string;
	changeType: EvolutionChangeType;
	previousCondition: ToothCondition;
	currentCondition: ToothCondition;
	isAnatomicallyValid: boolean;
	validationMessage?: string | null;
	description: string;
}

export class OdontogramEvolutionEngine {
	/**
	 * Валидация анатомической корректности перехода состояния зуба
	 */
	public static validateToothTransition(
		fdiNumber: string,
		from: ToothCondition,
		to: ToothCondition,
	): { isValid: boolean; message?: string } {
		if (from === to) {
			return { isValid: true };
		}

		// Нельзя лечить или пломбировать ранее удаленный зуб без импланта
		if (from === "extracted" && (to === "caries" || to === "filled" || to === "pulpitis" || to === "periodontitis")) {
			return {
				isValid: false,
				message: `Анатомическая ошибка для зуба ${fdiNumber}: невозможно диагностировать кариес/поставить пломбу на ранее удаленный зуб. Сначала требуется установка имплантата.`,
			};
		}

		// Нельзя удалить уже отсутствующий зуб
		if ((from === "extracted" || from === "missing_congenital") && to === "extracted") {
			return {
				isValid: false,
				message: `Анатомическая ошибка для зуба ${fdiNumber}: зуб уже был удален или первично отсутствует.`,
			};
		}

		// Установка имплантата допустима только на место отсутствующего/удаленного зуба
		if (from === "healthy" && to === "implant") {
			return {
				isValid: false,
				message: `Анатомическая ошибка для зуба ${fdiNumber}: установка имплантата невозможна без предварительного удаления интактного зуба.`,
			};
		}

		// Первично отсутствующий зуб не может стать здоровым естественным зубом
		if (from === "missing_congenital" && from !== to && to !== "implant" && to !== "bridge_pontic") {
			return {
				isValid: false,
				message: `Анатомическая ошибка для зуба ${fdiNumber}: первично отсутствующий зуб (адентия) может быть восстановлен только имплантом или мостовидным протезом.`,
			};
		}

		return { isValid: true };
	}

	/**
	 * Определение типа клинического изменения состояния зуба
	 */
	public static classifyChangeType(from: ToothCondition, to: ToothCondition): EvolutionChangeType {
		if (from === to) return "no_change";
		if (to === "caries") return "caries_detected";
		if (to === "filled") return "filling_placed";
		if (to === "crown") return "crown_installed";
		if (to === "extracted") return "tooth_extracted";
		if (to === "implant") return "implant_placed";
		if (to === "abutment" || to === "bridge_pontic") return "prosthetic_restored";
		if (to === "pulpitis" || to === "periodontitis") return "endodontic_treated";
		return "condition_changed";
	}

	/**
	 * Сравнение двух срезов одонтограммы (Diff Engine)
	 */
	public static diffOdontograms(
		previous: OdontogramSnapshot,
		current: OdontogramSnapshot,
	): {
		changes: ToothEvolutionChange[];
		totalChangedTeeth: number;
		hasAnatomicalErrors: boolean;
	} {
		const changes: ToothEvolutionChange[] = [];
		const allToothKeys = new Set([
			...Object.keys(previous.teeth),
			...Object.keys(current.teeth),
		]);

		let hasAnatomicalErrors = false;

		for (const fdi of allToothKeys) {
			const prevTooth = previous.teeth[fdi] ?? { fdiNumber: fdi, condition: "healthy" };
			const currTooth = current.teeth[fdi] ?? { fdiNumber: fdi, condition: "healthy" };

			if (prevTooth.condition !== currTooth.condition) {
				const transition = this.validateToothTransition(fdi, prevTooth.condition, currTooth.condition);
				const changeType = this.classifyChangeType(prevTooth.condition, currTooth.condition);

				if (!transition.isValid) {
					hasAnatomicalErrors = true;
				}

				changes.push({
					fdiNumber: fdi,
					changeType,
					previousCondition: prevTooth.condition,
					currentCondition: currTooth.condition,
					isAnatomicallyValid: transition.isValid,
					validationMessage: transition.message ?? null,
					description: `Зуб ${fdi}: переход ${prevTooth.condition} -> ${currTooth.condition}`,
				});
			}
		}

		return {
			changes,
			totalChangedTeeth: changes.length,
			hasAnatomicalErrors,
		};
	}
}
