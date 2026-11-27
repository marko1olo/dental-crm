import {
	generateUuidV7,
	type BactericidalEquipment,
	type CreateBactericidalEquipmentDto,
} from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";

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
}): Promise<BactericidalEquipment | null> {
	const fetchFn = options?.customFetch || (typeof fetch !== "undefined" ? fetch : undefined);
	if (!fetchFn) return null;
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
		...(options?.headers || {}),
	});

	const res = await fetchFn("/api/registers/bactericidal/equipments", {
		method: "POST",
		headers,
		body: JSON.stringify(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET),
	});

	if (res.ok) {
		const data: unknown = await res.json();
		if (typeof data === "object" && data !== null) {
			return data as BactericidalEquipment;
		}
	}
	return null;
}
