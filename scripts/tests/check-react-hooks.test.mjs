/**
 * @file scripts/tests/check-react-hooks.test.mjs
 * @description Тесты для статического линтера правил хуков React 19.
 *
 * Проверяет обнаружение:
 * 1. Условных вызовов хуков (if, тернарные операторы, логические выражения, циклы, try/catch).
 * 2. Вызовов хуков во вложенных функциях или вне компонентов/хуков.
 * 3. Синхронных вызовов сеттеров стейта (set*()) в теле компонента вне эффектов и обработчиков.
 * 4. Отсутствия массива зависимостей в useCallback и useMemo.
 * 5. Корректного прохождения валидных компонентов без ложных срабатываний.
 *
 * Запуск: node --test scripts/tests/check-react-hooks.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { lintReactHooksInFile } from "../check-react-hooks.mjs";

test("React 19 Hooks Linter: Detects hook inside if statement", () => {
	const code = `
		function PatientVisit(props: { hasTooth: boolean }) {
			if (props.hasTooth) {
				const [state, setState] = useState(0);
			}
			return <div>Visit</div>;
		}
	`;
	const errors = lintReactHooksInFile(code, "PatientVisit.tsx");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/no-conditional-hooks");
	assert.match(errors[0].message, /условного оператора if/);
});

test("React 19 Hooks Linter: Detects hook inside ternary operator", () => {
	const code = `
		function TelemetryBar(props: { compact: boolean }) {
			const data = props.compact ? useStore() : null;
			return <div>{data}</div>;
		}
	`;
	const errors = lintReactHooksInFile(code, "TelemetryBar.tsx");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/no-conditional-hooks");
	assert.match(errors[0].message, /тернарного оператора/);
});

test("React 19 Hooks Linter: Detects hook inside logical expression (&& / ?? / ||)", () => {
	const code = `
		function Header(props: { customSpecialty?: string }) {
			const specialty = props.customSpecialty ?? useVisitStore((s) => s.specialty);
			return <div>{specialty}</div>;
		}
	`;
	const errors = lintReactHooksInFile(code, "Header.tsx");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/no-conditional-hooks");
	assert.match(errors[0].message, /логического выражения/);
});

test("React 19 Hooks Linter: Detects hook inside try/catch block", () => {
	const code = `
		function SafeComponent() {
			let logic: any = null;
			try {
				logic = useAppLogicContext();
			} catch (e) {}
			return <div>Logic</div>;
		}
	`;
	const errors = lintReactHooksInFile(code, "SafeComponent.tsx");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/no-conditional-hooks");
	assert.match(errors[0].message, /try\/catch/);
});

test("React 19 Hooks Linter: Detects hook inside helper function that is not a component or custom hook", () => {
	const code = `
		export function calculateBillingTotals(ctx: any) {
			const ref = useRef(false);
			return ctx.total;
		}
	`;
	const errors = lintReactHooksInFile(code, "calculateBillingTotals.ts");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/invalid-enclosing-function");
	assert.match(errors[0].message, /вспомогательной функции «calculateBillingTotals»/);
});

test("React 19 Hooks Linter: Detects synchronous setState call directly in component render body", () => {
	const code = `
		function InfiniteLoopComponent() {
			const [count, setCount] = useState(0);
			setCount(count + 1);
			return <div>{count}</div>;
		}
	`;
	const errors = lintReactHooksInFile(code, "InfiniteLoopComponent.tsx");
	assert.equal(errors.length, 1);
	assert.equal(errors[0].rule, "rules-of-hooks/no-render-phase-setstate");
	assert.match(errors[0].message, /Синхронный вызов сеттера стейта «setCount\(\)»/);
});

test("React 19 Hooks Linter: Detects missing dependencies array in useCallback and useMemo", () => {
	const code = `
		function MemoizedActions() {
			const action = useCallback(() => {
				console.log("hello");
			});
			const memoVal = useMemo(() => 42);
			return <button onClick={action}>{memoVal}</button>;
		}
	`;
	const errors = lintReactHooksInFile(code, "MemoizedActions.tsx");
	assert.equal(errors.length, 2);
	assert.equal(errors[0].rule, "rules-of-hooks/missing-deps");
	assert.equal(errors[1].rule, "rules-of-hooks/missing-deps");
});

test("React 19 Hooks Linter: Valid component passes with 0 errors", () => {
	const code = `
		import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

		export function ValidVisitWorkspace(props: { patientId: string }) {
			const [activeTooth, setActiveTooth] = useState<number | null>(null);
			const timerRef = useRef<number | null>(null);

			useEffect(() => {
				console.log("Patient changed:", props.patientId);
			}, [props.patientId]);

			const handleSelectTooth = useCallback((tooth: number) => {
				setActiveTooth(tooth);
			}, []);

			const formattedTooth = useMemo(() => {
				return activeTooth ? "Зуб " + activeTooth : "Не выбран";
			}, [activeTooth]);

			return (
				<div>
					<span>{formattedTooth}</span>
					<button onClick={() => handleSelectTooth(16)}>Выбрать 16</button>
				</div>
			);
		}
	`;
	const errors = lintReactHooksInFile(code, "ValidVisitWorkspace.tsx");
	assert.equal(errors.length, 0);
});
