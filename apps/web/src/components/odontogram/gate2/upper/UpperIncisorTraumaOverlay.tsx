import type React from "react";
import type { IncisorTraumaType } from "../types/upperIncisorTypes";

export interface UpperIncisorTraumaOverlayProps {
	traumaType: IncisorTraumaType;
	ellis2MesialPath: string;
	ellis2DistalPath: string;
	ellis4LinePath: string;
	crownMonolithPath: string;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Incisor Trauma Overlay (Ellis Classification)
 * Ellis II: Enamel-dentin angle fracture (mesio/disto) exposing amber dentin.
 * Ellis IV: Non-vital discolored crown with traumatic transverse fracture line.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorTraumaOverlay: React.FC<UpperIncisorTraumaOverlayProps> = ({
	traumaType,
	ellis2MesialPath,
	ellis2DistalPath,
	ellis4LinePath,
	crownMonolithPath,
	isDark = false,
	className,
}) => {
	if (traumaType === "none") return null;

	return (
		<g
			id="upper-incisor-trauma-overlay"
			data-trauma-type={traumaType}
			className={className}
		>
			{traumaType === "ellis_class_2_mesial" && (
				<g id="trauma-ellis-2-mesial">
					<path
						id="trauma-ellis-2-mesial-fracture"
						d={ellis2MesialPath}
						fill="#d97706"
						opacity="0.88"
						stroke="#b45309"
						strokeWidth="0.8"
						strokeLinejoin="round"
					/>
					<path
						d={ellis2MesialPath}
						fill="none"
						stroke="#fef3c7"
						strokeWidth="0.4"
						strokeDasharray="1.5 1"
					/>
				</g>
			)}
			{traumaType === "ellis_class_2_distal" && (
				<g id="trauma-ellis-2-distal">
					<path
						id="trauma-ellis-2-distal-fracture"
						d={ellis2DistalPath}
						fill="#d97706"
						opacity="0.88"
						stroke="#b45309"
						strokeWidth="0.8"
						strokeLinejoin="round"
					/>
					<path
						d={ellis2DistalPath}
						fill="none"
						stroke="#fef3c7"
						strokeWidth="0.4"
						strokeDasharray="1.5 1"
					/>
				</g>
			)}
			{traumaType === "ellis_class_4" && (
				<g id="trauma-ellis-4-nonvital">
					<path
						id="trauma-ellis-4-discoloration"
						d={crownMonolithPath}
						fill="#78716c"
						opacity="0.42"
						stroke="none"
					/>
					<path
						id="trauma-ellis-4-fracture-line"
						d={ellis4LinePath}
						fill="none"
						stroke={isDark ? "#fca5a5" : "#b91c1c"}
						strokeWidth="0.9"
						strokeLinecap="round"
						strokeDasharray="3 1.5"
					/>
				</g>
			)}
		</g>
	);
};
