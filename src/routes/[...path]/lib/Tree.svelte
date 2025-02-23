<script lang="ts">
	import { melt, type TreeView } from "@melt-ui/svelte";
	import { getContext } from "svelte";
	import { goto } from "$app/navigation";
	import Icon from "@iconify/svelte";

	// Define the type for a tree item.
	export type TreeItem = {
		title: string;
		link?: string;
		children?: TreeItem[];
	};

	export let treeItems: TreeItem[] = [];
	export let level: number = 1;

	// Get the tree view context from Melt UI.
	const {
		elements: { item, group },
		helpers: { isExpanded, isSelected },
	} = getContext<TreeView>("tree");

	// Group folders (with children) and files (without children) separately.
	$: folders = Array.isArray(treeItems)
		? treeItems.filter((t) => t?.children && t.children.length > 0)
		: [];
	$: files = Array.isArray(treeItems)
		? treeItems.filter(
				(t): t is TreeItem => !!t && (!t.children || t.children.length === 0),
			)
		: [];
	// If a link is defined, navigate using SvelteKit's goto.
	function handleClick(e: MouseEvent, link?: string) {
		if (link) {
			e.preventDefault();
			e.stopPropagation();
			goto("/" + link);
		}
	}
</script>

{#each folders as treeItem, i (treeItem.title + i)}
	{@const itemId = `${treeItem.title}-${i}`}
	<li class="{level !== 1 ? 'pl-4' : ''} dark:text-gray-100">
		<button
			class="flex w-full items-center gap-2 rounded-md p-2 hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-700"
			use:melt={$item({ id: itemId, hasChildren: true })}
			on:click|capture={(e) => handleClick(e, treeItem.link)}
			class:bg-gray-100={$isSelected(itemId)}
			class:dark:bg-gray-700={$isSelected(itemId)}
		>
			<!-- Chevron for folders -->
			<Icon
				icon="mynaui:chevron-right-solid"
				class={"h-5 w-5 transition-transform duration-200 " +
					($isExpanded(itemId) ? "rotate-90" : "")}
			/>
			<span class="flex-1 text-left font-semibold">{treeItem.title}</span>
		</button>
		{#if treeItem.children}
			<ul use:melt={$group({ id: itemId })}>
				<!-- Recursively render the folder's children -->
				<svelte:self treeItems={treeItem.children} level={level + 1} />
			</ul>
		{/if}
	</li>
{/each}

{#each files as treeItem, j (treeItem.title + j)}
	{@const itemId = `${treeItem.title}-${j}`}
	<li class="{level !== 1 ? 'pl-4' : ''} dark:text-gray-100">
		<button
			class="flex w-full items-center gap-2 rounded-md p-1 hover:bg-gray-50 focus:outline-none dark:hover:bg-gray-700"
			use:melt={$item({ id: itemId, hasChildren: false })}
			on:click|capture={(e) => handleClick(e, treeItem.link)}
			class:selected={$isSelected(itemId)}
		>
			<!-- Spacer for alignment -->
			<span class="inline-block h-4 w-4"></span>
			<span class="flex-1 text-left">{treeItem.title}</span>
		</button>
	</li>
{/each}

<style>
	/* Highlight the selected item */
	button.selected {
		background-color: var(--color-gray-700); /* Tailwind blue-100 */
	}
	li:focus {
		box-shadow: none !important;
	}
</style>
