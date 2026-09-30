/**
 * VisiographStatusAlerts.tsx
 *
 * Warning and error alerts for VisiographAnalyzer:
 * - openFailure: Full scan image download failure
 * - saveFailure: Server patient card storage failure
 * - formulaFailure: Live tooth formula mutation failure
 * - applyNotice: Unreadable or unmapped tooth states notice
 * - error: General analysis error
 */

import { AlertTriangle, X } from "lucide-react";
import React from "react";

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
				<div
					style={{
						padding: "12px 16px",
						background: "var(--bad-bg)",
						color: "var(--bad-fg)",
						borderRadius: "10px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
						fontSize: "0.88rem",
						marginTop: hasCurrentScan ? "0" : "12px",
					}}
				>
					<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
					<div>
						<strong>Ошибка анализа</strong>
						<div style={{ marginTop: "4px" }}>{error}</div>
					</div>
					<button
						type="button"
						onClick={onClearError}
						style={{
							marginLeft: "auto",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "inherit",
						}}
					>
						<X size={14} />
					</button>
				</div>
			)}

			{openFailure && (
				<div
					role="alert"
					data-testid="xray-scan-open-failure"
					style={{
						padding: "10px 14px",
						background: "var(--warn-bg)",
						color: "var(--warn-fg)",
						borderRadius: "10px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
						fontSize: "0.85rem",
					}}
				>
					<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
					<div>
						<strong>Снимок не открыт полностью</strong>
						<div style={{ marginTop: "4px" }}>{openFailure}</div>
					</div>
					<button
						type="button"
						onClick={onClearOpenFailure}
						style={{
							marginLeft: "auto",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "inherit",
						}}
						aria-label="Скрыть сообщение"
					>
						<X size={14} />
					</button>
				</div>
			)}

			{saveFailure && (
				<div
					role="alert"
					style={{
						padding: "10px 14px",
						background: "var(--warn-bg)",
						color: "var(--warn-fg)",
						borderRadius: "10px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
						fontSize: "0.85rem",
					}}
				>
					<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
					<div>
						<strong>Заключение не сохранено в карту</strong>
						<div style={{ marginTop: "4px" }}>{saveFailure}</div>
					</div>
				</div>
			)}

			{formulaFailure && (
				<div
					role="alert"
					style={{
						padding: "10px 14px",
						background: "var(--warn-bg)",
						color: "var(--warn-fg)",
						borderRadius: "10px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
						fontSize: "0.85rem",
					}}
				>
					<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
					<div>
						<strong>Находки не внесены в зубную формулу</strong>
						<div style={{ marginTop: "4px" }}>{formulaFailure}</div>
					</div>
				</div>
			)}

			{applyNotice && (
				<div
					role="status"
					style={{
						padding: "10px 14px",
						background: "var(--warn-bg)",
						color: "var(--warn-fg)",
						borderRadius: "10px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
						fontSize: "0.85rem",
					}}
				>
					<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
					<div>{applyNotice}</div>
				</div>
			)}
		</>
	);
}
