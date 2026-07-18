import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { useMarketingLogic } from "../../../hooks/useMarketingLogic";

type UseMarketingLogicReturn = ReturnType<typeof useMarketingLogic>;

export function MarketingNpsTab({
	state,
	actions,
}: {
	state: UseMarketingLogicReturn["state"];
	actions: UseMarketingLogicReturn["actions"];
}) {
	const { npsScore, npsEnabled, npsSendDelay, npsMessageTemplate } = state;
	const {
		setNpsEnabled,
		setNpsSendDelay,
		setNpsMessageTemplate,
		saveMarketingData,
	} = actions;

	return (
		<motion.div
			key="nps"
			className="marketing-panel"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<div style={{ maxWidth: "800px" }}>
				<h3 style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px" }}>
					Система оценки качества (NPS)
				</h3>

				<div
					style={{
						display: "flex",
						gap: "24px",
						marginBottom: "32px",
						flexWrap: "wrap",
					}}
				>
					<div className="marketing-stat-card" style={{ flex: "1 1 200px" }}>
						<div className="marketing-stat-icon-wrapper">
							<Star size={24} />
						</div>
						<div className="marketing-stat-content">
							<h3 className="marketing-stat-title">Ваш NPS</h3>
							<strong
								style={{
									fontSize: 24,
									color: "var(--teal)",
									lineHeight: 1,
									marginTop: 4,
								}}
							>
								{npsScore}
							</strong>
						</div>
					</div>

					<div
						style={{
							flex: "2 1 300px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							background: "var(--paper-soft)",
							padding: "16px",
							borderRadius: "12px",
							border: "1px solid var(--line)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
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
									Авто-опросы пациентов
								</strong>
								<span style={{ fontSize: 13, color: "var(--muted)" }}>
									Отправлять SMS с просьбой оценить прием
								</span>
							</div>
							<label className="theme-switch" style={{ margin: 0 }}>
								<input
									type="checkbox"
									checked={npsEnabled}
									onChange={(e) => setNpsEnabled(e.target.checked)}
								/>
								<span className="slider round"></span>
							</label>
						</div>

						<div
							style={{
								opacity: npsEnabled ? 1 : 0.5,
								pointerEvents: npsEnabled ? "auto" : "none",
								transition: "opacity 0.2s",
							}}
						>
							<label
								style={{
									display: "block",
									fontSize: 13,
									color: "var(--muted)",
									marginBottom: 8,
								}}
							>
								Задержка перед отправкой (часы)
							</label>
							<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
								<input
									type="range"
									min="1"
									max="72"
									value={npsSendDelay}
									onChange={(e) => setNpsSendDelay(parseInt(e.target.value))}
									style={{ flex: 1, accentColor: "var(--teal)" }}
								/>
								<strong style={{ color: "var(--ink)", width: 40 }}>
									{npsSendDelay} ч
								</strong>
							</div>
						</div>
					</div>
				</div>

				<h4
					style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--ink)" }}
				>
					Шаблон сообщения
				</h4>
				<textarea
					className="marketing-textarea"
					value={npsMessageTemplate}
					onChange={(e) => setNpsMessageTemplate(e.target.value)}
					rows={4}
				/>
				<div
					style={{
						marginTop: "16px",
						display: "flex",
						justifyContent: "flex-end",
					}}
				>
					<button
						className="primary-button"
						type="button"
						onClick={() =>
							saveMarketingData({
								npsEnabled,
								npsSendDelay,
								npsMessageTemplate,
							})
						}
					>
						Сохранить настройки NPS
					</button>
				</div>
			</div>
		</motion.div>
	);
}
