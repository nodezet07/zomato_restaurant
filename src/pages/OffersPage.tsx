import { OffersTab } from '@/components/menu/OffersTab';
import { PageShell } from '@/components/layout/PageShell';
import { useRestaurantStore } from '@/stores/restaurantStore';

export function OffersPage() {
  const restaurantId = useRestaurantStore((s) => s.restaurant?._id ?? '');

  return (
    <PageShell
      eyebrow="Marketing"
      title="Offers & coupons"
      subtitle="Same coupons customers see in the app and apply at checkout"
    >
      {!restaurantId ? (
        <p className="text-sm text-muted">Loading restaurant…</p>
      ) : (
        <OffersTab restaurantId={restaurantId} />
      )}
    </PageShell>
  );
}
