import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PostOfficeFlow } from "./PostOfficeFlow";
const meta = { title: "PostOffice/Flows/Main", component: PostOfficeFlow } satisfies Meta<typeof PostOfficeFlow>;
export default meta; type Story = StoryObj<typeof meta>;
export const Default: Story = {};
