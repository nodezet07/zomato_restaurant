import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { MenuAddon } from '@/types/api';

type AddonRow = MenuAddon & { kind: 'portion' | 'extra' };

function toRows(addons: MenuAddon[]): AddonRow[] {
  return addons.map((a) => ({
    ...a,
    kind: /^(portion|size):/i.test(a.name) ? 'portion' : 'extra',
  }));
}

function fromRows(rows: AddonRow[]): MenuAddon[] {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => {
      const label = r.name.trim();
      const name =
        r.kind === 'portion' && !/^(portion|size):/i.test(label)
          ? `Portion: ${label}`
          : label;
      return {
        name,
        price: Number(r.price) || 0,
        isAvailable: r.isAvailable !== false,
      };
    });
}

type Props = {
  value: MenuAddon[];
  onChange: (addons: MenuAddon[]) => void;
};

export function AddonFields({ value, onChange }: Props) {
  const rows = toRows(value.length ? value : []);

  const setRows = (next: AddonRow[]) => onChange(fromRows(next));

  const addRow = (kind: 'portion' | 'extra') => {
    setRows([
      ...rows,
      {
        kind,
        name: kind === 'portion' ? 'Half' : 'Extra Raita',
        price: 0,
        isAvailable: true,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-black uppercase tracking-wider text-muted">
          Customization (sizes & extras)
        </Label>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold rounded-lg" onClick={() => addRow('portion')}>
            <Plus className="mr-1 h-3 w-3" /> Size
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold rounded-lg" onClick={() => addRow('extra')}>
            <Plus className="mr-1 h-3 w-3" /> Extra
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/10 bg-slate-50/80 px-3 py-4 text-center text-[11px] text-muted font-semibold">
          No addons yet. Customers see a customize modal when addons exist (like in the app).
        </p>
      )}

      {rows.map((row, idx) => (
        <div
          key={idx}
          className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-black/5 bg-slate-50/50 p-2"
        >
          {/* Kind Select */}
          <div className="w-24 shrink-0">
            <Select
              value={row.kind}
              onValueChange={(v) => {
                const next = [...rows];
                next[idx] = { ...row, kind: v as 'portion' | 'extra' };
                setRows(next);
              }}
            >
              <SelectTrigger className="h-8 text-[10px] font-bold bg-white border-black/10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1">
                <SelectItem value="portion" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">Size</SelectItem>
                <SelectItem value="extra" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name Input */}
          <div className="flex-1 min-w-[120px]">
            <Input
              value={row.name.replace(/^(Portion|Size):\s*/i, '')}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...row, name: e.target.value };
                setRows(next);
              }}
              placeholder={row.kind === 'portion' ? 'e.g. Half' : 'e.g. Extra cheese'}
              className="h-8 text-xs font-semibold bg-white border-black/10 rounded-lg placeholder:text-muted"
            />
          </div>

          {/* Price Input */}
          <div className="w-20 shrink-0 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted">₹</span>
            <Input
              type="number"
              min={0}
              value={row.price}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...row, price: Number(e.target.value) };
                setRows(next);
              }}
              placeholder="0"
              className="h-8 pl-4.5 pr-1 text-xs font-semibold bg-white border-black/10 rounded-lg"
            />
          </div>

          {/* Availability Switch */}
          <div className="flex items-center gap-1.5 px-1 select-none shrink-0">
            <span className="text-[10px] font-bold text-muted">Active</span>
            <Switch
              checked={row.isAvailable !== false}
              onCheckedChange={(checked) => {
                const next = [...rows];
                next[idx] = { ...row, isAvailable: checked };
                setRows(next);
              }}
            />
          </div>

          {/* Delete Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer"
            onClick={() => setRows(rows.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
