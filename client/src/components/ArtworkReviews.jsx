import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { artworksAPI } from '../services/api';

const Stars = ({ value, onChange, size = 20 }) => (
  <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => {
      const active = star <= value;
      return onChange ? (
        <button
          type="button"
          key={star}
          onClick={() => onChange(star)}
          className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          <Star size={size} className={active ? 'fill-amber-500 text-amber-500' : 'text-stone-300'} />
        </button>
      ) : (
        <Star key={star} size={size} className={active ? 'fill-amber-500 text-amber-500' : 'text-stone-300'} />
      );
    })}
  </div>
);

const ArtworkReviews = ({ artworkId, isAuthenticated }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0, distribution: [] });
  const [eligibility, setEligibility] = useState(null);
  const [form, setForm] = useState({ rating: 0, title: '', comment: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    const response = await artworksAPI.getReviews(artworkId);
    setReviews(response.data.reviews || []);
    setSummary(response.data.summary || { average: 0, count: 0, distribution: [] });
  }, [artworkId]);

  const loadEligibility = useCallback(async () => {
    if (!isAuthenticated) {
      setEligibility(null);
      return;
    }
    try {
      const response = await artworksAPI.getReviewEligibility(artworkId);
      const data = response.data;
      setEligibility(data);
      if (data.review) {
        setForm({
          rating: data.review.rating,
          title: data.review.title || '',
          comment: data.review.comment || '',
        });
      }
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error('Failed to check review eligibility:', error);
      }
      setEligibility(null);
    }
  }, [artworkId, isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadReviews(), loadEligibility()])
      .catch((error) => console.error('Failed to load reviews:', error))
      .finally(() => setLoading(false));
  }, [loadReviews, loadEligibility]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.rating) return toast.error('Choose a star rating');
    if (form.comment.trim().length < 10) return toast.error('Write at least 10 characters');

    setSaving(true);
    try {
      if (eligibility.hasReview) {
        await artworksAPI.updateReview(artworkId, eligibility.review.id, form);
        toast.success('Your review was updated');
      } else {
        await artworksAPI.createReview(artworkId, form);
        toast.success('Thank you for sharing your review');
      }
      setEditing(false);
      await Promise.all([loadReviews(), loadEligibility()]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save your review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-24 pt-16 border-t border-stone-200" aria-labelledby="reviews-heading">
      <div className="grid gap-12 lg:grid-cols-[320px_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-amber-700">Collector voices</p>
          <h2 id="reviews-heading" className="mt-3 text-4xl font-serif text-stone-900">Reviews</h2>

          {summary.count > 0 ? (
            <div className="mt-7">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-serif text-stone-900">{summary.average.toFixed(1)}</span>
                <div className="pb-1">
                  <Stars value={Math.round(summary.average)} />
                  <p className="mt-1 text-sm text-stone-500">{summary.count} verified {summary.count === 1 ? 'review' : 'reviews'}</p>
                </div>
              </div>
              <div className="mt-7 space-y-2">
                {summary.distribution.map(({ rating, count }) => (
                  <div key={rating} className="grid grid-cols-[18px_1fr_24px] items-center gap-2 text-xs text-stone-500">
                    <span>{rating}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-stone-500">No collector reviews yet.</p>
          )}

          {!isAuthenticated && (
            <p className="mt-7 border-l-2 border-amber-500 pl-4 text-sm leading-6 text-stone-600">
              Verified collectors can review an artwork after delivery.
            </p>
          )}
          {isAuthenticated && eligibility && !eligibility.eligible && (
            <p className="mt-7 border-l-2 border-stone-300 pl-4 text-sm leading-6 text-stone-500">
              {eligibility.reason}
            </p>
          )}
        </div>

        <div>
          {eligibility?.eligible && (!eligibility.hasReview || editing) && (
            <form onSubmit={handleSubmit} className="mb-10 rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-serif text-stone-900">
                    {eligibility.hasReview ? 'Edit your review' : 'Share your experience'}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">Your review will be marked as a verified purchase.</p>
                </div>
                <Stars value={form.rating} onChange={(rating) => setForm((current) => ({ ...current, rating }))} size={26} />
              </div>
              <label className="mt-6 block">
                <span className="text-sm font-medium text-stone-700">Review title <span className="font-normal text-stone-400">(optional)</span></span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  maxLength={100}
                  placeholder="A memorable addition to my collection"
                  className="mt-2 w-full rounded-lg border border-stone-200 px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="mt-5 block">
                <span className="text-sm font-medium text-stone-700">Your review</span>
                <textarea
                  value={form.comment}
                  onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                  minLength={10}
                  maxLength={1500}
                  rows={5}
                  required
                  placeholder="Tell other collectors what you appreciate about this artwork..."
                  className="mt-2 w-full resize-y rounded-lg border border-stone-200 px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
                <span className="mt-1 block text-right text-xs text-stone-400">{form.comment.length}/1500</span>
              </label>
              <div className="mt-6 flex justify-end gap-3">
                {eligibility.hasReview && (
                  <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-stone-200 px-5 py-3 text-stone-600 hover:bg-stone-50">
                    Cancel
                  </button>
                )}
                <button disabled={saving} className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Saving...' : eligibility.hasReview ? 'Update review' : 'Publish review'}
                </button>
              </div>
            </form>
          )}

          {eligibility?.hasReview && !editing && (
            <div className="mb-8 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="flex items-center gap-3 text-sm text-stone-700">
                <CheckCircle2 size={18} className="text-amber-700" />
                Your verified review is published.
              </div>
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-950">
                <Edit3 size={16} /> Edit
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-stone-100" />)}
            </div>
          ) : reviews.length > 0 ? (
            <div className="divide-y divide-stone-200">
              {reviews.map((review) => (
                <article key={review.id} className="py-7 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Stars value={review.rating} />
                    <time className="text-xs text-stone-400" dateTime={review.createdAt}>
                      {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                  {review.title && <h3 className="mt-4 text-xl font-serif text-stone-900">{review.title}</h3>}
                  <p className="mt-3 whitespace-pre-line leading-7 text-stone-600">{review.comment}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="font-medium text-stone-800">{review.reviewer}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={14} /> Verified collector
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center text-stone-500">
              Be the first verified collector to share an experience with this work.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArtworkReviews;
