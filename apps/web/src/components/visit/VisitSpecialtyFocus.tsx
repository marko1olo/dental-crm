import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitSpecialtyFocus() {
	const context = useAppLogicContext() || {};
	const {
		activeDoctor,
		activeChair,
		selectedSpecialty,
		setSelectedSpecialty,
		setSelectedProtocolId,
		specialtyLabels = {},
		visibleVisitSpecialtyFocusOptions = [],
	} = context as any;

	const currentSpecialtyLabel = (selectedSpecialty && specialtyLabels[selectedSpecialty]) || "Терапия";
	const focusOptions = Array.isArray(visibleVisitSpecialtyFocusOptions) ? visibleVisitSpecialtyFocusOptions : [];

	return (
		<section
			className="specialty-focus-bar"
			aria-label="Фокус специальности приема"
		>
			<div>
				<p className="eyebrow">Фокус врача</p>
				<h3>{currentSpecialtyLabel}</h3>
				<p>
					{activeDoctor?.fullName?.split(" ")[0] ?? "Врач"} ·{" "}
					{activeChair?.name ?? "кресло"}
				</p>
			</div>
			<div className="specialty-focus-options">
				{focusOptions.map((option: any) => (
					<button
						className={selectedSpecialty === option.specialty ? "active" : ""}
						type="button"
						key={option.specialty}
						aria-pressed={selectedSpecialty === option.specialty}
						onClick={() => {
							if (setSelectedSpecialty) setSelectedSpecialty(option.specialty);
							if (setSelectedProtocolId) setSelectedProtocolId(null);
						}}
					>
						<strong>{option.title}</strong>
						<span>{option.hint}</span>
					</button>
				))}
			</div>
		</section>
	);
}
