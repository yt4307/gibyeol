import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InboxList } from "./InboxList";
const letter = { letterId: `0x${"1".repeat(64)}` as const, sender: "0x1234567890abcdef1234567890abcdef12345678" as const, recipient: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const, recipientKeyId: 1, archiveSha256: `0x${"2".repeat(64)}` as const, transactionHash: `0x${"3".repeat(64)}` as const, blockNumber: 42n };
const meta = { title: "Inbox/Components/InboxList", component: InboxList, args: { letters: [letter], onOpen: () => undefined, onRecover: () => undefined } } satisfies Meta<typeof InboxList>;
export default meta; type Story = StoryObj<typeof meta>;
export const Locked: Story = {};
export const Empty: Story = { args: { letters: [] } };
