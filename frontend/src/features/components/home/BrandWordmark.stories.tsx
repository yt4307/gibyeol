import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BrandWordmark } from "./BrandWordmark";

const meta = {
  title: "Home/Components/BrandWordmark",
  component: BrandWordmark,
  parameters: { layout: "centered" },
  args: { children: "GIBYEOL" },
} satisfies Meta<typeof BrandWordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const KoreanName: Story = {
  args: { children: "기별" },
};
