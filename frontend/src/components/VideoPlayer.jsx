import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

// ============================================================
// Video players for the trainee learning page.
//
// A required video can only be completed by watching it, so the page has to be
// able to report REAL playback progress for every player it ships. The backend
// classifies a lesson's source as "trackable" or not (services/videoSource.service.js)
// and refuses to complete an unmeasured video, so an embed rendered as a bare
// <iframe> would leave the trainee permanently stuck on the 80% rule.
//
//   native  - a real <video> element: currentTime / duration.
//   youtube - the IFrame Player API: getCurrentTime() / getDuration().
//   vimeo   - the postMessage player API: getCurrentTime / getDuration.
//
// All three report through the same `onProgress(currentTime, duration)` callback
// in seconds, so the page applies one set of rules regardless of the provider.
//
// A provider we cannot measure (an unknown host, a bare embed) is rendered as a
// plain iframe with `measurable={false}`, which is what makes the page offer the
// "I watched this video" confirmation instead of a button that cannot work.
// ============================================================

const YT_API_SRC = 'https://www.youtube.com/iframe_api';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

// Loads the YouTube IFrame API exactly once per page, no matter how many
// players mount. Concurrent callers share the same promise.
let youTubeApiPromise = null;
const loadYouTubeApi = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      if (window.YT && typeof window.YT.Player === 'function') resolve(window.YT);
      else reject(new Error('YouTube IFrame API did not initialise'));
    };
    const script = document.createElement('script');
    script.src = YT_API_SRC;
    script.async = true;
    script.onerror = () => {
      youTubeApiPromise = null;
      reject(new Error('YouTube IFrame API could not be loaded'));
    };
    document.head.appendChild(script);
  });
  return youTubeApiPromise;
};

// Parses a lesson's video URL into the provider we can actually measure.
// Returns null when the URL is not an embed we support, in which case the
// caller plays it natively (or shows a plain iframe).
export const parseVideoSource = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? { provider: 'youtube', videoId: id } : null;
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
    let id = null;
    if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || null;
    if (!id && url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || null;
    if (!id) id = url.searchParams.get('v') || url.searchParams.get('video_id');
    return id ? { provider: 'youtube', videoId: id } : null;
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const first = url.pathname.split('/').filter(Boolean)[0] || '';
    const id = /^(\d+)/.exec(first);
    return id ? { provider: 'vimeo', videoId: id[1] } : null;
  }
  if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com')) {
    const match = url.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
    if (match && match[1]) return { provider: 'dailymotion', videoId: match[1] };
  }
  return null;
};

// Dailymotion exposes a scriptable player too, but its API is not loaded
// anywhere in this app. Reporting honestly (unmeasurable) is what lets the page
// offer the manual confirmation rather than a completion button that 400s.
export const isMeasurableEmbed = (source) =>
  !!source && (source.provider === 'youtube' || source.provider === 'vimeo');

// ------------------------------------------------------------
// YouTube (IFrame Player API)
// ------------------------------------------------------------
const YouTubePlayer = ({ videoId, startSeconds = 0, onProgress, onApi, onFailure }) => {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const progressRef = useRef(onProgress);
  const [failed, setFailed] = useState('');
  // Guards the effect against React 18 StrictMode's double mount, which would
  // otherwise create two players bound to the same node.
  const createdRef = useRef(false);

  progressRef.current = onProgress;

  const report = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return;
    let current = 0;
    let duration = 0;
    try {
      current = player.getCurrentTime();
      duration = player.getDuration();
    } catch {
      return;
    }
    progressRef.current(current, duration);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current || createdRef.current) return;
        createdRef.current = true;
        playerRef.current = new YT.Player(hostRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            // Required for the JS API to be reachable from this origin.
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const player = event.target;
              if (startSeconds > 0) {
                try {
                  player.seekTo(startSeconds, true);
                } catch {
                  /* the video simply starts at 0 */
                }
              }
              // The API has no progress event, so real playback is sampled
              // once a second. That is the same cadence a native player uses.
              pollRef.current = setInterval(report, 1000);
              if (onApi) onApi({ seekTo: (seconds) => player.seekTo(seconds, true) });
            },
            onStateChange: (event) => {
              // Ended: report once more so a video finished in one sitting is
              // always credited before the polling timer is torn down.
              if (event.data === 0) {
                report();
                stopPolling();
              }
            },
            onError: () => {
              setFailed('This video cannot be played here (it may be private, age-restricted or removed).');
              if (onFailure) onFailure();
            }
          }
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFailed(
          err?.message ||
            'The YouTube player could not be loaded. Check your connection and try again.'
        );
        if (onFailure) onFailure();
      });

    return () => {
      cancelled = true;
      stopPolling();
      createdRef.current = false;
      const player = playerRef.current;
      playerRef.current = null;
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch {
          /* the iframe is being removed anyway */
        }
      }
    };
  }, [videoId, startSeconds, report, onApi, onFailure]);

  if (failed) {
    return (
      <div className="aspect-video rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-red-700">{failed}</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden border border-mint-border bg-black">
      <div ref={hostRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute" />
    </div>
  );
};

// ------------------------------------------------------------
// Vimeo (postMessage player API)
// ------------------------------------------------------------
const VimeoPlayer = ({ videoId, startSeconds = 0, onProgress, onApi, onFailure }) => {
  const frameRef = useRef(null);
  const pollRef = useRef(null);
  const timeRef = useRef({ current: 0, duration: 0 });
  const progressRef = useRef(onProgress);
  const startedRef = useRef(false);

  progressRef.current = onProgress;

  const call = useCallback((method, value) => {
    const frame = frameRef.current;
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ method, value }), VIMEO_ORIGIN);
  }, []);

  const report = useCallback(() => {
    const { current, duration } = timeRef.current;
    progressRef.current(current, duration);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const onMessage = (event) => {
      if (cancelled) return;
      if (event.origin !== VIMEO_ORIGIN) return;
      let payload;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!payload || typeof payload.value !== 'number') return;

      if (payload.method === 'getDuration') {
        timeRef.current.duration = payload.value;
      } else if (payload.method === 'getCurrentTime') {
        timeRef.current.current = payload.value;
        if (!startedRef.current && timeRef.current.duration > 0) {
          startedRef.current = true;
          if (onApi) {
            onApi({ seekTo: (seconds) => call('setCurrentTime', seconds) });
          }
        }
        report();
      }
    };

    window.addEventListener('message', onMessage);
    pollRef.current = setInterval(() => {
      call('getDuration');
      call('getCurrentTime');
    }, 1000);

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [call, report, onApi]);

  const src = `${VIMEO_ORIGIN}/video/${videoId}?api=1&player_id=vt-${videoId}&title=0&byline=0&portrait=0&dnt=1`;

  return (
    <div className="aspect-video rounded-xl overflow-hidden border border-mint-border bg-black">
      <iframe
        ref={frameRef}
        src={src}
        title="Training video"
        className="w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
        onError={() => onFailure && onFailure()}
      />
    </div>
  );
};

