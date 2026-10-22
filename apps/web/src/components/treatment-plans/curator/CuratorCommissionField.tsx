/**
 * apps/web/src/components/treatment-plans/curator/CuratorCommissionField.tsx
 *
 * Симулятор франшизных комиссий куратора полностью выкошен (Мандат 8n, 8e).
 * Стоматолог лечит людей в клинике на 1-3 кресла, а не ведёт процедурный
 * симулятор брокерских процентов франшизы.
 */

import React from "react";

export interface CuratorCommissionFieldProps {
	readonly useCustomCommission?: boolean;
	readonly onToggleCustomCommission?: (val: boolean) => void;
	readonly customCommissionPercent?: number;
	readonly onChangeCommissionPercent?: (val: number) => void;
}

export const CuratorCommissionField: React.FC<CuratorCommissionFieldProps> = () => {
	// Деактивировано: ноль бюрократии и ноль симуляций франшизных процентов
	return null;
};
