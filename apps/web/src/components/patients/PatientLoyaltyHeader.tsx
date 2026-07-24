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
	none: { label: "Базовый", discountPct: 0, color: "#64748b" },
	silver: { label: "Серебро", discountPct: 5, color: "#94a3b8" },
	gold: { label: "Золото", discountPct: 10, color: "#f59e0b" },
	platinum: { label: "Платинум", discountPct: 15, color: "#6366f1" },
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
		<div style={{ position: "relative" }} data-testid="patient-loyalty-header">
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
							className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-50 min-w-[160px] flex flex-col gap-0.5"
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
									className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs border-0 cursor-pointer text-left transition-colors ${
										currentTier === tierKey
											? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
											: "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium"
									}`}
								>
									<Crown size={14} color={config.color} />
									<span className="flex-1">{config.label}</span>
									{config.discountPct > 0 && (
										<span
											style={{ color: config.color }}
											className="text-[11px] font-bold"
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
