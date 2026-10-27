export function getDefaultBactericidalEquipments(organizationId: string) {
	return [
		{
			organizationId,
			roomName: "Терапевтический кабинет №1",
			roomAreaM2: "18.00",
			roomVolumeM3: "54.00",
			deviceBrand: "Дезар-4 (КРОНТ)",
			serialNumber: "DZR-2026-001",
			deviceType: "recirculator_closed" as const,
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
			deviceType: "recirculator_closed" as const,
			lampType: "TUV 15W",
			lampCount: 5,
			maxLampHours: 9000,
			totalOperatingHours: "310.00",
			isCommissioned: true,
		},
	];
}

export function getDefaultTemperatureHumidityEquipments(organizationId: string) {
	return [
		{
			organizationId,
			name: "Фармацевтический холодильник Позис ХФ-140",
			location: "Кабинет №1 (хранение анестетиков)",
			equipmentType: "refrigerator_cold" as const,
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
			equipmentType: "storage_room" as const,
			meterDeviceName: "Гигрометр ВИТ-2",
			meterSerialNumber: "VIT2-2026-01",
			targetTempMinCelsius: "18.00",
			targetTempMaxCelsius: "25.00",
			targetHumidityMinPercent: "30.00",
			targetHumidityMaxPercent: "60.00",
			isActive: true,
		},
	];
}
