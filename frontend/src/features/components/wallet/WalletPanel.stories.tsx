import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WalletPanel } from "./WalletPanel";

const meta = {
  title: "Wallet/Components/WalletPanel",
  component: WalletPanel,
  args: {
    onConnect: () => undefined,
    onReconnect: () => undefined,
    onContinueSignature: () => undefined,
    onSelectAccount: () => undefined,
    onCancelAccountSelection: () => undefined,
    onChangeAccount: () => undefined,
    onChangeWallet: () => undefined,
    onLogout: () => undefined,
  },
} satisfies Meta<typeof WalletPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Disconnected: Story = {};
export const Connected: Story = { args: { address: "0x1234567890abcdef1234567890abcdef12345678" } };
export const AwaitingMobileSignature: Story = { args: { pendingSignatureAddress: "0x1234567890abcdef1234567890abcdef12345678" } };
export const AccountSelection: Story = {
  args: {
    availableAccounts: [
      "0x1234567890abcdef1234567890abcdef12345678",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    ],
  },
};
export const Failed: Story = { args: { error: "지원하는 네트워크로 전환해 주세요." } };
