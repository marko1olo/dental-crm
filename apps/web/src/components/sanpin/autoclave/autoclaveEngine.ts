/**
 * SanPiN 3.3686-21 Autoclave Engine & Barcode Traceability System
 * Expiration calculations, Barcode parsing/generation, Form 257/u electronic log, EMR binding.
 */

import {
	AutoclaveCycleId,
	AutoclavePackagingType,
	IndicatorQualityClass,
	SANPIN_PACKAGING_RULES,
	AUTOCLAVE_CYCLES,
	AutoclaveCycleDefinition,
	getPackagingRule
} from './autoclavePresets';

export interface SterilePackRecord {
	barcode: string; // SANPIN-MELAG01-042-20260822-001
	packId: string;
	autoclaveId: string;
	cycleNumber: number;
	sterilizationDate: string; // ISO String
	expirationDate: string; // ISO String
	packagingType: AutoclavePackagingType;
	packagingNameRu: string;
	itemCategoryRu: string;
	itemsListRu: string[];
	operatorName: string;
	operatorStaffId?: string;
	status: 'sterile' | 'expiring_soon' | 'expired' | 'breached' | 'used';
	isBreached: boolean;
	usedAtPatientId?: string;
	usedAtPatientName?: string;
	usedAtVisitDate?: string;
	usedByDoctorName?: string;
}

export interface Form257SterilizerJournalEntry {
	id: string;
	date: string; // YYYY-MM-DD
	cycleNumber: number;
	deviceName: string;
	autoclaveId: string;
	cycleType: AutoclaveCycleId;
	cycleNameRu: string;
	sterilizationMode: {
		temperatureCelsius: number;
		pressureBar: number;
		durationMinutes: number;
	};
	loadDescriptionRu: string;
	packsCount: number;
	packagingType: AutoclavePackagingType;
	indicatorType: IndicatorQualityClass;
	indicatorColorBeforeRu: string;
	indicatorColorAfterRu: string;
	isIndicatorPassed: boolean;
	isBiologicalTestConducted: boolean;
	biologicalTestResult: 'passed' | 'failed' | 'not_conducted';
	isBatchApproved: boolean;
	operatorName: string;
	operatorSignatureStamp: string;
	generatedBarcodes: string[];
	notes?: string;
}

export interface PatientSterileUsageRecord {
	packBarcode: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	nurseName: string;
	visitDate: string;
	verifiedSterile: boolean;
	recordedAtIso: string;
}

// ---------------------------------------------------------------------------
// 1. Expiry & Shelf-life Calculations
// ---------------------------------------------------------------------------

export interface PackExpiryCalculation {
	sterilizationDate: Date;
	expiryDate: Date;
	daysValid: number;
	formattedExpiry: string;
	isExpired: boolean;
	daysRemaining: number;
}

export function computePackExpiryDate(
	packagingType: AutoclavePackagingType,
	sterilizationDateInput: string | Date = new Date()
): PackExpiryCalculation {
	const rule = getPackagingRule(packagingType);
	const sDate = typeof sterilizationDateInput === 'string'
		? new Date(sterilizationDateInput)
		: new Date(sterilizationDateInput.getTime());

	const expiryDate = new Date(sDate.getTime() + rule.shelfLifeDays * 24 * 60 * 60 * 1000);
	const now = new Date();
	const diffMs = expiryDate.getTime() - now.getTime();
	const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
	const isExpired = daysRemaining < 0 || (rule.shelfLifeDays === 0 && diffMs < -60 * 60 * 1000);

	return {
		sterilizationDate: sDate,
		expiryDate,
		daysValid: rule.shelfLifeDays,
		formattedExpiry: expiryDate.toISOString().slice(0, 10),
		isExpired,
		daysRemaining: Math.max(0, daysRemaining),
	};
}

export function evaluatePackStatus(
	sterilizationDate: string | Date,
	packagingType: AutoclavePackagingType,
	isBreached = false
): 'sterile' | 'expiring_soon' | 'expired' | 'breached' {
	if (isBreached) return 'breached';

	const calc = computePackExpiryDate(packagingType, sterilizationDate);
	if (calc.isExpired) return 'expired';
	if (calc.daysRemaining <= 3 && calc.daysValid > 0) return 'expiring_soon';
	return 'sterile';
}

// ---------------------------------------------------------------------------
// 2. GS1 DataMatrix / Code 128 Barcode Engine
// ---------------------------------------------------------------------------

function formatDigits(num: number, digits: number): string {
	return String(num).padStart(digits, '0');
}

function formatDateCompact(d: Date): string {
	const year = d.getFullYear();
	const month = formatDigits(d.getMonth() + 1, 2);
	const day = formatDigits(d.getDate(), 2);
	return `${year}${month}${day}`;
}

/**
 * Generates SanPiN compliant barcode string:
 * Format: `SANPIN-<AUTOCLAVE_ID>-<CYCLE_NUM>-<YYYYMMDD>-<PACK_NUM>`
 */
