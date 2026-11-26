import type { FastifyInstance } from "fastify";
import { registerDayConfirmationDispatchRoutes } from "./dayConfirmations/dispatchHandler.js";
import { registerDayConfirmationQueryRoute } from "./dayConfirmations/queryHandler.js";
import {
	type ReminderState,
	dayBoundsInTimeZone,
	tomorrowInTimeZone,
} from "./dayConfirmations/timezoneAndTypes.js";

export type { ReminderState };
export { dayBoundsInTimeZone, tomorrowInTimeZone };

export async function registerDayConfirmationRoutes(app: FastifyInstance) {
	registerDayConfirmationQueryRoute(app);
	registerDayConfirmationDispatchRoutes(app);
}
