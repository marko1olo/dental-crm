/**
 * Контейнер состояний подбора кандидатов листа ожидания (загрузка, ошибки, пустые состояния).
 */
import { Zap } from "lucide-react";
import React from "react";
import { EmptyState } from "../../EmptyState";
import { WaitlistCandidatesList } from "./WaitlistCandidatesList";
import { WaitlistHeaderAndFilter } from "./WaitlistHeaderAndFilter";
import type { WaitlistMatchReport, WaitlistMatchRow } from "./waitlistTypes";

export type WaitlistBlockContainerProps = {
	appointmentId: string;
	compact: boolean;
	lazy: boolean;
	lazyLabel: string;
	started: boolean;
	loading: boolean;
	error: string | null;
	report: WaitlistMatchReport | null;
	called: Set<string>;
	contactedPatients: Set<string>;
	bookingId: string | null;
	activeMenuEntryId: string | null;
	setActiveMenuEntryId: (id: string | null) => void;
	onLoad: () => void;
	onTakeSlot: (match: WaitlistMatchRow) => void;
	onSendWhatsApp: (match: WaitlistMatchRow) => void;
	onCopySms: (match: WaitlistMatchRow) => void;
	onToggleCalled: (patientId: string) => void;
};

export const WaitlistBlockContainer: React.FC<WaitlistBlockContainerProps> = ({
	appointmentId,
	compact,
	lazy,
	lazyLabel,
	started,
	loading,
	error,
	report,
	called,
	contactedPatients,
	bookingId,
	activeMenuEntryId,
	setActiveMenuEntryId,
	onLoad,
	onTakeSlot,
	onSendWhatsApp,
	onCopySms,
	onToggleCalled,
}) => {
	if (lazy && !started) {
		return (
			<div className="waitlist-matches-block" data-testid="waitlist-matches-lazy">
				<button type="button" className="link-button" data-testid="waitlist-matches-load-btn" onClick={onLoad}>
					{lazyLabel}
				</button>
			</div>
		);
	}

	const shellClass = compact ? "waitlist-matches-block waitlist-matches-block--compact" : "waitlist-matches-block panel ops-panel";
	const matchesCount = (report?.matches ?? []).length;

	return (
		<section className={shellClass} data-testid="waitlist-matches-block" data-appointment-id={appointmentId} aria-label="Подбор кандидатов из листа ожидания">
			<WaitlistHeaderAndFilter compact={compact} loading={loading} report={report} onRefresh={onLoad} />

			{error && (
				<div className="ops-notice ops-notice--error mb-2" role="alert" data-testid="waitlist-matches-error">
					<p className="m-0 text-xs">{error}</p>
					<button className="secondary-button mt-1.5 min-h-[36px] pointer-coarse:min-h-[44px]" type="button" onClick={onLoad} aria-busy={loading || undefined}>
						{loading ? "Загружаю…" : "Попробовать снова"}
					</button>
				</div>
			)}

			{loading && !report && !error && (
				<p className="ops-note text-xs m-1" data-testid="waitlist-matches-loading">
					Подбираем кандидатов из листа ожидания…
				</p>
			)}

			{report && matchesCount === 0 && !error && (
				compact ? (
					<p className="ops-note text-xs m-1 text-[var(--muted)]" data-testid="waitlist-matches-empty">
						В листе ожидания подходящих нет{(report?.examinedEntries ?? 0) > 0 ? ` (проверено ${report.examinedEntries})` : ", очередь пуста"}. Окно можно занять другим приёмом.
					</p>
				) : (
					<EmptyState
						icon={<Zap size={28} />}
						title="В листе ожидания подходящих нет"
						description={(report?.examinedEntries ?? 0) > 0 ? `Проверено ${report.examinedEntries} заявок в очереди. Окно свободно для записи.` : "Лист ожидания пуст. Окно свободно для записи."}
						glass={false}
					/>
				)
			)}

			{report && matchesCount > 0 && (
				<WaitlistCandidatesList
					report={report}
					called={called}
					contactedPatients={contactedPatients}
					bookingId={bookingId}
					activeMenuEntryId={activeMenuEntryId}
					setActiveMenuEntryId={setActiveMenuEntryId}
					onTakeSlot={onTakeSlot}
					onSendWhatsApp={onSendWhatsApp}
					onCopySms={onCopySms}
					onToggleCalled={onToggleCalled}
				/>
			)}

			{report?.note && !compact && <p className="ops-hint text-xs mt-2 text-[var(--muted)]">{report.note}</p>}
		</section>
	);
};
