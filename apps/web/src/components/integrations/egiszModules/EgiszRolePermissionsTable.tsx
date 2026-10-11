import React from "react";
import { cleanBlankLabel, type EgiszPermissionItem } from "./egiszWidgetTypes";

export interface EgiszRolePermissionsTableProps {
	readonly items: readonly EgiszPermissionItem[];
	readonly updatingId: string | null;
	readonly onTogglePermission: (
		item: EgiszPermissionItem,
		patch: { isExportAllowed?: boolean; patientOptOutRespect?: boolean },
	) => void;
}

export const EgiszRolePermissionsTable: React.FC<EgiszRolePermissionsTableProps> = ({
	items,
	updatingId,
	onTogglePermission,
}) => {
	if (items.length === 0) {
		return (
			<div
				style={{
					padding: "20px 0",
					textAlign: "center",
					color: "var(--muted)",
					fontSize: 12,
				}}
			>
				Правила выгрузки бланков в ЕГИСЗ пока не настроены.
			</div>
		);
	}

	return (
		<div style={{ marginTop: 10 }} data-testid="egisz-role-permissions-table">
			{items.map((item) => {
				const cleaned = cleanBlankLabel(item.formCode, item.fieldName);
				const isBusy = updatingId === item.id;

				return (
					<div
						key={item.id}
						style={{
							padding: "10px 4px",
							borderTop: "1px solid var(--line)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
						}}
					>
						<div style={{ minWidth: 0, flex: 1 }}>
							<div
								style={{
									fontSize: 12,
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.35,
								}}
							>
								{cleaned.title}
							</div>
							<div
								style={{
									fontSize: 11,
									color: "var(--muted)",
									marginTop: 2,
								}}
							>
								{cleaned.subtitle}
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 8,
									marginTop: 6,
									flexWrap: "wrap",
								}}
							>
								<button
									type="button"
									onClick={() =>
										onTogglePermission(item, {
											patientOptOutRespect: !item.patientOptOutRespect,
										})
									}
									aria-busy={isBusy}
									style={{
										height: 26,
										padding: "0 8px",
										borderRadius: 6,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										color: "var(--ink)",
										fontSize: 11,
										fontWeight: 500,
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										transition: "border-color 0.15s ease",
									}}
									title="Переключить учёт отказа пациента (323-ФЗ)"
								>
									<span>Отказ пациента:</span>
									<strong style={{ fontWeight: 700 }}>
										{item.patientOptOutRespect
											? "учитывается"
											: "не учитывается"}
									</strong>
								</button>
								{item.requiredStaffRole && (
									<span
										style={{
											height: 26,
											padding: "0 8px",
											borderRadius: 6,
											border: "1px solid var(--line)",
											background: "var(--paper-soft)",
											color: "var(--muted)",
											fontSize: 11,
											fontWeight: 500,
											display: "inline-flex",
											alignItems: "center",
										}}
									>
										Доступ: {item.requiredStaffRole}
									</span>
								)}
							</div>
						</div>
						<div style={{ flexShrink: 0 }}>
							<button
								type="button"
								onClick={() =>
									onTogglePermission(item, {
										isExportAllowed: !item.isExportAllowed,
									})
								}
								aria-busy={isBusy}
								style={{
									height: 32,
									padding: "0 12px",
									borderRadius: 8,
									fontSize: 11,
									fontWeight: 600,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									border: item.isExportAllowed
										? "1px solid var(--teal, #0d9488)"
										: "1px solid var(--line)",
									background: "var(--paper-soft)",
									color: item.isExportAllowed
										? "var(--teal, #0d9488)"
										: "var(--muted)",
									transition: "all 0.15s ease",
								}}
							>
								{item.isExportAllowed
									? "Выгрузка разрешена"
									: "Выгрузка отключена"}
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
};
