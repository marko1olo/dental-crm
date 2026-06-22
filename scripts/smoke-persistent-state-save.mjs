import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-save-persist-"));
const stateFilePath = path.join(tempRoot, "state.json");
const backupDirectoryPath = path.join(tempRoot, "backups");

process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = backupDirectoryPath;
process.env.DENTAL_STATE_BACKUPS = "2";
process.env.DENTAL_STATE_PERSISTENCE = "on";

const persistentStatePath = path.resolve("apps/api/dist/persistentState.js");

if (!existsSync(persistentStatePath)) {
  throw new Error("Build API first: npm run build");
}

const { savePersistentState, loadPersistentState } = await import(pathToFileURL(persistentStatePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const dummyState = {
    staffMembers: [{ id: "s1", name: "Dr. Smith", role: "doctor", specialities: ["therapist"] }]
  };

  savePersistentState(dummyState);

  assert(existsSync(stateFilePath), "State file should be created");

  const fileContent = JSON.parse(readFileSync(stateFilePath, "utf8"));

  assert(fileContent.version === 1, "Saved version mismatch");
  assert(fileContent.state.staffMembers[0].id === "s1", "Saved state payload mismatch");
  assert(typeof fileContent.checksum === "string", "Checksum should be generated");

  const loadedState = loadPersistentState();
  assert(loadedState !== null, "State should be loaded");
  assert(loadedState.staffMembers[0].name === "Dr. Smith", "Loaded state content mismatch");

  // Update state and verify backup rotation works
  const updatedState = {
    staffMembers: [{ id: "s1", name: "Dr. Smith Updated", role: "doctor", specialities: ["therapist"] }]
  };

  savePersistentState(updatedState);

  const updatedFileContent = JSON.parse(readFileSync(stateFilePath, "utf8"));
  assert(updatedFileContent.state.staffMembers[0].name === "Dr. Smith Updated", "Updated state payload mismatch");

  // Verify that an error during save does not crash the process
  let originalWarn = console.warn;
  let warnMessages = [];
  console.warn = (msg) => warnMessages.push(msg);

  try {
    const badTempRoot = mkdtempSync(path.join(tmpdir(), "dental-save-persist-bad-"));
    const badStateFilePath = path.join(badTempRoot, "state.json");
    const fs = await import("node:fs");
    fs.mkdirSync(badStateFilePath); // Make the target file a directory!
    process.env.DENTAL_STATE_FILE = badStateFilePath;

    let threw = false;
    try {
      savePersistentState(dummyState);
    } catch (err) {
      threw = true;
    }

    assert(!threw, "savePersistentState should not throw an error on file system failure");
    assert(warnMessages.length > 0, "savePersistentState should log a warning on failure");
    assert(warnMessages[0].startsWith("Dental state file save failed"), "Warning message mismatch");

    fs.rmSync(badTempRoot, { recursive: true, force: true });
  } finally {
    console.warn = originalWarn;
  }

  console.log("PASS: savePersistentState verified successfully");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
