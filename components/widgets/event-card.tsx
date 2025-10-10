import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const presenters = [
  {
    id: "speaker-armando-gonzalez",
    name: "Marcelo Gavotti",
    title: "CEO",
    avatar:
      "https://res.cloudinary.com/dy7cv4bih/image/upload/v1759447491/CPF_Floors_-_SR_-_Marcelo_bs92fj.png",
  },
  {
    id: "speaker-jorge-guerrero",
    name: "Jorge Guerrero",
    title: "Commercial Director",
    avatar:
      "https://res.cloudinary.com/dy7cv4bih/image/upload/v1759447491/CPF_Floors_-_SR_-_Jorge_prxlue.png",
  },
];

export function EventCard() {
  return (
    <Card className="border-none bg-background shadow-none">
      <CardHeader className="space-y-2">
        <Badge
          variant="outline"
          className="w-fit border-transparent bg-[#FF7B00]/10 text-[13px] font-semibold uppercase tracking-[0.2em] text-[#FF7B00]"
        >
          Breakout session
        </Badge>
        <div>
          <h2 className="font-montserrat text-xl font-semibold">
            Launchpad Sales Performance
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Click, connect, create. Learn how to quickly design and deploy a
            sales playbook to get sales in new strategic regions with the new
            suite of AI-powered tools that CPF Floors is developing.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#FF7B00]/30 bg-[#FF7B00]/5 p-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-[#FF7B00] text-background">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              CPF Launchpad
            </p>
            <p className="text-sm text-muted-foreground">11:15 AM</p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
        <div className="space-y-3">
          {presenters.map((speaker) => (
            <div
              key={speaker.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3"
            >
              <div className="relative size-10 overflow-hidden rounded-full border border-border/40">
                <Image
                  src={speaker.avatar}
                  alt={speaker.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {speaker.name}
                </p>
                <p className="text-sm text-muted-foreground">{speaker.title}</p>
              </div>
              <div className="flex-1" />
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
