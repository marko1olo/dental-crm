/**
 * VisiographStatusAlerts.tsx — Предупреждения и ошибки анализатора визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { VisiographAlertBox } from "./alerts/VisiographAlertBox.js";

export interface VisiographStatusAlertsProps {
	error: string | null;
	onClearError: () => void;
	openFailure: string | null;
	onClearOpenFailure: () => void;
	saveFailure: string | null;
	formulaFailure: string | null;
	applyNotice: string | null;
	hasCurrentScan: boolean;
}

export function VisiographStatusAlerts({
	error,
	onClearError,
	openFailure,
	onClearOpenFailure,
	saveFailure,
	formulaFailure,
	applyNotice,
	hasCurrentScan,
}: VisiographStatusAlertsProps) {
	return (
		<>
			{error && (
				<VisiographAlertBox
					type="bad"
					title="Ошибка анализа"
					message={error}
					onClose={onClearError}
					marginTop={hasCurrentScan ? "0" : "12px"}
				/>
			)}
			{openFailure && (
				<VisiographAlertBox
					type="warn"
					role="alert"
					testId="xray-scan-open-failure"
					title="Снимок не открыт полностью"
					message={openFailure}
					onClose={onClearOpenFailure}
				/>
			)}
			{saveFailure && (
				<VisiographAlertBox
					type="warn"
					role="alert"
					title="Заключение не сохранено в карту"
					message={saveFailure}
				/>
			)}
			{formulaFailure && (
				<VisiographAlertBox
					type="warn"
					role="alert"
					title="Находки не внесены в зубную формулу"
					message={formulaFailure}
				/>
			)}
			{applyNotice && (
				<VisiographAlertBox
					type="warn"
					role="status"
					message={applyNotice}
				/>
			)}
		</>
	);
}
