<script lang="ts">
	import { createCollapsible, melt } from '@melt-ui/svelte';
	import { onMount } from 'svelte';

	let { headings, activeHeading } = $props();
	const {
		elements: { root, trigger, content },
		states: { open }
	} = createCollapsible({ defaultOpen: true });

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
	}

	// Indent unit in rem
	const INDENT_UNIT = 1.0;

	let processedHeadings = $state([]);

	// Use Svelte 5's $effect rune to update processedHeadings reactively.
	$effect(() => {
		if (!headings || headings.length === 0) {
			processedHeadings = [];
			return;
		}
		const processed = [];
		// First heading: start with 0 rem indent.
		processed.push({ ...headings[0], margin: 0 });
		for (let i = 1; i < headings.length; i++) {
			const prevHeading = headings[i - 1];
			const prevMargin = processed[i - 1].margin;
			let newMargin = prevMargin;
			if (headings[i].level > prevHeading.level) {
				// Increase indent.
				newMargin = prevMargin + INDENT_UNIT;
			} else if (headings[i].level < prevHeading.level) {
				// Decrease indent (not below 0).
				newMargin = Math.max(0, prevMargin - INDENT_UNIT);
			}
			// If same level, keep the same margin.
			processed.push({ ...headings[i], margin: newMargin });
		}
		processedHeadings = processed;
	});
</script>

<!-- Container always takes full available width (up to max-w-xs) -->
<div class="w-full max-w-xs rounded-lg p-4" use:melt={$root}>
	<!-- Trigger button with clean typography -->
	<button
		class="w-full text-left font-semibold text-gray-800 transition-colors duration-300 hover:text-blue-600 dark:text-gray-100"
		use:melt={$trigger}
	>
		Table of Contents {open ? '▾' : '▸'}
	</button>
	<!-- Collapsible content -->
	<div class="prose-sm mt-3" use:melt={$content}>
		<ul class="ml-0 w-full list-none pl-0">
			{#each processedHeadings as heading}
				<li
					onclick={() => scrollToHeading(heading.id)}
					class="py-0.1 cursor-pointer transition-colors duration-300 hover:text-blue-500 {heading.id ===
					activeHeading
						? 'text-blue-500 dark:text-blue-400'
						: 'text-gray-600 dark:text-gray-300'}"
					style="margin-left: {heading.margin}rem;"
				>
					{heading.text}
				</li>
			{/each}
		</ul>
	</div>
</div>
