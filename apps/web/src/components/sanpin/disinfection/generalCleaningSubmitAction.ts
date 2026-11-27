import { generateUuidV7 } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import type { DisinfectionJournalRecord, DisinfectionRoomType, DisinfectionApplicationMethod } from "./disinfectionTypes.js";

export interface SubmitCleaningParams {
	logDate: string;
	roomName: string;
	roomType: DisinfectionRoomType;
	cleaningType: "general" | "current_routine";
	treatedAreaM2: number;
	applicationMethod: DisinfectionApplicationMethod;
	disinfectantName: string;
	activeIngredient: string;
	concentrationPercent: number;
	solutionVolumeLiters: number;
	concentrateVolumeMl: number;
	waterVolumeLiters: number;
	exposureMinutes: number;
	uvMinutes: number;
	ventilationMinutes: number;
	operatorStaffName: string;
	operatorStaffPosition: string;
	notes: string;
	nextPlannedDate: string;
}

export async function submitGeneralCleaningRecord(p: SubmitCleaningParams): Promise<DisinfectionJournalRecord> {
	const record: DisinfectionJournalRecord = {
		id: `cln-${Date.now()}`,
		logDate: p.logDate,
		roomName: p.roomName,
		roomType: p.roomType,
		cleaningType: p.cleaningType,
		treatedAreaM2: p.treatedAreaM2,
		applicationMethod: p.applicationMethod,
		disinfectantName: p.disinfectantName,
		activeIngredient: p.activeIngredient,
		concentrationPercent: p.concentrationPercent,
		solutionVolumeLiters: p.solutionVolumeLiters,
		concentrateVolumeMl: p.concentrateVolumeMl,
		waterVolumeLiters: p.waterVolumeLiters,
		exposureMinutes: p.exposureMinutes,
		uvIrradiationMinutes: p.uvMinutes,
		ventilationMinutes: p.ventilationMinutes,
		operatorStaffFullName: p.operatorStaffName,
		operatorStaffPosition: p.operatorStaffPosition,
		isInspectorVerified: true,
		notes: p.notes.trim() || undefined,
	};

	const payload = {
		cleaningType: p.cleaningType,
		scheduledDate: p.logDate,
		actualDateTime: new Date().toISOString(),
		roomName: p.roomName,
		treatedAreaM2: p.treatedAreaM2,
		disinfectantName: `${p.disinfectantName} ${p.concentrationPercent}%`,
		activeIngredient: p.activeIngredient,
		solutionConcentrationPercent: p.concentrationPercent,
		applicationMethod: p.applicationMethod,
		exposureTimeMinutes: p.exposureMinutes,
		uvIrradiationMinutes: p.uvMinutes,
		ventilationMinutes: p.ventilationMinutes,
		status: "completed",
		notes: p.notes.trim() || `Расход раствора: ${p.solutionVolumeLiters} л (${p.concentrateVolumeMl} мл концентрата)`,
	};

	try {
		const res = await fetch("/api/registers/cleaning", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	} catch (err) {
		clientLogger.warn("Failed to submit cleaning record to API:", err);
		if (!isDemoShowcaseMode()) {
			throw err;
		}
	}

	showToast(
		`Генеральная уборка зафиксирована: ${p.disinfectantName} ${p.concentrationPercent}%, раствор ${p.solutionVolumeLiters} л (след. дата: ${p.nextPlannedDate})`,
		"success",
	);

	return record;
}
