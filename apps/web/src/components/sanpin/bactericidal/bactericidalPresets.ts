import {
	type CreateBactericidalEquipmentDto,
} from "@dental/shared";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";

export const CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET: CreateBactericidalEquipmentDto = {
	roomName: "Кабинет терапевтической стоматологии №1",
	roomVolumeM3: 45.0,
	deviceBrand: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
	serialNumber: "DZ-004812",
	deviceType: "recirculator_closed",
	lampType: "TUV 15W / 30W",
	lampCount: 3,
	maxLampHours: 8000,
	totalOperatingHours: 0,
};

export async function provisionCanonicalBactericidalEquipment(options?: {
	customFetch?: typeof fetch;
	headers?: Record<string, string>;
}): Promise<any | null> {
	const fetchFn = options?.customFetch || (typeof fetch !== "undefined" ? fetch : undefined);
	if (!fetchFn) return null;
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		...(options?.headers || {}),
	};

	const res = await fetchFn("/api/registers/bactericidal/equipments", {
		method: "POST",
		headers,
		body: JSON.stringify(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET),
	});

	if (res.ok) {
		return await res.json();
	}
	return null;
}
