import { AnimatePresence } from "framer-motion";
import { ChevronDown, Crown, Loader2 } from "lucide-react";
import React from "react";
import { LoyaltyTierDropdown } from "./loyalty/LoyaltyTierDropdown";
import { usePatientLoyalty } from "./loyalty/usePatientLoyalty";

export function PatientLoyaltyHeader({ patientId }: { patientId: string }) {
	const { patient, isOpen, setIsOpen, saving, currentTier, currentLoyalty, handleSetTier } =
		usePatientLoyalty(patientId);

	if (!patient) return null;

	return (
		<div style={{ position: "relative" }} data-testid="patient-loyalty-header">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				disabled={saving}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-label={`Статус лояльности: ${currentLoyalty.label}`}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					background: `color-mix(in srgb, ${currentLoyalty.color} 10%, transparent)`,
					padding: "3px 8px",
					minHeight: "28px",
					borderRadius: "6px",
					border: `1px solid color-mix(in srgb, ${currentLoyalty.color} 30%, transparent)`,
					cursor: saving ? "wait" : "pointer",
					transition: "background 0.2s",
				}}
				title="Изменить статус лояльности"
			>
				{saving ? (
					<Loader2 size={14} color={currentLoyalty.color} className="animate-spin" />
				) : (
					<Crown size={14} color={currentLoyalty.color} />
				)}

				<span style={{ fontSize: "12px", fontWeight: 600, color: currentLoyalty.color }}>
					{currentLoyalty.label}
				</span>

				{currentLoyalty.discountPct > 0 && (
					<span
						title="Программа эту скидку не считает: назначьте её вручную при оплате"
						style={{
							fontSize: "12px",
							fontWeight: 700,
							background: currentLoyalty.color,
							color: "var(--on-teal, #ffffff)",
							padding: "2px 6px",
							borderRadius: "4px",
							marginLeft: "4px",
						}}
					>
						-{currentLoyalty.discountPct}%
					</span>
				)}
				<ChevronDown size={12} color={currentLoyalty.color} style={{ marginLeft: "2px", opacity: 0.7 }} />
			</button>

			<AnimatePresence>
				{isOpen && (
					<LoyaltyTierDropdown
						currentTier={currentTier}
						onSelectTier={handleSetTier}
						onClose={() => setIsOpen(false)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
