/**
 * DentalTraumaProtocolEngine.test.ts — Unit tests for IADT 2020 protocol engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DentalTraumaProtocolEngine } from "./DentalTraumaProtocolEngine.js";

describe("DentalTraumaProtocolEngine", () => {
  it("should handle Avulsion with < 60 min dry time", () => {
    const protocol = DentalTraumaProtocolEngine.getProtocol({
      traumaType: "AVULSION",
      dryTimeMinutes: 30,
      toothIdentifier: "11",
    });
    assert.match(protocol.protocol, /<60 мин/);
    assert.strictEqual(protocol.followUpSchedule.length, 6);
  });

  it("should handle Avulsion with > 60 min dry time", () => {
    const protocol = DentalTraumaProtocolEngine.getProtocol({
      traumaType: "AVULSION",
      dryTimeMinutes: 90,
      toothIdentifier: "11",
    });
    assert.match(protocol.protocol, />60 мин/);
    assert.match(protocol.protocol, /RCT/);
  });

  it("should handle Intrusion correctly", () => {
    const protocol = DentalTraumaProtocolEngine.getProtocol({
      traumaType: "INTRUSION",
      toothIdentifier: "11",
    });
    assert.match(protocol.protocol, /спонтанного прорезывания/);
  });
});
