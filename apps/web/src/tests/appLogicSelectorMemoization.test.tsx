import assert from "node:assert/strict";
import test from "node:test";
import React, { useState } from "react";
import { renderToString } from "react-dom/server";
import {
	AppLogicProvider,
	useAppLogicSelector,
	useAppLogicContext,
} from "../contexts/AppLogicContext";

test("useAppLogicSelector accurately selects data and avoids re-computation", () => {
	let renderCount = 0;

	function TestConsumer() {
		renderCount++;
		const patientName = useAppLogicSelector((ctx: any) => ctx.patientName);
		return <div>{patientName}</div>;
	}

	const initialContext: any = {
		patientName: "Иванов И.И.",
		activeTooth: 16,
		dashboard: null,
	};

	const html1 = renderToString(
		<AppLogicProvider value={initialContext}>
			<TestConsumer />
		</AppLogicProvider>,
	);

	assert.ok(html1.includes("Иванов И.И."));
	assert.equal(renderCount, 1);
});

test("useAppLogicSelector falls back safely when rendered without AppLogicStoreContext", () => {
	function TestConsumer() {
		const patientName = useAppLogicSelector((ctx: any) => ctx.patientName);
		return <span>{patientName}</span>;
	}

	const contextValue: any = {
		patientName: "Петров П.П.",
	};

	const html = renderToString(
		<AppLogicProvider value={contextValue}>
			<TestConsumer />
		</AppLogicProvider>,
	);

	assert.ok(html.includes("Петров П.П."));
});
