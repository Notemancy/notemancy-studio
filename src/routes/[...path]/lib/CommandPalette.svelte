<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Command } from "bits-ui";

  import Icon from "@iconify/svelte";

  const dispatch = createEventDispatcher();

  function handleCommandSelect(command: string) {
    // Run command-specific logic here (if needed)
    console.log("Selected command:", command);
    // Dispatch a custom event with the selected command as detail
    dispatch("close", { command });
  }
</script>

<Command.Root
  class="bg-white w-[500px] max-w-lg flex flex-col divide-y rounded-xl border border-gray-100 divide-gray-100 overflow-hidden"
>
  <Command.Input
    class="w-full px-4 py-2 text-sm placeholder-gray-500 focus:outline-none"
    placeholder="Search for something..."
  />

  <Command.List class="max-h-[280px] overflow-y-auto">
    <Command.Viewport>
      <Command.Empty
        class="flex items-center justify-center p-4 text-gray-500 text-sm"
      >
        No results found.
      </Command.Empty>

      <Command.Group>
        <Command.GroupHeading
          class="px-3 pb-2 pt-4 text-xs text-gray-500 uppercase tracking-wide"
        >
          Commands
        </Command.GroupHeading>
        <Command.GroupItems>
          <Command.Item
            class="flex h-10 cursor-pointer select-none items-center gap-2 px-3 py-2 text-base hover:bg-gray-100"
            keywords={["settings"]}
            onSelect={() => handleCommandSelect("settings")}
          >
            <div class="flex items-center gap-4">
              <Icon
                icon="ri:settings-line"
                width="20"
                height="20"
                class="dark:text-gray-50 text-gray-700"
              />
              <div>Settings</div>
            </div></Command.Item
          >
          <Command.Item
            class="flex h-10 cursor-pointer select-none items-center gap-2 px-3 py-2 text-base hover:bg-gray-100"
            keywords={["scan"]}
            onSelect={() => handleCommandSelect("scan")}
          >
            <div class="flex items-center gap-4">
              <Icon
                icon="famicons:scan-sharp"
                width="20"
                height="20"
                class="dark:text-gray-50 text-gray-700"
              />
              <div>Scan</div>
            </div>
          </Command.Item>
        </Command.GroupItems>
      </Command.Group>
    </Command.Viewport>
  </Command.List>
</Command.Root>
