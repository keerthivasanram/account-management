// Klarves is company software for company computers: phones and tablets get the sign-in page
// with an explanation, never the app. The backend enforces the same rule (MOBILE_BLOCKED).
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|Silk|Kindle/i;

export const MOBILE_BLOCKED_MESSAGE =
  'Klarves is available on company computers only. Please sign in from your company laptop or desktop.';

/** True for phones and tablets, including iPads that report a desktop Safari user agent. */
export const isMobileDevice = (nav = typeof navigator !== 'undefined' ? navigator : null) => {
  if (!nav) return false;
  if (nav.userAgentData && nav.userAgentData.mobile === true) return true;
  if (MOBILE_UA.test(nav.userAgent || '')) return true;
  // iPadOS 13+ "desktop mode" says Macintosh; real Macs have no multi-touch screen
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1;
};

export const BLOCKED_PATH = '/?blocked=mobile';
