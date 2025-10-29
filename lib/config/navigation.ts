import {
  BarChart3,
  Boxes,
  Home,
  LineChart,
  LogOut,
  MessageCircle,
  Settings,
  UserRound,
} from "lucide-react";

export const DASHBOARD_NAV = [
  {
    label: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    label: "Sales",
    href: "/sales",
    icon: BarChart3,
  },
  {
    label: "Sales Operations",
    href: "/sales-ops",
    icon: Boxes,
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: LineChart,
  },
  {
    label: "Customer Sentiment",
    href: "/sentiment",
    icon: MessageCircle,
  },
] as const;

export const SECONDARY_NAV = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "My Profile",
    href: "/profile",
    icon: UserRound,
  },
  {
    label: "Logout",
    href: "/logout",
    icon: LogOut,
  },
] as const;