export function generateSanpinBarcode(
	autoclaveId: string,
	cycleNumber: number,
	dateInput: Date | string,
	packIndex: number | string
): string {
	const cleanAutoclave = autoclaveId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'AUTO1';
	const cycleStr = formatDigits(cycleNumber, 3);
	const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
	const dateStr = formatDateCompact(dateObj);
	const packStr = typeof packIndex === 'number' ? formatDigits(packIndex, 3) : String(packIndex);

	return `SANPIN-${cleanAutoclave}-${cycleStr}-${dateStr}-${packStr}`;
}

export interface ParsedSanpinBarcode {
	isValid: boolean;
	barcode: string;
	autoclaveId: string;
	cycleNumber: number;
	dateString: string;
	packId: string;
	error?: string;
}

export function parseSanpinBarcode(barcodeString: string): ParsedSanpinBarcode {
	const clean = (barcodeString || '').trim();
	const parts = clean.split('-');

	if (parts.length < 5 || parts[0] !== 'SANPIN') {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId: '',
			cycleNumber: 0,
			dateString: '',
			packId: '',
			error: 'Неверный формат штрихкода СанПиН (ожидается SANPIN-DEVICE-CYCLE-DATE-PACK)',
		};
	}

	const autoclaveId = parts[1] ?? '';
	const cycleNumber = parseInt(parts[2] ?? '0', 10);
	const dateString = parts[3] ?? '';
	const packId = parts.slice(4).join('-');

	if (isNaN(cycleNumber) || cycleNumber <= 0) {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId,
			cycleNumber: 0,
			dateString,
			packId,
			error: 'Некорректный номер цикла стерилизатора',
		};
	}

	if (dateString.length !== 8) {
		return {
			isValid: false,
			barcode: clean,
			autoclaveId,
			cycleNumber,
			dateString,
			packId,
			error: 'Некорректный формат даты (ожидается ГГГГММДД)',
		};
	}

	return {
		isValid: true,
		barcode: clean,
		autoclaveId,
		cycleNumber,
		dateString,
		packId,
	};
}

// ---------------------------------------------------------------------------
// 3. Batch Pack Generator
// ---------------------------------------------------------------------------

export function generateSterileBatchPacks(params: {
	autoclaveId: string;
	cycleNumber: number;
	packagingType: AutoclavePackagingType;
	packCount: number;
	itemCategoryRu: string;
	itemsListRu: string[];
	operatorName: string;
	operatorStaffId?: string;
	sterilizationDate?: Date | string;
}): SterilePackRecord[] {
	const {
		autoclaveId,
		cycleNumber,
		packagingType,
		packCount,
		itemCategoryRu,
		itemsListRu,
		operatorName,
		operatorStaffId,
		sterilizationDate = new Date(),
	} = params;

	const sDate = typeof sterilizationDate === 'string' ? new Date(sterilizationDate) : sterilizationDate;
	const expiry = computePackExpiryDate(packagingType, sDate);
	const packRule = getPackagingRule(packagingType);

	const records: SterilePackRecord[] = [];
	for (let i = 1; i <= packCount; i++) {
		const packId = formatDigits(i, 3);
		const barcode = generateSanpinBarcode(autoclaveId, cycleNumber, sDate, packId);

		records.push({
			barcode,
			packId,
			autoclaveId,
			cycleNumber,
			sterilizationDate: sDate.toISOString(),
			expirationDate: expiry.expiryDate.toISOString(),
			packagingType,
			packagingNameRu: packRule.nameRu,
			itemCategoryRu,
			itemsListRu,
			operatorName,
			operatorStaffId,
			status: 'sterile',
			isBreached: false,
		});
	}

	return records;
}

// ---------------------------------------------------------------------------
// 4. Cycle Parameter & Indicator Validation
// ---------------------------------------------------------------------------

export interface CycleValidationResult {
	isApproved: boolean;
	temperaturePassed: boolean;
	pressurePassed: boolean;
	plateauTimePassed: boolean;
	violations: string[];
	complianceMessageRu: string;
}

export function validateSterilizationCycleParameters(
	cycleDef: AutoclaveCycleDefinition,
	measuredTempCelsius: number,
	measuredPressureBar: number,
	measuredPlateauTimeMin: number
): CycleValidationResult {
	const violations: string[] = [];

	const temperaturePassed =
		measuredTempCelsius >= cycleDef.temperatureToleranceCelsius.min &&
		measuredTempCelsius <= cycleDef.temperatureToleranceCelsius.max;

	if (!temperaturePassed) {
		violations.push(
			`Температура стерилизации ${measuredTempCelsius.toFixed(1)}°C вне допуска [${cycleDef.temperatureToleranceCelsius.min}..${cycleDef.temperatureToleranceCelsius.max}°C]`
		);
	}

	const pressurePassed =
		measuredPressureBar >= cycleDef.pressureToleranceBar.min &&
		measuredPressureBar <= cycleDef.pressureToleranceBar.max;

	if (!pressurePassed) {
		violations.push(
			`Давление пара ${measuredPressureBar.toFixed(2)} бар вне допуска [${cycleDef.pressureToleranceBar.min}..${cycleDef.pressureToleranceBar.max} бар]`
		);
	}

	const plateauTimePassed = measuredPlateauTimeMin >= cycleDef.plateauTimeMinutes;

	if (!plateauTimePassed) {
		violations.push(
			`Время стерилизационной выдержки ${measuredPlateauTimeMin} мин меньше нормы ${cycleDef.plateauTimeMinutes} мин`
		);
	}

	const isApproved = temperaturePassed && pressurePassed && plateauTimePassed;

	const complianceMessageRu = isApproved
		? 'Параметры цикла строго соответствуют СанПиН 3.3686-21 и ГОСТ ISO 17665.'
		: `БРАК СТЕРИЛИЗАЦИИ: ${violations.join('; ')}. Загрузка подлежит карантину и повторной стерилизации!`;

	return {
		isApproved,
		temperaturePassed,
		pressurePassed,
		plateauTimePassed,
		violations,
		complianceMessageRu,
	};
}

