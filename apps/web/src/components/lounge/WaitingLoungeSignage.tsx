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
	clinicName,
	initialItems,
	onExit,
	onClose,
}: WaitingLoungeSignageProps) {
	const {
		currentTime, isFullscreen, isSoundEnabled,
		setIsSoundEnabled, toggleFullscreen, queueItems,
		clinicDisplayName, clinicDisplayPhone, clinicWifiName,
		connectionError, requiresAuth,
	} = useLoungeQueueState(initialItems);

	const effectiveClinicName = clinicDisplayName || clinicName || "Стоматологическая клиника";

	const handleExit = () => {
		if (onExit) onExit();
		else if (onClose) onClose();
		else if (typeof window !== "undefined") window.location.hash = "#schedule";
	};

	return (
		<div className="lounge-signage-root" data-testid="waiting-lounge-signage">
			<div className="lounge-bg-container" aria-hidden="true">
				<div className="lounge-bg-scrim" />
			</div>

			<LoungeHeader
				clinicName={effectiveClinicName}
				isSoundEnabled={isSoundEnabled}
				isFullscreen={isFullscreen}
				onToggleSound={() => setIsSoundEnabled((prev) => !prev)}
				onToggleFullscreen={toggleFullscreen}
				onExit={handleExit}
			/>

			<main className="lounge-main-grid">
				<LoungeClockCard currentTime={currentTime} wifiName={clinicWifiName} />

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
						{requiresAuth ? (
							<div
								className="lounge-empty-queue py-12 px-6 flex flex-col items-center justify-center text-center gap-3 text-[var(--ink-muted)]"
								data-testid="lounge-auth-required"
							>
								<Calendar className="w-10 h-10 opacity-60 shrink-0" aria-hidden="true" />
								<div className="text-base font-semibold text-[var(--ink)]">
									Требуется авторизация терминала зоны ожидания
								</div>
								<div className="text-sm text-[var(--ink-muted)]">
									Войдите в кабинет администратора клиники, чтобы синхронизировать живую очередь приёма
								</div>
							</div>
						) : connectionError && queueItems.length === 0 ? (
							<div
								className="lounge-empty-queue py-12 px-6 flex flex-col items-center justify-center text-center gap-3 text-[var(--ink-muted)]"
								data-testid="lounge-connection-error"
							>
								<Calendar className="w-10 h-10 opacity-60 shrink-0" aria-hidden="true" />
								<div className="text-base font-semibold text-[var(--ink)]">{connectionError}</div>
								<div className="text-sm text-[var(--ink-muted)]">
									Повторное подключение выполняется автоматически каждые 15 секунд
								</div>
							</div>
						) : queueItems.length === 0 ? (
							<div
								className="lounge-empty-queue py-12 px-6 flex flex-col items-center justify-center text-center gap-3 text-[var(--ink-muted)]"
								data-testid="lounge-empty-queue"
							>
								<Calendar className="w-10 h-10 opacity-60 shrink-0" aria-hidden="true" />
								<div className="text-base font-semibold text-[var(--ink)]">
									В данный момент приём завершён или ожидающих пациентов нет
								</div>
								<div className="text-sm text-[var(--ink-muted)]">
									Информация о следующих приёмах появится здесь автоматически
								</div>
							</div>
						) : (
							queueItems.map((item) => <BillboardCabinetRow key={item.id} item={item} />)
						)}
					</div>
				</section>
			</main>

			<footer className="lounge-footer lounge-glass-card">
				<div className="lounge-footer-ticker">
					<span className="lounge-footer-accent">{effectiveClinicName}:</span>
					<span>Забота о вашей улыбке • При вопросах обратитесь к администратору на ресепшен</span>
				</div>
				{clinicDisplayPhone ? (
					<div className="lounge-footer-contacts">
						<span>Тел.: {clinicDisplayPhone}</span>
					</div>
				) : null}
			</footer>
		</div>
	);
}

export default WaitingLoungeSignage;
