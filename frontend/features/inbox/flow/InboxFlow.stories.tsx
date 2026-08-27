import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InboxFlow } from "./InboxFlow";
const meta = { title: "Inbox/Flows/Inbox", component: InboxFlow, args: { address: "0x1234567890abcdef1234567890abcdef12345678" } } satisfies Meta<typeof InboxFlow>;
export default meta; type Story = StoryObj<typeof meta>; export const Default: Story = {};
