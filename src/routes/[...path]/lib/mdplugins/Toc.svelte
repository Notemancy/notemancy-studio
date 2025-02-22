<!-- Toc.svelte -->
<script lang="ts">
	import { getAstNode } from 'svelte-exmarkdown';
	import { onMount, onDestroy, tick } from 'svelte';
	import Tree from './Tree.svelte';

	// Retrieve the AST node injected by our rehype TOC plugin.
	const astContext = getAstNode();

	// The injected tocData should be an array of objects with { id, text, level }.
	// (getAstNode returns a store, so we access its value via $astContext.)
	let tocData: Array<{ id: string; text: string; level: number }> = [];
	$: tocData = ($astContext && $astContext.properties && $astContext.properties.tocData) || [];

	/**
	 * Build a nested tree structure from the flat list of headings.
	 * Each item in the tree will have:
	 * - id: heading id
	 * - node: a simulated node containing innerHTML (used by the Tree component)
	 * - level: heading level (number)
	 * - children: array of sub-headings
	 */
	function buildTocTree(headings: Array<{ id: string; text: string; level: number }>) {
		const tree = [];
		const stack = [];
		for (const heading of headings) {
			const item = {
				id: heading.id,
				node: { innerHTML: heading.text },
				level: heading.level,
				children: []
			};
			// Pop out headings until finding a parent with a lower level.
			while (stack.length && heading.level <= stack[stack.length - 1].level) {
				stack.pop();
			}
			if (stack.length === 0) {
				tree.push(item);
			} else {
				stack[stack.length - 1].children.push(item);
			}
			stack.push(item);
		}
		return tree;
	}

	// Build the nested tree whenever tocData changes.
	$: tocTree = buildTocTree(tocData);

	// Track the active heading's id for the section indicator.
	let activeHeadingId = '';

	// IntersectionObserver instance (client‑only).
	let observer: IntersectionObserver;

	// Set up the observer only on the client.
	function setupObserver() {
		if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
			return;
		}
		observer = new IntersectionObserver(
			(entries) => {
				// Filter for entries that are at least 50% visible.
				const visibleEntries = entries.filter((entry) => entry.isIntersecting);
				if (visibleEntries.length > 0) {
					// Sort the visible entries by their top position.
					visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
					activeHeadingId = visibleEntries[0].target.id;
				}
			},
			{
				threshold: 0.5
			}
		);
		// Query all headings by id from the tocData.
		const elements = tocData.map((d) => document.getElementById(d.id)).filter((el) => el !== null);
		elements.forEach((el) => observer.observe(el));
	}

	// Run observer setup on mount (client‑only).
	onMount(async () => {
		if (typeof window === 'undefined') return;
		await tick(); // Wait for DOM updates.
		setupObserver();
	});

	// If tocData changes on the client, reset the observer.
	$: if (tocData.length > 0 && typeof window !== 'undefined') {
		if (observer) {
			observer.disconnect();
		}
		tick().then(setupObserver);
	}

	onDestroy(() => {
		if (observer) {
			observer.disconnect();
		}
	});
</script>

<!-- Sticky right sidebar container for the TOC -->
<div
	style="
		position: fixed;
		top: 50px;
		right: 20px;
		width: 250px;
		max-height: calc(100vh - 70px);
		overflow-y: auto;
		padding: 10px;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
	"
>
	<p style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">On This Page</p>
	<nav>
		{#if tocTree.length > 0}
			<!-- Pass the nested tree and activeHeadingId to the Tree component -->
			<Tree tree={tocTree} {activeHeadingId} />
		{:else}
			<p>No headings found.</p>
		{/if}
	</nav>
</div>
