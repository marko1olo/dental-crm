import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitSpecialtyFocus() {
	const {
		activeDoctor,
		activeChair,
		selectedSpecialty,
		setSelectedSpecialty,
		setSelectedProtocolId,
		specialtyLabels,
		visibleVisitSpecialtyFocusOptions,
	} = useAppLogicContext();

	return (
		<section
			className="specialty-focus-bar"
			aria-label="Фокус специальности приема"
		>
			<div>
				<p className="eyebrow">Фокус врача</p>
				<h3>{specialtyLabels[selectedSpecialty]}</h3>
				<p>
					{activeDoctor?.fullName.split(" ")[0] ?? "Врач"} ·{" "}
					{activeChair?.name ?? "кресло"}
				</p>
			</div>
			<div className="specialty-focus-options">
				{visibleVisitSpecialtyFocusOptions.map((option) => (
					<button
						className={selectedSpecialty === option.specialty ? "active" : ""}
						type="button"
						key={option.specialty}
						aria-pressed={selectedSpecialty === option.specialty}
						onClick={() => {
							setSelectedSpecialty(option.specialty);
							setSelectedProtocolId(null);
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
