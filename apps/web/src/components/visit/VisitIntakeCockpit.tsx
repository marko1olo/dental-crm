import React, { useState, useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import {
	Search,
	UserPlus,
	Play,
	Clock,
	AlertCircle,
	ArrowRight,
	CalendarDays,
	UserCheck,
	Sparkles,
	CheckCircle2,
	Phone,
} from "lucide-react";
import { PatientAvatar } from "../PatientAvatar";
import { formatClockTime } from "../shift";
import { showToast } from "../GlobalToast";

export interface VisitIntakeCockpitProps {
	dashboard?: Dashboard | null;
	activeDoctor?: any;
	onSelectPatient: (patientId: string) => void;
	onEmergencyIntake?: () => void;
}

export function VisitIntakeCockpit({
	dashboard,
	activeDoctor,
	onSelectPatient,
	onEmergencyIntake,
}: VisitIntakeCockpitProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [queueFilter, setQueueFilter] = useState<"all" | "waiting" | "in_chair" | "scheduled">("all");

	// Индекс пациентов клиники
	const allPatients = useMemo(() => {
		return dashboard?.patients || [];
	}, [dashboard?.patients]);

	const patientsById = useMemo(() => {
		const map = new Map<string, any>();
		for (const p of allPatients) {
			map.set(p.id, p);
		}
		return map;
	}, [allPatients]);

	// Записи на сегодня
	const todayAppointments = useMemo(() => {
		const list = dashboard?.appointments || [];
		const todayIso = dashboard?.todayIso || new Date().toISOString().slice(0, 10);
		return list
			.filter((app: any) => {
				const appDate = (app.startsAt || "").slice(0, 10);
				return !appDate || appDate === todayIso;
			})
			.sort((a: any, b: any) => (a.startsAt || "").localeCompare(b.startsAt || ""));
	}, [dashboard?.appointments, dashboard?.todayIso]);

	// Фильтрация очереди по табам
	const filteredAppointments = useMemo(() => {
		return todayAppointments.filter((app: any) => {
			const status = String(app.status || "").toLowerCase();
			if (queueFilter === "waiting") {
				return status === "arrived" || status === "waiting" || status === "in_hall";
			}
			if (queueFilter === "in_chair") {
				return status === "in_chair" || status === "in_progress" || status === "in_treatment";
			}
			if (queueFilter === "scheduled") {
				return status === "scheduled" || status === "confirmed" || status === "planned";
			}
			return true;
		});
	}, [todayAppointments, queueFilter]);

	// Поиск пациентов в картотеке
	const searchResults = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return allPatients.filter((p: any) => {
			const name = (p.fullName || "").toLowerCase();
			const phone = (p.phone || "").replace(/\D/g, "");
			const card = (p.cardNumber || p.medicalCardNumber || "").toLowerCase();
			return name.includes(q) || phone.includes(q) || card.includes(q);
		}).slice(0, 6);
	}, [allPatients, searchQuery]);

	// Быстрый клик "Начать прием первого пациента из очереди"
	const handleStartNextInQueue = () => {
		const waiting = todayAppointments.find((a: any) => {
			const s = String(a.status || "").toLowerCase();
			return s === "arrived" || s === "waiting" || s === "in_progress";
		});
		if (waiting && waiting.patientId) {
			onSelectPatient(waiting.patientId);
			showToast(`Открыт приём: ${waiting.patientName || "Пациент"}`, "success");
			return;
		}
		if (todayAppointments.length > 0 && todayAppointments[0]?.patientId) {
			onSelectPatient(todayAppointments[0].patientId);
			showToast(`Открыт приём: ${todayAppointments[0].patientName || "Пациент"}`, "success");
			return;
		}
		if (allPatients.length > 0) {
			onSelectPatient(allPatients[0].id);
			showToast(`Открыта карта: ${allPatients[0].fullName}`, "info");
			return;
		}
		showToast("Нет пациентов в очереди", "warning");
	};

	return (
		<div className="dente-intake-cockpit" style={{
			padding: "1.25rem",
			maxWidth: "1200px",
			margin: "0 auto",
			display: "flex",
			flexDirection: "column",
			gap: "1.25rem",
			color: "var(--text, #0f172a)",
		}}>
			{/* Хедер Кокпита приёма */}
			<header style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1rem",
				padding: "1rem 1.25rem",
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "14px",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
					<div style={{
						width: "44px",
						height: "44px",
						borderRadius: "10px",
						background: "var(--accent-subtle, #eff6ff)",
						color: "var(--accent, #0284c7)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}>
						<UserCheck size={24} />
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
								Клинический приём пациентов
							</h1>
							<span style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								padding: "0.15rem 0.5rem",
								borderRadius: "999px",
								background: "var(--paper-soft, #f1f5f9)",
								color: "var(--text-muted, #64748b)",
								border: "1px solid var(--line, #cbd5e1)",
							}}>
								Форма 043/у
							</span>
						</div>
						<p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-muted, #64748b)" }}>
							{activeDoctor?.fullName
								? `Дежурный врач: ${activeDoctor.fullName}`
								: "Выберите пациента из очереди смены или найдите карту в архиве"}
						</p>
					</div>
				</div>

				{/* Быстрые действия дежурного врача */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
					{todayAppointments.length > 0 && (
						<button
							type="button"
							onClick={handleStartNextInQueue}
							id="btn-intake-start-next"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "0.5rem",
								padding: "0.55rem 1rem",
								fontSize: "0.875rem",
								fontWeight: 600,
								color: "#ffffff",
								background: "var(--accent, #0284c7)",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
								minHeight: "40px",
							}}
						>
							<Play size={16} fill="currentColor" />
							<span>Пригласить следующего</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => {
							if (onEmergencyIntake) {
								onEmergencyIntake();
							} else if (allPatients.length > 0) {
								onSelectPatient(allPatients[0].id);
								showToast("Экстренный приём: открыта карточка пациента", "warning");
							} else {
								showToast("Для острой боли создайте пациента в картотеке", "info");
							}
						}}
						id="btn-intake-emergency"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "0.45rem",
							padding: "0.55rem 0.9rem",
							fontSize: "0.85rem",
							fontWeight: 600,
							color: "#dc2626",
							background: "rgba(239, 68, 68, 0.08)",
							border: "1px solid rgba(239, 68, 68, 0.2)",
							borderRadius: "8px",
							cursor: "pointer",
							minHeight: "40px",
						}}
					>
						<UserPlus size={16} />
						<span>+ Принять без записи / Острая боль</span>
					</button>
				</div>
			</header>

			{/* Блок быстрого поиска картотеки */}
			<section style={{
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "14px",
				padding: "1rem 1.25rem",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
			}}>
				<label
					htmlFor="intake-patient-search-input"
					style={{
						display: "block",
						fontSize: "0.8rem",
						fontWeight: 600,
						textTransform: "uppercase",
						letterSpacing: "0.04em",
						color: "var(--text-muted, #64748b)",
						marginBottom: "0.5rem",
					}}
				>
					Быстрый поиск пациента для приёма
				</label>
				<div style={{ position: "relative", width: "100%" }}>
					<Search
						size={18}
						style={{
							position: "absolute",
							left: "0.85rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--text-muted, #94a3b8)",
							pointerEvents: "none",
						}}
					/>
					<input
						id="intake-patient-search-input"
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по ФИО, номеру телефона (+7...) или номеру медкарты..."
						style={{
							width: "100%",
							padding: "0.65rem 0.85rem 0.65rem 2.5rem",
							fontSize: "0.95rem",
							border: "1px solid var(--line, #cbd5e1)",
							borderRadius: "8px",
							background: "var(--paper-soft, #f8fafc)",
							color: "var(--text, #0f172a)",
							boxSizing: "border-box",
							outline: "none",
						}}
					/>
				</div>

				{/* Выпадающие результаты поиска */}
				{searchResults.length > 0 && (
					<div style={{
						marginTop: "0.75rem",
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "0.6rem",
					}}>
						{searchResults.map((p: any) => (
							<div
								key={p.id}
								onClick={() => {
									onSelectPatient(p.id);
									setSearchQuery("");
								}}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "0.65rem 0.85rem",
									borderRadius: "8px",
									border: "1px solid var(--line, #e2e8f0)",
									background: "var(--paper, #ffffff)",
									cursor: "pointer",
									transition: "all 0.15s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "var(--accent, #0284c7)";
									e.currentTarget.style.background = "var(--paper-soft, #f8fafc)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "var(--line, #e2e8f0)";
									e.currentTarget.style.background = "var(--paper, #ffffff)";
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
									<PatientAvatar fullName={p.fullName} size={36} mode="auto" />
									<div>
										<div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.fullName}</div>
										<div style={{ fontSize: "0.78rem", color: "var(--text-muted, #64748b)" }}>
											{p.phone || "Телефон не указан"}
										</div>
									</div>
								</div>
								<button
									type="button"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.3rem",
										padding: "0.35rem 0.65rem",
										fontSize: "0.8rem",
										fontWeight: 600,
										color: "var(--accent, #0284c7)",
										background: "var(--accent-subtle, #eff6ff)",
										border: "1px solid rgba(2, 132, 199, 0.2)",
										borderRadius: "6px",
										cursor: "pointer",
									}}
								>
									<span>Начать приём</span>
									<ArrowRight size={14} />
								</button>
							</div>
						))}
					</div>
				)}
			</section>

			{/* Оперативная очередь смены */}
			<section style={{
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "14px",
				padding: "1.25rem",
				boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
			}}>
				<div style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.75rem",
					marginBottom: "1rem",
					borderBottom: "1px solid var(--line, #f1f5f9)",
					paddingBottom: "0.75rem",
				}}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Clock size={18} style={{ color: "var(--accent, #0284c7)" }} />
						<h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
							Очередь приёма на сегодня
						</h2>
						<span style={{
							fontSize: "0.8rem",
							fontWeight: 600,
							color: "var(--text-muted, #64748b)",
							background: "var(--paper-soft, #f1f5f9)",
							padding: "0.1rem 0.45rem",
							borderRadius: "6px",
						}}>
							{todayAppointments.length} визитов
						</span>
					</div>

					{/* Переключатель статусов */}
					<div style={{ display: "flex", gap: "0.35rem" }}>
						{[
							{ id: "all", label: "Все" },
							{ id: "waiting", label: "В холле" },
							{ id: "in_chair", label: "В кресле" },
							{ id: "scheduled", label: "Запланированы" },
						].map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setQueueFilter(tab.id as any)}
								style={{
									padding: "0.35rem 0.75rem",
									fontSize: "0.8rem",
									fontWeight: queueFilter === tab.id ? 600 : 500,
									color: queueFilter === tab.id ? "#ffffff" : "var(--text-muted, #64748b)",
									background: queueFilter === tab.id ? "var(--accent, #0284c7)" : "var(--paper-soft, #f1f5f9)",
									border: "1px solid",
									borderColor: queueFilter === tab.id ? "var(--accent, #0284c7)" : "var(--line, #e2e8f0)",
									borderRadius: "6px",
									cursor: "pointer",
									transition: "all 0.15s ease",
								}}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Карточки очереди */}
				{filteredAppointments.length > 0 ? (
					<div style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
						gap: "0.85rem",
					}}>
						{filteredAppointments.map((app: any) => {
							const pat = patientsById.get(app.patientId) || {};
							const status = String(app.status || "").toLowerCase();
							const isInChair = status === "in_chair" || status === "in_progress";
							const isWaiting = status === "arrived" || status === "waiting" || status === "in_hall";

							let statusBadge = {
								text: "Запланирован",
								bg: "var(--paper-soft, #f1f5f9)",
								color: "var(--text-muted, #64748b)",
								border: "var(--line, #e2e8f0)",
							};
							if (isInChair) {
								statusBadge = {
									text: "В кресле",
									bg: "rgba(16, 185, 129, 0.1)",
									color: "#059669",
									border: "rgba(16, 185, 129, 0.25)",
								};
							} else if (isWaiting) {
								statusBadge = {
									text: "В холле (ожидает)",
									bg: "rgba(245, 158, 11, 0.1)",
									color: "#d97706",
									border: "rgba(245, 158, 11, 0.25)",
								};
							}

							return (
								<div
									key={app.id}
									style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "space-between",
										padding: "1rem",
										borderRadius: "10px",
										border: "1px solid",
										borderColor: isInChair ? "var(--accent, #0284c7)" : "var(--line, #e2e8f0)",
										background: isInChair ? "var(--accent-subtle, #f0f9ff)" : "var(--paper, #ffffff)",
										boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
										gap: "0.75rem",
									}}
								>
									<div>
										<div style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											marginBottom: "0.5rem",
										}}>
											<div style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "0.3rem",
												fontSize: "0.85rem",
												fontWeight: 700,
												color: "var(--accent, #0284c7)",
											}}>
												<Clock size={14} />
												<span>{formatClockTime(app.startsAt)}</span>
											</div>
											<span style={{
												fontSize: "0.75rem",
												fontWeight: 600,
												padding: "0.15rem 0.5rem",
												borderRadius: "999px",
												background: statusBadge.bg,
												color: statusBadge.color,
												border: `1px solid ${statusBadge.border}`,
											}}>
												{statusBadge.text}
											</span>
										</div>

										<div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
											<PatientAvatar fullName={app.patientName || pat.fullName} size={40} mode="auto" />
											<div style={{ minWidth: 0 }}>
												<div style={{
													fontWeight: 700,
													fontSize: "0.95rem",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}>
													{app.patientName || pat.fullName || "Пациент"}
												</div>
												<div style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
													{app.reason || pat.complaints || "Первичный осмотр / Санация"}
												</div>
											</div>
										</div>
									</div>

									<div style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										paddingTop: "0.5rem",
										borderTop: "1px solid var(--line, #f1f5f9)",
									}}>
										<span style={{ fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)" }}>
											{app.chairName || "Кабинет 1"}
										</span>
										<button
											type="button"
											onClick={() => onSelectPatient(app.patientId || pat.id)}
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "0.35rem",
												padding: "0.45rem 0.85rem",
												fontSize: "0.85rem",
												fontWeight: 600,
												color: isInChair ? "#ffffff" : "var(--accent, #0284c7)",
												background: isInChair ? "var(--accent, #0284c7)" : "var(--accent-subtle, #eff6ff)",
												border: "1px solid",
												borderColor: isInChair ? "var(--accent, #0284c7)" : "rgba(2, 132, 199, 0.2)",
												borderRadius: "6px",
												cursor: "pointer",
											}}
										>
											<Play size={14} fill="currentColor" />
											<span>{isInChair ? "Продолжить приём" : "Начать приём"}</span>
										</button>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div style={{
						padding: "2.5rem 1rem",
						textAlign: "center",
						background: "var(--paper-soft, #f8fafc)",
						borderRadius: "10px",
						border: "1px dashed var(--line, #cbd5e1)",
					}}>
						<CalendarDays size={32} style={{ color: "var(--text-muted, #94a3b8)", marginBottom: "0.5rem" }} />
						<div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text, #334155)" }}>
							Нет запланированных пациентов в данном статусе
						</div>
						<div style={{ fontSize: "0.85rem", color: "var(--text-muted, #64748b)", marginTop: "0.25rem" }}>
							Используйте поиск по картотеке выше или выберите пациента из недавних
						</div>
					</div>
				)}
			</section>

			{/* Быстрый доступ: Недавние пациенты картотеки */}
			{allPatients.length > 0 && (
				<section style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "14px",
					padding: "1.25rem",
					boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
				}}>
					<h3 style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted, #64748b)" }}>
						Пациенты клиники для быстрого открытия карты
					</h3>
					<div style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
						gap: "0.6rem",
					}}>
						{allPatients.slice(0, 8).map((p: any) => (
							<div
								key={p.id}
								onClick={() => onSelectPatient(p.id)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.65rem",
									padding: "0.6rem 0.75rem",
									borderRadius: "8px",
									border: "1px solid var(--line, #e2e8f0)",
									background: "var(--paper, #ffffff)",
									cursor: "pointer",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "var(--accent, #0284c7)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "var(--line, #e2e8f0)";
								}}
							>
								<PatientAvatar fullName={p.fullName} size={32} mode="auto" />
								<div style={{ minWidth: 0, flex: 1 }}>
									<div style={{
										fontWeight: 600,
										fontSize: "0.85rem",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}>
										{p.fullName}
									</div>
									<div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>
										{p.phone || "Карта активна"}
									</div>
								</div>
								<ArrowRight size={14} style={{ color: "var(--text-muted, #94a3b8)" }} />
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
