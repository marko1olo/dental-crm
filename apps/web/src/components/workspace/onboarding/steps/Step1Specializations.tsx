import React from "react";
import { Check } from "lucide-react";
import { SPECIALIZATIONS, GlassCard } from "../ui/SharedOnboardingUI";

export function Step1Specializations({
	specs,
	toggleSpec,
	setSpecs,
	accentColor,
	isDark,
	textColor,
}: any) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 24,
				padding: "0 10px",
			}}
		>
			<div
				style={{
					textAlign: "center",
					marginBottom: 8,
					background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
					padding: 20,
					borderRadius: 16,
				}}
			>
				<p
					style={{
						margin: 0,
						fontSize: 18,
						color: accentColor,
						fontWeight: 700,
					}}
				>
					ВЫБЕРИТЕ СПЕЦИАЛИЗАЦИИ КЛИНИКИ (МУЛЬТИВЫБОР)
				</p>
				<p
					style={{
						margin: "8px 0 0 0",
						fontSize: 15,
						color: textColor,
					}}
				>
					Вы можете выбрать <b>сразу несколько направлений</b> одновременно.
				</p>
				<p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#aaa" }}>
					Интерфейс CRM автоматически адаптируется под выбранные модули.
				</p>
			</div>

			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "12px 16px",
					background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
					borderRadius: 12,
					gap: 12,
				}}
			>
				<span style={{ fontWeight: 600, fontSize: 15 }}>
					Выбрано направлений:{" "}
					<span
						style={{
							color: specs.length > 0 ? accentColor : "red",
							fontSize: 18,
							padding: "0 4px",
						}}
					>
						{specs.length}
					</span>{" "}
					из {SPECIALIZATIONS.length}
				</span>
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<button
						onClick={() => setSpecs(SPECIALIZATIONS.map((s) => s.id))}
						style={{
							padding: "8px 16px",
							borderRadius: 8,
							background: `${accentColor}22`,
							border: `1px solid ${accentColor}`,
							color: accentColor,
							cursor: "pointer",
							fontSize: 14,
							fontWeight: 600,
						}}
					>
						Выбрать все специализации
					</button>
					<button
						onClick={() => setSpecs([])}
						style={{
							padding: "8px 16px",
							borderRadius: 8,
							background: "transparent",
							border: `1px solid ${isDark ? "#444" : "#ccc"}`,
							color: isDark ? "#aaa" : "#555",
							cursor: "pointer",
							fontSize: 14,
						}}
					>
						Сбросить выбор
					</button>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
					gap: 16,
				}}
			>
				{SPECIALIZATIONS.map((s) => {
					const isSelected = specs.includes(s.id);
					return (
						<GlassCard
							key={s.id}
							selected={isSelected}
							onClick={() => toggleSpec(s.id)}
							accentColor={accentColor}
							isDark={isDark}
							style={{ position: "relative", padding: "24px 20px" }}
						>
							<div
								style={{
									position: "absolute",
									top: 16,
									right: 16,
									width: 32,
									height: 32,
									borderRadius: 10,
									border: `2px solid ${isSelected ? accentColor : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
									background: isSelected
										? accentColor
										: isDark
											? "rgba(0,0,0,0.2)"
											: "rgba(255,255,255,0.05)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									transition: "all 0.2s",
									boxShadow: isSelected ? `0 0 12px ${accentColor}88` : "none",
								}}
							>
								{isSelected && <Check size={20} color="#fff" strokeWidth={3} />}
							</div>
							<div
								style={{
									color: isSelected ? accentColor : isDark ? "#aaa" : "#555",
									marginBottom: 16,
									transform: isSelected ? "scale(1.15)" : "scale(1)",
									transition: "transform 0.2s",
									transformOrigin: "left center",
								}}
							>
								{s.icon}
							</div>
							<div>
								<div
									style={{
										fontWeight: 700,
										fontSize: 18,
										color: isSelected ? textColor : isDark ? "#aaa" : "#333",
									}}
								>
									{s.label}
								</div>
								<div
									style={{
										fontSize: 13,
										marginTop: 4,
										color: isSelected ? textColor : "#888",
										opacity: isSelected ? 0.9 : 0.7,
									}}
								>
									{s.desc}
								</div>
							</div>
						</GlassCard>
					);
				})}
			</div>
		</div>
	);
}
