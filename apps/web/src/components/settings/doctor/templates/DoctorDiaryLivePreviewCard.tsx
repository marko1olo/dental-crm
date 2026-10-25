import { Sparkles } from "lucide-react";
import React from "react";

interface DoctorDiaryLivePreviewCardProps {
	templateTitle: string;
	templateTags: readonly string[];
	interpolatedComplaints: string;
	interpolatedObjective: string;
	interpolatedTreatment: string;
}

export function DoctorDiaryLivePreviewCard({
	templateTitle,
	templateTags,
	interpolatedComplaints,
	interpolatedObjective,
	interpolatedTreatment,
}: DoctorDiaryLivePreviewCardProps) {
	return (
		<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
				<div className="flex items-center gap-2">
					<Sparkles size={14} className="text-teal-600" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Живой предпросмотр дневника приёма: {templateTitle}
					</span>
				</div>
				<div className="flex items-center gap-1 flex-wrap">
					{templateTags.map((tag) => (
						<span
							key={tag}
							className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20"
						>
							{tag}
						</span>
					))}
				</div>
			</div>

			<div className="space-y-2 text-xs leading-relaxed">
				<div>
					<strong className="text-[var(--ink)] block mb-0.5">Жалобы:</strong>
					<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
						{interpolatedComplaints}
					</p>
				</div>
				<div>
					<strong className="text-[var(--ink)] block mb-0.5">Объективный статус:</strong>
					<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
						{interpolatedObjective}
					</p>
				</div>
				<div>
					<strong className="text-[var(--ink)] block mb-0.5">План лечения и протокол манипуляций:</strong>
					<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
						{interpolatedTreatment}
					</p>
				</div>
			</div>
		</div>
	);
}
