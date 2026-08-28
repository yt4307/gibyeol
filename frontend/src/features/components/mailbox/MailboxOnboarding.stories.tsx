import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MailboxOnboarding } from "./MailboxOnboarding";
const meta = { title: "Mailbox/Components/Onboarding", component: MailboxOnboarding, args: { onRegister: () => undefined } } satisfies Meta<typeof MailboxOnboarding>;
export default meta; type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Registered: Story = { args: { keyId: 2 } };
