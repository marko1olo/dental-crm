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
		<div className="dbw-privacy-row">
			<input
				id="privacy-checkbox"
				data-testid="privacy-checkbox"
				type="checkbox"
				checked={hasAgreedToPrivacy}
				onChange={(e) => onAgreedChange(e.target.checked)}
				className="w-5 h-5 cursor-pointer min-w-[20px] min-h-[20px]"
			/>
			<label
				htmlFor="privacy-checkbox"
				className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug cursor-pointer py-2 flex items-center"
			>
				Я согласен на обработку персональных данных для записи на приём
			</label>
		</div>
	);
};
