import { useRef } from "react";

export function useSynchronizedScroll() {
	const leftBodyRef = useRef<HTMLDivElement>(null);
	const rightBodyRef = useRef<HTMLDivElement>(null);
	const isSyncingScrollRef = useRef(false);

	const handleLeftScroll = () => {
		if (isSyncingScrollRef.current) return;
		isSyncingScrollRef.current = true;
		if (leftBodyRef.current && rightBodyRef.current) {
			const left = leftBodyRef.current;
			const right = rightBodyRef.current;
			const maxLeft = left.scrollHeight - left.clientHeight;
			const maxRight = right.scrollHeight - right.clientHeight;
			if (maxLeft > 0 && maxRight > 0) {
				const ratio = left.scrollTop / maxLeft;
				right.scrollTop = Math.round(ratio * maxRight);
			} else {
				right.scrollTop = left.scrollTop;
			}
		}
		requestAnimationFrame(() => {
			isSyncingScrollRef.current = false;
		});
	};

	const handleRightScroll = () => {
		if (isSyncingScrollRef.current) return;
		isSyncingScrollRef.current = true;
		if (leftBodyRef.current && rightBodyRef.current) {
			const left = leftBodyRef.current;
			const right = rightBodyRef.current;
			const maxLeft = left.scrollHeight - left.clientHeight;
			const maxRight = right.scrollHeight - right.clientHeight;
			if (maxLeft > 0 && maxRight > 0) {
				const ratio = right.scrollTop / maxRight;
				left.scrollTop = Math.round(ratio * maxLeft);
			} else {
				left.scrollTop = right.scrollTop;
			}
		}
		requestAnimationFrame(() => {
			isSyncingScrollRef.current = false;
		});
	};

	return {
		leftBodyRef,
		rightBodyRef,
		handleLeftScroll,
		handleRightScroll,
	};
}
