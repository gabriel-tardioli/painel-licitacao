import { Gavel, LayoutDashboard, Filter, DollarSign, MapPin, Database, Upload, FileOutput, Video } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão Executiva", url: "/", icon: LayoutDashboard },
  { title: "Visão Administrativa", url: "/funil", icon: Filter },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Análise Regional", url: "/regional", icon: MapPin },
  { title: "Base Detalhada", url: "/base", icon: Database },
  { title: "Importação de Dados Licitações", url: "/importacao", icon: Upload },
  { title: "Relatório", url: "/relatorio", icon: FileOutput },
  { title: "Relatório de Vídeo", url: "/relatorio-video", icon: Video },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-primary">
        <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Gavel className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-primary-foreground font-heading">Painel de Licitações</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-primary-foreground font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
