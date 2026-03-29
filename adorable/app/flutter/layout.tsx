import { SkyBackground } from "@/components/sky-background";
import "./landing.css";

export default function FlutterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sama-landing-page h-full w-full overflow-hidden isolate">
      <SkyBackground />
      {children}
    </div>
  );
}
