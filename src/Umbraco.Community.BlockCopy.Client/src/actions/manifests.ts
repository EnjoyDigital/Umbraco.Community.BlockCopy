const forPropertyEditorUis = [
	'Umb.PropertyEditorUi.BlockList',
	'Umb.PropertyEditorUi.BlockGrid',
];

export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'propertyAction',
		kind: 'default',
		alias: 'BlockCopy.PropertyAction.CopyExternal',
		name: 'Block Copy - Copy to External',
		api: () => import('./copy-external.action.js'),
		forPropertyEditorUis,
		weight: 1100,
		meta: {
			icon: 'icon-out',
			label: 'Copy to External',
		},
		conditions: [
			{
				alias: 'Umb.Condition.Property.HasValue',
			},
		],
	},
	{
		type: 'propertyAction',
		kind: 'default',
		alias: 'BlockCopy.PropertyAction.PasteExternal',
		name: 'Block Copy - Paste from External',
		api: () => import('./paste-external.action.js'),
		forPropertyEditorUis,
		weight: 1090,
		meta: {
			icon: 'icon-enter',
			label: 'Paste from External',
		},
		conditions: [
			{
				alias: 'Umb.Condition.Property.Writable',
			},
		],
	},
];
