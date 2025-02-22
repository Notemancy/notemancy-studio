// remarkWikiLinks.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'svelte-exmarkdown';
import type { Root, Text } from 'mdast';
import type { Transformer } from 'unified';
import type { Parent } from 'unist';
import WikiLinkPreview from './WikiLinkPreview.svelte';

function formatWikiPath(path: string): string {
  // Remove any leading or trailing slashes
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // Split the path into segments
  const segments = cleanPath.split('/');

  // Only modify the last segment (the filename)
  if (segments.length > 0) {
    segments[segments.length - 1] = segments[segments.length - 1].replace(/ /g, '%20');
  }

  // Rejoin the segments with "/"
  return segments.join('/');
}

function remarkWikiLinks(): Transformer<Root> {
  return (tree) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || typeof index !== 'number') return;
      const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      const newChildren: any[] = [];
      let lastIndex = 0;

      while ((match = WIKI_LINK_REGEX.exec(node.value)) !== null) {
        // Add any text before this match
        if (match.index > lastIndex) {
          newChildren.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index)
          });
        }

        // The content inside the [[...]]
        const linkContent = match[1].trim();
        
        // Check if there's a pipe separator
        if (linkContent.includes('|')) {
          // Split on the pipe: left side is the target, right side is the alias
          const [linkPath, alias] = linkContent.split('|').map((s) => s.trim());
          newChildren.push({
            type: 'element',
            data: {
              hName: 'a',
              hProperties: {
                href: formatWikiPath(linkPath),
                className: ['wiki-link', 'link-preview']
              }
            },
            children: [
              {
                type: 'text',
                value: alias
              }
            ]
          });
        } else {
          // No pipe - use the content as both path and display text
          const linkPath = linkContent;
          const encodedPath = formatWikiPath(linkPath);
          newChildren.push({
            type: 'element',
            data: {
              hName: 'a',
              hProperties: {
                href: encodedPath,
                className: ['wiki-link', 'link-preview']
              }
            },
            children: [
              {
                type: 'text',
                value: linkPath // Keep the display text as the original unencoded path
              }
            ]
          });
        }
        
        lastIndex = match.index + match[0].length;
      }

      // Append any remaining text after the last match
      if (lastIndex < node.value.length) {
        newChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // Replace the original text node with our new children
      parent.children.splice(index, 1, ...newChildren);
    });
  };
}

/**
 * A factory function returning a svelte-exmarkdown plugin.
 *
 * This plugin converts wiki-link syntax in two formats:
 * 
 *    [[/path/to/page | alias]]  -> renders as "alias" linking to "/path/to/page"
 *    [[/path/to/page]]          -> renders as "/path/to/page" linking to "/path/to/page"
 *    [[path with spaces]]       -> replaces spaces in the filename (last segment) with %20
 *
 * All formats will be rendered as links with hover previews.
 * The preview is implemented in the custom Svelte component "WikiLinkPreview.svelte"
 * which uses Melt UI.
 */
export const wikiLinksPlugin = (
  options: Record<string, unknown> = {}
): Plugin => ({
  remarkPlugin: [remarkWikiLinks, options],
  renderer: {
    a: WikiLinkPreview
  }
});

export default remarkWikiLinks;
