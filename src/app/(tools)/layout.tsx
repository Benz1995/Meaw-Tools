import { ToolWorkspaceShell } from "@/components/tools/tool-workspace-shell";

export default function ToolsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ToolWorkspaceShell>{children}</ToolWorkspaceShell>;
}
