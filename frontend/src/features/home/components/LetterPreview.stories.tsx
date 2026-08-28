import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LetterPreview } from "./LetterPreview";

const meta = {
  title: "Home/Components/LetterPreview",
  component: LetterPreview,
  args: {
    label: "2026 · CHRISTMAS POST",
    message: "그날의 당신에게,\n잊지 않고 전할게요.",
  },
} satisfies Meta<typeof LetterPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
