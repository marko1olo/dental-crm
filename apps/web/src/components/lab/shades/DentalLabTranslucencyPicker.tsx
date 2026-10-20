import React from "react";

export function DentalLabTranslucencyPicker({
	translucency,
	setTranslucency,
}: {
	readonly translucency: string;
	readonly setTranslucency: (t: string) => void;
}) {
	return (
		<div className="space-y-1">
			<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)] block">
				Степень прозрачности:
			</span>
			<div className="grid grid-cols-5 gap-1.5">
				{[
					{ id: "UTML", label: "UTML" },
					{ id: "STML", label: "STML" },
					{ id: "HT", label: "HT" },
					{ id: "MT", label: "MT" },
					{ id: "LT", label: "LT" },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTranslucency(t.id)}
						data-testid={`translucency-${t.id}`}
						className={`min-h-[30px] rounded-lg border text-[11px] font-bold shadow-2xs transition ${
							translucency === t.id
								? "border-teal-600 bg-teal-600 text-white"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>
		</div>
	);
}
