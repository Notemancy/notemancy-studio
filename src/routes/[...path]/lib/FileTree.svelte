<script lang="ts">
  import { onMount } from "svelte";
  import { createTreeView } from "@melt-ui/svelte";
  import { setContext } from "svelte";
  import Tree from "./Tree.svelte";
  import { api, type TreeItem } from "$lib/api/client";

  let treeItems: TreeItem[] = [];
  let error: string | null = null;
  let loading = true;

  async function fetchTree() {
    try {
      loading = true;
      error = null;

      const response = await api.getFileTree();

      // Validate the response structure
      if (!Array.isArray(response)) {
        throw new Error(
          `Invalid response format. Expected array, got: ${typeof response}`,
        );
      }

      treeItems = response;
    } catch (e) {
      console.error("Failed to fetch file tree:", e);
      error = e instanceof Error ? e.message : "Failed to load file tree";
      treeItems = [];
    } finally {
      loading = false;
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

{#if loading}
  <div class="p-4">Loading file tree...</div>
{:else if error}
  <div class="p-4 text-red-600">
    {error}
    <button
      class="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
      on:click={fetchTree}
    >
      Retry
    </button>
  </div>
{:else}
  <ul class="h-full overflow-y-auto dark:bg-[--color-gray-800]" {...$tree}>
    <Tree {treeItems} />
  </ul>
{/if}
