import { manifests as actionManifests } from './actions/manifests.js';
import { manifests as modalManifests } from './modals/manifests.js';

export const manifests: Array<UmbExtensionManifest> = [
	...actionManifests,
	...modalManifests,
];
