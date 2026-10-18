import React, { useState } from "react";
import { CheckCircle2, DoorOpen, ShieldCheck, Sparkles } from "lucide-react";
import {
	CabinetHandoverModal,
	DoctorShiftHeroCard,
	formatClockTime as defaultFormatClockTime,
} from "../components/shift";
import { showToast } from "../components/GlobalToast";
import type { ShiftChairStatusCardProps } from "./shiftViewTypes";

export const ShiftViewChairStatusCard: React.FC<ShiftChairStatusCardProps> = ({
	inChairAppointment,
	doctorFullName,
	cabinetName,
	nextDoctorName = "Сменяющий врач",
	currentPatient,
	currentPatientHasCallablePhone = false,
	currentPatientCallablePhone = null,
	currentAppointmentReason = "",
	nextAppointment = null,
	nextAppointmentPatient = null,
	todayAppointmentsCount = 0,
	formatClockTime = defaultFormatClockTime,
	onOpenVisit,
	onOpenImaging,
	onCallPatientError,
	onStartNextAppointment,
	onOpenSchedule,
	onConfirmHandover,
}) => {
	const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);
	const [isHandoverSubmitted, setIsHandoverSubmitted] = useState<boolean>(false);

	const resolvedCabinet =
		cabinetName ||
		inChairAppointment?.cabinetName ||
		inChairAppointment?.room ||
		"Кабинет №1";

	const handleInstantHandover = () => {
		setIsHandoverSubmitted(true);
		onConfirmHandover?.();
		showToast(
			`Кабинет «${resolvedCabinet}» передан следующей смене (${nextDoctorName}). Журнал СанПиН и акт списания обновлены автоматически.`,
			"info",
		);
	};

	const handleModalHandoverConfirm = (notes?: string) => {
		setIsHandoverSubmitted(true);
		onConfirmHandover?.(notes);
	};

	return (
		<div className="shift-chair-status-card-container space-y-4" data-testid="shift-chair-status-card">
			{/* Карточка пациента в кресле и следующего визита */}
			<DoctorShiftHeroCard
				currentPatient={currentPatient}
				currentPatientHasCallablePhone={currentPatientHasCallablePhone}
				currentPatientCallablePhone={currentPatientCallablePhone || ""}
				currentAppointmentReason={currentAppointmentReason}
				nextAppointment={nextAppointment}
				nextAppointmentPatient={nextAppointmentPatient}
				todayAppointmentsCount={todayAppointmentsCount}
				formatClockTime={(value: unknown) => formatClockTime(typeof value === "string" ? value : undefined)}
				onOpenVisit={(patientId) => {
					onOpenVisit?.(patientId);
				}}
				onOpenImaging={(patientId) => {
					onOpenImaging?.(patientId);
				}}
				onCallPatientError={(msg) => {
					onCallPatientError?.(msg);
				}}
				onStartNextAppointment={(patientId) => {
					onStartNextAppointment?.(patientId);
				}}
				onOpenSchedule={() => {
					onOpenSchedule?.();
				}}
			/>

			{/* Лаконичная передача кабинета в 1 клик (Мандаты 8e и 8n: ноль бытовых чекбоксов) */}
			<section
				className="cabinet-handover-bar"
				aria-label="Передача кабинета и смены"
				data-testid="cabinet-handover-bar"
				style={{
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: "14px",
					padding: "14px 18px",
					boxShadow: "var(--shadow-1)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "14px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 320px" }}>
					<div
						style={{
							width: "38px",
							height: "38px",
							borderRadius: "10px",
							background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
							color: "var(--teal-dark, #0f766e)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						{isHandoverSubmitted ? (
							<CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
						) : (
							<DoorOpen size={20} aria-hidden="true" />
						)}
					</div>
					<div style={{ minWidth: 0 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
							<h3
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								Передача кабинета и смены
							</h3>
							<span
								className={`status-pill ${isHandoverSubmitted ? "status-in_treatment" : "status-pending"}`}
								style={{
									fontSize: "11px",
									fontWeight: 700,
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<ShieldCheck size={12} aria-hidden="true" />
								{isHandoverSubmitted ? "Кабинет сдан ✓" : "Готов к передаче"}
							</span>
						</div>
						<p
							style={{
								margin: "3px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								lineHeight: 1.35,
							}}
						>
							{resolvedCabinet} · Врач: {doctorFullName} → Сменяющий: {nextDoctorName}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					{isHandoverSubmitted ? (
						<button
							type="button"
							onClick={() => setIsHandoverModalOpen(true)}
							className="secondary-button"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								padding: "0 14px",
								minHeight: "38px",
								height: "38px",
								borderRadius: "8px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
							}}
							data-testid="btn-cabinet-handover-details"
						>
							<Sparkles size={14} aria-hidden="true" />
							<span>Детали передачи</span>
						</button>
					) : (
						<>
							<button
								type="button"
								onClick={handleInstantHandover}
								className="primary-button"
								style={{
									fontSize: "13px",
									fontWeight: 700,
									padding: "0 16px",
									minHeight: "38px",
									height: "38px",
									borderRadius: "8px",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									cursor: "pointer",
								}}
								title="Сдать кабинет и передать смену в 1 клик без бытовых чекбоксов"
								data-testid="btn-cabinet-handover-instant"
							>
								<DoorOpen size={15} aria-hidden="true" />
								<span>Сдать кабинет в 1 клик</span>
							</button>

							<button
								type="button"
								onClick={() => setIsHandoverModalOpen(true)}
								className="secondary-button"
								style={{
									fontSize: "13px",
									fontWeight: 600,
									padding: "0 12px",
									minHeight: "38px",
									height: "38px",
									borderRadius: "8px",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									cursor: "pointer",
								}}
								title="Открыть окно передачи смены с примечанием сменщику"
								data-testid="btn-open-cabinet-handover-modal"
							>
								<span>С примечанием...</span>
							</button>
						</>
					)}
				</div>
			</section>

			{/* 1-Click Handover Modal (Mandates 8e & 8n) */}
			<CabinetHandoverModal
				isOpen={isHandoverModalOpen}
				onClose={() => setIsHandoverModalOpen(false)}
				cabinetName={resolvedCabinet}
				doctorFullName={doctorFullName}
				nextDoctorName={nextDoctorName}
				onConfirmHandover={handleModalHandoverConfirm}
			/>
		</div>
	);
};
