import { User } from "lucide-react";
import React from "react";
import { SPECIALIZATIONS } from "../ui/SharedOnboardingUI";
import type { StaffEntry } from "../useOnboardingLogic";

export function Step5Staff({
	staff,
	setStaff,
	specs,
	accentColor,
	isDark,
	textColor,
}: any) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				width: "100%",
			}}
		>
			<div style={{ textAlign: "center", marginBottom: 8 }}>
				<p
					style={{
						margin: 0,
						fontSize: 18,
						color: accentColor,
						fontWeight: 700,
					}}
				>
					ФОРМИРОВАНИЕ ШТАТНОГО РАСПИСАНИЯ
				</p>
				<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
					Настройте права доступа и роли. На мобильных устройствах карточки
					автоматически сворачиваются.
				</p>
			</div>

			{staff.map((st: StaffEntry, i: number) => {
				const availableSpecs = SPECIALIZATIONS.filter((s) =>
					specs.includes(s.id),
				);
				return (
					<div
						key={st.id}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 16,
							padding: "20px 16px",
							borderRadius: 16,
							background: isDark
								? "rgba(255,255,255,0.03)"
								: "rgba(0,0,0,0.02)",
							border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
						}}
					>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
							<div
								style={{
									flex: "1 1 calc(50% - 6px)",
									minWidth: "200px",
								}}
							>
								<label
									style={{
										display: "block",
										fontSize: 12,
										color: "#888",
										marginBottom: 4,
									}}
								>
									ФИО сотрудника
								</label>
								<input
									value={st.fullName}
									onChange={(e) =>
										setStaff((prev: any) =>
											prev.map((item: any, idx: number) =>
												idx === i
													? { ...item, fullName: e.target.value }
													: item,
											),
										)
									}
									style={{
										width: "100%",
										padding: "12px 14px",
										borderRadius: 8,
										border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
										background: "transparent",
										color: textColor,
										fontSize: 15,
									}}
									placeholder="Иванов И.И."
								/>
							</div>
							<div
								style={{
									flex: "1 1 calc(50% - 6px)",
									minWidth: "200px",
								}}
							>
								<label
									style={{
										display: "block",
										fontSize: 12,
										color: "#888",
										marginBottom: 4,
									}}
								>
									Телефон
								</label>
								<input
									value={st.phone || ""}
									onChange={(e) =>
										setStaff((prev: any) =>
											prev.map((item: any, idx: number) =>
												idx === i
													? {
															...item,
															phone: e.target.value.replace(
																/[^\d+()\-\s]/g,
																"",
															),
														}
													: item,
											),
										)
									}
									style={{
										width: "100%",
										padding: "12px 14px",
										borderRadius: 8,
										border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
										background: "transparent",
										color: textColor,
										fontSize: 15,
									}}
									placeholder="+7 (999) 000-00-00"
								/>
							</div>

							<div
								style={{
									flex: "1 1 calc(50% - 6px)",
									minWidth: "140px",
								}}
							>
								<label
									style={{
										display: "block",
										fontSize: 12,
										color: "#888",
										marginBottom: 4,
									}}
								>
									Роль
								</label>
								<select
									value={st.role || "Врач"}
									onChange={(e) =>
										setStaff((prev: any) =>
											prev.map((item: any, idx: number) =>
												idx === i ? { ...item, role: e.target.value } : item,
											),
										)
									}
									style={{
										width: "100%",
										padding: "12px 14px",
										borderRadius: 8,
										border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
										background: isDark ? "#1a1d2e" : "#fff",
										color: textColor,
										fontSize: 15,
									}}
								>
									<option value="Врач">Врач</option>
									<option value="Ассистент">Ассистент</option>
									<option value="Администратор">Администратор</option>
									<option value="Куратор">Куратор</option>
								</select>
							</div>

							{st.role === "Врач" && availableSpecs.length > 0 && (
								<div
									style={{
										flex: "1 1 calc(50% - 6px)",
										minWidth: "140px",
									}}
								>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										Специализация
									</label>
									<select
										value={st.specialization || availableSpecs[0]?.label || ""}
										onChange={(e) =>
											setStaff((prev: any) =>
												prev.map((item: any, idx: number) =>
													idx === i
														? {
																...item,
																specialization: e.target.value,
															}
														: item,
												),
											)
										}
										style={{
											width: "100%",
											padding: "12px 14px",
											borderRadius: 8,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: isDark ? "#1a1d2e" : "#fff",
											color: textColor,
											fontSize: 15,
										}}
									>
										{availableSpecs.map((spec) => (
											<option key={spec.id} value={spec.label}>
												{spec.label}
											</option>
										))}
									</select>
								</div>
							)}

							{(st.role === "Врач" || st.role === "Куратор") && (
								<div style={{ flex: "1 1 100%" }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										Комиссионная ставка (%)
									</label>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											padding: "0 12px",
											borderRadius: 8,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: "transparent",
										}}
									>
										<input
											value={st.percentage}
											type="number"
											min={0}
											max={100}
											onChange={(e) =>
												setStaff((prev: any) =>
													prev.map((item: any, idx: number) =>
														idx === i
															? {
																	...item,
																	percentage: Math.max(
																		0,
																		Math.min(100, Number(e.target.value)),
																	),
																}
															: item,
													),
												)
											}
											style={{
												width: "100%",
												padding: "12px 4px",
												border: "none",
												background: "transparent",
												color: textColor,
												outline: "none",
												fontSize: 15,
											}}
											placeholder="Например: 25"
										/>
										<span
											style={{
												fontSize: 15,
												fontWeight: 600,
												color: accentColor,
											}}
										>
											%
										</span>
									</div>
								</div>
							)}

							{st.role === "Ассистент" && (
								<div style={{ flex: "1 1 100%" }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										Привязка к врачу
									</label>
									<select
										onChange={(e) => {
											const val = e.target.value;
											setStaff((prev: any) =>
												prev.map((item: any, idx: number) =>
													idx === i ? { ...item, linkedDoctorId: val } : item,
												),
											);
										}}
										style={{
											width: "100%",
											padding: "12px 14px",
											borderRadius: 8,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: isDark ? "#1a1d2e" : "#fff",
											color: textColor,
											fontSize: 15,
										}}
									>
										<option value="">Без жесткой привязки...</option>
										{staff
											.filter(
												(s: StaffEntry) => s.role === "Врач" && s.fullName,
											)
											.map((doc: StaffEntry) => (
												<option key={doc.id} value={doc.id}>
													{doc.fullName}
												</option>
											))}
									</select>
								</div>
							)}
						</div>
					</div>
				);
			})}

			<button
				onClick={() =>
					setStaff([
						...staff,
						{
							id: Date.now().toString(),
							fullName: "",
							role: "Врач",
							percentage: 0,
						},
					])
				}
				style={{
					padding: "16px",
					borderRadius: 16,
					background: "transparent",
					border: `2px dashed ${accentColor}88`,
					color: accentColor,
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 10,
					fontSize: 15,
					fontWeight: 600,
				}}
			>
				<User size={20} />
				Добавить еще сотрудника
			</button>
		</div>
	);
}
