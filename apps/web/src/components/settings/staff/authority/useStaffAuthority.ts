import {
	type StaffAuthorityFlagKey,
	canSignMedicalRecords,
} from "@dental/shared";
import { useCallback, useMemo, useState } from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import { staffRoleTitle } from "../../settingsInviteRoles";
import {
	FLAG_TITLES,
	type Flags,
	type RowState,
	type SaveState,
	type StaffMemberLite,
	flagsFromMember,
} from "./authorityTypes";

export function useStaffAuthority() {
	const appLogic = useAppLogicContext();
	const dashboardUnknown = (appLogic as { dashboard?: unknown } | null)?.dashboard;
	const loadDashboard = (appLogic as { loadDashboard?: () => Promise<void> | void } | null)?.loadDashboard;

	const clinicSettings =
		dashboardUnknown && typeof dashboardUnknown === "object" && dashboardUnknown !== null && "clinicSettings" in dashboardUnknown
			? (dashboardUnknown as { clinicSettings?: { staff?: StaffMemberLite[] } }).clinicSettings
			: undefined;
	const staff: StaffMemberLite[] = Array.isArray(clinicSettings?.staff) ? clinicSettings.staff : [];

	const [overrides, setOverrides] = useState<Record<string, { roleDerived: Flags; grants: Flags; effective: Flags; role: string }>>({});
	const [save, setSave] = useState<SaveState>({ kind: "idle" });

	const rows: RowState[] = useMemo(() => {
		const result: RowState[] = [];
		const seen = new Set<string>();
		for (const member of staff) {
			const id = typeof member.id === "string" ? member.id : "";
			if (!id || seen.has(id) || member.active === false) continue;
			seen.add(id);
			const nameRaw = typeof member.fullName === "string" ? member.fullName.trim() : "";
			const name = nameRaw.length > 0 ? nameRaw : id;
			const role = String(member.role ?? "");
			const fromDash = flagsFromMember(member);
			const ov = overrides[id];
			result.push({
				staffId: id,
				name,
				role: ov?.role ?? role,
				roleDerived: ov?.roleDerived ?? fromDash,
				effective: ov?.effective ?? fromDash,
				grants: ov?.grants ?? null,
			});
		}
		result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
		return result;
	}, [staff, overrides]);

	const setFlag = useCallback(async (row: RowState, flag: StaffAuthorityFlagKey, nextValue: boolean) => {
		if (!nextValue && row.roleDerived[flag]) {
			const msg = `Полномочие «${FLAG_TITLES[flag]}» даёт роль «${staffRoleTitle(row.role)}». Измените роль в карточке сотрудника.`;
			setSave({ kind: "failed", message: msg });
			showToast(msg, "warning");
			return;
		}
		if (flag === "canSignMedicalRecords" && nextValue && !canSignMedicalRecords(row.role)) {
			const msg = `Полномочие «${FLAG_TITLES[flag]}» доступно только врачам.`;
			setSave({ kind: "failed", message: msg });
			showToast(msg, "error");
			return;
		}
		if (row.effective[flag] === nextValue) return;

		setSave({ kind: "saving", staffId: row.staffId, flag });
		try {
			const res = await fetch(`/api/settings/staff/${row.staffId}/authority`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ [flag]: nextValue }),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить полномочие", "error");
				return;
			}
			const json = await res.json();
			if (json?.authority) {
				setOverrides((prev) => ({
					...prev,
					[row.staffId]: {
						roleDerived: json.authority.roleDerived,
						grants: json.authority.grants,
						effective: json.authority.effective,
						role: json.role ?? row.role,
					},
				}));
			}
			showToast(`Полномочие «${FLAG_TITLES[flag]}» обновлено`, "success");
			if (typeof loadDashboard === "function") void loadDashboard();
		} catch {
			showToast("Ошибка связи с сервером", "error");
		} finally {
			setSave({ kind: "idle" });
		}
	}, [loadDashboard]);

	return { rows, save, setFlag };
}
