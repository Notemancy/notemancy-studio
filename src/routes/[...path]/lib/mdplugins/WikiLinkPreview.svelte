<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { component } from "@cartamd/plugin-component";
  import { api } from "$lib/api/client";
  import { createLinkPreview, melt } from "@melt-ui/svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { Slot } from "@cartamd/plugin-component/svelte";
  import rehypeCallouts from "rehype-callouts";
  import "rehype-callouts/theme/vitepress";
  import min_dark from "shiki/themes/min-dark.mjs";
  import min_light from "shiki/themes/min-light.mjs";
  import rehypeMermaid from "rehype-mermaid";
  import { Carta, Markdown, MarkdownEditor, type Plugin } from "carta-md";

  import { math } from "@cartamd/plugin-math";
  import { anchor } from "@cartamd/plugin-anchor";
  import "@cartamd/plugin-code/default.css";
  import { code } from "@cartamd/plugin-code";

  import DOMPurify from "isomorphic-dompurify";
  import "katex/dist/katex.css";

  // Your MD plugins (assume imported as before)
  import cartawiki from "../cartawiki";
  import everforest_dark from "shiki/themes/everforest-dark.mjs";

  // These props are passed in from Carta’s component mapping.
  let { href, children } = $props();

  const mermaid: Plugin = {
    transformers: [
      {
        execution: "async",
        type: "rehype",
        transform({ processor }) {
          processor.use(rehypeMermaid, { strategy: "img-png" });
        },
      },
    ],
  };

  const callouts: Plugin = {
    transformers: [
      {
        execution: "async",
        type: "rehype",
        transform({ processor }) {
          processor.use(rehypeCallouts);
        },
      },
    ],
  };

  const carta = new Carta({
    extensions: [
      cartawiki,
      math(),
      callouts,
      mermaid,
      anchor(),
      code({
        langs: [
          "javascript",
          "docker",
          "py",
          "markdown",
          "yaml",
          "toml",
          "bash",
        ],
      }),
    ],
    sanitizer: DOMPurify.sanitize,
  });

  // Remove a leading slash if present.
  const normalizedHref = href.startsWith("/") ? href.slice(1) : href;

  // A promise that resolves to the preview content.
  let contentPromise: Promise<string>;

  // Function that uses Tauri's get_page_content command.
  async function getContent(mdpath: string): Promise<string> {
    try {
      const response = await api.getPageContent(mdpath);
      if (!response || typeof response !== "object") {
        throw new Error("Invalid response format");
      }
      return response.content || "";
    } catch (error) {
      console.error("Error fetching preview content:", error);
      throw error;
    }
  }

  // On mount, begin fetching the preview content using the normalized href.
  onMount(() => {
    contentPromise = getContent(normalizedHref);
  });

  // Set up Melt‑UI's link preview.
  // (Use the actions without the $ prefix; only the state is a store.)
  const {
    elements: { trigger, content },
    states: { open },
  } = createLinkPreview();
</script>

<!-- The trigger link -->
<a
  {href}
  rel="noopener noreferrer"
  use:melt={$trigger}
  class="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black"
>
  <Slot />
</a>

{#if $open}
  <!-- The preview container is fixed to 500x500 and scrollable -->
  <div
    use:melt={$content}
    transition:fly={{ duration: 150, y: -8 }}
    class="border-muted shadow-popover mt-2 w-[500px] h-[500px] overflow-auto rounded-xl border dark:border-gray-300 bg-white dark:bg-gray-700 p-4"
  >
    <div
      class="prose lg:prose-base dark:prose-invert mt-0 pt-0 font-normal font-[Noto_Sans] w-full h-full"
    >
      <div
        class="mt-0 mb-4 border-b border-gray-300 pt-0 pb-3.5 text-[1.5rem] font-normal"
      >
        <a
          class="mt-0 pt-0 text-gray-800 hover:text-blue-600 dark:text-gray-50 dark:hover:text-blue-500"
          href="/"
        >
          Gnosis
        </a>
      </div>
      <div id="mdcontent" class="w-full h-full">
        {#await contentPromise}
          <p>Loading preview...</p>
        {:then content}
          {#key content}
            <Markdown {carta} value={content} />
          {/key}
        {:catch error}
          <p>Error loading preview: {error.message}</p>
        {/await}
      </div>
    </div>
  </div>
{/if}
