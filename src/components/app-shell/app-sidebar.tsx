"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { appNav, navItemFor } from "@/config/nav";
import { siteConfig } from "@/config/site";
import { can, type Role } from "@/server/authz/permissions";

export function AppSidebar({ role, organizationName }: { role: Role; organizationName: string }) {
  const pathname = usePathname();
  const active = navItemFor(pathname);
  // On phones the sidebar is a slide-over; close it once a link is chosen.
  const { setOpenMobile } = useSidebar();
  const closeOnMobile = () => setOpenMobile(false);
  // Only show what this role is allowed to open.
  const groups = appNav
    .map((group) => ({ ...group, items: group.items.filter((item) => can({ role }, item.permission)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={organizationName}>
              <Link href="/app" onClick={closeOnMobile}>
                <LogoMark className="size-8" />
                <span className="grid leading-tight">
                  <span className="font-semibold tracking-tight">{siteConfig.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{organizationName}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active?.href === item.href} tooltip={item.title}>
                    <Link href={item.href} onClick={closeOnMobile}>
                      <item.icon aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.preview && (
                    <SidebarMenuBadge className="text-[10px] font-medium text-muted-foreground uppercase">
                      Preview
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
