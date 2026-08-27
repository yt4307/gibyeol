import type { Preview } from "@storybook/nextjs-vite";
import AppGlobalStyles from "../src/app/GlobalStyles";
import { Providers } from "../src/app/providers";

const preview: Preview = {
  decorators: [
    (Story) => (
      <Providers>
        <AppGlobalStyles />
        <Story />
      </Providers>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
