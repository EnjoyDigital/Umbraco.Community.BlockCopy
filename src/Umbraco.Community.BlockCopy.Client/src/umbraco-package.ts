export const name = 'Umbraco.Community.BlockCopy';

export const extensions = [
  {
    name: 'BlockCopy Bundle',
    alias: 'BlockCopy.Bundle',
    type: 'bundle' as const,
    js: () => import('./manifests.js'),
  },
];
