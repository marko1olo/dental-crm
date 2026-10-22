import React from "react";
import { Sparkles } from "lucide-react";

export function OdontogramSkeleton() {
	return (
		<div
			className="odontogram-skeleton"
			aria-label="Загрузка зубной формулы"
			aria-busy="true"
		>
			<div className="flex items-center gap-2 text-sm text-[var(--muted)]">
				<Sparkles className="w-5 h-5 text-[var(--teal,#0d9488)] animate-spin" />
				<span>Загрузка интерактивной зубной формулы...</span>
			</div>
		</div>
	);
}
