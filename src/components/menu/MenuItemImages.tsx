import { Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
};

export function MenuItemImages({ images, onChange, max = 5 }: Props) {
  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    if (images.length >= max) {
      toast.error(`Maximum ${max} images`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange([...images, String(reader.result)]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase text-muted tracking-wider">
        Product images ({images.length}/{max})
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-black/5 bg-slate-50">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <label className="flex flex-col items-center justify-center aspect-square border border-dashed border-black/10 rounded-xl bg-slate-50 hover:border-brand/40 cursor-pointer">
            <Upload className="size-4 text-muted mb-1" />
            <span className="text-[9px] font-bold text-muted">Add</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFilePick} />
          </label>
        )}
      </div>
    </div>
  );
}
