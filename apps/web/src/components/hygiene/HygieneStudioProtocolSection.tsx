/**
 * @dental/web/components/hygiene/HygieneStudioProtocolSection.tsx
 *
 * Секция выбора клинического протокола чистки у кресла и списания расходников.
 * Мандаты: 8b (<=300 строк), 8am, 8e.
 */

import React from "react";
import { CLEANING_PROTOCOLS, type CleaningProtocol } from "./hygieneCatalogData";

export interface HygieneStudioProtocolSectionProps {
	readonly selectedProtocol: CleaningProtocol;
	readonly setSelectedProtocol: (p: CleaningProtocol) => void;
}

export const HygieneStudioProtocolSection: React.FC<HygieneStudioProtocolSectionProps> = ({
	selectedProtocol,
	setSelectedProtocol,
}) => {
	return (
		<>
			{/* Экспресс-протоколы чистки у кресла */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Экспресс-протокол чистки у кресла
					</span>
					<span className="text-xs text-[var(--ink-muted)]">
						Автоматическое добавление услуги и списание расходников
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{CLEANING_PROTOCOLS.map((proto) => {
						const isSelected = selectedProtocol.id === proto.id;
						return (
							<button
								key={proto.id}
								type="button"
								data-testid={`hygiene-protocol-${proto.id}`}
								onClick={() => setSelectedProtocol(proto)}
								className={`p-3.5 text-left rounded-xl border transition-all flex flex-col justify-between min-h-[110px] ${
									isSelected
										? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-[var(--primary-soft)]"
										: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--primary)]/50"
								}`}
							>
								<div>
									<div className="flex items-center justify-between">
										<span className="text-sm font-bold text-[var(--ink)]">
											{proto.title}
										</span>
										<span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)]">
											{proto.primaryService.priceRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
									<p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-relaxed">
										{proto.description}
									</p>
								</div>

								<div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] pt-2 border-t border-[var(--line-subtle)] mt-2">
									<span>Код: {proto.primaryService.code}</span>
									<span>{proto.durationMinutes} мин</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Сводка списания расходников */}
			<div className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs space-y-1">
				<div className="font-semibold text-[var(--ink)] flex items-center justify-between">
					<span>Пакетное списание расходников:</span>
					<span className="text-[var(--success,#10b981)] font-medium">100% автономия</span>
				</div>
				<div className="flex flex-wrap gap-1.5 pt-1">
					{selectedProtocol.consumables.map((item, idx) => (
						<span
							key={idx}
							className="px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--ink-muted)] text-[11px] border border-[var(--line-subtle)]"
						>
							{item}
						</span>
					))}
				</div>
			</div>
		</>
	);
};

HygieneStudioProtocolSection.displayName = "HygieneStudioProtocolSection";
