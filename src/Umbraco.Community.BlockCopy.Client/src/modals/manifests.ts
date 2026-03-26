export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'modal',
		alias: 'BlockCopy.Modal.PastePreview',
		name: 'Block Copy Paste Preview Modal',
		js: () => import('./paste-preview.element.js'),
	},
];
