import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingRoleProvider } from '@/lib/marketing-role-context';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingRoleProvider>
      <div className="flex min-h-screen flex-1 flex-col">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </MarketingRoleProvider>
  );
}
