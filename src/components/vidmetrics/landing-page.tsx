"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

const rotatingWords = ["winning", "surging", "leading"];
const performancePreviewSeries = [34, 46, 40, 58, 54, 66];
const lengthPreviewSeries = [
  { label: "60s", value: 28 },
  { label: "5m", value: 44 },
  { label: "20m", value: 36 },
];

const previewVideos = [
  {
    title: "Why recap clips are outpacing full episodes",
    views: "968k",
    pace: "74k/day",
    tag: "Breakout",
  },
  {
    title: "Inside the title formula driving 2x more clicks",
    views: "712k",
    pace: "49k/day",
    tag: "Surging",
  },
];

const previewKpis = [
  { label: "Videos analyzed", value: "25", meta: "Last 30 days" },
  { label: "Average views", value: "412k", meta: "Across recent uploads" },
  { label: "Standing out", value: "11", meta: "Videos above median" },
];

export function VidMetricsLandingPage() {
  const router = useRouter();
  const [channelUrl, setChannelUrl] = useState("");
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => {
      setWordVisible(false);
    }, 1800);

    const swapTimer = window.setTimeout(() => {
      setActiveWordIndex(
        (currentIndex) => (currentIndex + 1) % rotatingWords.length,
      );
      setWordVisible(true);
    }, 2100);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(swapTimer);
    };
  }, [activeWordIndex]);

  function openAnalysis(targetUrl: string) {
    const cleaned = targetUrl.trim();

    if (!cleaned) {
      return;
    }

    router.push(`/analyze?channel=${encodeURIComponent(cleaned)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openAnalysis(channelUrl);
  }

  const activeWord = rotatingWords[activeWordIndex] ?? rotatingWords[0] ?? "";
  const performanceChartPoints = performancePreviewSeries
    .map((value, index) => `${10 + index * 24},${58 - value * 0.7}`)
    .join(" ");
  const performanceAreaPoints = `10,66 ${performancePreviewSeries
    .map((value, index) => `${10 + index * 24},${58 - value * 0.7}`)
    .join(" ")} 130,66`;
  return (
    <main className="relative flex min-h-dvh w-full flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#FEFDFF_0%,#F7F3FC_44%,#F4F5FB_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.1),transparent_32%),radial-gradient(circle_at_left,rgba(168,85,247,0.06),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.05),transparent_26%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(196,181,253,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(196,181,253,0.09)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <section className="relative flex min-h-dvh w-full flex-1 items-stretch">
        <div className="mx-auto box-border flex w-full max-w-[1440px] flex-1 flex-col px-5 sm:px-8 lg:px-10">
          <header className="flex items-center py-6 sm:py-7">
            <div className="inline-flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[linear-gradient(180deg,#A855F7,#7C3AED)] shadow-[0_0_12px_rgba(124,58,237,0.18)]" />
              <p className="text-lg font-[family:var(--font-display)] font-semibold tracking-[-0.045em] sm:text-[1.7rem]">
                <span className="text-foreground">Vid</span>
                <span className="bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] bg-clip-text text-transparent">
                  Metrics
                </span>
              </p>
            </div>
          </header>

          <div className="grid min-w-0 flex-1 items-center gap-8 pt-2 pb-8 sm:gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:pt-3 lg:pb-8">
            <div className="mx-auto flex w-full max-w-full min-w-0 flex-col text-center sm:max-w-[650px] lg:mx-0 lg:-translate-y-10 lg:text-left">
              <div className="mt-1 space-y-3.5 sm:mt-2.5 sm:space-y-4">
                <h1 className="text-foreground text-[1.88rem] leading-[1.03] font-semibold tracking-[-0.04em] text-balance sm:text-[3rem] sm:leading-[0.96]">
                  Analyze any{" "}
                  <span className="inline-block bg-[linear-gradient(180deg,#38BDF8,#7C3AED)] bg-clip-text pr-1 text-transparent">
                    YouTube
                  </span>{" "}
                  competitor for faster media decisions.
                </h1>

                <div className="text-foreground flex flex-wrap items-center justify-center gap-1.5 text-[1.15rem] font-semibold tracking-[-0.03em] sm:text-[1.6rem] lg:justify-start">
                  <span>See what is</span>
                  <span className="inline-flex w-[86px] shrink-0 justify-start sm:w-[104px]">
                    <span
                      className={`inline-flex text-[#6D28D9] transition-all duration-500 ${
                        wordVisible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-1 opacity-0"
                      }`}
                    >
                      {activeWord}
                    </span>
                  </span>
                  <span>right now.</span>
                </div>

                <p className="text-muted-strong mx-auto max-w-[34rem] text-[0.95rem] leading-7 sm:text-[0.98rem] lg:mx-0">
                  Paste a channel or video URL to spot top videos, breakout
                  trends, and what is working right now.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-7.5 w-full max-w-full sm:mt-8.5 sm:max-w-[620px]"
              >
                <div className="flex flex-col gap-2 rounded-[22px] border border-[rgba(124,58,237,0.1)] bg-white/74 p-1.5 shadow-[0_18px_36px_rgba(91,75,138,0.1)] backdrop-blur-md lg:flex-row lg:items-center">
                  <label className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-[17px] border border-[rgba(124,58,237,0.08)] bg-white/84 px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] transition">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(124,58,237,0.08)] text-[#7C3AED]">
                      <Search className="size-3.5" />
                    </span>
                    <input
                      required
                      value={channelUrl}
                      onChange={(event) => setChannelUrl(event.target.value)}
                      placeholder="Paste a YouTube channel or video URL"
                      type="url"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      aria-label="YouTube channel or video URL"
                      className="clean-url-input placeholder:text-muted w-full appearance-none bg-transparent text-[14px] font-medium ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:outline-none sm:text-[15px]"
                    />
                  </label>

                  <button
                    type="submit"
                    className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[17px] border border-[rgba(91,33,182,0.16)] bg-[linear-gradient(180deg,#7C3AED,#5B21B6)] px-5 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(91,33,182,0.18)] transition hover:-translate-y-0.5 hover:brightness-105 lg:min-w-[152px]"
                  >
                    Analyze
                    <span className="flex size-6 items-center justify-center rounded-full bg-white/14 transition group-hover:bg-white/20">
                      <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[430px] lg:max-w-[490px] lg:-translate-y-11">
              <div className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_68%)] blur-2xl" />
              <div className="pointer-events-none absolute inset-y-10 left-8 w-20 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.5),transparent)] opacity-70 blur-xl" />

              <div className="pointer-events-none absolute top-24 -left-4 z-10 hidden w-[148px] rotate-[-3deg] rounded-[20px] border border-[rgba(124,58,237,0.12)] bg-white/88 p-2.5 shadow-[0_20px_38px_rgba(91,75,138,0.12)] backdrop-blur-sm md:block">
                <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)]" />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#6D28D9]">
                    Performance
                  </p>
                  <TrendingUp className="size-4 text-[#7C3AED]" />
                </div>
                <p className="text-muted mt-1 text-[11px] leading-5">
                  Views/day across top videos
                </p>

                <div className="mt-2.5 overflow-hidden rounded-[14px] border border-[rgba(124,58,237,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,255,0.92))] px-2 py-2">
                  <svg
                    viewBox="0 0 140 70"
                    className="h-[66px] w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="heroPerformanceArea"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="rgba(124,58,237,0.22)" />
                        <stop offset="100%" stopColor="rgba(124,58,237,0.02)" />
                      </linearGradient>
                      <linearGradient
                        id="heroPerformanceLine"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#C084FC" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>

                    {[16, 32, 48, 64].map((y) => (
                      <line
                        key={y}
                        x1="8"
                        x2="132"
                        y1={y}
                        y2={y}
                        stroke="rgba(124,58,237,0.08)"
                        strokeDasharray="3 4"
                      />
                    ))}

                    <polygon
                      points={performanceAreaPoints}
                      fill="url(#heroPerformanceArea)"
                    />
                    <polyline
                      points={performanceChartPoints}
                      fill="none"
                      stroke="url(#heroPerformanceLine)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {performancePreviewSeries.map((value, index) => {
                      const cx = 10 + index * 24;
                      const cy = 58 - value * 0.7;

                      return (
                        <g key={`${value}-${index}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r="4"
                            fill="#FFFFFF"
                            stroke="#8B5CF6"
                            strokeWidth="2"
                          />
                          <circle cx={cx} cy={cy} r="1.8" fill="#7C3AED" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="pointer-events-none absolute top-[118px] -right-3 z-10 hidden w-[142px] rotate-[3deg] rounded-[20px] border border-[rgba(124,58,237,0.12)] bg-white/88 p-2.5 shadow-[0_20px_38px_rgba(91,75,138,0.12)] backdrop-blur-sm md:block">
                <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)]" />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#6D28D9]">
                    Video length
                  </p>
                  <span className="size-2 rounded-full bg-[#8B5CF6]" />
                </div>
                <p className="text-muted mt-1 text-[11px] leading-5">
                  Length mix from the board
                </p>

                <div className="mt-2.5 rounded-[14px] border border-[rgba(124,58,237,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,255,0.92))] px-2 py-2.5">
                  <div className="flex h-[74px] items-end justify-between gap-2">
                    {lengthPreviewSeries.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <span className="text-[10px] font-semibold text-[#6D28D9]">
                          {index === 1 ? "Best" : `${item.value}%`}
                        </span>
                        <div className="flex h-[52px] w-full items-end rounded-full bg-[rgba(124,58,237,0.08)] px-1">
                          <div
                            className="w-full rounded-full bg-[linear-gradient(180deg,#C084FC,#7C3AED)]"
                            style={{ height: `${item.value}px` }}
                          />
                        </div>
                        <span className="text-muted text-[10px] font-medium">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[30px] border border-[rgba(124,58,237,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(249,245,255,0.92))] p-3 shadow-[0_24px_56px_rgba(91,75,138,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_68px_rgba(91,75,138,0.16)] sm:p-3.5">
                <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(124,58,237,0.1),transparent)]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_34%,transparent_64%,rgba(255,255,255,0.22))]" />
                <div className="pointer-events-none absolute -top-12 right-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.44),transparent_70%)] blur-2xl" />

                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-muted font-mono text-[11px] tracking-[0.24em] uppercase">
                      Dashboard preview
                    </p>
                    <h2 className="mt-2 text-2xl font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                      VidMetrics dashboard
                    </h2>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,58,237,0.1)] bg-white/72 px-3 py-1 text-xs font-semibold text-[#6D28D9]">
                    <TrendingUp className="size-3.5" />
                    Live preview
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
                  {previewKpis.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-[rgba(124,58,237,0.08)] bg-white/72 p-2.5"
                    >
                      <p className="text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-[1.28rem] font-[family:var(--font-display)] font-semibold tracking-[-0.04em]">
                        {item.value}
                      </p>
                      <p className="text-muted mt-1.5 text-xs">{item.meta}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3.5 space-y-2.5">
                  <div className="rounded-[22px] border border-[rgba(124,58,237,0.08)] bg-white/72 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Channel information
                        </p>
                        <p className="text-muted mt-1 text-xs leading-5">
                          @creatorpulse • 2.4M subscribers
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(124,58,237,0.1)] bg-white/84 px-2.5 py-1 text-[11px] font-semibold text-[#6D28D9]">
                        Open
                        <ExternalLink className="size-3" />
                      </span>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      {[
                        [
                          "Top video",
                          "Why recap clips are outpacing full episodes",
                        ],
                        ["Upload pace", "Every 4 days"],
                        ["Average engagement", "7.9%"],
                        ["Shorts share", "48%"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-[14px] border border-[rgba(124,58,237,0.08)] bg-white/86 px-2.5 py-2"
                        >
                          <p className="text-muted font-mono text-[10px] tracking-[0.16em] uppercase">
                            {label}
                          </p>
                          <p className="mt-1.5 text-sm leading-6 font-semibold">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[rgba(124,58,237,0.08)] bg-white/72 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Top videos</p>
                        <p className="text-muted mt-1 text-xs leading-5">
                          Ranked by performance score
                        </p>
                      </div>
                      <Users className="size-4 text-[#7C3AED]" />
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {previewVideos.map((video, index) => (
                        <div
                          key={video.title}
                          className="flex items-center gap-2 rounded-[16px] border border-[rgba(124,58,237,0.08)] bg-white/86 px-2.5 py-2"
                        >
                          <div className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#A855F7,#7C3AED)] text-sm font-semibold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {video.title}
                            </p>
                            <div className="text-muted mt-1 flex items-center gap-2 text-[10px]">
                              <span>{video.views} views</span>
                              <span>{video.pace}</span>
                            </div>
                          </div>
                          <span className="rounded-full border border-[rgba(124,58,237,0.12)] bg-[rgba(245,238,255,0.9)] px-2.5 py-1 text-xs font-semibold text-[#6D28D9]">
                            {video.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
