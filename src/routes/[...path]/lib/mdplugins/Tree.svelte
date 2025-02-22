<!-- Tree.svelte -->
<script lang="ts">
	// The nested tree data passed from Toc.svelte.
	export let tree: any[] = [];
	// Nesting level (for indentation); default is 1.
	export let level: number = 1;
	// The id of the currently active heading.
	export let activeHeadingId: string = '';
</script>

<ul style="margin: 0; list-style: none; padding-left: {level !== 1 ? '1rem' : '0'};">
	{#each tree as heading (heading.id)}
		<li style="margin-top: 0; padding-top: 0.5rem; display: flex; align-items: center;">
			<!-- Active section indicator -->
			<div
				style="
					width: 4px;
					height: 1em;
					margin-right: 4px;
					background: {heading.id === activeHeadingId ? '#3B82F6' : 'transparent'};
					transition: background 0.2s;
				"
			></div>
			<a
				href={'#' + heading.id}
				style="color: #6B7280; text-decoration: none; transition: color 0.2s;"
				on:click|preventDefault={() => {
					const element = document.getElementById(heading.id);
					if (element) {
						element.scrollIntoView({ behavior: 'smooth' });
					}
				}}
			>
				{@html heading.node.innerHTML}
			</a>
		</li>
		{#if heading.children && heading.children.length > 0}
			<svelte:self tree={heading.children} level={level + 1} {activeHeadingId} />
		{/if}
	{/each}
</ul>
