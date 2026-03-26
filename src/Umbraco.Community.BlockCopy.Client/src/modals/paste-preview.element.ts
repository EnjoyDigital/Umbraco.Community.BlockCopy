import { html, css, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import type { PastePreviewModalData, PastePreviewModalValue } from './paste-preview.token.js';

const MEDIA_EDITOR_ALIASES = ['Umbraco.MediaPicker3', 'Umbraco.MediaPicker', 'Umbraco.ImageCropper'];

@customElement('blockcopy-paste-preview-modal')
export class BlockCopyPastePreviewModalElement extends UmbModalBaseElement<
	PastePreviewModalData,
	PastePreviewModalValue
> {
	@state()
	private _hasMediaReferences = false;

	@state()
	private _isTypeMismatch = false;

	override connectedCallback(): void {
		super.connectedCallback();
		this._analyzeData();
	}

	private _analyzeData(): void {
		const data = this.data;
		if (!data) return;

		// Check for media references
		this._hasMediaReferences = data.portableData.blocks.contentData.some((block) =>
			block.values.some((v) => MEDIA_EDITOR_ALIASES.some((alias) => v.editorAlias?.includes(alias))),
		);

		// Check for type mismatch
		this._isTypeMismatch = data.portableData.editorType !== data.targetEditorType;
	}

	private _getContentTypeKeys(): string[] {
		const keys = new Set<string>();
		for (const block of this.data?.portableData.blocks.contentData ?? []) {
			keys.add(block.contentTypeKey);
		}
		for (const block of this.data?.portableData.blocks.settingsData ?? []) {
			keys.add(block.contentTypeKey);
		}
		return Array.from(keys);
	}

	#handleConfirm(): void {
		this.modalContext?.setValue({ confirmed: true });
		this.modalContext?.submit();
	}

	#handleCancel(): void {
		this.modalContext?.reject();
	}

	override render() {
		const data = this.data;
		if (!data) return html`<p>No data available.</p>`;

		const { portableData, targetEditorType } = data;
		const blockCount = portableData.blocks.contentData.length;
		const contentTypeKeys = this._getContentTypeKeys();
		const sourceDate = new Date(portableData.timestamp).toLocaleString();

		return html`
			<umb-body-layout headline="Paste from External">
				<div id="main">
					<uui-box headline="Source Information">
						<div class="info-grid">
							<div class="info-item">
								<span class="info-label">Source</span>
								<span class="info-value">${portableData.sourceUrl}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Copied</span>
								<span class="info-value">${sourceDate}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Editor Type</span>
								<span class="info-value">${portableData.editorType}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Blocks</span>
								<span class="info-value">${blockCount}</span>
							</div>
						</div>
					</uui-box>

					${this._isTypeMismatch
						? html`
								<uui-box headline="Warning" class="warning-box">
									<p>
										<strong>Editor type mismatch:</strong> The copied blocks are from a
										<strong>${portableData.editorType}</strong> editor, but the target is a
										<strong>${targetEditorType}</strong> editor. This may cause issues.
									</p>
								</uui-box>
							`
						: ''}
					${this._hasMediaReferences
						? html`
								<uui-box headline="Media References" class="warning-box">
									<p>
										These blocks contain media references that may not exist on this site. You may
										need to re-select media items after pasting.
									</p>
								</uui-box>
							`
						: ''}

					<uui-box headline="Content Types">
						<ul class="content-type-list">
							${contentTypeKeys.map(
								(key) => html`
									<li>
										<code>${key}</code>
									</li>
								`,
							)}
						</ul>
						<p class="content-type-note">
							These content type IDs must match on this site for the blocks to render correctly.
						</p>
					</uui-box>

					<p class="paste-warning">
						Pasting will <strong>replace</strong> the current property value with the imported blocks.
					</p>
				</div>

				<div slot="actions">
					<uui-button label="Cancel" @click=${this.#handleCancel}></uui-button>
					<uui-button
						label="Paste ${blockCount} block(s)"
						look="primary"
						color="positive"
						@click=${this.#handleConfirm}></uui-button>
				</div>
			</umb-body-layout>
		`;
	}

	static override styles = [
		UmbTextStyles,
		css`
			:host {
				display: block;
			}

			#main {
				display: flex;
				flex-direction: column;
				gap: var(--uui-size-layout-1);
				padding: var(--uui-size-layout-1);
			}

			.info-grid {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: var(--uui-size-space-3);
			}

			.info-item {
				display: flex;
				flex-direction: column;
			}

			.info-label {
				font-size: 0.8em;
				color: var(--uui-color-text-alt);
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.info-value {
				font-weight: 600;
				word-break: break-all;
			}

			.warning-box {
				--uui-color-header-contrast: var(--uui-color-danger);
			}

			.warning-box p {
				margin: 0;
			}

			.content-type-list {
				list-style: none;
				padding: 0;
				margin: 0;
			}

			.content-type-list li {
				padding: var(--uui-size-space-1) 0;
				border-bottom: 1px solid var(--uui-color-border);
			}

			.content-type-list li:last-child {
				border-bottom: none;
			}

			.content-type-note {
				font-size: 0.85em;
				color: var(--uui-color-text-alt);
				margin-top: var(--uui-size-space-3);
			}

			.paste-warning {
				text-align: center;
				color: var(--uui-color-text-alt);
				font-size: 0.9em;
			}
		`,
	];
}

export { BlockCopyPastePreviewModalElement as element };

declare global {
	interface HTMLElementTagNameMap {
		'blockcopy-paste-preview-modal': BlockCopyPastePreviewModalElement;
	}
}
