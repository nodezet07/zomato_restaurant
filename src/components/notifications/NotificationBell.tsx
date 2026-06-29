import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationFeed,
} from '@/hooks/useNotificationsQuery';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type Props = {
  enabled?: boolean;
  onOrderSelect?: (orderId: string) => void;
};

export function NotificationBell({ enabled = true, onOrderSelect }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const feed = useNotificationFeed(enabled);
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void feed.refetch();
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-ink shadow-sm transition hover:border-brand/30 hover:bg-brand/5"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" strokeWidth={2.25} />
          {feed.unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 py-0.5 text-[9px] font-black text-white">
              {feed.unread > 9 ? '9+' : feed.unread}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b border-black/5 pb-3">
          <div className="flex items-center justify-between gap-2 pr-6">
            <SheetTitle className="text-base font-extrabold">Notifications</SheetTitle>
            {feed.unread > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-bold text-brand"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
          {feed.unread > 0 ? (
            <p className="text-left text-xs text-muted">{feed.unread} unread</p>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3">
          <NotificationsList
            items={feed.items.slice(0, 20)}
            loading={feed.loading}
            compact
            navigate={navigate}
            onOrderSelect={onOrderSelect}
            onItemClick={(item) => {
              if (!item.isRead) markOne.mutate(item._id);
            }}
          />
        </div>

        <div className="border-t border-black/5 pt-3">
          <Button
            variant="outline"
            className="w-full rounded-xl font-bold"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View all notifications
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
