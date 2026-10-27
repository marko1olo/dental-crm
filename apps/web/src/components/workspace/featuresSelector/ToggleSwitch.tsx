import React from "react";

export interface ToggleSwitchProps {
	readonly checked: boolean;
	readonly onChange: (nextValue: boolean) => void;
	readonly color: string;
	readonly ariaLabel?: string;
}

export function ToggleSwitch({
	checked,
	onChange,
	color,
	ariaLabel,
}: ToggleSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			onClick={() => onChange(!checked)}
			className="inline-flex items-center justify-center cursor-pointer select-none border-none bg-transparent p-1 transition-all"
			style={{
				minHeight: "44px",
				minWidth: "48px",
			}}
		>
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					width: 48,
					height: 26,
					borderRadius: 13,
					background: checked ? color : "var(--line-strong, #cbd5e1)",
					transition: "background .25s ease, box-shadow .25s ease",
					boxShadow: checked ? `0 0 10px 2px ${color}55` : "none",
					flexShrink: 0,
					padding: 0,
				}}
			>
				<span
					style={{
						width: 20,
						height: 20,
						borderRadius: "50%",
						background: "var(--paper-strong, #ffffff)",
						boxShadow: "0 1px 4px rgba(0,0,0,.25)",
						transform: `translateX(${checked ? 25 : 3}px)`,
						transition: "transform .22s cubic-bezier(.4,0,.2,1)",
						display: "block",
					}}
				/>
			</span>
		</button>
	);
}
