import React from "react";
import { ClipboardList, Clock, Stethoscope } from "lucide-react";

interface CopilotDrawerPlaybooksProps {
	onSendPrompt: (prompt: string) => void;
}

export const CopilotDrawerPlaybooks: React.FC<CopilotDrawerPlaybooksProps> = ({
	onSendPrompt,
}) => {
	return (
		<div className="copilot-playbooks-strip" data-testid="copilot-playbooks-strip">
			<span className="copilot-playbooks-label">Сценарии:</span>
			<button
				type="button"
				onClick={() =>
					onSendPrompt(
						"Проведи утренний брифинг: долги смены, ключевые пациенты и загрузка кабинетов",
					)
				}
				className="copilot-playbook-chip"
				data-testid="playbook-morning-briefing"
			>
				<ClipboardList size={14} className="shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<span>Утренний брифинг</span>
			</button>
			<button
				type="button"
				onClick={() =>
					onSendPrompt(
						"Подготовь визит ближайшего пациента: анамнез, аллергии, предыдущие манипуляции",
					)
				}
				className="copilot-playbook-chip"
				data-testid="playbook-prepare-visit"
			>
				<Stethoscope size={14} className="shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<span>Подготовить визит</span>
			</button>
			<button
				type="button"
				onClick={() =>
					onSendPrompt(
						"Найди пациентов из листа ожидания и рекаллов, чтобы заполнить свободные окна в расписании",
					)
				}
				className="copilot-playbook-chip"
				data-testid="playbook-fill-gap"
			>
				<Clock size={14} className="shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<span>Заполнить окно в расписании</span>
			</button>
		</div>
	);
};
