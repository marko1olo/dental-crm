/**
 * VoiceModalCommandList.tsx — Список распознанных клинических команд со статусами доверия.
 * Строго <= 120 строк по Мандату 8b.
 */

import { Activity, Check, Trash2 } from "lucide-react";
import type { ClinicalVoiceParseResult, ParsedClinicalVoiceCommand } from "./voiceModalTypes";

interface VoiceModalCommandListProps {
	parseResult: ClinicalVoiceParseResult | null;
	appliedCommandIds: Set<string>;
	onApplyCommand: (cmd: ParsedClinicalVoiceCommand) => void;
	onDeleteCommand: (cmdId: string) => void;
}

export function VoiceModalCommandList({
	parseResult,
	appliedCommandIds,
	onApplyCommand,
	onDeleteCommand,
}: VoiceModalCommandListProps) {
	if (!parseResult || parseResult.commands.length === 0) return null;

	return (
		<div className="dnt-voice-commands-section">
			<div className="dnt-voice-section-header">
				<div className="dnt-voice-section-title">
					<Activity size={18} />
					<span>Распознанные клинические команды ({parseResult.commands.length})</span>
				</div>
				{parseResult.summary && (
					<span style={{ fontSize: "13px", color: "var(--muted)" }}>
						{parseResult.summary}
					</span>
				)}
			</div>

			<div className="dnt-voice-command-chips-list">
				{parseResult.commands.map((cmd) => {
					const isApplied = appliedCommandIds.has(cmd.id);
					return (
						<div
							key={cmd.id}
							className={`dnt-voice-chip-card dnt-voice-chip-card--${cmd.confidenceLevel} ${isApplied ? "dnt-voice-chip-card--applied" : ""}`}
						>
							<div className="dnt-voice-chip-info">
								<div className="dnt-voice-chip-meta">
									{cmd.toothNumber && (
										<span className="dnt-voice-badge dnt-voice-badge--tooth">
											Зуб {cmd.toothNumber}
										</span>
									)}
									<span className={`dnt-voice-badge dnt-voice-badge--${cmd.confidenceLevel}`}>
										{cmd.confidenceLevel === "high" ? "Высокая точность" : "Проверить"}
									</span>
									{cmd.soapSection && (
										<span className="dnt-voice-badge dnt-voice-badge--soap">
											Дневник: {cmd.soapSection}
										</span>
									)}
									{cmd.category === "anesthesia" && (
										<span className="dnt-voice-badge dnt-voice-badge--anesthesia">Анестезия</span>
									)}
									{cmd.category === "consumable" && (
										<span className="dnt-voice-badge dnt-voice-badge--consumable">Материал</span>
									)}
								</div>
								<div className="dnt-voice-chip-summary">{cmd.summary}</div>
								<div className="dnt-voice-chip-raw">«{cmd.rawSpeech}»</div>
							</div>

							<div className="dnt-voice-chip-actions">
								{isApplied ? (
									<span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--ok-fg)", fontSize: "13px", fontWeight: 600 }}>
										<Check size={16} />
										Применено
									</span>
								) : (
									<button
										type="button"
										onClick={() => onApplyCommand(cmd)}
										disabled={false}
										className="voice-btn-apply"
										title="Применить команду"
									>
										<Check size={16} />
										<span>Применить</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => onDeleteCommand(cmd.id)}
									className="voice-btn-icon"
									title="Удалить команду"
									aria-label="Удалить команду"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
