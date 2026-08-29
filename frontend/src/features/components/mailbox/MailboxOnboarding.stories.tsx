import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MailboxOnboarding } from "./MailboxOnboarding";
const meta = { title: "Mailbox/Components/Onboarding", component: MailboxOnboarding, args: { onRegister: () => undefined, onDeactivate: () => undefined } } satisfies Meta<typeof MailboxOnboarding>;
export default meta; type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Registered: Story = { args: { keyId: 2, active: true, deactivationSupported: true } };
export const Inactive: Story = { args: { keyId: 2, active: false, deactivationSupported: true } };
export const LegacyContract: Story = { args: { keyId: 2, active: true, deactivationSupported: false } };
