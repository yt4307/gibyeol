import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusPill } from "./StatusPill";

const meta = {
  title: "Home/Components/StatusPill",
  component: StatusPill,
  parameters: { layout: "centered" },
  args: { label: "크리스마스까지 D-120" },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Countdown: Story = {};

export const Arrived: Story = {
  args: { label: "기별이 도착하는 날" },
};
