import { UmbModalToken } from '@umbraco-cms/backoffice/modal';
import type { PortableBlockData } from '../models/portable-block.model.js';

export interface PastePreviewModalData {
	portableData: PortableBlockData;
	targetEditorType: 'BlockList' | 'BlockGrid';
	existingBlockCount: number;
}

export interface PastePreviewModalValue {
	confirmed: boolean;
	pasteMode: 'replace' | 'append';
}

export const BLOCK_COPY_PASTE_PREVIEW_MODAL = new UmbModalToken<
	PastePreviewModalData,
	PastePreviewModalValue
>('BlockCopy.Modal.PastePreview', {
	modal: {
		type: 'sidebar',
		size: 'small',
	},
});
