/**
 * DENTE Dental CRM — Leads Kanban Convert Modal
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends), Mandate 8b (<= 120 lines)
 */

import { motion } from "framer-motion";
import React from "react";
import { LeadConvertDialogForm } from "./leadConvertModules/LeadConvertDialogForm";
import type {
	LeadConvertModalProps,
	LeadConvertMode,
	LeadConvertSubmitOptions,
} from "./leadConvertModules/leadConvertTypes";

export type {
	LeadConvertModalProps,
	LeadConvertMode,
	LeadConvertSubmitOptions,
};

export const LeadConvertModal: React.FC<LeadConvertModalProps> = (props) => {
	const {
		isOpen,
		cardBg = "var(--paper)",
		borderColor = "var(--line)",
	} = props;

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{
					background: cardBg,
					borderRadius: 16,
					padding: 24,
					width: 440,
					maxWidth: "95%",
					maxHeight: "90vh",
					overflowY: "auto",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				<LeadConvertDialogForm {...props} />
			</motion.div>
		</div>
	);
};
