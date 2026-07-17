import type { DentalSpecialty } from "@dental/shared";
import React from "react";
import { roleFocusOrder } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export function InlineStepRole() {
	const {
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		selectedSpecialty,
		setSelectedSpecialty,
		staffRoleLabels,
		specialtyLabels,
	} = useAppLogicContext();

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
				<div
					className="role-picker form-span-2"
					aria-label="Роль нового сотрудника"
				>
					{roleFocusOrder.map((role) => (
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
				</div>
				<div
					className="specialty-strip form-span-2"
					aria-label="Специализация врача"
				>
					{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
						(specialty) => (
							<button
								className={
									selectedSpecialty === specialty ? "active" : ""
								}
								key={specialty}
								type="button"
								aria-pressed={selectedSpecialty === specialty}
								onClick={() => setSelectedSpecialty(specialty)}
							>
								{specialtyLabels[specialty]}
							</button>
						),
					)}
				</div>
			</div>
		</div>
	);
}
