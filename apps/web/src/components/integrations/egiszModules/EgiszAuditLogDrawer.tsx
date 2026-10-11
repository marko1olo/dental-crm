import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileText,
	RefreshCcw,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { EgiszAuditLogItem } from "./egiszWidgetTypes";

export interface EgiszAuditLogDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

const DEMO_AUDIT_LOGS: readonly EgiszAuditLogItem[] = [
	{
		id: "log-1",
		timestamp: "12.10.2026 14:30",
		formTitle: "Медицинская карта стоматологического больного (043/у)",
		patientName: "Смирнов Алексей Петрович",
		doctorName: "Кузнецова А. С.",
		status: "Registered",
		regNumber: "РЭМД-77-2026-88A41BC9",
	},
	{
		id: "log-2",
		timestamp: "12.10.2026 11:15",
		formTitle: "Протокол консультации и осмотра (СЭМД-101)",
		patientName: "Волкова Мария Ивановна",
		doctorName: "Кузнецова А. С.",
		status: "Registered",
		regNumber: "РЭМД-77-2026-72D19FE2",
	},
	{
		id: "log-3",
		timestamp: "11.10.2026 17:40",
		formTitle: "Протокол КЛКТ 3D и рентген-снимков (СЭМД-103)",
		patientName: "Николаев Дмитрий Сергеевич",
		doctorName: "Соколов П. В.",
		status: "Pending",
		regNumber: "РЭМД-77-2026-44B081A0",
	},
	{
		id: "log-4",
		timestamp: "10.10.2026 16:05",
		formTitle: "Медицинская карта стоматологического больного (043/у)",
		patientName: "Козлов Иван Михайлович",
		doctorName: "Кузнецова А. С.",
		status: "Error",
		flkError: "FLK-001: Некорректный СНИЛС пациента (ошибка контрольной суммы)",
	},
];

export const EgiszAuditLogDrawer: React.FC<EgiszAuditLogDrawerProps> = ({
	isOpen,
	onClose,
}) => {
	const [logs] = useState<readonly EgiszAuditLogItem[]>(DEMO_AUDIT_LOGS);
	const [selectedLog, setSelectedLog] = useState<EgiszAuditLogItem | null>(null);

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			window.addEventListener("keydown", handleEsc);
		}
		return () => window.removeEventListener("keydown", handleEsc);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			data-testid="egisz-audit-log-drawer"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				display: "flex",
				justifyContent: "flex-end",
				background: "rgba(0, 0, 0, 0.45)",
				backdropFilter: "blur(4px)",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					width: "100%",
					maxWidth: 540,
					height: "100%",
					background: "var(--paper-card, var(--paper, #ffffff))",
					borderLeft: "1px solid var(--line)",
					display: "flex",
					flexDirection: "column",
					boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)",
				}}
			>
				{/* Шапка шторки */}
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<FileText size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
						<h3
							style={{
								margin: 0,
								fontSize: 15,
								fontWeight: 700,
								color: "var(--ink)",
							}}
						>
							Журнал выгрузки в РЭМД ЕГИСЗ
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							minWidth: 44,
							minHeight: 44,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							background: "transparent",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
							borderRadius: 8,
						}}
						aria-label="Закрыть журнал"
					>
						<X size={20} />
					</button>
				</div>

				{/* Список квитанций */}
				<div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
					<p style={{ margin: "0 0 12px 0", fontSize: 12, color: "var(--muted)" }}>
						История отправленных электронных медицинских документов (СЭМД) и квитанций форматно-логического контроля.
					</p>

					<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
						{logs.map((item) => {
							const isSuccess = item.status === "Registered";
							const isPending = item.status === "Pending";
							const isError = item.status === "Error";

							return (
								<div
									key={item.id}
									style={{
										padding: "12px 14px",
										borderRadius: 10,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										display: "flex",
										flexDirection: "column",
										gap: 6,
									}}
								>
									<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
										<div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
											{item.formTitle}
										</div>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												fontSize: 11,
												fontWeight: 600,
												padding: "2px 8px",
												borderRadius: 6,
												border: "1px solid var(--line)",
												background: isSuccess
													? "rgba(13, 148, 136, 0.1)"
													: isError
														? "rgba(225, 29, 72, 0.1)"
														: "rgba(100, 116, 139, 0.1)",
												color: isSuccess
													? "var(--teal, #0d9488)"
													: isError
														? "#e11d48"
														: "var(--muted)",
												flexShrink: 0,
											}}
										>
											{isSuccess && <CheckCircle2 size={12} />}
											{isPending && <Clock size={12} />}
											{isError && <AlertCircle size={12} />}
											{isSuccess ? "Зарегистрирован" : isPending ? "В очереди" : "Ошибка ФЛК"}
										</span>
									</div>

									<div style={{ fontSize: 12, color: "var(--ink-secondary, var(--ink))" }}>
										Пациент: <strong>{item.patientName}</strong> · Врач: {item.doctorName}
									</div>

									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
										<span>{item.timestamp}</span>
										{item.regNumber && (
											<span style={{ fontFamily: "monospace", fontWeight: 600 }}>
												{item.regNumber}
											</span>
										)}
									</div>

									{item.flkError && (
										<div
											style={{
												marginTop: 6,
												padding: "6px 10px",
												borderRadius: 6,
												background: "rgba(225, 29, 72, 0.08)",
												border: "1px solid rgba(225, 29, 72, 0.2)",
												fontSize: 11,
												color: "#be123c",
											}}
										>
											{item.flkError}
										</div>
									)}

									{isError && (
										<button
											type="button"
											onClick={() => {
												showToast("Повторная отправка пакета СЭМД в ЕГИСЗ инициирована", "info");
											}}
											style={{
												marginTop: 6,
												alignSelf: "flex-start",
												height: 28,
												padding: "0 10px",
												borderRadius: 6,
												border: "1px solid var(--line)",
												background: "var(--paper)",
												fontSize: 11,
												fontWeight: 600,
												color: "var(--ink)",
												cursor: "pointer",
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
											}}
										>
											<RefreshCcw size={11} />
											Повторить отправку
										</button>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Подвал */}
				<div
					style={{
						padding: "12px 20px",
						borderTop: "1px solid var(--line)",
						display: "flex",
						justifyContent: "flex-end",
					}}
				>
					<button
						type="button"
						onClick={onClose}
						style={{
							height: 34,
							padding: "0 16px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: 12,
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
