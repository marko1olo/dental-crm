import type { SterilizerEquipmentStatus } from "@dental/shared";
import {
	Archive,
	Calendar,
	CheckCircle2,
	RotateCcw,
	ShieldCheck,
	Wrench,
} from "lucide-react";
import React from "react";
import type { SterilizerFormData } from "./types";

export interface SterilizerMaintenanceScheduleProps {
	formData: SterilizerFormData;
	onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
	isEditing: boolean;
	submitting: boolean;
	onQuickMaintenance: () => void;
	onQuickReturnToService: () => void;
	onQuickDecommission: (reason?: string) => void;
	decommissionReason: string;
	setDecommissionReason: (r: string) => void;
	showDecommissionConfirm: boolean;
	setShowDecommissionConfirm: (show: boolean) => void;
}

export function SterilizerMaintenanceSchedule({
	formData,
	onFieldChange,
	isEditing,
	submitting,
	onQuickMaintenance,
	onQuickReturnToService,
	onQuickDecommission,
	decommissionReason,
	setDecommissionReason,
	showDecommissionConfirm,
	setShowDecommissionConfirm,
}: SterilizerMaintenanceScheduleProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			{/* Maintenance Dates Grid */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
				{/* Status */}
				<div>
					<label
						htmlFor="sterilizer-status-select"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Текущий рабочий статус
					</label>
					<select
						id="sterilizer-status-select"
						value={formData.status}
						onChange={(e) => onFieldChange("status", e.target.value as SterilizerEquipmentStatus)}
						className="sanpin-select"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem", fontWeight: 600 }}
					>
						<option value="active">В работе (допущен к стерилизации)</option>
						<option value="in_maintenance">На техобслуживании / Ремонте (ТО)</option>
						<option value="decommissioned">Списан / Выведен из эксплуатации</option>
					</select>
				</div>

				{/* Verification Expiry Date */}
				<div>
					<label
						htmlFor="sterilizer-verification-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Дата очередной поверки датчиков (ФЗ № 102-ФЗ)
					</label>
					<input
						id="sterilizer-verification-input"
						type="date"
						value={formData.verificationExpiryDate}
						onChange={(e) => onFieldChange("verificationExpiryDate", e.target.value)}
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Next Maintenance Date */}
				<div>
					<label
						htmlFor="sterilizer-nextmaint-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Дата следующего планового ТО
					</label>
					<input
						id="sterilizer-nextmaint-input"
						type="date"
						value={formData.nextMaintenanceDate}
						onChange={(e) => onFieldChange("nextMaintenanceDate", e.target.value)}
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Last Maintenance Date */}
				<div>
					<label
						htmlFor="sterilizer-lastmaint-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Дата последнего проведенного ТО
					</label>
					<input
						id="sterilizer-lastmaint-input"
						type="date"
						value={formData.lastMaintenanceDate}
						onChange={(e) => onFieldChange("lastMaintenanceDate", e.target.value)}
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>

				{/* Notes / Service organization */}
				<div style={{ gridColumn: "1 / -1" }}>
					<label
						htmlFor="sterilizer-notes-input"
						style={{ display: "block", fontSize: "0.775rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--ink, #0f172a)" }}
					>
						Сервисная организация, номер договора ТО и примечания
					</label>
					<input
						id="sterilizer-notes-input"
						type="text"
						value={formData.notes}
						onChange={(e) => onFieldChange("notes", e.target.value)}
						placeholder="ООО «МедСервисТехника», договор №ТО-2026/04 от 12.01.2026..."
						className="sanpin-input"
						style={{ width: "100%", height: "38px", fontSize: "0.85rem" }}
					/>
				</div>
			</div>

			{/* Regulated Maintenance Checklist Card */}
			<div
				style={{
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "8px",
					padding: "0.75rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				<span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
					<Calendar size={14} color="#0d9488" /> График регламентного сервисного обслуживания (ТО)
				</span>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.5rem", fontSize: "0.74rem" }}>
					<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
						<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
							Бактерицидный воздушный фильтр
						</div>
						<div style={{ color: "var(--muted, #64748b)" }}>
							Замена каждые 500 циклов или 6 месяцев. Контроль стерильности сушки.
						</div>
					</div>

					<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
						<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
							Уплотнитель двери камеры
						</div>
						<div style={{ color: "var(--muted, #64748b)" }}>
							Замена каждые 1000 циклов или 1 год. Предотвращение утечки вакуума.
						</div>
					</div>

					<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
						<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
							Резервуар чистой воды
						</div>
						<div style={{ color: "var(--muted, #64748b)" }}>
							Очистка и дезинфекция еженедельно. Использование деионизированной воды.
						</div>
					</div>

					<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
						<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
							Поверка датчиков давления / темп.
						</div>
						<div style={{ color: "var(--muted, #64748b)" }}>
							Ежегодная метрологическая поверка аккредитованной организацией.
						</div>
					</div>
				</div>
			</div>

			{/* Editing Quick Actions Bar */}
			{isEditing && (
				<div
					style={{
						padding: "0.75rem",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
						Быстрые действия технического статуса:
					</span>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
						{formData.status === "active" && (
							<button
								type="button"
								onClick={onQuickMaintenance}
								aria-busy={submitting}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#d97706" }}
							>
								<Wrench size={14} /> Вывести на техобслуживание (ТО)
							</button>
						)}

						{formData.status === "in_maintenance" && (
							<button
								type="button"
								onClick={onQuickReturnToService}
								aria-busy={submitting}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#059669" }}
							>
								<CheckCircle2 size={14} /> Вернуть в строй (ТО завершено)
							</button>
						)}

						{formData.status !== "decommissioned" && (
							showDecommissionConfirm ? (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.35rem",
										padding: "0.5rem",
										background: "rgba(220, 38, 38, 0.06)",
										borderRadius: "6px",
										border: "1px solid rgba(220, 38, 38, 0.25)",
										width: "100%",
									}}
								>
									<label
										htmlFor="sterilizer-decommission-reason"
										style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}
									>
										Основание списания (дефектация, износ, замена):
									</label>
									<input
										id="sterilizer-decommission-reason"
										type="text"
										value={decommissionReason}
										onChange={(e) => setDecommissionReason(e.target.value)}
										placeholder="Акт технической экспертизы и дефектации № "
										className="sanpin-input"
										style={{ minHeight: "32px", fontSize: "0.78rem" }}
									/>
									<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem" }}>
										<button
											type="button"
											onClick={() => void onQuickDecommission(decommissionReason)}
											aria-busy={submitting}
											className="sanpin-btn touch-manipulation"
											style={{
												minHeight: "30px",
												padding: "0.2rem 0.6rem",
												background: "#dc2626",
												color: "#fff",
												fontSize: "0.75rem",
												fontWeight: 700,
												border: "none",
												borderRadius: "4px",
											}}
										>
											Подтвердить списание
										</button>
										<button
											type="button"
											onClick={() => setShowDecommissionConfirm(false)}
											aria-busy={submitting}
											className="sanpin-btn sanpin-btn-secondary touch-manipulation"
											style={{ minHeight: "30px", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
										>
											Отмена
										</button>
									</div>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setShowDecommissionConfirm(true)}
									aria-busy={submitting}
									className="sanpin-btn sanpin-btn-secondary touch-manipulation"
									style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#dc2626" }}
								>
									<Archive size={14} /> Списать с баланса клиники
								</button>
							)
						)}

						{formData.status === "decommissioned" && (
							<button
								type="button"
								onClick={onQuickReturnToService}
								aria-busy={submitting}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								style={{ minHeight: "36px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#2563eb" }}
							>
								<RotateCcw size={14} /> Восстановить аппарат в строй
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
