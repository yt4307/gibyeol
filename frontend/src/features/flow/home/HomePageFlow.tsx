import { HomeHero } from "@features/components/home/HomeHero";
import { homeContent } from "@features/data/home/home-content";

export function HomePageFlow() {
  return <HomeHero content={homeContent} />;
}
