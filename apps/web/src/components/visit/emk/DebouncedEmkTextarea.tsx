import React from "react";
import type { ClinicalFormFieldTarget } from "@dental/shared";
import { ClinicalStenographerBar } from "./ClinicalStenographerBar";
import { useClinicalStenographer } from "./useClinicalStenographer";
import type { DebouncedEmkTextareaProps } from "./EmkTypes";
export type { DebouncedEmkTextareaProps };

function inferTargetFieldFromKey(key: string): ClinicalFormFieldTarget {
	if (key === "complaint" || key === "complaints") return "complaints";
	if (key === "anamnesis") return "anamnesis";
	if (key === "objectiveStatus" || key === "statusLocalis") return "objective";
	if (key === "treatmentPlan" || key === "treatmentDescription") return "treatment";
	if (key === "recommendations") return "recommendations";
	return "all";
}

export function DebouncedEmkTextarea({
	fieldKey,
	label,
	value,
	onCommit,
	textareaRef,
	className,
	placeholder,
	enableStenographer = true,
	showStenographerChips = true,
	stenographerFieldTarget,
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

	const internalTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

	const setCombinedRef = React.useCallback(
		(el: HTMLTextAreaElement | null) => {
			internalTextareaRef.current = el;
			if (typeof textareaRef === "function") {
				textareaRef(el);
			} else if (textareaRef && typeof textareaRef === "object") {
				(textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
			}
		},
		[textareaRef],
	);

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

	// Clinical Stenographer hook integration
	const targetField = stenographerFieldTarget ?? inferTargetFieldFromKey(fieldKey);
	const {
		fieldSnippets,
		handleKeyDown,
		insertSnippet,
		isListening,
		isProcessing,
		interimSpeechText,
		toggleVoiceDictation,
		applyInterim,
		stopVoiceDictation,
	} = useClinicalStenographer({
		value: localValue,
		onChange: (nextVal) => {
			setLocalValue(nextVal);
			localValueRef.current = nextVal;
		},
		onCommit: (nextVal) => {
			lastCommittedValueRef.current = nextVal;
			onCommitRef.current(fieldKey, nextVal);
		},
		textareaRef: internalTextareaRef,
		targetField,
		enableStenographer,
	});

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
		<div className="w-full flex flex-col gap-1.5" data-testid={`emk-textarea-wrap-${fieldKey}`}>
			<textarea
				ref={setCombinedRef}
				aria-label={label}
				value={localValue}
				placeholder={placeholder}
				onChange={handleChange}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				className={className}
				data-testid={`textarea-${fieldKey}`}
			/>
			{enableStenographer && showStenographerChips && (fieldSnippets.length > 0 || isListening) && (
				<ClinicalStenographerBar
					snippets={fieldSnippets}
					onSelectSnippet={insertSnippet}
					isListening={isListening}
					isProcessing={isProcessing}
					interimSpeechText={interimSpeechText}
					onToggleVoice={toggleVoiceDictation}
					onApplyInterim={applyInterim}
					onCancelVoice={stopVoiceDictation}
					targetField={targetField}
				/>
			)}
		</div>
	);
}
