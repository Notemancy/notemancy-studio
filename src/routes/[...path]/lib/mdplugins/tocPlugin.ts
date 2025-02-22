// tocPlugin.ts
import type { Plugin } from 'svelte-exmarkdown';
import { visit } from 'unist-util-visit';

/**
 * Rehype transformer to build a Table of Contents.
 *
 * This function collects all heading elements (h1–h6) that have an id,
 * extracts their id, text, and heading level, then injects a new node
 * (with tagName "toc") at the beginning of the document. The node’s
 * properties include a `tocData` array which is later used by the renderer.
 */
function rehypeToc() {
	return function transformer(tree: any) {
		// Collect headings: only headings with an id are considered.
		const headings: Array<{ id: string; text: string; level: number }> = [];
		visit(tree, 'element', (node: any) => {
			if (node.tagName && /^h[1-6]$/.test(node.tagName)) {
				if (node.properties && node.properties.id) {
					const level = parseInt(node.tagName[1]);
					const text = (node.children || [])
						.filter((child: any) => child.type === 'text')
						.map((child: any) => child.value)
						.join(' ')
						.trim();
					headings.push({ id: node.properties.id, text, level });
				}
			}
		});

		// Create a custom TOC node that will be replaced by our Svelte component.
		const tocNode = {
			type: 'element',
			tagName: 'toc',
			properties: {
				// Attach the headings array for use by the renderer.
				tocData: headings,
				// Inline styles (replacing Tailwind classes).
				style:
					"border:1px solid #e5e7eb; padding:10px; background:#f9fafb; margin-bottom:16px;"
			},
			children: [] // No children needed.
		};

		// Insert the TOC node at the beginning of the document.
		if (tree.children) {
			tree.children.unshift(tocNode);
		} else {
			tree.children = [tocNode];
		}
	};
}

import Toc from './Toc.svelte';

export const tocPlugin: Plugin = {
	rehypePlugin: [rehypeToc],
	// Map our custom <toc> element to the Toc Svelte component.
};
