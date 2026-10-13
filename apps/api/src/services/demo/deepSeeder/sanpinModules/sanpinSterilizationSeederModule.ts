/**
 * sanpinSterilizationSeederModule.ts — SanPiN 3.3686-21 / 2.1.3684-21 Registers & Logs (Layer 2).
 *
 * Seeds autoclaves, dry heat sterilizers, form 257/у sterilization log,
 * form 366/у PSO cleaning log, Dezar bactericidal lamps, microclimate log, and medical waste classes A/B.
 */

import { eq } from "drizzle-orm";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	generalCleaningLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	sterilizerEquipments,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../../db/schema.js";
import type { DbTx } from "../types.js";

/**
 * Засевает журналы СанПиН 3.3686-21 / 2.1.3684-21 (автоклавы, ПСО 366/у, стерилизацию 257/у, УФ-рециркуляторы, температуру и отходы).
 */
export async function seedSanpinRegisters(
	tx: DbTx,
	organizationId: string,
	operatorUserId: string,
): Promise<void> {
	const now = new Date();
	const todayStr = now.toISOString().slice(0, 10);
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// 1. Паспорта стерилизаторов (автоклав + сухожар)
	const existingSterEquips = await tx
		.select({ id: sterilizerEquipments.id })
		.from(sterilizerEquipments)
		.where(eq(sterilizerEquipments.organizationId, organizationId))
		.limit(1);

	if (existingSterEquips.length === 0) {
		await tx
			.insert(sterilizerEquipments)
			.values([
				{
					organizationId,
					name: "Автоклав Euronda E9 Next (Класс B, 24 л)",
					brandModel: "Euronda E9 Next 24L",
					serialNumber: "SN-E9N-2025-8841",
					inventoryNumber: "ИНВ-ЦСО-001",
					deviceType: "autoclave_steam",
					deviceClass: "autoclave_class_b",
					chamberVolumeLiters: "24.00",
					locationRoom: "ЦСО (Стерилизационная)",
					status: "active",
					isCommissioned: true,
					notes: "Фракционированный предвакуум, встроенный термопринтер циклов",
				},
				{
					organizationId,
					name: "Стерилизатор воздушный Ферропласт-10",
					brandModel: "Ферропласт Премиум ГП-10",
					serialNumber: "SN-FP10-2024-1192",
					inventoryNumber: "ИНВ-ЦСО-002",
					deviceType: "dry_heat",
					deviceClass: "dry_heat_air",
					chamberVolumeLiters: "10.00",
					locationRoom: "ЦСО (Стерилизационная)",
					status: "active",
					isCommissioned: true,
					notes: "Режим 180 °C / 60 мин для цельнометаллических лотков и боров",
				},
			])
			.onConflictDoNothing();
	}

	// 2. Журнал контроля работы стерилизаторов (Форма № 257/у)
	const existingSterLogs = await tx
		.select({ id: sterilizationLogs.id })
		.from(sterilizationLogs)
		.where(eq(sterilizationLogs.organizationId, organizationId))
		.limit(1);

	if (existingSterLogs.length === 0) {
		const expOneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
		const expTwentyDays = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
		await tx
			.insert(sterilizationLogs)
			.values([
				{
					organizationId,
					deviceName: "Автоклав Euronda E9 Next (Класс B)",
					autoclaveId: "SN-E9N-2025-8841",
					cycleNumber: 1,
					itemsDescription: "Смотровые лотки (зеркала, зонды, пинцеты) — 15 наборов, наконечники турбинные — 6 шт. | Интегратор МедИС-П-134 достиг конечного эталона. Вакуум-тест и Бови-Дик пройдены.",
					packagingType: "laminated_heat_sealed",
					temperatureCelsius: "134.0",
					pressureBar: "2.15",
					durationMin: 5,
					indicatorType: "class5_integrating",
					cycleMode: "B",
					passedIndicator: true,
					status: "passed",
					barcode: `DNT-STER-C001-${todayStr.replace(/-/g, "")}-A1B2`,
					expiresAt: expOneYear,
					operatorId: operatorUserId,
					timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
				},
				{
					organizationId,
					deviceName: "Автоклав Euronda E9 Next (Класс B)",
					autoclaveId: "SN-E9N-2025-8841",
					cycleNumber: 2,
					itemsDescription: "Хирургические кассеты (элеваторы, щипцы, иглодержатели, распаторы) — 6 компл. | Партия хирургического блока допущена к приёму. Упаковка герметична.",
					packagingType: "kraft_self_adhesive",
					temperatureCelsius: "134.0",
					pressureBar: "2.15",
					durationMin: 5,
					indicatorType: "class5_integrating",
					cycleMode: "B",
					passedIndicator: true,
					status: "passed",
					barcode: `DNT-STER-C002-${todayStr.replace(/-/g, "")}-C3D4`,
					expiresAt: expTwentyDays,
					operatorId: operatorUserId,
					timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
				},
				{
					organizationId,
					deviceName: "Стерилизатор воздушный Ферропласт-10 (ГП-10)",
					autoclaveId: "SN-FP10-2024-1192",
					cycleNumber: 1,
					itemsDescription: "Эндодонтические боксы, боры твердосплавные и алмазные, гладилки — 12 уп. | Сухожаровой цикл 180 °C / 60 мин. Все 5 контрольных точек в норме.",
					packagingType: "kraft_self_adhesive",
					temperatureCelsius: "180.0",
					pressureBar: "0.00",
					durationMin: 60,
					indicatorType: "class4_multivariable",
					cycleMode: "dry_heat_180",
					passedIndicator: true,
					status: "passed",
					barcode: `DNT-STER-C001-${yesterday.toISOString().slice(0, 10).replace(/-/g, "")}-E5F6`,
					expiresAt: expTwentyDays,
					operatorId: operatorUserId,
					timestamp: yesterday,
				},
			])
			.onConflictDoNothing();
	}

	// 3. Журнал предстерилизационной очистки (ПСО, Форма № 366/у)
	const existingPsoLogs = await tx
		.select({ id: preSterilizationCleaningLogs.id })
		.from(preSterilizationCleaningLogs)
		.where(eq(preSterilizationCleaningLogs.organizationId, organizationId))
		.limit(1);

	if (existingPsoLogs.length === 0) {
		await tx
			.insert(preSterilizationCleaningLogs)
			.values([
				{
					organizationId,
					testType: "both",
					batchItemCount: 150,
					testedSampleCount: 5,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isBatchApproved: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1%",
					operatorId: operatorUserId,
					notes: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты) | Выборка 3% от партии (5 из 150 шт.). Пробы отрицательные, партия передана на упаковку.",
					timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
				},
				{
					organizationId,
					testType: "both",
					batchItemCount: 60,
					testedSampleCount: 3,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isBatchApproved: true,
					detergentBrand: "Оптимакс Про 1.5% (УЗ-мойка)",
					operatorId: operatorUserId,
					notes: "Хирургический инструментарий (щипцы, элеваторы, кюреты, распаторы) | Следов гемоглобина и ПАВ не обнаружено.",
					timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
				},
				{
					organizationId,
					testType: "both",
					batchItemCount: 120,
					testedSampleCount: 4,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isBatchApproved: true,
					detergentBrand: "Септодор Форте 1%",
					operatorId: operatorUserId,
					notes: "Эндодонтический инструментарий, боры, стоматологические наконечники | Ротационная продувка и промывка каналов наконечников проведена.",
					timestamp: yesterday,
				},
			])
			.onConflictDoNothing();
	}

	// 4. Бактерицидные рециркуляторы (Дезар) + журнал учета часов
	let bactEquips = await tx
		.select()
		.from(bactericidalEquipments)
		.where(eq(bactericidalEquipments.organizationId, organizationId));

	if (bactEquips.length === 0) {
		bactEquips = await tx
			.insert(bactericidalEquipments)
			.values([
				{
					organizationId,
					roomName: "Терапевтический кабинет №1",
					roomAreaM2: "18.00",
					roomVolumeM3: "54.00",
					deviceBrand: "Дезар-4 (КРОНТ)",
					serialNumber: "DZR-2026-001",
					deviceType: "recirculator_closed",
					lampType: "TUV 15W",
					lampCount: 3,
					maxLampHours: 9000,
					totalOperatingHours: "420.50",
					isCommissioned: true,
				},
				{
					organizationId,
					roomName: "ЦСО (Стерилизационная)",
					roomAreaM2: "12.00",
					roomVolumeM3: "36.00",
					deviceBrand: "Дезар-7 (КРОНТ)",
					serialNumber: "DZR-2026-002",
					deviceType: "recirculator_closed",
					lampType: "TUV 15W",
					lampCount: 5,
					maxLampHours: 9000,
					totalOperatingHours: "310.00",
					isCommissioned: true,
				},
			])
			.returning();
	}

	const existingBactLogs = await tx
		.select({ id: bactericidalIrradiatorLogs.id })
		.from(bactericidalIrradiatorLogs)
		.where(eq(bactericidalIrradiatorLogs.organizationId, organizationId))
		.limit(1);

	if (existingBactLogs.length === 0 && bactEquips.length > 0) {
		const sStart = new Date(now);
		sStart.setHours(8, 0, 0, 0);
		const sEnd = new Date(now);
		sEnd.setHours(9, 0, 0, 0);
		await tx
			.insert(bactericidalIrradiatorLogs)
			.values(
				bactEquips.map((eqItem) => ({
					organizationId,
					equipmentId: eqItem.id,
					date: todayStr,
					sessionStartTime: sStart,
					sessionEndTime: sEnd,
					durationMinutes: 60,
					operatingMode: "continuous_presence",
					cumulativeHoursAfterSession: eqItem.totalOperatingHours,
					operatorId: operatorUserId,
					notes: "Предсменное и текущее обеззараживание воздуха в присутствии персонала",
				})),
			)
			.onConflictDoNothing();
	}

	// 5. Температурный режим и влажность (Приказ 706н / 646н)
	let tempEquips = await tx
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (tempEquips.length === 0) {
		tempEquips = await tx
			.insert(temperatureHumidityEquipments)
			.values([
				{
					organizationId,
					name: "Фармацевтический холодильник Позис ХФ-140",
					location: "Кабинет №1 (хранение анестетиков)",
					equipmentType: "refrigerator_cold",
					meterDeviceName: "Термометр ТЦ-1200",
					meterSerialNumber: "PZS-140-001",
					targetTempMinCelsius: "2.00",
					targetTempMaxCelsius: "8.00",
					isActive: true,
				},
				{
					organizationId,
					name: "Гигрометр психометрический ВИТ-2",
					location: "ЦСО (Стерилизационная)",
					equipmentType: "storage_room",
					meterDeviceName: "Гигрометр ВИТ-2",
					meterSerialNumber: "VIT2-2026-01",
					targetTempMinCelsius: "18.00",
					targetTempMaxCelsius: "25.00",
					targetHumidityMinPercent: "30.00",
					targetHumidityMaxPercent: "60.00",
					isActive: true,
				},
			])
			.returning();
	}

	const existingTempLogs = await tx
		.select({ id: temperatureHumidityLogs.id })
		.from(temperatureHumidityLogs)
		.where(eq(temperatureHumidityLogs.organizationId, organizationId))
		.limit(1);

	if (existingTempLogs.length === 0 && tempEquips.length > 0) {
		await tx
			.insert(temperatureHumidityLogs)
			.values(
				tempEquips.map((te) => {
					const isFridge = te.equipmentType.includes("refrigerator");
					return {
						organizationId,
						equipmentId: te.id,
						measurementDate: todayStr,
						measurementPeriod: "morning",
						temperatureCelsius: isFridge ? "4.20" : "21.50",
						relativeHumidityPercent: isFridge ? null : "48.00",
						isWithinNorm: true,
						operatorId: operatorUserId,
						notes: "Утренний контроль микроклимата и холодовой цепи — норма",
					};
				}),
			)
			.onConflictDoNothing();
	}

	// 6. Медицинские отходы классов А и Б (СанПиН 2.1.3684-21)
	const existingWasteLogs = await tx
		.select({ id: medicalWasteLogs.id })
		.from(medicalWasteLogs)
		.where(eq(medicalWasteLogs.organizationId, organizationId))
		.limit(1);

	if (existingWasteLogs.length === 0) {
		await tx
			.insert(medicalWasteLogs)
			.values([
				{
					organizationId,
					operationType: "accumulation",
					wasteClass: "class_B",
					wasteDescription: "Отработанные карпулы анестетиков, салфетки, перчатки, слюноотсосы (каб. №1–3)",
					packageType: "yellow_bag",
					packageCount: 2,
					weightKg: "1.850",
					disinfectionMethod: "chemical_soaking",
					disinfectantUsed: "Оптимакс Про 1.5%",
					disposalCompany: "ООО «ЭкоМедСервис»",
					contractNumber: "ДОГ-ЭКО-2026/14",
					transferActNumber: `АКТ-Б-${todayStr.replace(/-/g, "")}`,
					responsibleStaffId: operatorUserId,
					notes: "Обеззараживание и герметизация жёлтых пакетов проведены по регламенту смены",
				},
				{
					organizationId,
					operationType: "transfer_to_disposal_company",
					wasteClass: "class_A",
					wasteDescription: "Неинфицированная бумага, крафт-упаковка, бахилы",
					packageType: "white_bag",
					packageCount: 3,
					weightKg: "3.200",
					disinfectionMethod: "none_centralized",
					disposalCompany: "АО «ЭкоТехПром»",
					contractNumber: "ДОГ-ТКО-2026/08",
					transferActNumber: `АКТ-А-${todayStr.replace(/-/g, "")}`,
					responsibleStaffId: operatorUserId,
					notes: "Плановый вывоз отходов класса А",
				},
			])
			.onConflictDoNothing();
	}

	// 7. Генеральные уборки
	const existingCleaning = await tx
		.select({ id: generalCleaningLogs.id })
		.from(generalCleaningLogs)
		.where(eq(generalCleaningLogs.organizationId, organizationId))
		.limit(1);

	if (existingCleaning.length === 0) {
		await tx
			.insert(generalCleaningLogs)
			.values({
				organizationId,
				cleaningType: "general",
				scheduledDate: todayStr,
				roomName: "Терапевтический кабинет №1 и ЦСО",
				treatedAreaM2: "30.00",
				disinfectantName: "Аламинол 1% / Оптимакс Про 1.5%",
				activeIngredient: "ЧАС + третичные амины",
				solutionConcentrationPercent: "1.50",
				applicationMethod: "wiping",
				exposureTimeMinutes: 30,
				uvIrradiationMinutes: 60,
				ventilationMinutes: 15,
				operatorId: operatorUserId,
				inspectorId: operatorUserId,
				status: "completed",
				notes: "Плановая генеральная уборка с УФ-облучением и сменой спецодежды",
			})
			.onConflictDoNothing();
	}
}
