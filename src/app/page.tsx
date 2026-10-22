import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

// Temporary home page: replaced by the landing page on Wed 28 Oct.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">Work in progress</p>
      <h1 className="text-4xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="max-w-md text-muted-foreground">{siteConfig.description}</p>
      <Button disabled title="The demo opens once login is built">
        Live demo coming soon
      </Button>
    </main>
  );
}
