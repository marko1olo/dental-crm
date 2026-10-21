import type { Appointment, Dashboard } from "@dental/shared";
import { isNegativeAllergyStatement } from "../../../../utils/somaticNorm";
import { DEFAULT_SOLO_CHAIR } from "../gridConstants";
import { extractTeethList } from "../gridSlotMath";

export interface MobileSheetResolvedData {
	mPatName: string;
	mPatObj: Dashboard["patients"][number] | undefined;
	mDocObj: Dashboard["clinicSettings"]["staff"][number] | undefined;
	mChairObj: { id: string; name: string; color?: string | null | undefined } | undefined;
	mBalance: number | null;
	mTeeth: string[];
	mStart: string;
	mEnd: string;
	mAllergyAlert: string | null;
}

export function useScheduleMobileSheetData(
	selectedMobileAppt: Appointment | null,
	dashboard: Dashboard,
	timezone: string,
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string,
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string,
): MobileSheetResolvedData | null {
	if (!selectedMobileAppt) return null;

	const mPatName = patientName(
		dashboard.patients,
		selectedMobileAppt.patientId,
	);
	const mPatObj = dashboard.patients?.find(
		(p) => p.id === selectedMobileAppt.patientId,
	);
	const mDocObj = dashboard.clinicSettings?.staff?.find(
		(s) => s.id === selectedMobileAppt.doctorUserId,
	);
	const mChairObj =
		dashboard.clinicSettings?.chairs?.find(
			(c) => c.id === selectedMobileAppt.chairId,
		) ||
		(selectedMobileAppt.chairId === DEFAULT_SOLO_CHAIR.id
			? DEFAULT_SOLO_CHAIR
			: undefined);

	const mRawBal =
		mPatObj?.balanceRub ??
		(mPatObj as { balance?: number | string | null } | undefined)?.balance;
	const mBalance =
		mRawBal !== undefined &&
		mRawBal !== null &&
		mRawBal !== "" &&
		Number.isFinite(Number(mRawBal))
			? Number(mRawBal)
			: null;

	const mTeeth = extractTeethList(selectedMobileAppt);
	const mStart = toDateTimeLocalValue(
		selectedMobileAppt.startsAt,
		timezone,
	).slice(11, 16);
	const mEnd = toDateTimeLocalValue(selectedMobileAppt.endsAt, timezone).slice(
		11,
		16,
	);

	const mAllergyAlert = (() => {
		const rawAllergies =
			(mPatObj as { allergies?: string | null } | undefined)?.allergies ||
			(mPatObj as { anamnesis?: { allergies?: string | null } } | undefined)
				?.anamnesis?.allergies;
		if (
			rawAllergies &&
			typeof rawAllergies === "string" &&
			rawAllergies.trim() &&
			!isNegativeAllergyStatement(rawAllergies)
		) {
			return `Внимание: ${rawAllergies.trim()}`;
		}
		const notes = mPatObj?.notes || "";
		const match = notes.match(/аллерги[яеи][^.;\n]*/i);
		if (match && !isNegativeAllergyStatement(match[0])) {
			return `Внимание: ${match[0].trim()}`;
		}
		const reason = selectedMobileAppt?.reason || "";
		if (
			(/лидокаин/i.test(reason) || /аллерги/i.test(reason)) &&
			!isNegativeAllergyStatement(reason)
		) {
			return "Внимание: Аллергия на лидокаин";
		}
		return null;
	})();

	return {
		mPatName,
		mPatObj,
		mDocObj,
		mChairObj,
		mBalance,
		mTeeth,
		mStart,
		mEnd,
		mAllergyAlert,
	};
}
