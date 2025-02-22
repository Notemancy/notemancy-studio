// calloutsPlugin.ts
import type { Plugin } from 'svelte-exmarkdown';
import { visit } from 'unist-util-visit';
import Callout from './Callout.svelte';

// Mapping of callout types to Iconify icon names (using mdi icons)
const calloutIcons: Record<string, string> = {
	abstract: 'mdi:file-document-outline',         // originally: FileText
	info: 'mdi:information-outline',                 // originally: Info
	todo: 'mdi:checkbox-marked-outline',             // originally: CheckSquare
	tip: 'mdi:lightbulb-outline',                      // originally: Lightbulb
	success: 'mdi:check-circle-outline',             // originally: CheckCircle
	question: 'mdi:help-circle-outline',             // originally: HelpCircle
	warning: 'mdi:alert-circle-outline',             // originally: AlertTriangle
	failure: 'mdi:close-circle-outline',             // originally: XCircle
	danger: 'mdi:alert-octagon-outline',             // originally: AlertOctagon
	bug: 'mdi:bug-outline',                          // originally: Bug
	example: 'mdi:file-document-edit-outline',       // originally: FileSearch
	quote: 'mdi:format-quote-close',                 // originally: Quote
	error: 'mdi:close-circle-outline',               // originally: XCircle
	important: 'mdi:alert-outline'                   // originally: AlertTriangle
};

// Mapping of callout types to icon colors (using Tailwind-inspired hex values)
const calloutIconColors: Record<string, string> = {
	abstract: '#6B7280', // gray-500
	info: '#3B82F6',     // blue-500
	todo: '#6366F1',     // indigo-500
	tip: '#FACC15',      // yellow-500
	success: '#10B981',  // green-500
	question: '#0EA5E9', // sky-500
	warning: '#F59E0B',  // amber-500
	failure: '#EF4444',  // red-500
	danger: '#DC2626',   // red-600
	bug: '#EF4444',      // red-500
	example: '#14B8A6',  // teal-500
	quote: '#6B7280',    // gray-500
	error: '#EF4444',    // red-500
	important: '#F97316' // orange-500
};

// Default fallback icon and color for custom callout types
const defaultIcon = 'mdi:tag-outline';
const defaultIconColor = '#9CA3AF'; // gray-400

/**
 * Rehype plugin to process callouts.
 *
 * This plugin looks for blockquotes that contain a callout marker in the form:
 *
 *    [!type] or [!type+]
 *
 * The marker is expected in the first text node of the second child of the blockquote.
 * When found, the plugin:
 *  - Removes the marker from the text.
 *  - Transforms the blockquote into a div with these custom properties:
 *      - data-type: the callout type (lowercased)
 *      - data-collapsible: true/false depending on whether a '+' was present
 *      - data-icon: the icon name (from calloutIcons or a default fallback)
 *      - data-icon-color: the color for the icon (from calloutIconColors or a default)
 */
function rehypeCallouts() {
	return function transformer(tree: any) {
		visit(tree, 'element', (node: any) => {
			if (
				node.tagName === 'blockquote' &&
				Array.isArray(node.children) &&
				node.children.length >= 2
			) {
				const callout = node.children[1];
				if (callout && Array.isArray(callout.children) && callout.children.length > 0) {
					const firstChild = callout.children[0];
					if (firstChild && typeof firstChild.value === 'string') {
						const match = firstChild.value.trim().match(/^\[!(\w+)(\+)?\]/);
						if (match) {
							// Capture the callout type and whether it's collapsible
							const type = match[1].toLowerCase();
							const isCollapsible = !!match[2];

							// Use the mapped icon and color if available; otherwise, fallback to default.
							const icon = calloutIcons[type] || defaultIcon;
							const iconColor = calloutIconColors[type] || defaultIconColor;

							// Remove the callout marker from the text.
							firstChild.value = firstChild.value.replace(/^\[!\w+\+?\]/, '').trim();

							// Transform the blockquote into a div with our custom properties.
							node.tagName = 'div';
							node.properties = {
								className: 'markdown-callout',
								'data-type': type,
								'data-collapsible': isCollapsible,
								'data-icon': icon,
								'data-icon-color': iconColor
							};
						}
					}
				}
			}
		});
	};
}

// Export the plugin with both the rehype transformer and the Svelte renderer.
export const calloutsPlugin: Plugin = {
	rehypePlugin: [rehypeCallouts],
	renderer: {
		// The Callout.svelte component should import Icon from '@iconify/svelte'
		// and render the icon using the data-icon and data-icon-color properties.
		div: Callout
	}
};
