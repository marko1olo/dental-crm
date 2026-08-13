import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { isMachineDeliverableChannel, MACHINE_DELIVERABLE_CHANNELS } from "./channelRouter.js";

describe("isMachineDeliverableChannel", () => {
  test("Returns true for all machine deliverable channels", () => {
    assert.equal(isMachineDeliverableChannel("sms"), true);
    assert.equal(isMachineDeliverableChannel("email"), true);
    assert.equal(isMachineDeliverableChannel("whatsapp"), true);
    assert.equal(isMachineDeliverableChannel("telegram"), true);
  });

  test("Returns true for every channel in MACHINE_DELIVERABLE_CHANNELS", () => {
    for (const channel of MACHINE_DELIVERABLE_CHANNELS) {
      assert.equal(isMachineDeliverableChannel(channel), true);
    }
  });

  test("Returns false for invalid, unknown, or incorrectly cased channels", () => {
    assert.equal(isMachineDeliverableChannel("push"), false);
    assert.equal(isMachineDeliverableChannel("phone"), false);
    assert.equal(isMachineDeliverableChannel(""), false);
    assert.equal(isMachineDeliverableChannel("SMS"), false); // Case sensitive
    assert.equal(isMachineDeliverableChannel("Email"), false);
  });
});
