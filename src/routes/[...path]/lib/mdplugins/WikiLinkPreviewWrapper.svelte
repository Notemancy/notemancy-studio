<!-- WikiLinkPreviewWrapper.svelte -->
<script lang="ts">
  // Import the actual WikiLinkPreview (which uses get_page_content via Tauri)
  import WikiLinkPreview from "./WikiLinkPreview.svelte";

  // Forward all props that Carta passes (such as href and alias)
  export let href: string;
  export let alias: string;
</script>

<svelte:component this={WikiLinkPreview} {href} {alias} />
