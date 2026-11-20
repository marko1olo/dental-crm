import type React from "react";

export interface BookingPrivacyRowProps {
	readonly hasAgreedToPrivacy: boolean;
	readonly onAgreedChange: (agreed: boolean) => void;
}

export const BookingPrivacyRow: React.FC<BookingPrivacyRowProps> = ({
	hasAgreedToPrivacy,
	onAgreedChange,
}) => {
	return (
		<div className="dbw-privacy-row flex items-start gap-2.5">
			<input
				id="privacy-checkbox"
				data-testid="privacy-checkbox"
				type="checkbox"
				checked={hasAgreedToPrivacy}
				onChange={(e) => onAgreedChange(e.target.checked)}
				className="w-5 h-5 cursor-pointer min-w-[20px] min-h-[20px] mt-0.5 accent-[var(--primary)]"
			/>
			<label
				htmlFor="privacy-checkbox"
				className="text-xs font-medium text-[var(--ink-muted)] leading-snug cursor-pointer select-none"
			>
				Я согласен с{" "}
				<a
					href="/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-[var(--primary)] text-[var(--ink)] transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					политикой конфиденциальности
				</a>{" "}
				и даю согласие на обработку персональных данных
			</label>
		</div>
	);
};
