/**
 * DENTE Dental CRM — Workspace Perspective Switcher (Layer 1)
 * 
 * Mandate 8s (SSOT Componentization), Mandate 8e (Doctor Autonomy)
 */

import React from "react";
import { ChevronDown } from "lucide-react";
import {
	perspectiveDescriptions,
	perspectiveLabels,
	perspectiveShortLabels,
	usePerspectiveStore,
	type WorkspacePerspective,
} from "../../store/perspectiveStore";

export function PerspectiveSwitcher() {
	const perspective = usePerspectiveStore((state) => state.perspective);
	const setPerspective = usePerspectiveStore((state) => state.setPerspective);

	const options: WorkspacePerspective[] = [
		"standard",
		"chairsider",
		"frontdesk",
		"pediatric",
		"presentation",
		"orthodontic",
	];

	return (
		<details
			className="workspace-role-switcher workspace-perspective-switcher"
			aria-label="Клинический режим"
		>
			<summary title={perspectiveDescriptions[perspective]}>
				<span className="hidden 2xl:inline">Режим</span>
				<strong className="hidden 2xl:inline truncate max-w-[130px] align-middle">
					{perspectiveLabels[perspective]}
				</strong>
				<strong className="2xl:hidden truncate max-w-[100px] align-middle">
					{perspectiveShortLabels[perspective] ||
						perspectiveLabels[perspective]}
				</strong>
				<ChevronDown
					size={13}
					className="switcher-chevron opacity-60"
					aria-hidden="true"
				/>
			</summary>
			<div className="role-switcher-options">
				{options.map((mode) => (
					<button
						className={perspective === mode ? "active" : ""}
						key={mode}
						type="button"
						aria-pressed={perspective === mode}
						title={perspectiveDescriptions[mode]}
						onClick={(event) => {
							setPerspective(mode);
							if (
								mode === "chairsider" ||
								mode === "pediatric" ||
								mode === "orthodontic" ||
								mode === "presentation"
							) {
								window.location.hash = "visit";
							} else if (mode === "frontdesk") {
								window.location.hash = "schedule";
							}
							event.currentTarget.closest("details")?.removeAttribute("open");
						}}
					>
						{perspectiveLabels[mode]}
					</button>
				))}
			</div>
		</details>
	);
}
