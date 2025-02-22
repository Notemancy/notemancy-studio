// remarkHighlight.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'svelte-exmarkdown';
import type { Root, Text } from 'mdast';
import type { Transformer } from 'unified';
import type { Parent } from 'unist';

function remarkHighlight(): Transformer<Root> {
	return (tree) => {
		visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
			if (!parent || typeof index !== 'number') return;

			// Regex to match the highlight syntax: ==some text==
			const HIGHLIGHT_REGEX = /==([^=]+)==/g;
			let match: RegExpExecArray | null;
			const newChildren: any[] = [];
			let lastIndex = 0;

			while ((match = HIGHLIGHT_REGEX.exec(node.value)) !== null) {
				// Add any text before the match.
				if (match.index > lastIndex) {
					newChildren.push({
						type: 'text',
						value: node.value.slice(lastIndex, match.index)
					});
				}

				// Extract the text inside the ==...==
				const highlightedText = match[1].trim();

				// Create an element node for the highlighted text.
				newChildren.push({
					type: 'element',
					data: {
						hName: 'span',
						hProperties: {
							className: ['bg-yellow-200', 'dark:bg-yellow-100', 'text-black', 'dark:text-gray-600', 'px-1', 'py-0.5', 'rounded']
						}
					},
					children: [{ type: 'text', value: highlightedText }]
				});

				lastIndex = match.index + match[0].length;
			}

			// Append any remaining text after the last match.
			if (lastIndex < node.value.length) {
				newChildren.push({
					type: 'text',
					value: node.value.slice(lastIndex)
				});
			}

			// Replace the original node with the newly constructed nodes.
			if (newChildren.length > 0) {
				parent.children.splice(index, 1, ...newChildren);
			}
		});
	};
}

/**
 * A factory function returning a svelte-exmarkdown plugin.
 * Since our output is a standard `<span>` element, no custom renderer is needed.
 */
export const highlightPlugin = (options: Record<string, unknown> = {}): Plugin => ({
	remarkPlugin: [remarkHighlight, options]
});

export default remarkHighlight;
