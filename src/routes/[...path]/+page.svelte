<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import "./tw.css";
  import { api } from "$lib/api/client";
  import rehypeCallouts from "rehype-callouts";
  import "rehype-callouts/theme/vitepress";

  //import Markdown from "svelte-exmarkdown";
  import { math } from "@cartamd/plugin-math";
  import { anchor } from "@cartamd/plugin-anchor";
  import "@cartamd/plugin-code/default.css";
  import { code } from "@cartamd/plugin-code";

  import DOMPurify from "isomorphic-dompurify";
  import "katex/dist/katex.css";
  import { Carta, Markdown, MarkdownEditor, type Plugin } from "carta-md";

  // Your MD plugins (assume imported as before)
  import cartawiki from "./lib/cartawiki";
  import everforest_dark from "shiki/themes/everforest-dark.mjs";
  import everforest_light from "shiki/themes/everforest-light.mjs";
  import min_dark from "shiki/themes/min-dark.mjs";
  import min_light from "shiki/themes/min-light.mjs";

  import FileTree from "./lib/FileTree.svelte";
  import Icon from "@iconify/svelte";
  import ToC from "$lib/components/ToC.svelte";
  import rehypeMermaid from "rehype-mermaid";

  import { page } from "$app/stores";

  import { svelteCustom } from "@cartamd/plugin-component/svelte";
  import { initializeComponents } from "@cartamd/plugin-component/svelte";
  import { component } from "@cartamd/plugin-component";

  import WikiLinkPreview from "./lib/mdplugins/WikiLinkPreview.svelte";

  type PageContent = {
    content: string;
    metadata: Record<string, any>;
  };

  // Replace props with state
  let md = $state("");
  let metadata = $state({});
  // Hardcoded values (replacing env variables)
  const git = "richwill28";
  const email = "richwindsor@email.com";

  let currentVirtualPath = $state("");

  async function fetchContent() {
    try {
      const path = $page.params.path || "home.md";
      const decodedPath = path.replace(/%20/g, " ");
      currentVirtualPath = decodedPath;

      const response = await api.getPageContent(decodedPath);

      // Handle potential Ok wrapper and validate response
      if (!response || typeof response !== "object") {
        throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      }

      // Set content and metadata, with fallbacks
      md = response.content || "";
      metadata = response.metadata || {};
    } catch (e) {
      console.error("Error fetching content:", e);
      console.error("Full error details:", {
        name: e.name,
        message: e.message,
        stack: e.stack,
        api: api.constructor.name,
      });

      md =
        "Error loading content: " +
        (e instanceof Error ? e.message : String(e));
      metadata = {};
    }
  }

  // Replace the effect with our fetch
  $effect(() => {
    if ($page.params.path) {
      fetchContent();
    }
  });

  onMount(() => {
    fetchContent();
  });

  /*──────────────────────────────
    Dark Mode Toggling & Sidebar
  ──────────────────────────────*/
  let currentTheme: "dark" | "light" = $state("light");
  function updateTheme(theme: "dark" | "light") {
    currentTheme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }
  function toggleTheme() {
    updateTheme(currentTheme === "dark" ? "light" : "dark");
  }
  onMount(() => {
    const storedTheme = localStorage.getItem("theme") as
      | "dark"
      | "light"
      | null;
    if (storedTheme === "dark" || storedTheme === "light") {
      updateTheme(storedTheme);
    } else {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      updateTheme(systemPrefersDark ? "dark" : "light");
    }
    if (!localStorage.getItem("theme")) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (e) => {
        updateTheme(e.matches ? "dark" : "light");
      });
    }
  });
  let sidebarOpen = $state(true);
  let sidebarWidth = $state("");
  let toggleAlignment = $state("");
  $effect(() => {
    sidebarWidth = sidebarOpen ? "16rem" : "3rem";
  });
  $effect(() => {
    toggleAlignment = sidebarOpen ? "justify-between" : "justify-center";
  });

  /*──────────────────────────────
    TOC Implementation with $effect
  ──────────────────────────────*/

  let headings: { id: string; text: string; level: number }[] = $state([]);
  let observer: IntersectionObserver | null = null;
  let activeHeading = $state("");

  $effect(async () => {
    // Wait for the new markdown content to render
    md;
    await tick();
    const mdElement = document.getElementById("mdcontent");
    if (mdElement) {
      // Disconnect previous observer if it exists.
      if (observer) {
        observer.disconnect();
      }

      // Extract the headings
      const headingElements = Array.from(
        mdElement.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      );
      headings = headingElements.map((h) => ({
        id: h.id,
        text: h.textContent || "",
        level: Number(h.tagName.substring(1)),
      }));

      // Create a new IntersectionObserver for the new headings.
      observer = new IntersectionObserver(
        (entries) => {
          // Choose the first intersecting heading.
          const visibleEntry = entries.find((entry) => entry.isIntersecting);
          if (visibleEntry) {
            activeHeading = visibleEntry.target.id;
          }
        },
        {
          root: null,
          rootMargin: "0px 0px -80% 0px", // Adjust as needed.
          threshold: 0.1,
        },
      );

      // Observe each heading element.
      headingElements.forEach((el) => observer.observe(el));
    }
  });

  // Clean up when the component is destroyed.
  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  const mapped = [
    svelteCustom(
      "wiki-link",
      (node) => {
        const matched =
          node.tagName === "a" &&
          node.properties &&
          Array.isArray(node.properties.className) &&
          node.properties.className.includes("wiki-link");
        return matched;
      },
      WikiLinkPreview,
    ),
  ];

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

  let editorTheme = $state(min_light);

  function initializeCarta() {
    // Choose the editor theme based on current mode.
    editorTheme = currentTheme === "dark" ? min_dark : min_light;
    carta = new Carta({
      theme: editorTheme,
      shikiOptions: {
        // Provide both themes for dual mode support.
        themes: [min_light, min_dark],
      },
      extensions: [
        cartawiki,
        component(mapped, initializeComponents),
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
  }

  let carta = $state(
    new Carta({
      theme: editorTheme,
      shikiOptions: {
        // Provide both themes for dual mode support.
        themes: [everforest_light, everforest_dark],
      },
      extensions: [
        cartawiki,
        component(mapped, initializeComponents),
        math(),
        callouts,
        anchor(),
        mermaid,
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
    }),
  );

  let isEditing = $state(false);

  // Set up global keyboard shortcuts for toggling modes.
  function handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      isEditing = !isEditing;
      event.preventDefault();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  $inspect(currentVirtualPath);

  let autoSaveTimer: any = null;
  let savingStatus: "" | "error" | "saving" | "saved" = $state("");

  $effect(() => {
    const deps = [md, currentVirtualPath, isEditing];

    // Only set auto-save when editing
    if (isEditing) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(async () => {
        if (!md) {
          console.warn("Auto-save aborted: Missing content", { md });
          return;
        }

        const effectivePath = currentVirtualPath?.trim() || "home.md";
        savingStatus = "saving";

        try {
          await api.updatePageContent(md, null, effectivePath);
          savingStatus = "saved";

          // Clear the saved status after 2 seconds
          setTimeout(() => {
            savingStatus = "";
          }, 2000);
        } catch (error) {
          console.error("Auto-save failed:", error);
          savingStatus = "error";

          // Clear error status after 3 seconds
          setTimeout(() => {
            if (savingStatus === "error") {
              savingStatus = "";
            }
          }, 3000);
        }
      }, 500);
    }
  });

  onDestroy(() => {
    clearTimeout(autoSaveTimer);
  });
</script>

<!-- Overall Page Layout -->
<div class="relative min-h-screen bg-white p-8 pt-4 dark:bg-gray-800">
  <!-- Left Sidebar (FileTree), fixed -->
  <div
    class="fixed top-4 left-0 overflow-hidden transition-all duration-300 dark:bg-gray-800"
    style="width: {sidebarWidth}; height: calc(100vh - 1rem);"
  >
    <div class="flex h-12 items-center px-2 {toggleAlignment}">
      <button
        onclick={() => (sidebarOpen = !sidebarOpen)}
        class="flex items-center"
      >
        <Icon
          icon="ph:dots-nine-fill"
          width="32"
          height="32"
          class="transition-all duration-300 dark:text-gray-50"
          style="transform: rotate({sidebarOpen ? '0deg' : '180deg'});"
        />
      </button>
      {#if sidebarOpen}
        <button
          onclick={() => {
            if (currentTheme === "light") {
              document.documentElement.classList.add("dark");
              currentTheme = "dark";
            } else {
              document.documentElement.classList.remove("dark");
              currentTheme = "light";
            }
            // Reinitialize Carta with the updated theme.
            initializeCarta();
          }}
        >
          {#if currentTheme === "dark"}
            <Icon
              icon="tabler:sun-filled"
              width="20"
              height="20"
              class="text-gray-100 transition-all duration-300"
            />
          {:else}
            <Icon
              icon="ph:moon-fill"
              width="18"
              height="18"
              class="transition-all duration-300"
            />
          {/if}
        </button>
      {/if}
    </div>
    {#if sidebarOpen}
      <div class="overflow-y-auto" style="height: calc(100vh - 1rem - 3rem);">
        <FileTree />
      </div>
    {/if}
  </div>

  <!-- Main Content Area -->
  <div
    class="pl-8 transition-all duration-300"
    style="margin-left: {sidebarWidth};"
  >
    <!-- Markdown Content Container -->
    <div class="mt-0 max-w-[700px] pt-0">
      <div
        class="mt-0 mb-4 border-b border-gray-300 pt-0 pb-3.5 text-[1.8rem] font-normal"
      >
        <div class="mt-0 pt-0 text-gray-800 dark:text-gray-50">
          {metadata.title || "Notemancy"}
        </div>
      </div>
      <div
        class="justify-left mb-8 flex items-start gap-5 prose prose-base dark:prose-invert"
      >
        <a href={`https://github.com/${git}`} target="_blank">Github</a>
        <a href={`mailto:${email}`} target="_blank">Email</a>
      </div>

      {#if isEditing}
        <div class="max-w-[700px] prose prose-sm dark:prose-invert">
          {#key currentTheme}
            <MarkdownEditor
              {carta}
              bind:value={md}
              disableToolbar={true}
              theme={"tw"}
            />
          {/key}
        </div>
      {:else}
        <div
          id="mdcontent"
          class="prose dark:prose-invert font-normal font-[Noto_Sans] max-w-[700px]"
        >
          {#key currentTheme}
            {#key md}
              <Markdown {carta} value={md} />
            {/key}
          {/key}
        </div>
      {/if}

      <!-- TOC Sidebar -->
    </div>
  </div>

  {#if !isEditing}
    <div class="fixed top-5 right-5 flex w-[300px] justify-start">
      <ToC {headings} {activeHeading} />
    </div>
  {/if}

  {#if savingStatus}
    <div
      class="fixed bottom-5 right-5 bg-black bg-opacity-70 text-white px-5 py-3 rounded text-sm z-50"
    >
      {#if savingStatus === "saving"}
        Saving...
      {:else if savingStatus === "saved"}
        Saved!
      {/if}
    </div>
  {/if}
</div>

<!-- (Optional) Global styles for markdown, etc. -->
<style>
  @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap");

  /*:global(blockquote) {
    font-family: "Noto Sans Serif", serif;
    font-size: 1.2em;
    font-style: italic;
    color: #444;
    border-left: 4px solid #ddd;
    padding: 0.5em 1em;
    margin: 1.5em 0;
    background-color: #f9f9f9;
  }
  :global(blockquote cite) {
    display: block;
    text-align: right;
    font-size: 0.9em;
    font-style: normal;
    color: #666;
    margin-top: 0.5em;
  }*/
  :global(blockquote cite::before) {
    content: "— ";
  }
  /*:global(.shiki) {
    font-size: 16px;
  }*/

  :global(img) {
    border-radius: 6px;
  }

  :global([id^="mermaid-"]) {
    width: 60vw;
    max-width: 80vw;
    position: relative;
  }

  /*:global(.carta-font-code),
  :global(.carta-font-code *) {
    font-family: "Noto Sans", sans-serif !important;
    font-variant-ligatures: normal !important;
    font-size: 1rem !important;
    line-height: 1.5rem !important;
    caret-color: black;
  }*/
</style>
