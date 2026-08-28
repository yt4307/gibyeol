import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RecoveryPanel } from "./RecoveryPanel";
const meta = { title: "Inbox/Components/RecoveryPanel", component: RecoveryPanel, args: { onRequestCode: async () => undefined, onRecover: () => undefined, onCancel: () => undefined } } satisfies Meta<typeof RecoveryPanel>;
export default meta; type Story = StoryObj<typeof meta>; export const Default: Story = {};
