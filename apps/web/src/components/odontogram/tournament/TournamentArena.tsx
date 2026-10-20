/**
 * DENTE Odontogram Tournament Arena
 * Master comparison showcase displaying 10 competitor styles across 4 benchmark teeth.
 */

import React, { useState } from "react";
import { Moon, Sun, Trophy, ZoomIn, ZoomOut } from "lucide-react";
import { COMPETITOR_STYLES } from "./candidatesRegistry";

export const TournamentArena: React.FC = () => {
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [zoom, setZoom] = useState<number>(1);
	const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

	const displayedStyles = selectedCandidate
		? COMPETITOR_STYLES.filter((s) => s.id === selectedCandidate)
		: COMPETITOR_STYLES;

	return (
		<div
			className={`tournament-arena min-h-screen p-6 transition-colors duration-200 ${
				theme === "dark"
					? "dark bg-[#0b0f17] text-[#f1f5f9]"
					: "light bg-[#f8fafc] text-[#0f172a]"
			}`}
			data-testid="odontogram-tournament-arena"
		>
			{/* Header & Controls */}
			<div className="max-w-[1600px] mx-auto mb-8 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--line,#e2e8f0)]/60">
				<div>
					<div className="flex items-center gap-2">
						<Trophy className="w-6 h-6 text-amber-500" />
						<h1 className="text-2xl font-black tracking-tight">
							DENTE ODONTOGRAM TOURNAMENT — 10 COMPETITORS
						</h1>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1">
						Битва 10 субагентов за право стать канонической одонтограммой DENTE. 4 контрольных эталона.
					</p>
				</div>

				<div className="flex items-center gap-3">
					{/* Candidate Filter */}
					<select
						value={selectedCandidate ?? ""}
						onChange={(e) => setSelectedCandidate(e.target.value ? Number(e.target.value) : null)}
						className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] cursor-pointer"
					>
						<option value="">Все 10 кандидатов</option>
						{COMPETITOR_STYLES.map((c) => (
							<option key={c.id} value={c.id}>
								{c.nameRu}
							</option>
						))}
					</select>

					{/* Zoom Controls */}
					<div className="flex items-center rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-1 gap-1">
						<button
							type="button"
							onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
							className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
							title="Уменьшить"
						>
							<ZoomOut size={16} />
						</button>
						<span className="text-xs font-mono font-bold px-1.5">{Math.round(zoom * 100)}%</span>
						<button
							type="button"
							onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
							className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
							title="Увеличить"
						>
							<ZoomIn size={16} />
						</button>
					</div>

					{/* Theme Switcher */}
					<button
						type="button"
						onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] font-bold text-xs cursor-pointer shadow-2xs hover:border-teal-500 transition-colors"
					>
						{theme === "light" ? (
							<>
								<Moon size={14} className="text-indigo-500" />
								<span>Темная тема</span>
							</>
						) : (
							<>
								<Sun size={14} className="text-amber-500" />
								<span>Светлая тема</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* Comparison Table */}
			<div className="max-w-[1600px] mx-auto flex flex-col gap-6">
				{displayedStyles.map((style) => (
					<div
						key={style.id}
						className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${
							theme === "dark"
								? "bg-[#131b2a] border-[#222f43] text-white"
								: "bg-white border-slate-200 text-slate-900"
						}`}
						data-testid={`tournament-candidate-row-${style.id}`}
					>
						{/* Candidate Header */}
						<div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--line,#e2e8f0)]/40">
							<div>
								<div className="flex items-center gap-2">
									<span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
										#{style.id}
									</span>
									<h2 className="text-base font-extrabold text-slate-900 dark:text-white">{style.nameRu}</h2>
								</div>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
									{style.subtitleRu}
								</p>
							</div>
							<span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
								Разработчик: <strong className="text-teal-500">{style.authorAgent}</strong>
							</span>
						</div>

						{/* 4 Benchmark Columns */}
						<div
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
							style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
						>
							{/* 1. Incisor */}
							<div className="flex flex-col items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
								<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
									1. Резец 11 (Интактный)
								</span>
								<div className="w-full flex items-center justify-center min-h-[180px]">
									<style.IncisorComponent theme={theme} scale={1} />
								</div>
								<span className="text-[10px] text-center text-slate-400 mt-2">
									Жемчужная эмаль, мамелоны
								</span>
							</div>

							{/* 2. Premolar */}
							<div className="flex flex-col items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
								<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
									2. Премоляр 14 (Каналы)
								</span>
								<div className="w-full flex items-center justify-center min-h-[180px]">
									<style.PremolarComponent theme={theme} scale={1} />
								</div>
								<span className="text-[10px] text-center text-slate-400 mt-2">
									Бифуркация корня, эндодонтия
								</span>
							</div>

							{/* 3. Molar */}
							<div className="flex flex-col items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
								<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
									3. Моляр 46 (Гранулема)
								</span>
								<div className="w-full flex items-center justify-center min-h-[180px]">
									<style.MolarComponent theme={theme} scale={1} />
								</div>
								<span className="text-[10px] text-center text-slate-400 mt-2">
									3 корня, периапикальное гало
								</span>
							</div>

							{/* 4. Implant */}
							<div className="flex flex-col items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
								<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
									4. Имплант (Формирователь)
								</span>
								<div className="w-full flex items-center justify-center min-h-[180px]">
									<style.ImplantComponent theme={theme} scale={1} />
								</div>
								<span className="text-[10px] text-center text-slate-400 mt-2">
									Титановый винт SLA, формирователь
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
