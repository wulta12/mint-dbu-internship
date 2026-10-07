// ============================================================
// Video source classification.
//
// A video lesson is only completable by watching it, so the server has to
// know whether the configured source can report real playback progress.
//
//   trackable  - the browser can read currentTime/duration back out of a
//                real player (a native <video>, YouTube's IFrame API or
//                Vimeo's Player API), so the 80% rule can be enforced.
//   untrackable- anything else (an unknown host, a redirect page, a provider
//                with no scriptable player). The video must still play for
//                the trainee, but progress CANNOT be measured, so the system
//                must never claim it was watched on its own.
//
// The frontend mirrors these rules for the UI; this copy is the authority,
// because it decides whether a manual "I watched it" confirmation is allowed.
// ============================================================

const DIRECT_MEDIA_EXTENSIONS = /\.(mp4|m4v|webm|ogg|ogv|mov)(\?.*)?$/i;

// Hostnames that always serve a media file, whatever the path looks like.
const DIRECT_MEDIA_HOSTS = new Set([
  'localhost',
  '127.0.0.1'
]);

const parseUrl = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  // Lesson files uploaded to this system are served from the backend itself.
  if (/^\/?uploads\//i.test(trimmed)) {
    return { kind: 'local', provider: 'uploaded', host: '', path: trimmed };
  }

  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    return {
      kind: 'remote',
      provider: null,
      host: url.hostname.replace(/^www\./i, '').toLowerCase(),
      pathname: url.pathname,
      search: url.search,
      url
    };
  } catch {
    return null;
  }
};

/**
 * Describes a lesson's video source.
 *
 * @returns {{ provider: string, trackable: boolean, reason?: string }}
 */
const describeVideoSource = (videoUrl, filePath) => {
  // An uploaded file is always playable in a native <video> element.
  if (filePath && !videoUrl) {
    return { provider: 'uploaded', trackable: true };
  }

  const parsed = parseUrl(videoUrl);

  if (!parsed) {
    // Not a URL at all. If the lesson also carries an uploaded file, play that.
    if (filePath) return { provider: 'uploaded', trackable: true };
    return {
      provider: 'unknown',
      trackable: false,
      reason: 'This lesson has no usable video source.'
    };
  }

  if (parsed.kind === 'local') {
    return { provider: 'uploaded', trackable: true };
  }

  const { host, pathname, search, url } = parsed;

  // ---- YouTube (IFrame Player API: getCurrentTime/getDuration) ----
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
    const id =
      (() => {
        const embed = /^\/embed\/([^/?#]+)/.exec(pathname);
        if (embed) return embed[1];
        const shorts = /^\/shorts\/([^/?#]+)/.exec(pathname);
        if (shorts) return shorts[1];
        return url.searchParams.get('v') || url.searchParams.get('video_id') ||
          (host === 'youtu.be' ? pathname.split('/').filter(Boolean)[0] : null);
      })();
    return id
      ? { provider: 'youtube', trackable: true, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&enablejsapi=1&origin=${encodeURIComponent(url.origin)}` }
      : { provider: 'youtube', trackable: false, reason: 'This YouTube link does not contain a video id.' };
  }

  // ---- Vimeo (Player API over postMessage) ----
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = /^(\d+)/.exec(pathname.split('/').filter(Boolean)[0] || '');
    return id
      ? { provider: 'vimeo', trackable: true, embedUrl: `https://player.vimeo.com/video/${id[1]}` }
      : { provider: 'vimeo', trackable: false, reason: 'This Vimeo link does not contain a video id.' };
  }

  // ---- Direct media files: a native <video> reports real playback ----
  if (DIRECT_MEDIA_EXTENSIONS.test(`${pathname}${search}`)) {
    return { provider: 'direct', trackable: true };
  }

  // A local backend URL without a file extension is only trackable if it looks
  // like the uploads folder, which was already handled above.
  if (DIRECT_MEDIA_HOSTS.has(host)) {
    return { provider: 'direct', trackable: false, reason: 'This video URL does not point at a media file.' };
  }

  // ---- Anything else: plays in an iframe, but progress cannot be read ----
  return {
    provider: 'external',
    trackable: false,
    reason: 'This video is hosted by a provider that does not report playback progress, so the 80% requirement cannot be verified automatically.'
  };
};

const isTrackableVideo = (videoUrl, filePath) =>
  describeVideoSource(videoUrl, filePath).trackable;

module.exports = { describeVideoSource, isTrackableVideo, DIRECT_MEDIA_EXTENSIONS };