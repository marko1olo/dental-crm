/**
 * doctorPayrollDbQueries.ts — Канонический фасад запросов зарплаты врачей (SSOT).
 * Реализация декомпозирована в payrollModules/ в рамках Мандата 8b (ROT-009).
 */

export {
	type PayrollOrderDto,
	type DoctorPayrollProfileDto,
	type ClosedPayrollPeriodDto,
	type DoctorPayrollDatasetResult,
	getTreatmentItemGrossKopecks,
	parseClosedPeriodRange,
	SPECIALTY_TITLES,
	CATEGORY_LABELS_RU,
	normalizeClinicalCategory,
	fetchActiveDoctorProfiles,
	fetchClosedPayrollStatements,
} from "./payrollModules/payrollTypesAndQueries.js";

export { fetchDoctorPayrollDataset } from "./payrollModules/payrollDatasetQuery.js";
