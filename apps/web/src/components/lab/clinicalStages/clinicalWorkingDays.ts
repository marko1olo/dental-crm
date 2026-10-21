import { MATERIALS } from "../labMath";

export interface WorkingDaysRemainingInfo {
	workingDays: number;
	calendarDays: number;
	isOverdue: boolean;
	isUrgent: boolean;
	badgeClass: string;
	labelRu: string;
}

export function calculateMaterialTotalCostKopecks(materialId: string, teethCount = 1): number {
	const count = Math.max(1, teethCount);
	const mat = MATERIALS.find((m) => m.id === materialId);
	const unitKopecks = (mat as any)?.baseCostKopecks ?? 650000;
	return unitKopecks * count;
}

export function addWorkingDays(startDate: Date, workingDays = 7): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < workingDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

export function calculateWorkingDaysRemaining(
	targetDate?: string | Date | null,
	fromDate: string | Date = new Date(),
): WorkingDaysRemainingInfo | null {
	if (!targetDate) return null;
	const due = new Date(targetDate);
	if (Number.isNaN(due.getTime())) return null;

	const from = new Date(fromDate);
	const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());

	const diffTime = dueMidnight.getTime() - fromMidnight.getTime();
	const calendarDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

	let workingDays = 0;
	if (calendarDays > 0) {
		const cur = new Date(fromMidnight);
		while (cur < dueMidnight) {
			cur.setDate(cur.getDate() + 1);
			const day = cur.getDay();
			if (day !== 0 && day !== 6) {
				workingDays++;
			}
		}
	} else if (calendarDays < 0) {
		const cur = new Date(dueMidnight);
		while (cur < fromMidnight) {
			cur.setDate(cur.getDate() + 1);
			const day = cur.getDay();
			if (day !== 0 && day !== 6) {
				workingDays--;
			}
		}
	}

	const isOverdue = workingDays < 0;
	const isUrgent = workingDays >= 0 && workingDays <= 2;

	let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
	let labelRu = `В графике: ${workingDays} раб. дн.`;

	if (isOverdue) {
		badgeClass = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
		labelRu = `Дедлайн просрочен на ${Math.abs(workingDays)} раб. дн.`;
	} else if (workingDays === 0) {
		badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
		labelRu = "Срок сдачи: сегодня";
	} else if (isUrgent) {
		badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
		labelRu = `Срочно: ${workingDays} раб. дн.`;
	}

	return { workingDays, calendarDays, isOverdue, isUrgent, badgeClass, labelRu };
}
