/**
 * EasyDrive Skeleton Loader Component (skeleton.js)
 * -----------------------------------------------------------
 * Provides animated placeholders to avoid layout shift and improve
 * perceived performance while asynchronous operations (API fetches) occur.
 */

/**
 * Returns HTML string containing placeholder skeleton cards.
 * @param {number} count - Number of skeleton cards to generate
 * @returns {string} HTML markup string
 */
export function renderCarSkeleton(count = 6) {
  let skeletons = '';
  for (let i = 0; i < count; i++) {
    skeletons += `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-line skeleton-line-sm" style="margin-top: 8px;"></div>
        <div class="skeleton skeleton-line skeleton-line-lg"></div>
        <div class="skeleton skeleton-line skeleton-line-md" style="margin-top: 12px;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px;">
          <div class="skeleton skeleton-line skeleton-line-sm" style="width: 30%; height: 24px;"></div>
          <div class="skeleton skeleton-line" style="width: 35%; height: 36px; border-radius: 8px;"></div>
        </div>
      </div>
    `;
  }
  return skeletons;
}
