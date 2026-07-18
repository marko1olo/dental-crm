import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import type { useMarketingLogic } from "../../../hooks/useMarketingLogic";

type UseMarketingLogicReturn = ReturnType<typeof useMarketingLogic>;

export function MarketingReferralsTab({
	state,
	actions,
}: {
	state: UseMarketingLogicReturn["state"];
	actions: UseMarketingLogicReturn["actions"];
}) {
	const { refEnabled, refReward, refNewDiscount } = state;
	const { setRefEnabled, setRefReward, setRefNewDiscount, saveMarketingData } =
		actions;
	const { auth } = useAppLogicContext();

	return (
		<motion.div
			key="referrals"
			className="marketing-panel"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<div style={{ maxWidth: "800px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>
					Реферальная Программа
				</h3>
				<p
					style={{
						color: "var(--muted)",
						marginBottom: "24px",
						lineHeight: 1.6,
						fontSize: "15px",
					}}
				>
					Стимулируйте пациентов рекомендовать вашу клинику друзьям и близким в
					обмен на бонусы.
				</p>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "var(--paper-soft)",
						padding: "16px 20px",
						borderRadius: "12px",
						border: "1px solid var(--line)",
						marginBottom: "24px",
					}}
				>
					<div>
						<strong
							style={{
								display: "block",
								fontSize: 15,
								color: "var(--ink)",
							}}
						>
							Статус программы
						</strong>
						<span style={{ fontSize: 13, color: "var(--muted)" }}>
							Начисление бонусов за приглашенных
						</span>
					</div>
					<label className="theme-switch" style={{ margin: 0 }}>
						<input
							type="checkbox"
							checked={refEnabled}
							onChange={(e) => setRefEnabled(e.target.checked)}
						/>
						<span className="slider round"></span>
					</label>
				</div>

				<div
					style={{
						opacity: refEnabled ? 1 : 0.5,
						pointerEvents: refEnabled ? "auto" : "none",
						transition: "opacity 0.2s",
					}}
				>
					<div className="marketing-form-grid" style={{ marginBottom: "24px" }}>
						<div>
							<label>Бонус приглашающему (₽)</label>
							<input
								type="number"
								className="text-input"
								value={refReward}
								onChange={(e) => setRefReward(e.target.value)}
							/>
						</div>
						<div>
							<label>Скидка новому пациенту (%)</label>
							<input
								type="number"
								className="text-input"
								value={refNewDiscount}
								onChange={(e) => setRefNewDiscount(e.target.value)}
							/>
						</div>
					</div>

					<h4
						style={{
							margin: "0 0 16px 0",
							fontSize: "16px",
							color: "var(--ink)",
						}}
					>
						Сгенерированная ссылка для пациентов
					</h4>
					<div style={{ display: "flex", gap: "12px" }}>
						<input
							type="text"
							className="text-input"
							value={`https://dente.app/ref/${auth.currentOrganizationId()}/P8X1A`}
							readOnly
							style={{
								flex: 1,
								background: "var(--paper-soft)",
								color: "var(--teal)",
							}}
						/>
						<button
							className="secondary-button"
							type="button"
							onClick={() => showToast("Ссылка скопирована", "success")}
						>
							<Copy size={16} /> Копировать
						</button>
					</div>

					<div
						style={{
							marginTop: "32px",
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<button
							className="primary-button"
							type="button"
							onClick={() =>
								saveMarketingData({
									refEnabled,
									refReward,
									refNewDiscount,
								})
							}
						>
							Применить условия рефералки
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
