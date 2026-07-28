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
    /*
     * hashCredential возвращает строку, а не Promise (внутри pbkdf2Sync), поэтому
     * прежний вызов .then() прямо на результате падал с TypeError: этот замер не
     * выполнялся ни разу. Результат заворачивается в Promise.resolve, чтобы
     * Promise.all ниже получил то, что объявлено в типе promises.
     */
    promises.push(
      Promise.resolve(hashCredential("password")).then((hash) =>
        verifyCredential("password", hash),
      ),
    );
  }
  await Promise.all(promises);
  const endPar = performance.now();
  console.log(`Parallel async run took ${endPar - startPar} ms`);
}

runBench();
