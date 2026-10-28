/**
 * ToothBridgeConnectors.tsx — Индикаторы мостовидного соединения зубов.
 * Отображают левый и правый коннекторы мостовидного протеза с клинической палитрой материалов.
 */

import React from "react";
import type { RestorativeMaterialKey } from "../anatomicalToothGeometries";

export interface ToothBridgeConnectorsProps {
	readonly hasLeftBridgeConnector?: boolean | undefined;
	readonly hasRightBridgeConnector?: boolean | undefined;
	readonly isTop: boolean;
	readonly bridgeMaterial?: RestorativeMaterialKey | undefined;
}

export const ToothBridgeConnectors: React.FC<ToothBridgeConnectorsProps> = ({
	hasLeftBridgeConnector,
	hasRightBridgeConnector,
	isTop,
	bridgeMaterial,
}) => {
	const backgroundGradient =
		bridgeMaterial === "gold"
			? "linear-gradient(135deg, #f59e0b, #b45309)"
			: bridgeMaterial === "ceramic_emax"
				? "linear-gradient(135deg, #38bdf8, #0284c7)"
				: "linear-gradient(135deg, #93c5fd, #2563eb)";

	return (
		<>
			{hasLeftBridgeConnector && (
				<div
					className={`bridge-connector-left absolute left-0 w-3.5 h-3.5 -translate-x-2 z-20 pointer-events-none rounded-full shadow-xs border border-blue-400/60 ${
						isTop ? "top-[62%]" : "top-[36%]"
					}`}
					style={{ background: backgroundGradient }}
					title="Мостовидное соединение"
				/>
			)}
			{hasRightBridgeConnector && (
				<div
					className={`bridge-connector-right absolute right-0 w-3.5 h-3.5 translate-x-2 z-20 pointer-events-none rounded-full shadow-xs border border-blue-400/60 ${
						isTop ? "top-[62%]" : "top-[36%]"
					}`}
					style={{ background: backgroundGradient }}
					title="Мостовидное соединение"
				/>
			)}
		</>
	);
};

export default ToothBridgeConnectors;
