import { hashCredential, verifyCredential } from "./cryptoHelper.js";

async function runBench() {
  const startSeq = performance.now();
  for (let i = 0; i < 50; i++) {
    const hash = await hashCredential("password");
    await verifyCredential("password", hash);
  }
  const endSeq = performance.now();
  console.log(`Sequential async run took ${endSeq - startSeq} ms`);

  const startPar = performance.now();
  const promises: Promise<boolean>[] = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      hashCredential("password").then((hash) =>
        verifyCredential("password", hash),
      ),
    );
  }
  await Promise.all(promises);
  const endPar = performance.now();
  console.log(`Parallel async run took ${endPar - startPar} ms`);
}

runBench();
