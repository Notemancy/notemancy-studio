// headingIdsPlugin.ts
import type { Plugin } from 'svelte-exmarkdown';
import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

/**
 * Generates a random short ID of length 8.
 * Uses crypto.getRandomValues if available; otherwise falls back to Math.random.
 *
 * @returns A random string of 8 characters.
 */
function generateShortId(): string {
	const charset = '0123456789abcdefghijklmnopqrstuvwxyz';
	let id = '';
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const array = new Uint8Array(8);
		crypto.getRandomValues(array);
		for (let i = 0; i < array.length; i++) {
			id += charset[array[i] % charset.length];
		}
	} else {
		for (let i = 0; i < 8; i++) {
			id += charset[Math.floor(Math.random() * charset.length)];
		}
	}
	return id;
}

/**
 * Rehype plugin that assigns a random short ID (length 8) to all heading elements (h1–h6)
 * that do not already have one.
 */
function rehypeRandomHeadingIds() {
	return function transformer(tree: any) {
		visit(tree, 'element', (node: any) => {
			if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
				// Ensure the node has a properties object.
				if (!node.properties) {
					node.properties = {};
				}
				// Only add an ID if one isn't already present.
				if (!node.properties.id) {
					node.properties.id = generateShortId();
				}
			}
		});
	};
}

export const headingIdsPlugin: Plugin = {
	rehypePlugin: [rehypeRandomHeadingIds],
	// No custom renderer is needed for headings.
	renderer: {}
};
