import { generateDocs } from './generate-docs.mjs';
import { buildRegistry } from './build-registry.mjs';

async function main() {
  await Promise.all([generateDocs(), buildRegistry()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
});