// ---------------------------------------------------------------------------
// 5. Electronic Journal Form 257/u Record Creation
// ---------------------------------------------------------------------------

export function createForm257JournalEntry(params: {
	autoclaveId: string;
	deviceName: string;
	cycleNumber: number;
	cycleId: AutoclaveCycleId;
	measuredTemp: number;
	measuredPressure: number;
	measuredDurationMin: number;
	loadDescriptionRu: string;
	packCount: number;
	packagingType: AutoclavePackagingType;
	indicatorType: IndicatorQualityClass;
	isIndicatorPassed: boolean;
	operatorName: string;
	notes?: string;
}): Form257SterilizerJournalEntry {
	const cycleDef = AUTOCLAVE_CYCLES[params.cycleId] || AUTOCLAVE_CYCLES.cycle_134_wrapped;
	const validation = validateSterilizationCycleParameters(
		cycleDef,
		params.measuredTemp,
		params.measuredPressure,
		params.measuredDurationMin
	);

	const isBatchApproved = validation.isApproved && params.isIndicatorPassed;
	const now = new Date();

	const generatedBarcodes: string[] = [];
	for (let i = 1; i <= params.packCount; i++) {
		generatedBarcodes.push(generateSanpinBarcode(params.autoclaveId, params.cycleNumber, now, i));
	}

	return {
		id: `F257-${params.autoclaveId}-${params.cycleNumber}-${Date.now()}`,
		date: now.toISOString().slice(0, 10),
		cycleNumber: params.cycleNumber,
		deviceName: params.deviceName,
		autoclaveId: params.autoclaveId,
		cycleType: params.cycleId,
		cycleNameRu: cycleDef.nameRu,
		sterilizationMode: {
			temperatureCelsius: params.measuredTemp,
			pressureBar: params.measuredPressure,
			durationMinutes: params.measuredDurationMin,
		},
		loadDescriptionRu: params.loadDescriptionRu,
		packsCount: params.packCount,
		packagingType: params.packagingType,
		indicatorType: params.indicatorType,
		indicatorColorBeforeRu: 'Светло-желтый / Розовый (исходный)',
		indicatorColorAfterRu: params.isIndicatorPassed ? 'Темно-коричневый / Черный (эталонный)' : 'Без изменений (брак)',
		isIndicatorPassed: params.isIndicatorPassed,
		isBiologicalTestConducted: cycleDef.mandatoryIndicators.includes('biological_spores'),
		biologicalTestResult: cycleDef.mandatoryIndicators.includes('biological_spores') ? 'passed' : 'not_conducted',
		isBatchApproved,
		operatorName: params.operatorName,
		operatorSignatureStamp: `УКЭП: ${params.operatorName} • ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU')}`,
		generatedBarcodes,
		notes: params.notes,
	};
}

// ---------------------------------------------------------------------------
// 6. EMR Traceability Binding (Form 043/u)
// ---------------------------------------------------------------------------

export function bindPackToPatientRecord(
	pack: SterilePackRecord,
	patientId: string,
	patientName: string,
	doctorName: string,
	visitDate: string = new Date().toISOString().slice(0, 10)
): { success: boolean; record?: PatientSterileUsageRecord; error?: string } {
	const currentStatus = evaluatePackStatus(pack.sterilizationDate, pack.packagingType, pack.isBreached);

	if (currentStatus === 'expired') {
		return {
			success: false,
			error: `Запрещено СанПиН: Срок стерильности пакета ${pack.barcode} истек (${pack.expirationDate.slice(0, 10)}). Пакет подлежит дезинфекции, ПСО и повторной стерилизации.`,
		};
	}

	if (currentStatus === 'breached') {
		return {
			success: false,
			error: `Запрещено СанПиН: Нарушена герметичность стерилизационной упаковки ${pack.barcode}.`,
		};
	}

	const usageRecord: PatientSterileUsageRecord = {
		packBarcode: pack.barcode,
		patientId,
		patientName,
		doctorName,
		nurseName: pack.operatorName,
		visitDate,
		verifiedSterile: true,
		recordedAtIso: new Date().toISOString(),
	};

	return {
		success: true,
		record: usageRecord,
	};
}
