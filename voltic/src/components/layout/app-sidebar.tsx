"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Zap,
  BarChart3,
  Search,
  Users,
  LayoutGrid,
  Image,
  BookOpen,
  MessageSquareText,
  Scissors,
  Sparkles,
  Layers,
  Coins,
  TrendingUp,
  LineChart,
  Palette,
  Link2,
  Type,
  FileText,
  ChevronDown,
  Settings,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/events";
import { resetPostHog } from "@/lib/analytics/posthog-provider";

const mainNavItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Automations", href: "/automations", icon: Zap },
  { label: "Campaign Analysis", href: "/campaign-analysis", icon: BarChart3 },
  { label: "Discover", href: "/discover", icon: Search },
  { label: "Competitors", href: "/competitors", icon: Users },
  { label: "Boards", href: "/boards", icon: LayoutGrid },
  { label: "Assets", href: "/assets", icon: Image },
  { label: "Brand Guidelines", href: "/brand-guidelines", icon: BookOpen },
  { label: "Creative Studio", href: "/creative-studio", icon: MessageSquareText },
  { label: "Variations", href: "/variations", icon: Sparkles },
  { label: "Ad Generator", href: "/ad-generator", icon: Layers },
  { label: "Decomposition", href: "/decomposition", icon: Scissors },
  { label: "Credits", href: "/credits", icon: Coins },
];

const reportItems = [
  { label: "Top Ads", href: "/reports/top-ads", icon: TrendingUp },
  { label: "Top Campaigns", href: "/reports/top-campaigns", icon: LineChart },
  { label: "Top Creatives", href: "/reports/top-creatives", icon: Palette },
  { label: "Top Landing Pages", href: "/reports/top-landing-pages", icon: Link2 },
  { label: "Top Headlines", href: "/reports/top-headlines", icon: Type },
  { label: "Top Copy", href: "/reports/top-copy", icon: FileText },
];

interface AppSidebarProps {
  userEmail: string;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace } = useWorkspace();

  const initial = workspace.name.charAt(0).toUpperCase();

  function handleNavClick(destination: string) {
    track("sidebar_nav_clicked", {
      destination,
      current_page: pathname,
    });
  }

  async function handleLogout() {
    track("user_logged_out");
    resetPostHog();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      {/* Workspace Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-semibold text-sm">
                    {initial}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {workspace.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {workspace.slug}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-sm bg-emerald-600 text-white text-xs font-semibold">
                    {initial}
                  </div>
                  {workspace.name}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={
                        isActive
                          ? "border-l-2 border-emerald-600 rounded-l-none font-semibold"
                          : ""
                      }
                    >
                      <Link
                        href={item.href}
                        onClick={() => handleNavClick(item.href)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Reports Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={
                        isActive
                          ? "border-l-2 border-emerald-600 rounded-l-none font-semibold"
                          : ""
                      }
                    >
                      <Link
                        href={item.href}
                        onClick={() => handleNavClick(item.href)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {userEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userEmail}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => router.push("/settings")}
                >
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
