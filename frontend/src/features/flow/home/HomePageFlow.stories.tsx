import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomePageFlow } from "./HomePageFlow";

const meta = {
  title: "Home/Flows/HomePage",
  component: HomePageFlow,
} satisfies Meta<typeof HomePageFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
