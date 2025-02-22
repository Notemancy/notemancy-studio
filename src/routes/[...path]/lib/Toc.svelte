<script lang="ts">
	// Import Svelte lifecycle and utilities.
	import { onMount, tick } from 'svelte';
	// Import Melt UI's Table of Contents creator.
	import { createTableOfContents } from '@melt-ui/svelte';
	import { pushState } from '$app/navigation';
	// Import the recursive TOC tree component.
	import TocTree from './TocTree.svelte';

	// Destructure props with a fallback for markdownContainerId.
	let { markdownContainerId = 'markdown-content' } = $props();

	// Create reactive state for headings and active heading indexes.
	let headingsTree = $state([]);
	let activeHeadingIdxs = $state([]);
	let item: any; // The Melt UI action for TOC items.

	onMount(async () => {
		// Wait until the DOM updates so that the markdown content is rendered.
		await tick();

		// Initialize the TOC using Melt UI.
		const toc = createTableOfContents({
			selector: `#${markdownContainerId}`,
			exclude: ['h1', 'h4', 'h5', 'h6'],
			activeType: 'all',
			pushStateFn: pushState,
			headingFilterFn: (heading) => !heading.hasAttribute('data-toc-ignore'),
			scrollFn: (id) => {
				// Scroll only within the markdown container.
				const container = document.getElementById(markdownContainerId);
				const element = document.getElementById(id);
				if (container && element) {
					container.scrollTo({
						top: element.offsetTop - container.offsetTop - 16,
						behavior: 'smooth'
					});
				}
			}
		});

		// Subscribe to Melt UI's reactive stores.
		const unsubscribeTree = toc.states.headingsTree.subscribe((value) => {
			headingsTree = value;
		});
		const unsubscribeActive = toc.states.activeHeadingIdxs.subscribe((value) => {
			activeHeadingIdxs = value;
		});
		// Save the TOC item action.
		item = toc.elements.item;

		// Cleanup subscriptions when unmounting.
		return () => {
			unsubscribeTree();
			unsubscribeActive();
		};
	});
</script>

<!-- Inline Tailwind classes -->
<div class="overflow-y-auto rounded bg-white p-4">
	<p class="font-semibold text-neutral-900">On This Page</p>
	<nav>
		{#if headingsTree.length > 0}
			<TocTree {headingsTree} {activeHeadingIdxs} {item} />
		{:else}
			<p>No headings found.</p>
		{/if}
	</nav>
</div>
