import React from "react";
import { useState } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Send,
	Sparkles,
	Stethoscope,
	User,
	X,
} from "lucide-react";

export interface BookingSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly curatingDoctor?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly onBookAppointment?: (req: {
		specialty: string;
		preferredDate: string;
		note: string;
		doctorName?: string;
	}) => void;
	readonly onShowToast?: (msg: string) => void;
	readonly data?: any;
	readonly onSubmit?: (req: any) => void;
}

const AVAILABLE_SPECIALTIES = [
	{ id: "consult", title: "Консультация и осмотр", durationRu: "30 мин", isFree: true },
	{ id: "hygiene", title: "Профгигиена и AirFlow", durationRu: "45 мин", isFree: false },
	{ id: "caries", title: "Лечение зуба / Острая боль", durationRu: "60 мин", isFree: false },
	{ id: "ortho", title: "Ортодонтия (брекеты/элайнеры)", durationRu: "30 мин", isFree: false },
	{ id: "surgery", title: "Консультация хирурга / Имплантация", durationRu: "45 мин", isFree: false },
];

const QUICK_TIME_SLOTS = ["10:00", "11:30", "14:00", "16:00", "17:30", "19:00"];

export const BookingSheet: React.FC<BookingSheetProps> = ({
	isOpen,
	onClose,
	curatingDoctor,
	patientName,
	patientPhone,
	onBookAppointment,
	onShowToast,
	data,
	onSubmit,
}) => {
	const [selectedSpecialty, setSelectedSpecialty] = useState(AVAILABLE_SPECIALTIES[0]?.title || "Консультация");
	const [selectedDoctorMode, setSelectedDoctorMode] = useState<"curator" | "any">("curator");
	const [selectedDate, setSelectedDate] = useState(() => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().slice(0, 10);
	});
	const [selectedTime, setSelectedTime] = useState("11:30");
	const [patientComment, setPatientComment] = useState("");

	if (!isOpen) return null;

	const resolvedDoctor = curatingDoctor || data?.curatingDoctor || "Лечащий врач";
	const chosenDoctor = selectedDoctorMode === "curator" ? resolvedDoctor : "Дежурный врач (ближайшее окно)";
	const resolvedName = patientName || data?.fullName || "Пациент";
	const resolvedPhone = patientPhone || data?.phone || "";

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (onBookAppointment) {
			onBookAppointment({
				specialty: selectedSpecialty,
				preferredDate: `${selectedDate} ${selectedTime}`,
				doctorName: chosenDoctor,
				note: patientComment
					? `${selectedSpecialty}. Пожелания: ${patientComment}`
					: selectedSpecialty,
			});
		} else if (onSubmit) {
			onSubmit({
				goalId: selectedSpecialty,
				doctorId: chosenDoctor,
				date: selectedDate,
				time: selectedTime,
				comment: patientComment,
			});
		}
		onShowToast?.(`Запись оформлена на ${selectedDate} в ${selectedTime}!`);
		onClose();
	};

	return (
		<div
			className="pc-sheet-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Онлайн-запись на приём"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: "540px", maxHeight: "90vh", overflowY: "auto" }}
				data-testid="patient-booking-sheet"
			>
				{/* Top Drag Handle */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				{/* Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Calendar size={20} style={{ color: "var(--pc-primary)" }} />
						<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
							Онлайн-запись на приём
						</h3>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<p style={{ margin: "0 0 10px 0", fontSize: "0.8125rem", color: "var(--pc-text-muted)", lineHeight: 1.4 }}>
					1-тап выбор времени. Ваши данные ({resolvedName}{resolvedPhone ? `, ${resolvedPhone}` : ""}) уже подтверждены в личном кабинете.
				</p>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
					{/* 1. Выбор услуги / причины визита */}
					<div>
						<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "6px" }}>
							Цель визита:
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "6px" }}>
							{AVAILABLE_SPECIALTIES.map((spec) => {
								const isSelected = selectedSpecialty === spec.title;
								return (
									<button
										key={spec.id}
										type="button"
										onClick={() => setSelectedSpecialty(spec.title)}
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											padding: "8px 10px",
											borderRadius: "var(--pc-radius-sm)",
											border: isSelected ? "2px solid var(--pc-primary)" : "1px solid var(--pc-border)",
											background: isSelected ? "var(--pc-primary-light)" : "var(--pc-surface)",
											color: isSelected ? "var(--pc-primary)" : "var(--pc-text-main)",
											cursor: "pointer",
											textAlign: "left",
											transition: "all 0.15s ease",
											minHeight: "40px",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
											<Stethoscope size={15} style={{ color: isSelected ? "var(--pc-primary)" : "var(--pc-text-muted)", flexShrink: 0 }} />
											<span style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
												{spec.title}
											</span>
										</div>
										<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
											<span style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>
												{spec.durationRu}
											</span>
											{isSelected && <Check size={14} />}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* 2. Выбор врача */}
					<div>
						<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "6px" }}>
							Лечащий специалист:
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
							<button
								type="button"
								onClick={() => setSelectedDoctorMode("curator")}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "2px",
									padding: "10px",
									borderRadius: "var(--pc-radius-sm)",
									border: selectedDoctorMode === "curator" ? "2px solid var(--pc-primary)" : "1px solid var(--pc-border)",
									background: selectedDoctorMode === "curator" ? "var(--pc-primary-light)" : "var(--pc-surface)",
									color: "var(--pc-text-main)",
									cursor: "pointer",
									textAlign: "left",
									minHeight: "48px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<User size={15} style={{ color: "var(--pc-primary)" }} />
									<strong style={{ fontSize: "0.8125rem" }}>{curatingDoctor}</strong>
								</div>
								<span style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>Ваш лечащий врач</span>
							</button>

							<button
								type="button"
								onClick={() => setSelectedDoctorMode("any")}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "2px",
									padding: "10px",
									borderRadius: "var(--pc-radius-sm)",
									border: selectedDoctorMode === "any" ? "2px solid var(--pc-primary)" : "1px solid var(--pc-border)",
									background: selectedDoctorMode === "any" ? "var(--pc-primary-light)" : "var(--pc-surface)",
									color: "var(--pc-text-main)",
									cursor: "pointer",
									textAlign: "left",
									minHeight: "48px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<Sparkles size={15} style={{ color: "var(--pc-primary)" }} />
									<strong style={{ fontSize: "0.8125rem" }}>Любой врач</strong>
								</div>
								<span style={{ fontSize: "0.75rem", color: "var(--pc-text-muted)" }}>Ближайшее окно</span>
							</button>
						</div>
					</div>

					{/* 3. Выбор даты и слота времени */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
							<label htmlFor="booking-date-input" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)" }}>
								Дата приёма:
							</label>
							<span style={{ fontSize: "0.75rem", color: "var(--pc-primary)", fontWeight: 700 }}>
								Свободные окна обновлены
							</span>
						</div>
						<input
							id="booking-date-input"
							type="date"
							value={selectedDate}
							min={new Date().toISOString().slice(0, 10)}
							onChange={(e) => setSelectedDate(e.target.value)}
							required
							style={{
								width: "100%",
								borderRadius: "var(--pc-radius-sm)",
								border: "1px solid var(--pc-border)",
								background: "var(--pc-surface)",
								color: "var(--pc-text-main)",
								padding: "8px 12px",
								fontSize: "0.875rem",
								boxSizing: "border-box",
								minHeight: "44px",
							}}
						/>
					</div>

					<div>
						<label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "6px" }}>
							Время начала приёма:
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
							{QUICK_TIME_SLOTS.map((slot) => {
								const isSelected = selectedTime === slot;
								return (
									<button
										key={slot}
										type="button"
										onClick={() => setSelectedTime(slot)}
										style={{
											minHeight: "40px",
											borderRadius: "var(--pc-radius-sm)",
											border: isSelected ? "2px solid var(--pc-primary)" : "1px solid var(--pc-border)",
											background: isSelected ? "var(--pc-primary)" : "var(--pc-surface)",
											color: isSelected ? "#ffffff" : "var(--pc-text-main)",
											fontWeight: isSelected ? 800 : 600,
											fontSize: "0.875rem",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "4px",
											cursor: "pointer",
											transition: "all 0.15s ease",
										}}
									>
										<Clock size={13} />
										<span>{slot}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 4. Пожелания (опционально) */}
					<div>
						<label htmlFor="booking-comment" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
							Комментарий или жалобы (необязательно):
						</label>
						<input
							id="booking-comment"
							type="text"
							value={patientComment}
							onChange={(e) => setPatientComment(e.target.value)}
							placeholder="Например: беспокоит зуб справа внизу при холодном"
							style={{
								width: "100%",
								borderRadius: "var(--pc-radius-sm)",
								border: "1px solid var(--pc-border)",
								background: "var(--pc-surface)",
								color: "var(--pc-text-main)",
								padding: "8px 12px",
								fontSize: "0.875rem",
								boxSizing: "border-box",
							}}
						/>
					</div>

					{/* 5. Кнопки действий (Sticky footer) */}
					<div style={{
						display: "flex",
						gap: "8px",
						marginTop: "4px",
						position: "sticky",
						bottom: "-20px",
						background: "var(--pc-bg)",
						paddingTop: "10px",
						paddingBottom: "10px",
						borderTop: "1px solid var(--pc-border)",
						zIndex: 10,
					}}>
						<button
							type="button"
							className="pc-btn-secondary"
							onClick={onClose}
							style={{ flex: 1, minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="pc-btn-primary"
							style={{ flex: 2, minHeight: "44px" }}
							data-testid="confirm-booking-1tap-btn"
						>
							<CheckCircle2 size={16} />
							<span>Записаться на {selectedTime}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default BookingSheet;
