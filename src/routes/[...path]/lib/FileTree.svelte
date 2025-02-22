<script lang="ts">
	import { onMount } from "svelte";
	import { createTreeView } from "@melt-ui/svelte";
	import { setContext } from "svelte";
	import { invoke } from "@tauri-apps/api/core";
	import Tree from "./Tree.svelte";
	import TreeItem from "./Tree.svelte";

	let treeItems: TreeItem[] = [];

	// Fetch the tree data using Tauri command
	async function fetchTree() {
		try {
			treeItems = await invoke("get_file_tree");
			console.log("Tree items:", treeItems);
		} catch (e) {
			console.error("Failed to fetch file tree:", e);
		}
	}

	onMount(() => {
		fetchTree();
	});

	// Create the tree view context
	const ctx = createTreeView({ defaultExpanded: [] });
	setContext("tree", ctx);
	const {
		elements: { tree },
	} = ctx;
</script>

<ul class="h-full overflow-y-auto dark:bg-[--color-gray-800]" {...$tree}>
	<Tree {treeItems} />
</ul>
