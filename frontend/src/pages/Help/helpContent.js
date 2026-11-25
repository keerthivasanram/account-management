// Help articles for the Klarves workspace. Plain data so they're searchable and testable.

export const TICKET_CATEGORIES = [
  { id: 'ACCOUNT_SETUP', label: 'Account setup' },
  { id: 'PUBLISHING', label: 'Publishing' },
  { id: 'ACCESS', label: 'Access & sign-in' },
  { id: 'OTHER', label: 'Something else' },
];
export const ticketCategoryLabel = (id) => TICKET_CATEGORIES.find((c) => c.id === id)?.label || 'Something else';

export const TICKET_STATUS = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };

export const ARTICLES = [
  {
    id: 'add-account', category: 'ACCOUNT_SETUP', title: 'Add an Instagram account',
    body: [
      'Go to My accounts and choose Add account.',
      'Enter the Instagram username. The profile link fills in for you.',
      'Only Business or Creator accounts can be added; Instagram does not allow publishing to personal accounts.',
      'The account is assigned to you and an administrator reviews it. You get a Mail when it is approved or rejected.',
    ],
    to: '/accounts/new', action: 'Add account',
  },
  {
    id: 'import-accounts', category: 'ACCOUNT_SETUP', title: 'Import several accounts from a file',
    body: [
      'Go to My accounts and choose Import accounts, then download the CSV template.',
      'Fill in one account per row. Only the username column is required.',
      'Choose the file. You see a preview first and nothing is saved until you choose Add.',
      'Rows marked Duplicate or Needs fixing are skipped; fix them in the file and import again.',
    ],
    to: '/accounts/import', action: 'Import accounts',
  },
  {
    id: 'connect-instagram', category: 'ACCOUNT_SETUP', title: 'Connect or reconnect an account to Instagram',
    body: [
      'Open My accounts and choose Connect on the account. You sign in with Meta (Facebook) and approve access.',
      'Sign in with the Facebook profile that manages the Instagram account.',
      'Access expires from time to time. When it does, the dashboard shows Reconnect account under Needs attention; repeat the steps above.',
    ],
    to: '/accounts', action: 'My accounts',
  },
  {
    id: 'publish-post', category: 'PUBLISHING', title: 'Create a post and send it for approval',
    body: [
      'Go to Publishing and choose Create post.',
      'Pick one of your accounts, upload a photo or video (JPG, PNG, MP4 or MOV, up to 50 MB), choose the format and the publish time, and write the caption.',
      'Save draft keeps it to yourself. Submit for approval sends it to an administrator.',
      'You get a Mail when it is approved (it moves to Scheduled) or sent back with a note (it returns to Drafts).',
    ],
    to: '/social/posts', action: 'Publishing',
  },
  {
    id: 'post-sent-back', category: 'PUBLISHING', title: 'My post was sent back',
    body: [
      'Open Publishing > Drafts. The post shows Needs changes with the reviewer’s note.',
      'Choose Edit, make the changes, and choose Submit for approval again.',
      'If the publish time has passed, pick a new time before submitting.',
    ],
    to: '/social/posts?tab=drafts', action: 'Open drafts',
  },
  {
    id: 'upload-failed', category: 'PUBLISHING', title: 'My photo or video won’t upload',
    body: [
      'Use JPG or PNG for photos and MP4 or MOV for videos.',
      'Files must be 50 MB or smaller. Export long Reels at a lower resolution.',
      'If it still fails, raise a ticket and attach a screenshot of the message.',
    ],
  },
  {
    id: 'sign-in', category: 'ACCESS', title: 'I can’t sign in',
    body: [
      'Use Continue with Google with your approved work account, or Continue with email to get a sign-in link.',
      'Your email must match the one your administrator invited. Another Google account won’t work.',
      'If it says no employee profile exists, ask an administrator to invite you.',
    ],
  },
  {
    id: 'missing-page', category: 'ACCESS', title: 'I can’t see a page or an account',
    body: [
      'You only see accounts assigned to you, and pages your role allows.',
      'If you should have access, ask your team lead or an administrator to assign the account or update your role.',
    ],
  },
  {
    id: 'leave', category: 'OTHER', title: 'Clock in, clock out and request leave',
    body: [
      'Clock in from Quick links on your dashboard, or from Attendance.',
      'To take time off, choose Request leave. Your team lead reviews it and you get a Mail with the decision.',
    ],
    to: '/attendance', action: 'Attendance',
  },
];

/** Case-insensitive search over titles and text; every word must match. */
export const searchArticles = (query, articles = ARTICLES) => {
  const words = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return articles;
  return articles.filter((a) => {
    const text = `${a.title} ${a.body.join(' ')}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
};
