import { MembersTabs } from "@/components/members/MembersTabs";

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MembersTabs />
      {children}
    </>
  );
}
