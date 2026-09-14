import { createFileRoute } from "@tanstack/react-router";
import { Check, CircleStop, Download, FileText, Loader2, Mic, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChromaKeyVideo } from "@/components/chroma-key-video";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mascot = "/media/deft3r-notebook-mascot.png";
const sleepingMascot = "/media/deft3r-mascot-sleeping.png";
const blinkMascot = "/media/deft3r-mascot-blink.png";
const writingVideo = "/media/deft3r-open-and-continuous-writing-transparent.webm";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DEFT3R — Akıllı Toplantı Defteri" },
      { name: "description", content: "Toplantıları gerçek zamanlı yazıya döken ve özetleyen sevimli dijital defter." },
      { property: "og:title", content: "DEFT3R — Akıllı Toplantı Defteri" },
      { property: "og:description", content: "Toplantıları gerçek zamanlı yazıya döken ve özetleyen sevimli dijital defter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AppState = "ready" | "meeting" | "closing" | "summary";
type DocStatus = "idle" | "working" | "done";

const conversation = [
  { name: "Ayşe", initials: "AY", tone: "coral", time: "00:08", text: "Günaydın! Önce bu haftanın önceliklerini netleştirelim." },
  { name: "Mert", initials: "ME", tone: "blue", time: "00:16", text: "Kullanıcı testlerini perşembeye kadar tamamlayabiliriz." },
  { name: "Selin", initials: "SE", tone: "yellow", time: "00:25", text: "Harika, ben de bulguları cuma sabahı ekiple paylaşırım." },
  { name: "Ayşe", initials: "AY", tone: "coral", time: "00:34", text: "O zaman bu haftanın ana hedefi kullanıcı testleri olsun." },
];

function Index() {
  const [state, setState] = useState<AppState>("ready");
  const [title, setTitle] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [notice, setNotice] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<DocStatus>("idle");
  const [transcriptStatus, setTranscriptStatus] = useState<DocStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (state !== "meeting") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    const bubbles = window.setInterval(
      () => setVisibleMessages((value) => Math.min(value + 1, conversation.length)),
      1900,
    );
    return () => {
      window.clearInterval(timer);
      window.clearInterval(bubbles);
    };
  }, [state]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startMeeting() {
    setNotice("");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNotice("Mikrofon izni alınamadı. Demo sessiz modda devam ediyor.");
    }
    setSeconds(0);
    setVisibleMessages(1);
    setState("meeting");
  }

  function endMeeting() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setVisibleMessages(conversation.length);
    setState("summary");
  }


  function reset() {
    setState("ready");
    setSeconds(0);
    setVisibleMessages(0);
    setNotice("");
    setSummaryStatus("idle");
    setTranscriptStatus("idle");
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const meetingName = title.trim() || "İsimsiz toplantı";

  function download(fileName: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function slug() {
    return meetingName.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşiöç]+/gi, "-").replace(/^-|-$/g, "") || "toplanti";
  }

  function prepareSummary() {
    if (summaryStatus === "working") return;
    setSummaryStatus("working");
    window.setTimeout(() => {
      download(
        `${slug()}-ozet.txt`,
        [
          `${meetingName} — Toplantı Özeti`,
          `Süre: ${time}`,
          "",
          "Özet:",
          "Ekip, bu haftanın ana odağını kullanıcı testleri olarak belirledi. Test sonuçları cuma sabahı paylaşılacak.",
          "",
          "Yapılacaklar:",
          "- Kullanıcı testlerini tamamla",
          "- Bulguları ekiple paylaş",
        ].join("\n"),
      );
      setSummaryStatus("done");
    }, 2200);
  }

  function prepareTranscript() {
    if (transcriptStatus === "working") return;
    setTranscriptStatus("working");
    window.setTimeout(() => {
      download(
        `${slug()}-transkript.txt`,
        [`${meetingName} — Toplantı Transkripti`, `Süre: ${time}`, "", ...conversation.map((m) => `[${m.time}] ${m.name}: ${m.text}`)].join("\n"),
      );
      setTranscriptStatus("done");
    }, 2200);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="paper-grid absolute inset-0" />
      <header className={cn("app-header relative z-20 mx-auto flex w-full max-w-6xl items-center justify-end px-5 py-5 sm:px-8", state !== "meeting" && "brand-hero")}>
        <button className="brand-badge" onClick={reset} aria-label="DEFT3R başlangıç ekranı">
          <img src={mascot} alt="" width={1024} height={1024} className="brand-badge-mascot object-contain" />
          <img src="/media/teb-ai-mark.png" alt="TEB AI logosu" className="brand-badge-teb object-contain" />
          <div className="brand-badge-text text-left leading-none">
            <p className="brand-wordmark brand-badge-word" aria-label="DEFT3R">
              DEFT3R
            </p>
            <p className="brand-badge-tag mt-1 font-semibold uppercase text-muted-foreground">Toplantı asistanı</p>
          </div>
        </button>
        {state === "meeting" && (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm font-semibold sm:flex"><i className="listening-dot" /> Dinliyor</span>
            <time className="font-mono text-sm font-semibold tabular-nums">{time}</time>
            <Button variant="danger" size="sm" onClick={endMeeting}><CircleStop className="size-4" /> Bitir</Button>
          </div>
        )}
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-84px)] max-w-5xl flex-col px-5 pb-8 sm:px-8">
        {state === "ready" && (
          <div className="ready-stage mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center">
            <div className="mascot-enter relative">
              <span className="mascot-shadow" />
              <span className="mascot-bob relative block w-[min(72vw,330px)]">
                <span className="mascot-look block">
                  <img src={mascot} alt="Gülümseyen mavi defter maskotu" width={1024} height={1024} className="block w-full object-contain" />
                  <img src={blinkMascot} alt="" aria-hidden="true" width={1024} height={1024} className="mascot-blink absolute inset-0 w-full object-contain" />
                </span>
              </span>
              <span className="mascot-wave" aria-hidden="true">
                <b>Merhaba!</b>
                <i />
              </span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Bugünkü toplantı ne hakkında?</h1>
            <p className="mt-2 text-sm text-muted-foreground">İsim vermeden de hemen başlayabilirsin.</p>
            <div className="mt-6 w-full rounded-2xl bg-card p-2 shadow-paper ring-1 ring-border">
              <label htmlFor="meeting-title" className="sr-only">Toplantı adı, isteğe bağlı</label>
              <textarea id="meeting-title" value={title} onChange={(event) => setTitle(event.target.value)} rows={2} placeholder="Toplantı adı (isteğe bağlı)" className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
              <Button className="mt-2 w-full" onClick={startMeeting}><Play className="size-4 fill-current" /> Toplantıyı Başlat</Button>
            </div>
            {notice && <p className="mt-3 text-sm font-medium text-destructive">{notice}</p>}
          </div>
        )}

        {state === "meeting" && (
          <div className="meeting-stage flex min-h-0 flex-1 flex-col">
            <div className="mx-auto mb-4 text-center">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{title.trim() || "İsimsiz toplantı"}</p>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Konuşmalar deftere düşüyor</h1>
            </div>
            <div className="transcript-scroll mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end overflow-y-auto px-1 pb-5">
              <div className="space-y-3">
                {conversation.slice(0, visibleMessages).map((message, index) => (
                  <article key={`${message.name}-${message.time}`} className={cn("speech-row bubble-in", index % 2 === 1 && "speech-row-alt")}>
                    <div className={cn("avatar", `avatar-${message.tone}`)}>{message.initials}</div>
                    <div className="speech-bubble">
                      <div className="mb-1 flex items-center justify-between gap-6"><strong className="text-xs">{message.name}</strong><time className="text-[10px] text-muted-foreground">{message.time}</time></div>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <MeetingMascot />
            <div className="meeting-writing-status flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground"><Mic className="size-3.5" /> DEFT3R yazıyor…</div>
            {notice && <p className="mt-2 text-center text-xs font-medium text-destructive">{notice}</p>}
          </div>
        )}


        {state === "summary" && (
          <div className="summary-stage mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
            <div className="sleepy-mascot" role="img" aria-label="Yere oturmuş uyuyan DEFT3R maskotu">
              <span className="sleepy-z sleepy-z-1" aria-hidden="true">z</span>
              <span className="sleepy-z sleepy-z-2" aria-hidden="true">z</span>
              <span className="sleepy-z sleepy-z-3" aria-hidden="true">Z</span>
              <img src={sleepingMascot} alt="" width={1024} height={1024} className="sleepy-mascot-img object-contain" />
              <span className="sleepy-floor" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">{meetingName} · {time}</p>
            <h1 className="mt-2 text-center font-display text-3xl font-bold">Toplantı tamamlandı</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">Ne hazırlamamı istersin? Hazır olunca dosya otomatik iner.</p>


            <div className="mt-6 grid w-full gap-3 sm:grid-cols-2" aria-live="polite">
              <Button
                className="doc-action w-full"
                onClick={prepareSummary}
                disabled={summaryStatus === "working"}
              >
                {summaryStatus === "working" ? (<><Loader2 className="size-4 animate-spin" /> Toplantı özeti alınıyor…</>)
                  : summaryStatus === "done" ? (<><Check className="size-4" /> Özet indirildi · tekrar al</>)
                  : (<><FileText className="size-4" /> Toplantı özeti al</>)}
              </Button>
              <Button
                variant="quiet"
                className="doc-action w-full"
                onClick={prepareTranscript}
                disabled={transcriptStatus === "working"}
              >
                {transcriptStatus === "working" ? (<><Loader2 className="size-4 animate-spin" /> Transkript alınıyor…</>)
                  : transcriptStatus === "done" ? (<><Check className="size-4" /> Transkript indirildi · tekrar al</>)
                  : (<><Download className="size-4" /> Toplantı transkripti al</>)}
              </Button>
            </div>



            <Button variant="quiet" className="mt-5" onClick={reset}><RotateCcw className="size-4" /> Yeni toplantı</Button>
          </div>
        )}
      </section>
    </main>
  );
}

function MeetingMascot() {
  return (
    <div className="meeting-mascot" role="img" aria-label="Açılıp toplantı notlarını yazan DEFT3R maskotu">
      <ChromaKeyVideo src={writingVideo} poster={mascot} className="meeting-mascot-video" />
    </div>
  );
}
