<!-- NotePreview.svelte -->
<script lang="ts">
	import { createLinkPreview, melt } from '@melt-ui/svelte';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { getAstNode } from 'svelte-exmarkdown';

	// Create the link preview; adjust options as needed.
	const {
		elements: { trigger, content, arrow },
		states: { open }
	} = createLinkPreview({ forceVisible: true });

	// Get the AST node representing this link.
	const astContext = getAstNode();

	// Local reactive variables.
	let pageLink: string = '';
	let linkText: string = '';
	let previewContent: string = '';

	// Remove sidebar elements from fetched HTML.
	function removeSidebar(htmlContent: string): string {
		if (!htmlContent) return '';
		const div = document.createElement('div');
		div.innerHTML = htmlContent;
		const sidebar = div.querySelector('[data-variant=sidebar]');
		if (sidebar) sidebar.remove();
		return div.querySelector('.prose')?.innerHTML || '';
	}

	onMount(async () => {
		// Check if the AST node has an "internal" link.
		if (astContext?.properties?.class?.includes('internal')) {
			pageLink = astContext.properties.href;
			// Assume the first child contains the link text.
			linkText = astContext.children?.[0]?.value || '';
			const response = await fetch(pageLink);
			let htmlContent = await response.text();
			previewContent = removeSidebar(htmlContent);
		}
	});
</script>

<!-- The link trigger using Melt's melt action -->
<a
	href={pageLink}
	target="_blank"
	rel="noopener noreferrer"
	use:melt={$trigger}
	class="text-magnum-900 focus-visible:ring-magnum-400 flex h-12 w-12 items-center justify-center rounded-full bg-white p-0 text-sm font-medium transition-colors hover:bg-white/90 focus-visible:ring focus-visible:ring-offset-2"
>
	{linkText}
</a>

{#if $open}
	<div
		use:melt={$content}
		transition:fly={{ y: -5, duration: 100 }}
		class="z-10 rounded-md bg-white shadow-sm"
	>
		<div class="h-[500px] w-[500px] overflow-auto p-2">
			{@html previewContent}
		</div>
		<div use:melt={$arrow} />
	</div>
{/if}
