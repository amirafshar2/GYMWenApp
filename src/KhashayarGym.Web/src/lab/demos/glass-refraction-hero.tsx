// 21st demo: GlassRefractionHero (id 8754)
import GlassRefractionHero from "@/components/ui/glass-refraction-hero";

const settings = {
  title: "Glass Refraction",
  description:
    "Experience the beauty of light bending through glass with our stunning refraction effects.",
  primaryLabel: "Get Started",
  secondaryLabel: "Learn More",
};

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  return (
    <div className="h-screen w-screen">
      <GlassRefractionHero
        title={s.title}
        description={s.description}
        primaryAction={{ label: s.primaryLabel, onClick: () => {} }}
        secondaryAction={{ label: s.secondaryLabel, onClick: () => {} }}
      />
    </div>
  );
}
