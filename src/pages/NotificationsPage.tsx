import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationFeed,
} from '@/hooks/useNotificationsQuery';
import { Button } from '@/components/ui/button';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { toast } from 'sonner';

export function NotificationsPage() {
  const navigate = useNavigate();
  const feed = useNotificationFeed();
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  async function enableAlerts() {
    const ok = await registerForPushNotifications();
    toast[ok ? 'success' : 'error'](
      ok ? 'Push-style alerts enabled' : 'Could not enable notifications',
    );
  }

  return (
    <PageShell
      eyebrow="Alerts"
      title="Notifications"
      subtitle="Order updates, payouts, and system messages — same feed as customer & rider apps."
      action={
        <div className="flex flex-wrap gap-2">
          {feed.unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          ) : null}
          <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => void enableAlerts()}>
            Enable push alerts
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            disabled={feed.isFetching}
            onClick={() => void feed.refetch()}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${feed.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {feed.unread > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
            <Bell className="size-4 text-brand" />
            <p className="text-sm font-semibold text-ink">
              {feed.unread} unread notification{feed.unread === 1 ? '' : 's'}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm min-h-[200px]">
          {feed.isError ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Could not reach server — showing saved alerts. Tap Refresh when online.
            </div>
          ) : null}
          {feed.isFetching && !feed.loading ? (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted">
              <Loader2 className="size-3 animate-spin" /> Refreshing…
            </div>
          ) : null}
          <NotificationsList
            items={feed.items}
            loading={feed.loading}
            navigate={navigate}
            onItemClick={(item) => {
              if (!item.isRead) markOne.mutate(item._id);
            }}
          />
        </div>
      </div>
    </PageShell>
  );
}
