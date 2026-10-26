/**
 * apps/web/src/components/settings/roleMatrix/PermissionCategorySection.tsx
 *
 * Category Accordion for Permissions (Mandates 8b, 8e, 8n).
 * Strictly <= 120 lines ceiling.
 */

import type { PermissionDefinition } from "@dental/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { PermissionRowItem } from "./PermissionRowItem";
import type { RolePermissionsMap } from "./roleMatrixTypes";

interface PermissionCategorySectionProps {
	readonly title: string;
	readonly description?: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
	readonly permissions: readonly PermissionDefinition[];
	readonly currentPermissions: RolePermissionsMap;
	readonly onToggle: (permKey: string) => void;
	readonly onCycleLevel: (permKey: string) => void;
	readonly defaultOpen?: boolean;
}

export const PermissionCategorySection: React.FC<PermissionCategorySectionProps> = ({
	title,
	description,
	icon: Icon,
	permissions,
	currentPermissions,
	onToggle,
	onCycleLevel,
	defaultOpen = true,
}) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	if (permissions.length === 0) return null;

	const grantedCount = permissions.filter((p) => {
		const lvl = currentPermissions[p.key];
		return lvl === "full" || lvl === "read" || lvl === "own";
	}).length;

	return (
		<div className="border border-[var(--line)] rounded-xl bg-[var(--paper)] overflow-hidden shadow-2xs">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)]/80 transition-colors text-left cursor-pointer touch-manipulation min-h-[48px]"
				aria-expanded={isOpen}
			>
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-6 h-6 rounded-md bg-[var(--paper)] text-[var(--teal)] flex items-center justify-center shrink-0 border border-[var(--line)]">
						<Icon size={14} />
					</div>
					<div className="min-w-0">
						<span className="font-bold text-xs sm:text-sm text-[var(--ink)] block truncate">
							{title}
						</span>
						{description && (
							<span className="text-[11px] text-[var(--muted)] hidden sm:block truncate">
								{description}
							</span>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<span
						className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
							grantedCount > 0
								? "bg-[var(--teal-soft)] text-[var(--teal-dark)] border-[var(--line-subtle)]"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						{grantedCount} из {permissions.length}
					</span>
					{isOpen ? (
						<ChevronDown size={16} className="text-[var(--muted)]" />
					) : (
						<ChevronRight size={16} className="text-[var(--muted)]" />
					)}
				</div>
			</button>

			{isOpen && (
				<div className="divide-y divide-[var(--line-subtle)] bg-[var(--paper)]">
					{permissions.map((perm) => (
						<PermissionRowItem
							key={perm.key}
							permission={perm}
							level={currentPermissions[perm.key] || "none"}
							onToggle={onToggle}
							onCycleLevel={onCycleLevel}
						/>
					))}
				</div>
			)}
		</div>
	);
};
