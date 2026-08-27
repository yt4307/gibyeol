import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PrimaryAction } from "./PrimaryAction";

const meta = {
  title: "Home/Components/PrimaryAction",
  component: PrimaryAction,
  parameters: { layout: "centered" },
  args: {
    href: "#about",
    children: "기별 이야기 보기",
  },
} satisfies Meta<typeof PrimaryAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
