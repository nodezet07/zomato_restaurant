import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Loader2 } from 'lucide-react';
import { fetchRestaurantReviews } from '@/services/reviews';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Review } from '@/types/api';

function StarRow({ value }: { value?: number }) {
  const rating = value ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
        />
      ))}
      <span className="ml-1 text-xs font-bold text-ink">{rating.toFixed(1)}</span>
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

  return (
    <Card className="border-black/5 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-sm text-ink">{customer}</p>
            <p className="text-[10px] text-muted font-medium">{date}</p>
          </div>
          <StarRow value={review.restaurantRating ?? review.foodRating} />
        </div>
        {review.reviewText && (
          <p className="text-sm text-ink/80 leading-relaxed">{review.reviewText}</p>
        )}
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-muted">
          {review.foodRating != null && <span>Food: {review.foodRating}/5</span>}
          {review.deliveryRating != null && <span>Delivery: {review.deliveryRating}/5</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsPage() {
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';
  const [page, setPage] = useState(1);

  const reviewsQ = useQuery({
    queryKey: ['reviews', restaurantId, page],
    queryFn: () => fetchRestaurantReviews(restaurantId, page, 10),
    enabled: Boolean(restaurantId),
  });

  const data = reviewsQ.data;
  const items = data?.items ?? [];

  return (
    <PageShell eyebrow="Feedback" title="Customer reviews">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="border-black/5 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-base">Rating summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-black text-ink">
              {(restaurant?.averageRating ?? 0).toFixed(1)}
              <span className="text-lg text-muted font-bold"> / 5</span>
            </p>
            <StarRow value={restaurant?.averageRating} />
            <p className="text-xs text-muted font-medium">
              {restaurant?.totalRatings ?? data?.total ?? 0} total reviews
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {reviewsQ.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand size-8" />
            </div>
          )}

          {!reviewsQ.isLoading && items.length === 0 && (
            <Card className="border-black/5">
              <CardContent className="py-12 text-center text-sm text-muted">
                No reviews yet. Reviews appear here after customers rate delivered orders.
              </CardContent>
            </Card>
          )}

          {items.map((r) => (
            <ReviewCard key={r._id} review={r} />
          ))}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs font-bold text-muted">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
