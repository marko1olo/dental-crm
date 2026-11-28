/**
 * apps/web/src/components/settings/roleMatrix/useRoleMatrixState.ts
 * State hook for RBAC Role Matrix (Mandates 8b, 8e, 8n). Strictly <= 120 lines ceiling.
 */
import { type GranularStaffRole, GRANULAR_ROLE_MATRIX, PERMISSION_DEFINITIONS, generateUuidV7 } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import { CLINICAL_ROLES, ROLE_DISPLAY_NAMES } from "./roleMatrixConstants";
import type { RoleCategory, RoleMatrixState, RolePermissionsMap } from "./roleMatrixTypes";
const STORAGE_KEY = "dente_custom_role_matrix";

const syncMatrix = async (matrix: Record<string, RolePermissionsMap>): Promise<boolean> => {
	if (typeof fetch === "undefined") return true;
	try {
		const res = await fetch("/api/settings/role-matrix", { method: "PUT", headers: getDenteAuthHeaders({ "Content-Type": "application/json", "Idempotency-Key": generateUuidV7() }), body: JSON.stringify({ matrix }) });
		if (!res.ok) {
			let errJson: { message?: string } = {};
			try {
				errJson = (await res.json()) as { message?: string };
			} catch (parseErr) {
				clientLogger.warn("[useRoleMatrixState] Failed to parse sync error JSON:", parseErr);
			}
			throw new Error(errJson.message || `Ошибка сервера (${res.status})`);
		}
		return true;
	} catch (e: unknown) {
		showToast(e instanceof Error ? e.message : "Ошибка сохранения матрицы", "error");
		return false;
	}
};

export function useRoleMatrixState(initialRole: GranularStaffRole = "doctor"): RoleMatrixState {
	const [selectedRole, setSelectedRoleState] = useState<GranularStaffRole>(initialRole);
	const [activeCategory, setActiveCategory] = useState<RoleCategory>(() => CLINICAL_ROLES.includes(initialRole) ? "clinical" : "administrative");
	const [showAdvancedRoles, setShowAdvancedRoles] = useState(false);
	const [selectedModuleFilter, setSelectedModuleFilter] = useState("all");
	const [onlySuperRights, setOnlySuperRights] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [customOverrides, setCustomOverrides] = useState<Record<string, RolePermissionsMap>>(() => safeLocalStorageGetJson<Record<string, RolePermissionsMap>>(STORAGE_KEY, {}) || {});

	useEffect(() => {
		if (typeof fetch === "undefined") return;
		let active = true;
		(async () => {
			try {
				const r = await fetch("/api/settings/role-matrix", { headers: getDenteAuthHeaders() });
				if (!r.ok) return;
				const d = (await r.json()) as { matrix?: Record<string, RolePermissionsMap> } | null;
				if (active && d?.matrix && typeof d.matrix === "object") setCustomOverrides(d.matrix);
			} catch (err) {
				clientLogger.warn("[useRoleMatrixState] Failed to load role matrix:", err);
			}
		})();
		return () => { active = false; };
	}, []);

	const currentPermissions = useMemo<RolePermissionsMap>(() => ({
		...(GRANULAR_ROLE_MATRIX[selectedRole] || {}), ...(customOverrides[selectedRole] || {}),
	}), [selectedRole, customOverrides]);

	const setSelectedRole = useCallback((role: GranularStaffRole) => {
		setSelectedRoleState(role);
		setActiveCategory(CLINICAL_ROLES.includes(role) ? "clinical" : "administrative");
	}, []);

	const togglePermission = useCallback((permKey: string) => {
		setCustomOverrides((prev) => {
			const roleMap = { ...(prev[selectedRole] || GRANULAR_ROLE_MATRIX[selectedRole] || {}) };
			roleMap[permKey] = (roleMap[permKey] || "none") === "none" ? "full" : "none";
			return { ...prev, [selectedRole]: roleMap };
		});
		setHasUnsavedChanges(true);
	}, [selectedRole]);

	const cyclePermissionLevel = useCallback((permKey: string) => {
		setCustomOverrides((prev) => {
			const roleMap = { ...(prev[selectedRole] || GRANULAR_ROLE_MATRIX[selectedRole] || {}) };
			const curr = roleMap[permKey] || "none";
			roleMap[permKey] = curr === "none" ? "read" : curr === "read" ? "full" : "none";
			return { ...prev, [selectedRole]: roleMap };
		});
		setHasUnsavedChanges(true);
	}, [selectedRole]);

	const savePermissions = useCallback(async () => {
		setIsSaving(true);
		safeLocalStorageSetJson(STORAGE_KEY, customOverrides);
		const ok = await syncMatrix(customOverrides);
		setIsSaving(false);
		if (ok) { setHasUnsavedChanges(false); showToast(`Права роли «${ROLE_DISPLAY_NAMES[selectedRole] || selectedRole}» успешно сохранены`, "success"); }
	}, [customOverrides, selectedRole]);

	const resetToStandard = useCallback(async () => {
		setIsSaving(true);
		const next = { ...customOverrides };
		delete next[selectedRole];
		setCustomOverrides(next);
		safeLocalStorageSetJson(STORAGE_KEY, next);
		const ok = await syncMatrix(next);
		setIsSaving(false);
		if (ok) { setHasUnsavedChanges(false); showToast("Права сброшены к клиническому стандарту", "info"); }
	}, [customOverrides, selectedRole]);

	const applyDoctorAutonomyPreset = useCallback(() => {
		setCustomOverrides((prev) => ({
			...prev,
			doctor: {
				...(prev.doctor || GRANULAR_ROLE_MATRIX.doctor || {}),
				"clinical.records.view": "full", "clinical.records.write": "full", "clinical.treatment_plans.manage": "full",
				"schedule.view": "full", "schedule.manage": "own", "patients.view_basic": "full",
				"patients.pii_full": "full", "finance.tariffs_manage": "read", "payroll.view_own": "own",
				"finance.reports_pnl": "none", "payroll.view_all_staff": "none",
			},
		}));
		setHasUnsavedChanges(true);
		showToast("Применён стандарт автономии врача (скидки 100%, ЭМК без блокировок)", "success");
	}, []);

	const { grantedCount, blockedCount } = useMemo(() => {
		const granted = PERMISSION_DEFINITIONS.filter((p) => ["full", "read", "own"].includes(currentPermissions[p.key] || "")).length;
		return { grantedCount: granted, blockedCount: PERMISSION_DEFINITIONS.length - granted };
	}, [currentPermissions]);

	return {
		selectedRole, setSelectedRole, activeCategory, setActiveCategory,
		showAdvancedRoles, setShowAdvancedRoles, selectedModuleFilter, setSelectedModuleFilter,
		onlySuperRights, setOnlySuperRights, currentPermissions, togglePermission,
		cyclePermissionLevel, savePermissions, resetToStandard, applyDoctorAutonomyPreset,
		isSaving, hasUnsavedChanges, grantedCount, blockedCount,
	};
}
