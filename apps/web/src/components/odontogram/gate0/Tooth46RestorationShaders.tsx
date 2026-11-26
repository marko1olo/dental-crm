import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix } from "./OdontogramSharedDefsContext";

/**
 * DENTE Dental CRM — Composite Restoration Shaders for Tooth 46
 * Nanohybrid light-cure composite (Mandate 8b <= 120 lines).
 */
export const Tooth46RestorationShaders: React.FC = () => {
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	return (
		<>
			{/* Nanohybrid Light-Cure Composite (A2/A3 Enamel-Dentin) */}
			<linearGradient id={sid("dente-composite-body")} x1="0" y1="0" x2="0.6" y2="1">
				<stop offset="0%" stopColor="#fbf6ee" stopOpacity="0.98" />
				<stop offset="35%" stopColor="#f4ecd8" stopOpacity="0.96" />
				<stop offset="70%" stopColor="#ebdcc0" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#dfcca8" stopOpacity="0.92" />
			</linearGradient>

			{/* Composite Filling Shaders */}
			<linearGradient id={sid("dente-composite-filling")} href={`#${sid("dente-composite-body")}`} />
			<linearGradient id={sid("dente-composite-filling-dark")} x1="0" y1="0" x2="0.6" y2="1">
				<stop offset="0%" stopColor="#475569" stopOpacity="0.95" />
				<stop offset="50%" stopColor="#334155" stopOpacity="0.95" />
				<stop offset="100%" stopColor="#1e293b" stopOpacity="0.90" />
			</linearGradient>

			{/* Inlay Ceramic Shaders */}
			<linearGradient id={sid("dente-inlay-ceramic-dark")} x1="0" y1="0" x2="0.6" y2="1">
				<stop offset="0%" stopColor="#64748b" stopOpacity="0.92" />
				<stop offset="100%" stopColor="#334155" stopOpacity="0.90" />
			</linearGradient>

			{/* Submicron Marginal Seal (Enamel Bevel Transition) */}
			<linearGradient id={sid("dente-composite-edge")} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.70" />
				<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.85" />
			</linearGradient>
		</>
	);
};
