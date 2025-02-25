<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "$lib/api/client";

	let { virtualPath } = $props();
	let referencingNotes: string[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	$effect(async () => {
		console.log("From comp", virtualPath);
		try {
			referencingNotes = await api.getReferencingNotes(virtualPath);
		} catch (e: any) {
			error = e.message || "Error fetching referencing notes";
		} finally {
			loading = false;
		}
	});

	// Extract the filename from the virtual path, removing the ".md" extension.
	function getTitle(path: string): string {
		const segments = path.split("/");
		let filename = segments[segments.length - 1];
		if (filename.endsWith(".md")) {
			filename = filename.slice(0, -3);
		}
		return filename;
	}
</script>

<div
	class="fixed bottom-8 right-5 rounded pl-0 ml-0 w-[300px] prose prose-sm dark:invert z-50"
>
	<h3 class="font-semibold mb-2">Connected Notes</h3>
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="text-red-500">{error}</p>
	{:else if referencingNotes.length === 0}
		<p>No connected notes found.</p>
	{:else}
		<ul class="list-none p-0 m-0">
			{#each referencingNotes as note}
				<li class="mb-1">
					<a href="/{note}" class="text-blue-600 hover:underline"
						>{getTitle(note)}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
</div>
