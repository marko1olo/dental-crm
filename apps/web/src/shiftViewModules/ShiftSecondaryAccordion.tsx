import type { Dashboard } from "@dental/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
import { ShiftIntelligenceSection } from "../components/shift";
import { EmkControlBoard } from "../components/visit/EmkControlBoard";

export interface ShiftSecondaryAccordionProps {
	dashboard?: Dashboard;
	// biome-ignore lint/suspicious/noExplicitAny: resources
	mostLoadedResource?: any;
	// biome-ignore lint/suspicious/noExplicitAny: role
	activeQueueRole?: any;
	// biome-ignore lint/suspicious/noExplicitAny: roles
	rolesWorthShowing?: any;
	staffRoleLabels?: Record<string, string>;
}

export const ShiftSecondaryAccordion: React.FC<ShiftSecondaryAccordionProps> = ({
	dashboard,
	mostLoadedResource,
	activeQueueRole,
	rolesWorthShowing,
	staffRoleLabels,
}) => {
	const [secondaryTab, setSecondaryTab] = useState<"emk" | "intelligence">("emk");
	const [isSecondaryExpanded, setIsSecondaryExpanded] = useState<boolean>(false);

	return (
		<section
			className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs overflow-hidden"
			data-testid="shift-secondary-accordion"
			aria-label="Операционный контроль смены"
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 14px",
					background: "var(--paper-soft)",
					borderBottom: isSecondaryExpanded ? "1px solid var(--line)" : "none",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						onClick={() => {
							setSecondaryTab("emk");
							if (!isSecondaryExpanded) setIsSecondaryExpanded(true);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
							secondaryTab === "emk" && isSecondaryExpanded
								? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Контроль качества ЭМК
					</button>
					<button
						type="button"
						onClick={() => {
							setSecondaryTab("intelligence");
							if (!isSecondaryExpanded) setIsSecondaryExpanded(true);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
							secondaryTab === "intelligence" && isSecondaryExpanded
								? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						Операционный контроль смены
					</button>
				</div>

				<button
					type="button"
					onClick={() => setIsSecondaryExpanded(!isSecondaryExpanded)}
					className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover)] transition-colors cursor-pointer"
					aria-expanded={isSecondaryExpanded}
				>
					<span>{isSecondaryExpanded ? "Свернуть" : "Развернуть"}</span>
					{isSecondaryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
				</button>
			</div>

			{isSecondaryExpanded && (
				<div className="p-3 sm:p-4">
					{secondaryTab === "emk" ? (
						<EmkControlBoard dashboard={dashboard} />
					) : (
						<ShiftIntelligenceSection
							dashboard={dashboard}
							mostLoadedResource={mostLoadedResource}
							activeQueueRole={activeQueueRole}
							rolesWorthShowing={typeof rolesWorthShowing === "boolean" ? rolesWorthShowing : Boolean(rolesWorthShowing && rolesWorthShowing.length > 0)}
							staffRoleLabels={staffRoleLabels}
						/>
					)}
				</div>
			)}
		</section>
	);
};
