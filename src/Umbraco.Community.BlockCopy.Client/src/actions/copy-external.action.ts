import { UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import type { UmbPropertyActionArgs } from '@umbraco-cms/backoffice/property-action';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';
import { BlockSerializer } from '../models/block-serializer.js';
import { ExternalClipboardBridge } from '../bridge/bridge.js';

export class CopyExternalPropertyAction extends UmbPropertyActionBase {
	#propertyContext?: typeof UMB_PROPERTY_CONTEXT.TYPE;
	#notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;
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

		const propertyValue = this.#propertyContext.getValue();

		if (!propertyValue) {
			this.#notificationContext.peek('danger', {
				data: { message: 'The property does not have a value to copy.' },
			});
			return;
		}

		// Determine editor type from the property editor UI alias
		const editorManifest = this.#propertyContext.getEditorManifest();
		const editorAlias = editorManifest?.alias ?? '';
		const editorType = editorAlias.includes('BlockGrid') ? 'BlockGrid' : 'BlockList';

		try {
			const portableData = BlockSerializer.serialize(
				propertyValue,
				editorType,
				window.location.origin,
			);

			ExternalClipboardBridge.export(portableData);

			if (!ExternalClipboardBridge.isExtensionPresent()) {
				this.#notificationContext.peek('warning', {
					data: {
						message:
							'Blocks copied, but the Block Copy Chrome extension was not detected. Install the extension to paste on another site.',
					},
				});
			} else {
				const blockCount = portableData.blocks.contentData.length;
				this.#notificationContext.peek('positive', {
					data: {
						message: `${blockCount} block(s) copied to external clipboard.`,
					},
				});
			}
		} catch (error) {
			this.#notificationContext.peek('danger', {
				data: {
					message: `Failed to copy blocks: ${(error as Error).message}`,
				},
			});
		}
	}
}

export { CopyExternalPropertyAction as api };
