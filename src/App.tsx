import { HeroSection } from "@/components/ui/hero-section"
import { Navbar } from "@/components/ui/navbar"
import { GooeyText } from "@/components/ui/gooey-text-morphing"

export default function App() {
  return (
    <>
      <Navbar />
      <HeroSection
      title="像编辑 PPT 一样"
      highlightText="修改任意网页"
      description="Morph 是一款强大的浏览器扩展，让你在页面上直接编辑 HTML 内容，零代码门槛，所见即所得。选中、点击、编辑 — 就这么简单。"
      buttonText="加入候补名单"
      onButtonClick={() => window.open("https://github.com", "_blank")}
      colors={["#0a0a0a", "#171717", "#262626", "#404040", "#737373", "#d4d4d4"]}
      distortion={1.0}
      speed={0.5}
      veilOpacity="bg-black/40 dark:bg-black/55"
      fontFamily="Satoshi, sans-serif"
      fontWeight={700}
      titleClassName="!text-white"
      descriptionClassName="!text-gray-200"
    >
      <div className="mb-10 h-16">
        <GooeyText
          texts={["Morph", "设计", "创造", "编辑"]}
          morphTime={1.2}
          cooldownTime={0.5}
          className="font-bold"
          textClassName="!text-4xl md:!text-5xl !text-primary"
        />
      </div>
    </HeroSection>
    </>
  )
}
