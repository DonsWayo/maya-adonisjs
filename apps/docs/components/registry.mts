import { type Registry } from '@fumadocs/cli/build';
import * as ui from './_registry';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

export const registry: Registry = {
  dir: path.dirname(fileURLToPath(import.meta.url)),
  on: {
    ui: {
      type: 'local',
      registry: ui.registry,
    },
  },
  rootDir: '../',
  namespaces: {
    '': 'components',
    '../utils': 'lib',
  },
  components: [
    {
      name: 'search-ai',
      description:
        'Ask AI dialog for your docs, you need to configure Inkeep first',
      files: ['ai/index.tsx', '../app/api/chat/route.ts'],
      mapImportPath: {
        '../../../packages/ui/src/components/button.tsx': {
          type: 'component',
          registry: 'ui',
          name: 'button',
          file: 'components/ui/button.tsx',
        },
      },
    },
  ],
  dependencies: {
    'fumadocs-core': {
      type: 'runtime',
    },
    'fumadocs-ui': {
      type: 'runtime',
    },
    next: {
      type: 'runtime',
    },
    react: {
      type: 'runtime',
    },
  },
};
