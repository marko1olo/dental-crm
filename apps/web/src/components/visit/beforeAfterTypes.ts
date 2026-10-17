/**
 * beforeAfterTypes.ts
 * Types for Chairside Before & After Splitter (Wiper Slider).
 */

export interface BeforeAfterSplitterPhotoItem {
	readonly id: string;
	readonly url: string;
	readonly name?: string;
	readonly stage?: "before" | "after" | "process";
}

export interface BeforeAfterSplitterProps {
	beforeUrl?: string;
	afterUrl?: string;
	beforeLabel?: string;
	afterLabel?: string;
	photos?: readonly BeforeAfterSplitterPhotoItem[];
	onClose?: () => void;
	compact?: boolean;
	className?: string;
}
