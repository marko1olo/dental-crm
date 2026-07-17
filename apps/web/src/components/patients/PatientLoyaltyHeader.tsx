import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crown, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

type LoyaltyTier = "none" | "silver" | "gold" | "platinum";

const LOYALTY_CONFIG: Record<
	LoyaltyTier,
	{ label: string; discountPct: number; color: string }
> = {
	none: { label: "Базовый", discountPct: 0, color: "var(--slate-500)" },
	silver: { label: "Серебро", discountPct: 5, color: "var(--slate-500)" },
	gold: { label: "Золото", discountPct: 10, color: "var(--amber)" },
	platinum: { label: "Платинум", discountPct: 15, color: "var(--indigo)" },
};

export function PatientLoyaltyHeader({ patientId }: { patientId: string }) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isOpen, setIsOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	if (!patient) return null;

	const adminProfile = patient.administrativeProfile || {};
	const currentTier: LoyaltyTier = adminProfile.loyaltyTier || "none";
	const currentLoyalty = LOYALTY_CONFIG[currentTier];

	const handleSetTier = async (tier: LoyaltyTier) => {
		setIsOpen(false);
		if (tier === currentTier) return;

		setSaving(true);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						loyaltyTier: tier,
					}),
				},
			);

			if (!res.ok) throw new Error("Failed to save loyalty tier");

			showToast("Статус лояльности обновлен", "success");
			await loadDashboard();
		} catch (err) {
			showToast("Ошибка при сохранении", "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div style={{ position: "relative" }}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				disabled={saving}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					background: `color-mix(in srgb, ${currentLoyalty.color} 10%, transparent)`,
					padding: "4px 8px",
					borderRadius: "6px",
					border: `1px solid color-mix(in srgb, ${currentLoyalty.color} 30%, transparent)`,
					cursor: saving ? "wait" : "pointer",
					transition: "background 0.2s",
				}}
				onMouseEnter={(e) => {
					if (!saving)
						e.currentTarget.style.background = `color-mix(in srgb, ${currentLoyalty.color} 15%, transparent)`;
				}}
				onMouseLeave={(e) => {
					if (!saving)
						e.currentTarget.style.background = `color-mix(in srgb, ${currentLoyalty.color} 10%, transparent)`;
				}}
				title="Изменить статус лояльности"
			>
				{saving ? (
					<Loader2
						size={14}
						color={currentLoyalty.color}
						className="animate-spin"
					/>
				) : (
					<Crown size={14} color={currentLoyalty.color} />
				)}

				<span
					style={{
						fontSize: "12px",
						fontWeight: 600,
						color: currentLoyalty.color,
					}}
				>
					{currentLoyalty.label}
				</span>

				{currentLoyalty.discountPct > 0 && (
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							background: currentLoyalty.color,
							color: "#fff",
							padding: "2px 4px",
							borderRadius: "4px",
							marginLeft: "4px",
						}}
					>
						-{currentLoyalty.discountPct}%
					</span>
				)}
				<ChevronDown
					size={12}
					color={currentLoyalty.color}
					style={{ marginLeft: "2px", opacity: 0.7 }}
				/>
			</button>

			<AnimatePresence>
				{isOpen && (
					<>
						<div
							style={{ position: "fixed", inset: 0, zIndex: 99 }}
							onClick={() => setIsOpen(false)}
						/>
						<motion.div
							initial={{ opacity: 0, y: 5, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 5, scale: 0.95 }}
							transition={{ duration: 0.15 }}
							style={{
								position: "absolute",
								top: "100%",
								left: 0,
								marginTop: "4px",
								background: "var(--paper)",
								border: "1px solid var(--border-300)",
								borderRadius: "8px",
								boxShadow:
									"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
								padding: "4px",
								zIndex: 100,
								minWidth: "160px",
								display: "flex",
								flexDirection: "column",
								gap: "2px",
							}}
						>
							{(
								Object.entries(LOYALTY_CONFIG) as [
									LoyaltyTier,
									(typeof LOYALTY_CONFIG)[LoyaltyTier],
								][]
							).map(([tierKey, config]) => (
								<button
									key={tierKey}
									type="button"
									onClick={() => handleSetTier(tierKey)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										padding: "8px 12px",
										borderRadius: "6px",
										background:
											currentTier === tierKey
												? "var(--surface-100)"
												: "transparent",
										border: "none",
										cursor: "pointer",
										textAlign: "left",
										fontSize: "13px",
										fontWeight: currentTier === tierKey ? 600 : 500,
										color: "var(--slate-800)",
									}}
									onMouseEnter={(e) => {
										if (currentTier !== tierKey)
											e.currentTarget.style.background = "var(--surface-50)";
									}}
									onMouseLeave={(e) => {
										if (currentTier !== tierKey)
											e.currentTarget.style.background = "transparent";
									}}
								>
									<Crown size={14} color={config.color} />
									<span style={{ flex: 1 }}>{config.label}</span>
									{config.discountPct > 0 && (
										<span
											style={{
												color: config.color,
												fontSize: "11px",
												fontWeight: 700,
											}}
										>
											-{config.discountPct}%
										</span>
									)}
								</button>
							))}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}
