/**
 * Единая точка экспорта и агрегатор модулей загрузки данных миграции.
 * Layer 5: Master Aggregator & Dispatcher.
 */

import type { MigrationEntityKind } from "@dental/shared";
import { loadAppointments, loadVisits } from "./entityLoaderAppointments.js";
import { loadPatients } from "./entityLoaderPatients.js";
import { loadPayments } from "./entityLoaderPayments.js";
import type { LoadOutcome, StagedRow } from "./types.js";

export * from "./constants.js";
export type * from "./types.js";
export * from "./timezonePolicy.js";
export * from "./stagingStore.js";
export * from "./batchPipeline.js";
export * from "./entityLoaderPatients.js";
export * from "./entityLoaderAppointments.js";
export * from "./entityLoaderPayments.js";

/** Выбирает загрузчик по сущности. */
export function loaderFor(
	entityKind: MigrationEntityKind,
):
	| ((input: {
			runId: string;
			organizationId: string;
			sourceSystem: string;
			sourceName: string;
			rows: StagedRow[];
			dryRun: boolean;
	  }) => Promise<LoadOutcome>)
	| null {
	switch (entityKind) {
		case "patient":
			return loadPatients;
		case "appointment":
			return loadAppointments;
		case "payment":
			return loadPayments;
		case "visit":
			return loadVisits;
		default:
			/**
			 * Врачи, услуги и состояния зубов пока не загружаются: у них в нашей
			 * модели есть обязательные связи (врач — это пользователь с ролью и
			 * доступом), создавать которые переносом нельзя без решения оператора.
			 * Возврат null честнее пустого загрузчика — движок сообщит, что сущность
			 * разобрана и уложена в стейджинг, но не загружена.
			 */
			return null;
	}
}

export { naturalKeyFor } from "../recordResolution.js";
