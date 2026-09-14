import { useEffect, useRef, useState } from "react";

type ChromaKeyVideoProps = {
  src: string;
  poster: string;
  className?: string;
  loopFrom?: number;
};

export function ChromaKeyVideo({ src, poster, className, loopFrom = 1.7 }: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let startTimer = 0;

    const beginAnimation = () => {
      video.pause();
      video.currentTime = 0;
      window.clearTimeout(startTimer);
      startTimer = window.setTimeout(() => {
        setIsReady(true);
        void video.play();
      }, 180);
    };

    const restartWriting = () => {
      video.currentTime = loopFrom;
      void video.play();
    };

    video.addEventListener("canplay", beginAnimation, { once: true });
    video.addEventListener("ended", restartWriting);
    video.load();

    return () => {
      window.clearTimeout(startTimer);
      video.removeEventListener("canplay", beginAnimation);
      video.removeEventListener("ended", restartWriting);
      video.pause();
    };
  }, [loopFrom, src]);

  return (
    <div className={className}>
      <img
        src={poster}
        alt=""
        className={isReady ? "meeting-mascot-poster is-hidden" : "meeting-mascot-poster"}
      />
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        className={isReady ? "meeting-mascot-media is-ready" : "meeting-mascot-media"}
      />
    </div>
  );
}
