// "(portal)" is a route group: it adds no URL segment, but every page in
// it shares this layout - the login check and the navigation bar.
import RequireAuth from '@/components/RequireAuth';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
