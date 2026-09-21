import { useEffect, useRef, useState } from "react";

export function useCountUp(endValue: number, duration: number = 1000) {
	const [value, setValue] = useState(endValue);
	const currentValueRef = useRef(endValue);
	currentValueRef.current = value;

	useEffect(() => {
		if (endValue === currentValueRef.current) return;

		const startVal = currentValueRef.current;
		let startTime: number | null = null;
		let animationFrameId: number | null = null;

		const step = (timestamp: number) => {
			if (startTime === null) startTime = timestamp;
			const progress = Math.min((timestamp - startTime) / duration, 1);

			// easeOutExpo
			const easeOut = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
			const nextValue = startVal + (endValue - startVal) * easeOut;

			setValue(nextValue);

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(step);
			} else {
				setValue(endValue);
			}
		};

		animationFrameId = requestAnimationFrame(step);

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, [endValue, duration]);

	return value;
}