// ------------------------------------------------------------
// Public component
// ------------------------------------------------------------

/**
 * Renders the right player for a lesson's video URL.
 *
 * `onProgress(currentTime, duration)` fires continuously during playback and is
 * the ONLY thing that credits a required video. `onApi({ seekTo })` lets the page
 * pull a player back to the furthest legitimately watched point.
 * `startSeconds` restores a previously saved position.
 */
const VideoPlayer = ({
  videoUrl,
  fileUrl,
  savedFraction = 0,
  onProgress,
  onApi,
  onFailure
}) => {
  const source = parseVideoSource(videoUrl);
  const durationRef = useRef(0);

  const handleProgress = useCallback(
    (currentTime, duration) => {
      if (Number.isFinite(duration) && duration > 0) durationRef.current = duration;
      // A stream that never reports a usable duration (Infinity/NaN from a
      // progressive download) cannot be measured, so nothing is credited.
      // Reporting a fake 0 here used to leave the trainee permanently stuck.
      const usable = Number.isFinite(duration) && duration > 0 ? duration : durationRef.current;
      if (!Number.isFinite(usable) || usable <= 0) return;
      onProgress(Number.isFinite(currentTime) ? currentTime : 0, usable);
    },
    [onProgress]
  );

  const startSeconds =
    Number.isFinite(savedFraction) && savedFraction > 0 ? savedFraction : 0;

  if (source && source.provider === 'youtube') {
    return (
      <YouTubePlayer
        key={`yt-${source.videoId}`}
        videoId={source.videoId}
        startSeconds={startSeconds}
        onProgress={handleProgress}
        onApi={onApi}
        onFailure={onFailure}
      />
    );
  }

  if (source && source.provider === 'vimeo') {
    return (
      <VimeoPlayer
        key={`vm-${source.videoId}`}
        videoId={source.videoId}
        startSeconds={startSeconds}
        onProgress={handleProgress}
        onApi={onApi}
        onFailure={onFailure}
      />
    );
  }

  if (source) {
    // Measurable provider we do not drive (Dailymotion) - play it, but do not
    // pretend progress can be measured.
    const embedUrl =
      source.provider === 'dailymotion'
        ? `https://www.dailymotion.com/embed/video/${source.videoId}?autoplay=0`
        : videoUrl;
    return (
      <div className="aspect-video rounded-xl overflow-hidden border border-mint-border bg-black">
        <iframe
          src={embedUrl}
          title="Training video"
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  const nativeSrc = videoUrl || fileUrl;
  if (nativeSrc) {
    return (
      <NativePlayer
        src={nativeSrc}
        savedFraction={savedFraction}
        onProgress={handleProgress}
        onApi={onApi}
        onFailure={onFailure}
      />
    );
  }

  return (
    <p className="text-mint-gray text-center py-8">No video URL configured for this lesson.</p>
  );
};

// ------------------------------------------------------------
// Native <video>
// ------------------------------------------------------------
const NativePlayer = ({ src, savedFraction, onProgress, onApi, onFailure }) => {
  // Restoring a saved position must also seed the page's "furthest watched"
  // watermark. When this handler was missing, the restore looked exactly like a
  // skip and the player was snapped back to 0, so progress could never
  // accumulate across two sittings.
  const handleLoadedMetadata = (e) => {
    const video = e.currentTarget;
    if (onApi) {
      onApi({ seekTo: (seconds) => { video.currentTime = seconds; } });
    }
    if (savedFraction > 0 && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = savedFraction * video.duration;
      onProgress(video.currentTime, video.duration);
    }
  };

  const handleTimeUpdate = (e) => {
    const video = e.currentTarget;
    onProgress(video.currentTime, video.duration);
  };

  return (
    <video
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-xl bg-black aspect-video"
      src={src}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onError={() => onFailure && onFailure()}
    ></video>
  );
};

export default VideoPlayer;
