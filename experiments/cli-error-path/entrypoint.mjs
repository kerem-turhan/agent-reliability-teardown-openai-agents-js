// A faithful reconstruction of the frozen example's entrypoint shape, at
// examples/financial-research-agent/main.ts:8-25 of the target commit:
//
//   async function main() {
//     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
//     rl.question('Enter a financial research query: ', async (query) => {
//       rl.close();
//       await withTrace('Financial research workflow', async () => {
//         const manager = new FinancialResearchManager();
//         await manager.run(query);
//       });
//     });
//   }
//   main().catch((error) => { console.error(error); process.exit(1); });
//
// `withTrace` and the manager are stubbed: neither participates in the mechanism under test, which
// is what happens to a rejection raised inside an async `rl.question` callback. The stub throws
// exactly where the fail-closed patch throws.
import { createInterface } from 'node:readline';

const mode = process.argv[2];
const withTrace = async (_name, run) => run();
const managerRun = async () => {
  throw new Error('Financial research stopped: no usable search results.');
};

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter a financial research query: ', (query) => {
    rl.close();
    const work = async () => {
      await withTrace('Financial research workflow', async () => {
        await managerRun(query);
      });
    };
    if (mode === 'handled') {
      // The one-line entrypoint change: route the callback's promise somewhere.
      work().catch((error) => {
        console.error(`handled: ${error.message}`);
        process.exit(1);
      });
      return;
    }
    // The frozen shape: the callback is `async`, so its rejection has no owner.
    void (async () => {
      await work();
    })();
  });
}

main().catch((error) => {
  console.error(`main().catch: ${error.message}`);
  process.exit(1);
});
