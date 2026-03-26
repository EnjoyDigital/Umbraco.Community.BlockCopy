import { UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import type { UmbPropertyActionArgs } from '@umbraco-cms/backoffice/property-action';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { BlockSerializer } from '../models/block-serializer.js';
import { ExternalClipboardBridge } from '../bridge/bridge.js';
import { BLOCK_COPY_PASTE_PREVIEW_MODAL } from '../modals/paste-preview.token.js';

export class PasteExternalPropertyAction extends UmbPropertyActionBase {
	#propertyContext?: typeof UMB_PROPERTY_CONTEXT.TYPE;
	#notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;
	#modalManagerContext?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
	#init: Promise<unknown>;

	constructor(host: UmbControllerHost, args: UmbPropertyActionArgs<never>) {
		super(host, args);

		this.#init = Promise.all([
			this.consumeContext(UMB_PROPERTY_CONTEXT, (context) => {
				this.#propertyContext = context;
			}).asPromise({ preventTimeout: true }),
			this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
				this.#notificationContext = context;
			}).asPromise({ preventTimeout: true }),
			this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
				this.#modalManagerContext = context;
			}).asPromise({ preventTimeout: true }),
		]);
	}

	override async execute(): Promise<void> {
		await this.#init;

		if (!this.#propertyContext) {
			throw new Error('Property context is not available');
		}
		if (!this.#notificationContext) {
			throw new Error('Notification context is not available');
		}
		if (!this.#modalManagerContext) {
			throw new Error('Modal manager context is not available');
		}

		if (!ExternalClipboardBridge.isExtensionPresent()) {
			this.#notificationContext.peek('warning', {
				data: {
					message: 'The Block Copy Chrome extension is not detected. Please install the extension first.',
				},
			});
			return;
		}

		try {
			const portableData = await ExternalClipboardBridge.requestImport();

			// Validate the portable data before showing it to the user
			const validation = BlockSerializer.validate(portableData);
			if (!validation.valid) {
				this.#notificationContext.peek('danger', {
					data: {
						message: `The clipboard data is invalid: ${validation.errors.join(', ')}`,
					},
				});
				return;
			}

			// Determine target editor type
			const editorManifest = this.#propertyContext.getEditorManifest();
			const editorAlias = editorManifest?.alias ?? '';
			const targetEditorType = editorAlias.includes('BlockGrid') ? 'BlockGrid' : 'BlockList';

			// Open paste preview modal
			const modalContext = this.#modalManagerContext.open(this, BLOCK_COPY_PASTE_PREVIEW_MODAL, {
				data: {
					portableData,
					targetEditorType,
				},
			});

			const result = await modalContext.onSubmit();

			if (result?.confirmed) {
				// Deserialize and set value
				const deserializedValue = BlockSerializer.deserialize(portableData);
				this.#propertyContext.setValue(deserializedValue);

				const blockCount = deserializedValue.contentData.length;
				this.#notificationContext.peek('positive', {
					data: {
						message: `${blockCount} block(s) pasted from external clipboard.`,
					},
				});
			}
		} catch (error) {
			const message = (error as Error).message;
			// Don't show error for user cancellation of modal
			if (!message.includes('cancelled') && !message.includes('rejected')) {
				this.#notificationContext.peek('danger', {
					data: {
						message: `Failed to paste blocks: ${message}`,
					},
				});
			}
		}
	}
}

export { PasteExternalPropertyAction as api };
