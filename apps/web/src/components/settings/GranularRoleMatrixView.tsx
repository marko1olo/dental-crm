/**
 * apps/web/src/components/settings/GranularRoleMatrixView.tsx
 * Canonical roles: doctor, registrar (administrator), assistant, owner. Strictly <= 80 lines.
 */
import { type GranularStaffRole, PERMISSION_DEFINITIONS } from "@dental/shared";
import { AlertTriangle, Shield } from "lucide-react";
import type React from "react";
import { PermissionCategorySection } from "./roleMatrix/PermissionCategorySection";
import { RoleActionButtons } from "./roleMatrix/RoleActionButtons";
import { RoleSelectorSegmentedBar } from "./roleMatrix/RoleSelectorSegmentedBar";
import { RoleSummaryHeroCard } from "./roleMatrix/RoleSummaryHeroCard";
import { CATEGORY_METAS } from "./roleMatrix/roleMatrixCategories";
import { SUPER_PERMISSIONS_MAP } from "./roleMatrix/roleMatrixConstants";
import { useRoleMatrixState } from "./roleMatrix/useRoleMatrixState";

export { CANONICAL_ROLE_PROFILES, ROLE_DISPLAY_NAMES, SUPER_PERMISSIONS_MAP } from "./roleMatrix/roleMatrixConstants";

export interface GranularRoleMatrixViewProps {
	readonly initialRole?: GranularStaffRole;
	readonly className?: string;
}

export const GranularRoleMatrixView: React.FC<GranularRoleMatrixViewProps> = ({ initialRole = "doctor", className = "" }) => {
	const s = useRoleMatrixState(initialRole);
	const visibleCats = CATEGORY_METAS.filter((c) => s.selectedModuleFilter === "all" || s.selectedModuleFilter === c.id);

	return (
		<article className={`flex flex-col gap-3 min-w-0 w-full pb-16 sm:pb-8 ${className}`} data-testid="granular-role-matrix-panel">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[var(--line)] min-w-0">
				<div className="flex flex-col gap-0.5 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
							<Shield className="w-5 h-5 text-[var(--teal)] shrink-0" />
							<span>Матрица прав доступа</span>
						</h2>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--line-subtle)]">Безопасность и врачебная автономия</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0">4 роли: Врач, Администратор, Ассистент, Главврач. Свобода скидок врача до 100%.</p>
				</div>
			</div>
			<RoleSelectorSegmentedBar selectedRole={s.selectedRole} onSelectRole={s.setSelectedRole} activeCategory={s.activeCategory} onChangeCategory={s.setActiveCategory} showAdvanced={s.showAdvancedRoles} onToggleAdvanced={() => s.setShowAdvancedRoles(!s.showAdvancedRoles)} />
			<RoleSummaryHeroCard role={s.selectedRole} onApplyDoctorPreset={s.applyDoctorAutonomyPreset} onResetToStandard={s.resetToStandard} />
			<div className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 flex-wrap">
					<button type="button" onClick={() => s.setOnlySuperRights(!s.onlySuperRights)} data-testid="rbac-filter-super-rights" className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer touch-manipulation ${s.onlySuperRights ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}>
						<AlertTriangle size={14} className={s.onlySuperRights ? "text-amber-600" : "text-[var(--muted)]"} />
						<span>Только супер-права</span>
					</button>
					<select value={s.selectedModuleFilter} onChange={(e) => s.setSelectedModuleFilter(e.target.value)} id="rbac-module-filter" className="px-2.5 py-1.5 h-9 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] cursor-pointer">
						<option value="all">Все категории ({PERMISSION_DEFINITIONS.length})</option>
						{CATEGORY_METAS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
					</select>
				</div>
			</div>
			<div className="flex flex-col gap-2 min-w-0" data-testid="rbac-categories-list">
				{visibleCats.map((c) => (
					<PermissionCategorySection key={c.id} title={c.title} description={c.description} icon={c.icon} permissions={PERMISSION_DEFINITIONS.filter((p) => p.module === c.id && (!s.onlySuperRights || Boolean(SUPER_PERMISSIONS_MAP[p.key])))} currentPermissions={s.currentPermissions} onToggle={s.togglePermission} onCycleLevel={s.cyclePermissionLevel} />
				))}
			</div>
			<RoleActionButtons onSave={s.savePermissions} onReset={s.resetToStandard} isSaving={s.isSaving} hasUnsavedChanges={s.hasUnsavedChanges} grantedCount={s.grantedCount} blockedCount={s.blockedCount} />
		</article>
	);
};

export default GranularRoleMatrixView;
