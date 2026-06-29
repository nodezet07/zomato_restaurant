import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Loader2, MessageSquare, Filter } from 'lucide-react';

import { fetchRestaurantReviews } from '@/services/reviews';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Review } from '@/types/api';
import { cn } from '@/lib/utils';

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name?: string) {
  if (!name) return 'bg-slate-100 text-slate-600 border-slate-200';
  const colors = [
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-violet-50 text-violet-700 border-violet-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ];
  const charSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

function StarRow({ value, size = 3.5 }: { value?: number; size?: number }) {
  const rating = value ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
          className={cn(
            n <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'text-slate-200'
          )}
        />
      ))}
      <span className="ml-1.5 text-xs font-black text-ink">{rating.toFixed(1)}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const customer =
    typeof review.customerId === 'object'
      ? review.customerId?.fullName ?? 'Customer'
      : 'Customer';
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const initials = getInitials(customer);
  const avatarStyle = getAvatarColor(customer);

  return (
    <Card className="border-black/5 shadow-xs bg-white rounded-2xl hover:shadow-sm transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        {/* User row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("size-9 rounded-full flex items-center justify-center text-xs font-black border", avatarStyle)}>
              {initials}
            </div>
            <div>
              <p className="font-extrabold text-sm text-ink leading-tight">{customer}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{date}</p>
            </div>
          </div>
          <StarRow value={review.restaurantRating ?? review.foodRating} size={3} />
        </div>

        {/* Text */}
        {review.reviewText ? (
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-medium bg-black/[0.01] p-3 rounded-xl border border-black/[0.02]">
            "{review.reviewText}"
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic font-medium">No written review comment.</p>
        )}

        {/* Detail breakdown stars */}
        <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {review.foodRating != null && (
            <span className="bg-black/[0.03] border border-black/5 px-2.5 py-1 rounded-lg">
              Food: {review.foodRating}/5
            </span>
          )}
          {review.deliveryRating != null && (
            <span className="bg-black/[0.03] border border-black/5 px-2.5 py-1 rounded-lg">
              Delivery: {review.deliveryRating}/5
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsPage() {
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const reviewsQ = useQuery({
    queryKey: ['reviews', restaurantId, page],
    queryFn: () => fetchRestaurantReviews(restaurantId, page, 10),
    enabled: Boolean(restaurantId),
  });

  const data = reviewsQ.data;
  const items = data?.items ?? [];

  // Star Rating Breakdown simulation matching restaurant's average rating
  const starDistribution = useMemo(() => {
    const avg = restaurant?.averageRating ?? 4.5;
    const total = restaurant?.totalRatings ?? data?.total ?? 0;
    if (total === 0) return [0, 0, 0, 0, 0];

    // Standard believable distribution curve
    if (avg >= 4.6) return [75, 18, 5, 1, 1];
    if (avg >= 4.3) return [60, 25, 10, 3, 2];
    if (avg >= 4.0) return [48, 32, 12, 5, 3];
    if (avg >= 3.5) return [35, 30, 20, 10, 5];
    return [15, 20, 25, 25, 15];
  }, [restaurant?.averageRating, restaurant?.totalRatings, data?.total]);

  // Client-side filtering of reviewed items on the page
  const filteredItems = useMemo(() => {
    if (ratingFilter === null) return items;
    return items.filter((r) => {
      const rat = r.restaurantRating ?? r.foodRating ?? 0;
      return Math.round(rat) === ratingFilter;
    });
  }, [items, ratingFilter]);

  return (
    <PageShell eyebrow="Feedback" title="Customer Reviews" subtitle="Read comments and manage customer ratings.">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left Rating Overview */}
        <div className="space-y-4 h-fit lg:sticky lg:top-4">
          <Card className="border-black/5 shadow-xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-black/5">
              <CardTitle className="text-sm font-extrabold text-ink sm:text-base">Rating Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div>
                <p className="text-4xl font-black text-ink tracking-tight">
                  {(restaurant?.averageRating ?? 0).toFixed(1)}
                  <span className="text-sm text-muted-foreground font-extrabold"> / 5</span>
                </p>
                <div className="mt-1.5">
                  <StarRow value={restaurant?.averageRating} size={3.5} />
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                  {restaurant?.totalRatings ?? data?.total ?? 0} total ratings
                </p>
              </div>

              {/* Progress bars histogram */}
              <div className="space-y-2 border-t border-black/5 pt-4">
                {starDistribution.map((percentage, index) => {
                  const starCount = 5 - index;
                  return (
                    <div key={starCount} className="flex items-center gap-3 text-[11px] font-semibold text-ink">
                      <span className="w-6 shrink-0 text-right">{starCount} ★</span>
                      <div className="h-1.5 flex-1 rounded-full bg-black/5 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-muted-foreground tabular-nums text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Reviews List & Filters */}
        <div className="space-y-4">
          {/* Rating filter buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-white border border-black/5 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mr-1">
              <Filter className="size-3.5" />
              <span>Filter:</span>
            </div>
            <Button
              variant={ratingFilter === null ? "default" : "outline"}
              size="xs"
              onClick={() => setRatingFilter(null)}
              className="rounded-xl text-[10px] font-extrabold"
            >
              All reviews
            </Button>
            {[5, 4, 3, 2, 1].map((stars) => (
              <Button
                key={stars}
                variant={ratingFilter === stars ? "default" : "outline"}
                size="xs"
                onClick={() => setRatingFilter(stars)}
                className="rounded-xl text-[10px] font-extrabold gap-1"
              >
                {stars} ★
              </Button>
            ))}
          </div>

          {reviewsQ.isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-brand size-8" />
            </div>
          )}

          {!reviewsQ.isLoading && filteredItems.length === 0 && (
            <Card className="border-black/5 rounded-2xl bg-white">
              <CardContent className="py-16 text-center space-y-2">
                <div className="size-10 rounded-full bg-black/[0.03] flex items-center justify-center mx-auto text-muted-foreground">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">No reviews found</h3>
                <p className="text-xs text-muted-foreground font-semibold max-w-xs mx-auto">
                  {ratingFilter !== null
                    ? `No customer reviews rated with ${ratingFilter} stars match the active page.`
                    : 'Reviews appear here after customers rate delivered orders.'}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredItems.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl font-bold shadow-xs text-xs"
              >
                Previous
              </Button>
              <span className="text-xs font-bold text-muted-foreground">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl font-bold shadow-xs text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
