import React from "react";
import { Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface PatientTopHeaderIdentityProps {
	readonly fullName: string;
	readonly initials: string;
	readonly birthDateStr: string;
	readonly phone: string;
	readonly cardNumber: string;
	readonly allergyText?: string | null;
	readonly isActiveVisit?: boolean;
}

export function PatientTopHeaderIdentity({
	fullName,
	initials,
	birthDateStr,
	phone,
	cardNumber,
	allergyText,
	isActiveVisit,
}: PatientTopHeaderIdentityProps) {
	const handleCopyPhone = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(phone);
			showToast("Телефон скопирован в буфер", "success");
		}
	};

	return (
		<div className="flex items-center gap-3.5 min-w-0 w-full">
			<div
				className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--teal,#0d9488)] to-teal-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[var(--teal)]/30"
				title={fullName}
			>
				{initials}
			</div>

			<div className="min-w-0 flex-1 flex flex-col gap-0.5">
				<div className="flex items-center gap-2 flex-wrap min-w-0">
					<h2
						className="text-[20px] font-black text-[var(--ink)] leading-tight tracking-tight truncate max-w-full"
						title={fullName}
					>
						{fullName}
					</h2>
					{isActiveVisit && (
						<span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold inline-flex items-center gap-1.5 shrink-0">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
							В клинике
						</span>
					)}
					{allergyText ? (
						<span
							className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
							title={`Аллергический статус: ${allergyText}`}
						>
							<ShieldAlert size={12} className="shrink-0" />
							<span>{allergyText}</span>
						</span>
					) : (
						<span
							className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
							title="Соматически здоров, без аллергических реакций"
						>
							<ShieldCheck size={12} className="shrink-0" />
							<span>Соматически здоров</span>
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap min-w-0">
					{birthDateStr && <span>{birthDateStr}</span>}
					{cardNumber && (
						<>
							<span className="opacity-40">•</span>
							<span className="font-mono font-semibold">{cardNumber}</span>
						</>
					)}
					{phone && (
						<>
							<span className="opacity-40">•</span>
							<span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--ink)]">
								{phone}
								<button
									type="button"
									onClick={handleCopyPhone}
									className="p-0.5 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--teal)] transition-colors cursor-pointer"
									title="Скопировать телефон"
									aria-label="Скопировать телефон"
								>
									<Copy size={12} />
								</button>
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
