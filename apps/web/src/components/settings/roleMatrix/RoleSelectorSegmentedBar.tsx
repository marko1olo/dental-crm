/**
 * apps/web/src/components/settings/roleMatrix/RoleSelectorSegmentedBar.tsx
 *
 * Apple Segmented Control for 4 Canonical Staff Roles (Mandates 8b, 8e, 8n).
 * Strictly <= 120 lines ceiling.
 */

import type { GranularStaffRole } from "@dental/shared";
import { SlidersHorizontal } from "lucide-react";
import type React from "react";
import { ADMINISTRATIVE_ROLES, CANONICAL_ROLE_PROFILES, CLINICAL_ROLES, ROLE_DISPLAY_NAMES } from "./roleMatrixConstants";
import type { RoleCategory } from "./roleMatrixTypes";

interface RoleSelectorSegmentedBarProps {
	readonly selectedRole: GranularStaffRole;
	readonly onSelectRole: (role: GranularStaffRole) => void;
	readonly activeCategory: RoleCategory;
	readonly onChangeCategory: (cat: RoleCategory) => void;
	readonly showAdvanced: boolean;
	readonly onToggleAdvanced: () => void;
}

export const RoleSelectorSegmentedBar: React.FC<RoleSelectorSegmentedBarProps> = ({
	selectedRole, onSelectRole, activeCategory, onChangeCategory, showAdvanced, onToggleAdvanced,
}) => {
	const visibleRoles = activeCategory === "clinical" ? CLINICAL_ROLES : ADMINISTRATIVE_ROLES;

	return (
		<div className="flex flex-col gap-2.5 min-w-0" data-testid="canonical-roles-section">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">Канонические роли (4)</span>
				<button type="button" onClick={onToggleAdvanced} className="text-[11px] font-medium text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[32px] touch-manipulation whitespace-nowrap">
					<SlidersHorizontal size={12} />
					<span>{showAdvanced ? "Скрыть расширенные" : "Все роли клиники (8)"}</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" role="tablist">
				{CANONICAL_ROLE_PROFILES.map((canonical) => {
					const isSelected = selectedRole === canonical.id ||
						(canonical.id === "registrar" && selectedRole === "senior_admin") ||
						(canonical.id === "owner" && selectedRole === "head_doctor");
					const Icon = canonical.icon;
					return (
						<button
							key={canonical.id} type="button" role="tab" aria-selected={isSelected}
							onClick={() => onSelectRole(canonical.id)} data-testid={`canonical-role-${canonical.id}`}
							className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[72px] touch-manipulation ${
								isSelected ? "bg-[var(--paper)] border-[var(--teal)] shadow-xs ring-1 ring-[var(--teal)]/30" : "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
						>
							<div className="flex items-center justify-between gap-2 w-full">
								<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-[var(--teal)] text-[var(--on-teal)]" : "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"}`}>
									<Icon size={15} />
								</div>
								<span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 ${isSelected ? "bg-[var(--teal-soft)] text-[var(--teal-dark)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}>
									{canonical.badge}
								</span>
							</div>
							<span className="font-bold text-xs text-[var(--ink)] leading-snug break-words">
								{canonical.title}
							</span>
							<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-snug">{canonical.summary}</p>
						</button>
					);
				})}
			</div>

			{showAdvanced && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] gap-1.5" role="tablist">
						{(["clinical", "administrative"] as const).map((cat) => (
							<button
								key={cat} type="button" role="tab" aria-selected={activeCategory === cat}
								onClick={() => onChangeCategory(cat)}
								className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer touch-manipulation flex-1 ${
									activeCategory === cat ? "bg-[var(--paper-soft)] text-[var(--teal-dark)] shadow-xs border border-[var(--teal)]/40" : "text-[var(--muted)]"
								}`}
							>
								{cat === "clinical" ? "Клинический блок (4)" : "Административный блок (4)"}
							</button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-2 py-1 min-w-0" role="tablist">
						{visibleRoles.map((roleKey) => (
							<button
								key={roleKey} type="button" role="tab" aria-selected={selectedRole === roleKey}
								onClick={() => onSelectRole(roleKey)}
								className={`px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all border cursor-pointer touch-manipulation ${
									selectedRole === roleKey ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs font-bold" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
								}`}
								data-testid={`role-matrix-tab-${roleKey}`}
							>
								{ROLE_DISPLAY_NAMES[roleKey] || roleKey}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
