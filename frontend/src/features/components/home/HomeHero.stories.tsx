import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { homeContent } from "@features/data/home/home-content";
import { HomeHero } from "./HomeHero";

const meta = {
  title: "Home/Sections/HomeHero",
  component: HomeHero,
  args: { content: homeContent },
} satisfies Meta<typeof HomeHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShortCopy: Story = {
  args: {
    content: {
      ...homeContent,
      title: ["미래에 닿는", "한 통의 기별."],
      description: "오늘의 마음을 약속한 시간까지 안전하게 보관합니다.",
    },
  },
};
