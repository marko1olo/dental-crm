/**
 * ProcedureBomsTab.tsx — Вкладка настроек технологических карт и норм списания материалов (804н).
 *
 * Монтируется в разделе «Настройки -> Техкарты 804н» и предоставляет полный интерфейс
 * управления нормами расхода материалов при закрытии приёма по приказу Минздрава РФ № 804н.
 */

import React from "react";
import { MaterialBomsSettingsPanel } from "../inventory/MaterialBomsSettingsPanel";

export interface ProcedureBomsTabProps {
	readonly organizationId?: string;
}

export function ProcedureBomsTab({ organizationId }: ProcedureBomsTabProps) {
	return <MaterialBomsSettingsPanel {...(organizationId ? { organizationId } : {})} />;
}
