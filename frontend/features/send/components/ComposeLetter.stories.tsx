import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ComposeLetter } from "./ComposeLetter";
const draft = { letterId: `0x${"1".repeat(64)}` as const, recipient: "", message: "12월의 나에게,", stage: "DRAFT" as const };
const meta = { title: "Send/Components/ComposeLetter", component: ComposeLetter, args: { draft, onChange: () => undefined, onSubmit: () => undefined, onReset: () => undefined } } satisfies Meta<typeof ComposeLetter>;
export default meta; type Story = StoryObj<typeof meta>;
export const Draft: Story = {};
export const Uploading: Story = { args: { draft: { ...draft, stage: "PACKED" }, busy: true } };
export const Failed: Story = { args: { error: "받는 분의 키가 바뀌어 다시 포장합니다." } };
