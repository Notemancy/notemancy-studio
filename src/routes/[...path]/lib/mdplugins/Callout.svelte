<!-- Callout.svelte -->
<script lang="ts">
	import { getAstNode } from 'svelte-exmarkdown';
	import { onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';

	// Retrieve the AST node that contains our custom properties.
	const astContext = getAstNode();

	// Initialize state
	let componentId = crypto.randomUUID();
	let isCollapsed = false;
	let iconName = '';
	let iconColor = '';
	let isCallout = false;
	let calloutType = '';
	let isCollapsible = false;

	// Update state reactively based on the AST properties.
	$: {
		if ($astContext?.properties?.className?.includes('markdown-callout')) {
			isCallout = true;
			calloutType = $astContext.properties['data-type'] || '';
			isCollapsible = $astContext.properties['data-collapsible'] || false;
			iconName = $astContext.properties['data-icon'] || '';
			iconColor = $astContext.properties['data-icon-color'] || '';
		} else {
			isCallout = false;
			calloutType = '';
			isCollapsible = false;
			iconName = '';
			iconColor = '';
		}
	}

	// Toggle the collapsed state if the callout is collapsible.
	function toggleCollapse() {
		if (isCollapsible) {
			isCollapsed = !isCollapsed;
		}
	}

	onDestroy(() => {
		// No additional cleanup is required.
	});
</script>

{#if isCallout}
	<!-- A minimal callout container without the colored side border -->
	<div
		class="my-8 rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-gray-700"
		data-callout-id={componentId}
	>
		<div class="flex items-center gap-2">
			{#if isCollapsible}
				<!-- Toggle button using Iconify chevrons -->
				<button on:click={toggleCollapse} class="text-gray-500 hover:text-gray-700">
					<Icon
						icon={isCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-down'}
						width="16"
						height="16"
					/>
				</button>
			{/if}

			{#if iconName}
				<!-- Render the icon with the provided color -->
				<Icon icon={iconName} width="20" height="20" style="color: {iconColor};" />
			{/if}

			<span class="font-medium text-gray-700 capitalize dark:text-gray-100">{calloutType}</span>
		</div>

		{#if !isCollapsed}
			<div class="prose-sm mt-2 text-gray-600 dark:text-gray-200">
				<slot />
			</div>
		{/if}
	</div>
{:else}
	<slot />
{/if}
