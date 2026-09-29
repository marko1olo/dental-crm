import React from "react";
import type { DebouncedEmkTextareaProps } from "./EmkTypes";

export function DebouncedEmkTextarea({
	fieldKey,
	label,
	value,
	onCommit,
	textareaRef,
	className,
	placeholder,
}: DebouncedEmkTextareaProps) {
	const [localValue, setLocalValue] = React.useState(value);
	const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const lastCommittedValueRef = React.useRef(value);
	const localValueRef = React.useRef(localValue);
	localValueRef.current = localValue;
	const onCommitRef = React.useRef(onCommit);
	onCommitRef.current = onCommit;

	const flushCommit = React.useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		if (localValueRef.current !== lastCommittedValueRef.current) {
			lastCommittedValueRef.current = localValueRef.current;
			onCommitRef.current(fieldKey, localValueRef.current);
		}
	}, [fieldKey]);

	// Sync local value when external value changes (e.g. from templates, voice dictation, chips)
	React.useEffect(() => {
		if (value !== lastCommittedValueRef.current) {
			setLocalValue(value);
			lastCommittedValueRef.current = value;
		}
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const nextVal = e.target.value;
		setLocalValue(nextVal);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			if (nextVal !== lastCommittedValueRef.current) {
				lastCommittedValueRef.current = nextVal;
				onCommitRef.current(fieldKey, nextVal);
			}
		}, 400); // Debounced autosave 300-500ms (Мандаты 8e, 8n)
	};

	const handleBlur = () => {
		flushCommit();
	};

	// Mandate 8e: flush uncommitted textarea content on window blur, tab switch, pagehide, or incoming call
	React.useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushCommit();
			}
		};
		const handleTelephony = () => {
			flushCommit();
		};

		window.addEventListener("pagehide", flushCommit);
		window.addEventListener("beforeunload", flushCommit);
		window.addEventListener("blur", flushCommit);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("dente-telephony-incoming-call", handleTelephony);
		window.addEventListener("dente:visit-tab-change", flushCommit);

		return () => {
			window.removeEventListener("pagehide", flushCommit);
			window.removeEventListener("beforeunload", flushCommit);
			window.removeEventListener("blur", flushCommit);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener(
				"dente-telephony-incoming-call",
				handleTelephony,
			);
			window.removeEventListener("dente:visit-tab-change", flushCommit);
			flushCommit();
		};
	}, [flushCommit]);

	return (
		<textarea
			ref={textareaRef}
			aria-label={label}
			value={localValue}
			placeholder={placeholder}
			onChange={handleChange}
			onBlur={handleBlur}
			className={className}
		/>
	);
}
