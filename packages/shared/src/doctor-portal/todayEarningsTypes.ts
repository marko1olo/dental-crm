import { z } from "zod";

export const doctorTodayEarningsSummarySchema = z
	.object({
		earnedTodayKopecks: z.number().int().nonnegative(),
		grossTodayKopecks: z.number().int().nonnegative(),
		commissionPercent: z.number().finite().min(0).max(100),
		completedVisitsCount: z.number().int().nonnegative(),
		plannedEarningsKopecks: z.number().int().nonnegative(),
	})
	.strict();

export type DoctorTodayEarningsSummary = z.infer<
	typeof doctorTodayEarningsSummarySchema
>;
