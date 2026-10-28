/**
 * copilotStreamReader.ts — SSE & NDJSON Stream Chunk Reader.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 100 lines.
 * - Robust error and stream boundary handling.
 */

export async function readEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }
      const { value, done } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      let idx = buf.indexOf("\n\n");
      while (idx >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        let event = "message";
        let dataStr = "";

        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataStr += line.slice(5).trim();
          }
        }

        if (dataStr) {
          try {
            onEvent(event, JSON.parse(dataStr));
          } catch {
            onEvent(event, { text: dataStr });
          }
        }
        idx = buf.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
