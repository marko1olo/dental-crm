import { useEffect, useRef, useState } from "react";

export function useCountUp(endValue: number, duration: number = 1000) {
	const [value, setValue] = useState(endValue);
	const startValueRef = useRef(endValue);
	const startTimeRef = useRef<number | null>(null);

	useEffect(() => {
		if (endValue === startValueRef.current) return;

		startValueRef.current = value;
		startTimeRef.current = null;

		let animationFrameId: number;

		const step = (timestamp: number) => {
			if (!startTimeRef.current) startTimeRef.current = timestamp;
			const progress = Math.min(
				(timestamp - startTimeRef.current) / duration,
				1,
			);

			// easeOutExpo
			const easeOut = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);

			setValue(
				startValueRef.current + (endValue - startValueRef.current) * easeOut,
			);

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(step);
			} else {
				setValue(endValue);
			}
		};

		animationFrameId = requestAnimationFrame(step);

		return () => cancelAnimationFrame(animationFrameId);
	}, [endValue, duration]);

	return value;
}
