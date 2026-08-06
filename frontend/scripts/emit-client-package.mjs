// Emits dist/client-package.json after every build.
// REQUIRED by the Catalyst CLI (clientConfig.validate()) — without it
// `catalyst deploy --only client` refuses to deploy:
//   "The ...\frontend\dist\client-package.json file does not exist."
// Vite empties dist/ on each build, so this must run AFTER `vite build`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'client-package.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      private: true,
      homepage: 'index.html',
      name: 'neural-justice-frontend',
      version: '1.0.0',
    },
    null,
    2,
  ) + '\n',
);
console.log(`[postbuild] wrote ${out}`);
