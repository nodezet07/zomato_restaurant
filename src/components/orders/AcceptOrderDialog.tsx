import { useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order } from '@/types/api';

const WAIT_OPTIONS = [15, 20, 25, 30, 35, 45, 60] as const;

type Props = {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (orderId: string, waitingMinutes: number) => Promise<void>;
  busy?: boolean;
};

export function AcceptOrderDialog({ order, open, onOpenChange, onAccept, busy }: Props) {
  const [minutes, setMinutes] = useState<string>('30');

  const orderLabel = order?.orderNumber ?? order?._id?.slice(-6).toUpperCase() ?? '';

  async function handleAccept() {
    if (!order) return;
    const waitingMinutes = Number(minutes);
    if (!Number.isFinite(waitingMinutes) || waitingMinutes < 5) {
      toast.error('Select a valid waiting time');
      return;
    }
    await onAccept(order._id, waitingMinutes);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-brand" />
            Accept order #{orderLabel}
          </DialogTitle>
          <DialogDescription>
            Set how long the customer should wait. They will see this on their tracking screen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="wait-time">Preparation time (minutes)</Label>
          <Select value={minutes} onValueChange={setMinutes}>
            <SelectTrigger id="wait-time" className="rounded-xl">
              <SelectValue placeholder="Select wait time" />
            </SelectTrigger>
            <SelectContent>
              {WAIT_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleAccept()} disabled={busy || !order} className="bg-brand hover:bg-brand/90">
            {busy ? 'Accepting…' : 'Accept order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
