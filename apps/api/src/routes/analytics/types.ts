import { z } from "zod";
import type {
	CuratorFunnelStage,
	CuratorPatientQueueItem,
	ExecutiveDepartmentKey,
	ExecutiveFunnelStage,
	ExecutivePeriod,
} from "@dental/shared";

/**
 * Названия месяцев для ярлыка когорты. Экспортируются, чтобы тест-замок на пояс
 * когорты сверял ярлык с ЭТОЙ таблицей, а не с собственной копией: вторая копия
 * разошлась бы с первой, и тест перестал бы проверять то, что показывают
 * владельцу клиники.
 */
export const RU_MONTHS = [
	"Янв",
	"Фев",
	"Мар",
	"Апр",
	"Май",
	"Июн",
	"Июл",
	"Авг",
	"Сен",
	"Окт",
	"Ноя",
	"Дек",
] as const;

/**
 * Канонический алиас для названий месяцев (SSOT).
 */
export const MONTH_LABELS_RU = RU_MONTHS;

export type TierKey = "basic" | "optimum" | "premium";

export interface RebookingEvent {
	id: string;
	patientName: string;
	rebookedBy: string;
	timeDeltaMinutes: number;
	creditedRole: "doctor" | "administrator";
	appointmentDate: string;
	createdAt: Date;
	attributionReason: string;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	specialty?: string | undefined;
}

export const rebookingConversionBodySchema = z.object({
	patientName: z.string().optional(),
	rebookedBy: z.string().optional(),
	timeDeltaMinutes: z.number().optional(),
	createdAt: z.string().optional(),
	completedAt: z.string().optional(),
	creditedRole: z.enum(["doctor", "administrator"]).optional(),
	appointmentDate: z.string().optional(),
	isSoloDoctor: z.boolean().optional(),
});

export type RebookingConversionBody = z.infer<typeof rebookingConversionBodySchema>;

export type {
	CuratorFunnelStage,
	CuratorPatientQueueItem,
	ExecutiveDepartmentKey,
	ExecutiveFunnelStage,
	ExecutivePeriod,
};
