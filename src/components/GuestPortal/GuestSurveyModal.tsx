import React, { useEffect, useState } from 'react';
import { Star, CheckCircle2, Send, MessageSquareHeart } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { PostCheckoutSurveyRatings } from '../../types/hotel';
import { ModalDismissButton, useModalDismiss } from '../Common/ModalDismissHandler';
import kamalLogo from '../../assets/images/kamal_hotel_logo_1794545954396.jpg';

const RATING_DIMENSIONS: { key: keyof PostCheckoutSurveyRatings; label: string }[] = [
  { key: 'cleanliness', label: 'Room Cleanliness & Housekeeping' },
  { key: 'staffHospitality', label: 'Front Desk & Staff Hospitality' },
  { key: 'roomComfort', label: 'Bed Comfort & Quietness' },
  { key: 'diningExperience', label: 'Breakfast & Ground-Floor Dining' },
  { key: 'valueForMoney', label: 'Overall Value for Money' },
];

export const GuestSurveyModal: React.FC = () => {
  const {
    surveys,
    activeSurveyToken,
    closeSurveyModal,
    submitGuestSurveyResponse,
    themeConfig,
  } = useHotel();

  const targetSurvey = surveys.find(
    (s) => s.surveyToken === activeSurveyToken || s.id === activeSurveyToken
  );

  const [overallRating, setOverallRating] = useState<number>(5);
  const [ratings, setRatings] = useState<PostCheckoutSurveyRatings>({
    cleanliness: 5,
    staffHospitality: 5,
    roomComfort: 5,
    diningExperience: 5,
    valueForMoney: 5,
  });
  const [npsScore, setNpsScore] = useState<number>(9);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [comment, setComment] = useState<string>('');
  const [submittedNow, setSubmittedNow] = useState<boolean>(false);

  useEffect(() => {
    if (activeSurveyToken) {
      setOverallRating(5);
      setRatings({
        cleanliness: 5,
        staffHospitality: 5,
        roomComfort: 5,
        diningExperience: 5,
        valueForMoney: 5,
      });
      setNpsScore(9);
      setWouldRecommend(true);
      setComment('');
      setSubmittedNow(false);
    }
  }, [activeSurveyToken]);

  useModalDismiss({
    isOpen: Boolean(activeSurveyToken && targetSurvey),
    onClose: closeSurveyModal,
  });

  if (!activeSurveyToken || !targetSurvey) return null;

  const isCompleted = targetSurvey.status === 'completed' || submittedNow;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = submitGuestSurveyResponse(targetSurvey.id, {
      overallRating,
      ratings,
      npsScore,
      wouldRecommend,
      comment,
    });
    if (ok) {
      setSubmittedNow(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSurveyModal();
      }}
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 bg-stone-100/80 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#f8f6f0] border border-amber-700/25 shrink-0 flex items-center justify-center">
              <img
                src={kamalLogo}
                alt={`${themeConfig.hotelName} emblem`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50 truncate">
                Post-Checkout Stay Survey
              </h3>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {targetSurvey.guestName} · Room {targetSurvey.roomNumber} · {targetSurvey.bookingCode}
              </div>
            </div>
          </div>

          <ModalDismissButton onClose={closeSurveyModal} ariaLabel="Close stay survey" />
        </div>

        {isCompleted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Dhanyabad, {targetSurvey.guestName}!
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed max-w-sm mx-auto">
              Your {targetSurvey.overallRating || overallRating}/5 stay rating for Room {targetSurvey.roomNumber} ({targetSurvey.roomName}) has been recorded and shared with our Hotel Manager dashboard.
            </p>
            <button
              type="button"
              onClick={closeSurveyModal}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            {/* Overall Rating */}
            <div className="space-y-2">
              <label className="block font-semibold text-stone-800 dark:text-stone-200">
                Overall Experience at {themeConfig.hotelName}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      star <= overallRating
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                        : 'border-stone-200 dark:border-stone-700 text-stone-300 dark:text-stone-600'
                    }`}
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    <Star className={`w-5 h-5 ${star <= overallRating ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="ml-2 font-mono font-bold text-sm text-stone-800 dark:text-stone-200 tabular-nums">
                  {overallRating} / 5
                </span>
              </div>
            </div>

            {/* Detailed Service Dimensions */}
            <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="font-semibold text-stone-800 dark:text-stone-200">
                Service &amp; Department Ratings
              </div>
              {RATING_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="flex items-center justify-between gap-3">
                  <span className="text-stone-600 dark:text-stone-300">{dim.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRatings((prev) => ({ ...prev, [dim.key]: val }))}
                        className="p-1 cursor-pointer"
                        aria-label={`${dim.label}: ${val} stars`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            val <= ratings[dim.key]
                              ? 'text-amber-500 fill-current'
                              : 'text-stone-300 dark:text-stone-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* NPS Likelihood Scale */}
            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-stone-800 dark:text-stone-200">
                  How likely are you to recommend us to a friend? (0–10)
                </label>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {npsScore} / 10
                </span>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setNpsScore(n);
                      setWouldRecommend(n >= 7);
                    }}
                    className={`py-1.5 rounded font-mono font-semibold text-[11px] border transition-colors cursor-pointer tabular-nums ${
                      npsScore === n
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest Comment */}
            <div className="space-y-1.5">
              <label
                htmlFor="guest-survey-comment"
                className="block font-semibold text-stone-800 dark:text-stone-200"
              >
                Comments or Suggestions for Management
              </label>
              <textarea
                id="guest-survey-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what stood out or anything our team can improve..."
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={closeSurveyModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Stay Rating</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
