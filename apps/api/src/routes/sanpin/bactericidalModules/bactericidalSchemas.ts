import {
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	type BactericidalDeviceType,
	type BactericidalLampStatus,
	type BactericidalOperatingMode,
} from "@dental/shared";
import { z } from "zod";

export const bactericidalAutopilotBodySchema = z
	.object({
		durationMinutes: z.number().optional(),
		date: z.string().optional(),
		operatingMode: z.string().optional(),
		equipmentId: z.string().optional(),
		notes: z.string().optional(),
	})
	.passthrough();

export type BactericidalAutopilotBody = z.infer<typeof bactericidalAutopilotBodySchema>;

export const morningShiftBodySchema = z
	.object({
		date: z.string().optional(),
		equipmentId: z.string().optional(),
		notes: z.string().optional(),
	})
	.passthrough();

export type MorningShiftBody = z.infer<typeof morningShiftBodySchema>;

export const eveningShiftBodySchema = z
	.object({
		date: z.string().optional(),
		shiftHours: z.number().optional(),
		equipmentId: z.string().optional(),
		notes: z.string().optional(),
	})
	.passthrough();

export type EveningShiftBody = z.infer<typeof eveningShiftBodySchema>;

export const updateBactericidalEquipmentBodySchema = z
	.object({
		action: z.enum(["replace_lamps"]).optional(),
		roomName: z.string().optional(),
		roomVolumeM3: z.number().optional(),
		deviceBrand: z.string().optional(),
		serialNumber: z.string().optional(),
		maxLampHours: z.number().optional(),
	})
	.passthrough();

export type UpdateBactericidalEquipmentBody = z.infer<typeof updateBactericidalEquipmentBodySchema>;

export {
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	type BactericidalDeviceType,
	type BactericidalLampStatus,
	type BactericidalOperatingMode,
};
