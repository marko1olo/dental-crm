import { MessageSquare, PhoneOutgoing } from "lucide-react";
import type React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import { countLabel } from "../../lib/russianPlural";
import { CommunicationTimelineItem } from "./timeline/CommunicationTimelineItem";
import {
	COMMUNICATIONS_SECTION_TITLE,
	asLog,
	countFromServer,
	formatDay,
	formatMoment,
} from "./timeline/timelineConstants";

export const PatientCommunicationTimelineWidget: React.FC<{
	patientId: string;
}> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const {
		data: payload,
		isLoading: loading,
		error,
	} = usePatientResource<unknown>(
		patientId,
		(id) => `/api/patients/${id}/communication-timelines`,
		() => (auth ? auth.denteClinicalReadHeaders() : {}),
		null,
	);

	const log = asLog(payload);
	const entries = log?.entries ?? [];
	const periodStart = formatDay(log?.firstEventAt ?? null);
	const periodEnd = formatDay(log?.lastEventAt ?? null);
	const needsCallCount = countFromServer(log?.needsCallCount);
	const lastNeedsCall = formatMoment(log?.lastNeedsCallAt ?? null);
	const total = countFromServer(log?.totalEvents);

	return (
		<div
			data-testid="patient-communication-timeline-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
		>
			<div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center space-x-2">
					<MessageSquare className="w-5 h-5 text-[var(--teal)]" aria-hidden="true" />
					<h3 className="font-semibold text-sm text-[var(--ink)]">Звонки и сообщения</h3>
				</div>
				{!loading && !error && total > 0 && periodStart && periodEnd ? (
					<span className="text-xs text-[var(--muted)]">
						{countLabel(total, "обращение", "обращения", "обращений")} с {periodStart} по {periodEnd}
					</span>
				) : null}
			</div>

			{loading ? (
				<div className="text-xs py-3 text-slate-500 dark:text-slate-400">Загрузка звонков и сообщений...</div>
			) : error ? (
				<div role="alert" className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800">
					Журнал не загружен: {error} Это не значит, что общения с пациентом не было.
				</div>
			) : !log ? (
				<div role="alert" className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800">
					Журнал не прочитан: сервер ответил в неизвестном виде.
				</div>
			) : (
				<>
					{needsCallCount > 0 ? (
						<div className="mb-3 p-3 rounded-lg border flex items-start gap-2 text-xs bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">
							<PhoneOutgoing className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
							<span>
								Машина отправить не смогла: {countLabel(needsCallCount, "обращение ждёт", "обращения ждут", "обращений ждут")} звонка руками
								{lastNeedsCall ? `, последнее — ${lastNeedsCall}` : ""}. Позвоните пациенту и закройте задачу в разделе «{COMMUNICATIONS_SECTION_TITLE}».
							</span>
						</div>
					) : null}

					{entries.length === 0 ? (
						<div className="p-4 rounded-lg border border-dashed border-[var(--glass-border)] text-xs bg-[var(--paper-soft)] text-[var(--muted)]">
							Обращений через систему не записано. Здесь появляются SMS, сообщения в Telegram, WhatsApp, ВКонтакте и MAX, письма и звонки, прошедшие через клинику.
						</div>
					) : (
						<>
							<ul className="space-y-2 list-none p-0 m-0">
								{entries.map((entry) => (
									<CommunicationTimelineItem key={entry.id} entry={entry} />
								))}
							</ul>
							{log.truncated ? (
								<p className="mt-2 mb-0 text-xs text-[var(--muted)]">
									Показаны не все обращения: {entries.length} из {total}. Полная переписка — в разделе «{COMMUNICATIONS_SECTION_TITLE}».
								</p>
							) : null}
						</>
					)}
				</>
			)}
		</div>
	);
};
