import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmailRegistration } from "./EmailRegistration";
const meta = { title: "Mailbox/Components/EmailRegistration", component: EmailRegistration, args: { onRequestCode: () => undefined, onVerifyCode: () => undefined } } satisfies Meta<typeof EmailRegistration>;
export default meta; type Story = StoryObj<typeof meta>;
export const Registration: Story = {};
export const CodeSent: Story = { args: { codeSent: true } };
export const Verified: Story = { args: { verified: true } };
