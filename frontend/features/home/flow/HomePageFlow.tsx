import { HomeHero } from "../components/HomeHero";
import { homeContent } from "../data/home-content";

export function HomePageFlow() {
  return <HomeHero content={homeContent} />;
}
