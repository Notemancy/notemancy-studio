// remarkImages.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'svelte-exmarkdown';
import type { Root, Text } from 'mdast';
import type { Transformer } from 'unified';
import type { Parent } from 'unist';

/**
 * This remark extension searches for patterns like:
 *
 *    ![[/path/to/image]]
 *
 * and replaces them with an element node that will render as:
 *
 *    <img src="/path/to/image" alt="/path/to/image" />
 *
 * You can customize the alt attribute as needed.
 */
function remarkImages(): Transformer<Root> {
	return (tree) => {
		visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
			if (!parent || typeof index !== 'number') return;

			// Regex to match the image syntax: ![[...]]
			const IMAGE_LINK_REGEX = /!\[\[([^\]]+)\]\]/g;
			let match: RegExpExecArray | null;
			const newChildren: any[] = [];
			let lastIndex = 0;

			while ((match = IMAGE_LINK_REGEX.exec(node.value)) !== null) {
				// Push any text before the match.
				if (match.index > lastIndex) {
					newChildren.push({
						type: 'text',
						value: node.value.slice(lastIndex, match.index)
					});
				}

				// Extract the image path (e.g., /path/to/image)
				const imagePath = match[1].trim();

				// Create an element node representing an <img> tag.
				newChildren.push({
					type: 'element',
					data: {
						hName: 'img',
						hProperties: {
							src: imagePath,
							alt: imagePath // you can change this to a more descriptive alt text if desired
						}
					},
					children: []
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

			// If we have replaced any content, splice the children.
			if (newChildren.length > 0) {
				parent.children.splice(index, 1, ...newChildren);
			}
		});
	};
}

/**
 * A factory function returning a svelte-exmarkdown plugin.
 * Since the output is a standard `<img>` element, no custom renderer is required.
 */
export const imagesPlugin = (options: Record<string, unknown> = {}): Plugin => ({
	remarkPlugin: [remarkImages, options]
});

export default remarkImages;
