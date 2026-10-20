import type { Metadata } from "next";
import WorkspaceShell from "@/components/features/workspace/WorkspaceShell";

export const metadata: Metadata = { title: "Facility workspace | SwasthyaSetu" };

export default function WorkspacePage() {
  return <WorkspaceShell />;
}
