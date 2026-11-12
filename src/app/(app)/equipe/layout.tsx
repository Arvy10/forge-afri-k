import { TeamTabs } from "@/components/team/TeamTabs";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TeamTabs />
      {children}
    </>
  );
}
