import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LetterReader } from "./LetterReader";
const meta = { title: "Inbox/Components/LetterReader", component: LetterReader, args: { letter: { message: "그해 겨울의 당신에게,\n오늘도 잘 지냈다고 전해요.", media: [] } } } satisfies Meta<typeof LetterReader>;
export default meta; type Story = StoryObj<typeof meta>; export const Default: Story = {};
