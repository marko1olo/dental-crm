/**
 * Канонический фасад загрузчика миграции (Layer 5 Facade).
 * Декомпозирован в директорию `./loader/` согласно архитектуре DAG /decomposer.
 *
 * Пояс клиники берётся из ЕДИНСТВЕННОГО источника — `clinicTimeZone` в
 * `services/reports/managerReports.js`.
 */
import { clinicTimeZone } from "../services/reports/managerReports.js";
void clinicTimeZone;

export type {
	DbTransaction,
	LoadOutcome,
	MigrationTimeZone,
	PostgresErrorFields,
	SavepointTx,
	StageResult,
	StagedRow,
	TransferredMoment,
} from "./loader/index.js";

export {
	APPOINTMENT_DEFAULT_MINUTES,
	DEFAULT_APPOINTMENT_MINUTES,
	LOAD_BATCH_SIZE,
	NO_OFFSET_TIME_ZONE,
	PAYMENT_DEFAULT_MINUTES,
	buildPatientIdentityIndex,
	explainDatabaseError,
	loadAppointments,
	loadEntityLinks,
	loadPatients,
	loadPayments,
	loadRowInSavepoint,
	loadVisits,
	loaderFor,
	migrationTimeZone,
	migrationTimeZoneFrom,
	naturalKeyFor,
	recordQuarantine,
	stageRows,
	transferredMoment,
} from "./loader/index.js";
