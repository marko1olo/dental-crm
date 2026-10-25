import React from "react";
import { Calendar } from "lucide-react";
import { useLoungeQueueState } from "./useLoungeQueueState";
import { LoungeHeader } from "./LoungeHeader";
import { LoungeClockCard } from "./LoungeClockCard";
import { BillboardCabinetRow } from "./BillboardCabinetRow";
import type { WaitingLoungeQueueItem, WaitingLoungeSignageProps } from "./loungeTypes";
import "./waitingLoungeSignage.css";

export type { WaitingLoungeQueueItem, WaitingLoungeSignageProps };

export function WaitingLoungeSignage({
	clinicName = "DENTE CLINIC",
	initialItems,
	onExit,
}: WaitingLoungeSignageProps) {
	const {
		currentTime, isFullscreen, isSoundEnabled,
		setIsSoundEnabled, toggleFullscreen, queueItems,
	} = useLoungeQueueState(initialItems);

	const handleExit = () => {
		if (onExit) onExit();
		else if (typeof window !== "undefined") window.location.hash = "#schedule";
	};

	return (
		<div className="lounge-signage-root" data-testid="waiting-lounge-signage">
			<div className="lounge-bg-container" aria-hidden="true">
				<div className="lounge-bg-scrim" />
			</div>

			<LoungeHeader
				clinicName={clinicName}
				isSoundEnabled={isSoundEnabled}
				isFullscreen={isFullscreen}
				onToggleSound={() => setIsSoundEnabled((prev) => !prev)}
				onToggleFullscreen={toggleFullscreen}
				onExit={handleExit}
			/>

			<main className="lounge-main-grid">
				<LoungeClockCard currentTime={currentTime} />

				<section className="lounge-queue-card lounge-glass-card" aria-label="Электронная очередь вызова">
					<div className="lounge-queue-header">
						<div className="lounge-queue-title-wrap">
							<h2 className="lounge-queue-title"><span>Электронная очередь вызова</span></h2>
							<p className="lounge-queue-subtitle">Проходите в кабинет при приглашении на табло</p>
						</div>
						<div className="lounge-queue-counter-pill">
							<span>Кабинетов на табло: {queueItems.length}</span>
						</div>
					</div>

					<div className="lounge-queue-list">
						{queueItems.length === 0 ? (
							<div className="lounge-empty-queue" data-testid="lounge-empty-queue" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", gap: "12px", color: "var(--muted, #94a3b8)" }}>
								<Calendar size={36} style={{ opacity: 0.5 }} />
								<div style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink, #f1f5f9)" }}>В данный момент приём завершён или ожидающих пациентов нет</div>
								<div style={{ fontSize: "13px" }}>Информация о следующих приёмах появится здесь автоматически</div>
							</div>
						) : (
							queueItems.map((item) => <BillboardCabinetRow key={item.id} item={item} />)
						)}
					</div>
				</section>
			</main>

			<footer className="lounge-footer lounge-glass-card">
				<div className="lounge-footer-ticker">
					<span className="lounge-footer-accent">Стоматологическая клиника DENTE:</span>
					<span>Забота о вашей улыбке • При вопросах обратитесь к администратору на ресепшен</span>
				</div>
				<div className="lounge-footer-contacts">
					<span>Тел.: +7 (495) 000-00-00</span>
				</div>
			</footer>
		</div>
	);
}

export default WaitingLoungeSignage;
