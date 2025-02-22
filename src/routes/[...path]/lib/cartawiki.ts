import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import type { Parent } from 'unist';
import type { Plugin } from 'carta-md';

/**
 * Helper to clean up and format the wiki link path.
 */
function formatWikiPath(path: string): string {
	// Remove any leading/trailing slashes and split the path
	const cleanPath = path.replace(/^\/+|\/+$/g, '');
	const segments = cleanPath.split('/');
	if (segments.length > 0) {
		// Replace spaces in the last segment with %20
		segments[segments.length - 1] = segments[segments.length - 1].replace(/ /g, '%20');
	}
	// Prepend a slash (adjust as needed)
	return '/' + segments.join('/');
}

/**
 * Remark plugin that transforms wikilink syntax ([[...]])
 * into anchor (<a>) elements.
 */
function remarkWikiLinks() {
	return function transformer(tree: Root) {
		visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
			if (!parent || typeof index !== 'number') return;
			const regex = /\[\[([^\]]+)\]\]/g;
			let match;
			const newNodes: any[] = [];
			let lastIndex = 0;

			while ((match = regex.exec(node.value)) !== null) {
				// Append any text before the match.
				if (match.index > lastIndex) {
					newNodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
				}

				const content = match[1].trim();
				let linkPath = '';
				let alias = '';

				// Split by pipe if an alias is provided.
				if (content.includes('|')) {
					[linkPath, alias] = content.split('|').map(s => s.trim());
				} else {
					linkPath = content;
					alias = content;
				}

				const formattedPath = formatWikiPath(linkPath);

				// Create an element node representing an anchor.
				newNodes.push({
					type: 'element',
					data: {
						hName: 'a',
						hProperties: {
							href: formattedPath,
							className: ['wiki-link']
						}
					},
					children: [{ type: 'text', value: alias }]
				});

				lastIndex = match.index + match[0].length;
			}

			// Append any remaining text after the last match.
			if (lastIndex < node.value.length) {
				newNodes.push({ type: 'text', value: node.value.slice(lastIndex) });
			}

			// If matches were found, replace the original text node.
			if (newNodes.length > 0) {
				parent.children.splice(index, 1, ...newNodes);
			}
		});
	};
}

/**
 * Carta extension that registers the remarkWikiLinks transformer.
 */
const cartawiki: Plugin = {
	transformers: [
		{
			execution: 'sync',
			type: 'remark',
			transform({ processor }) {
				// Register the wikilink remark plugin.
				processor.use(remarkWikiLinks);
			}
		}
	]
};

export default cartawiki;

