import type { DentalSpecialty } from "@dental/shared";
import React from "react";
import { roleFocusOrder } from "../../../../AppHelpers";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";
import {
	resolveClinicMode,
	staffRoleChoices,
} from "../../../../lib/clinicCapabilities";

export function InlineStepRole() {
	const {
		dashboard,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		selectedSpecialty,
		setSelectedSpecialty,
		staffRoleLabels,
		specialtyLabels,
	} = useAppLogicContext();

	/*
	 * Шаг предлагал все пять ролей всегда, включая ассистента, администратора и
	 * управляющего у врача, который работает один. Хуже того, именно этот шаг и
	 * заводил несуществующего сотрудника: выбранная здесь роль сохраняется как
	 * настройка рабочего места, а шапка рабочего места роли по режиму уже
	 * фильтрует — человек получал в заголовке «Роль: Управляющий» и список без
	 * управляющего.
	 *
	 * Режим читается из того же ответа сервера, что и в шапке
	 * (`clinicSettings.profile.mode`), второго источника правды не заводим.
	 * Правило «какие кнопки рисовать» одно на оба переключателя и живёт в
	 * lib/clinicCapabilities.ts.
	 */
	const clinicMode = resolveClinicMode(
		dashboard?.clinicSettings?.profile?.mode,
	);
	const availableRoles = staffRoleChoices(
		roleFocusOrder,
		clinicMode,
		selectedWorkspaceRole,
	);

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
					{availableRoles.map((role) => (
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
