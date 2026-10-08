import React from "react";
import type { DentalSpecialty } from "@dental/shared";
import type { WizardRoleStepProps } from "./types";

export function WizardRoleStep({
	onboardingRoleChoices,
	selectedWorkspaceRole,
	setSelectedWorkspaceRole,
	staffRoleLabels,
	specialtyLabels,
	selectedSpecialty,
	setSelectedSpecialty,
}: WizardRoleStepProps) {
	return (
		<div className="onboarding-panel">
			<div>
				<h3>Кто сейчас работает</h3>
				<p>
					Выбор роли и специализации сохраняется как настройка рабочего
					места и не подмешивает чужие разделы.
				</p>
			</div>
			<div className="onboarding-form-grid">
				<fieldset
					className="role-picker form-span-2"
					aria-label="Роль нового сотрудника"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					<legend className="sr-only">Роль нового сотрудника</legend>
					{onboardingRoleChoices.map((role) => (
						<button
							className={selectedWorkspaceRole === role ? "active" : ""}
							key={role}
							type="button"
							aria-pressed={selectedWorkspaceRole === role}
							onClick={() => setSelectedWorkspaceRole(role)}
						>
							{staffRoleLabels[role]}
						</button>
					))}
				</fieldset>
				<fieldset
					className="specialty-strip form-span-2"
					aria-label="Специализация врача"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					<legend className="sr-only">Специализация врача</legend>
					{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
						(specialty) => (
							<button
								className={selectedSpecialty === specialty ? "active" : ""}
								key={specialty}
								type="button"
								aria-pressed={selectedSpecialty === specialty}
								onClick={() => setSelectedSpecialty(specialty)}
							>
								{specialtyLabels[specialty]}
							</button>
						),
					)}
				</fieldset>
			</div>
		</div>
	);
}
