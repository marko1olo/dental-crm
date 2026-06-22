import { sleep } from "./sleep.mjs";

export async function waitFor(cdp, expression, label, attempts = 80) {
  let snapshot = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    snapshot = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true
    });
    if (snapshot.result.value) return snapshot.result.value;
    await sleep(250);
  }
  throw new Error(`${label} did not become ready: ${JSON.stringify(snapshot?.result?.value ?? null)}`);
}

export async function evaluate(cdp, expression, label) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(`${label} threw in browser: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result.value;
}

export async function setFileInputFiles(cdp, selector, files) {
  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const inputNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector
  });
  if (!inputNode.nodeId) throw new Error(`File input not found: ${selector}`);
  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files });

  const result = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return { ok: false, reason: "missing_input" };
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, filesLength: input.files ? input.files.length : 0 };
    })()`,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(`dispatch files for ${selector} threw in browser: ${JSON.stringify(result.exceptionDetails)}`);
  }
}
