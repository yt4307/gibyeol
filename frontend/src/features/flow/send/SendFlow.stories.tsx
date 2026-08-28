import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SendFlow } from "./SendFlow";
const meta = { title: "Send/Flows/SendLetter", component: SendFlow, args: { address: "0x1234567890abcdef1234567890abcdef12345678" } } satisfies Meta<typeof SendFlow>;
export default meta; type Story = StoryObj<typeof meta>;
export const Default: Story = {};
