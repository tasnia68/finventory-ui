import React from 'react';

const dots = Array.from({ length: 3 }, (_, index) => index);
const boxes = Array.from({ length: 3 }, (_, index) => index);

const AppLoadingScreen = ({ message = 'Loading workspace...', caption = 'Preparing inventory data and operator tools.' }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fc] px-6 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(19,91,236,0.14),_transparent_62%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(59,130,246,0.16),_transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.52),_rgba(255,255,255,0))] dark:bg-[linear-gradient(to_bottom,_rgba(15,23,42,0.3),_rgba(15,23,42,0))]" />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10 blur-xl" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] border border-slate-200/80 bg-white/88 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88">
            <img src={`${import.meta.env.BASE_URL}logistra.svg`} alt="Logistra" className="h-10 w-auto dark:hidden" />
            <img src={`${import.meta.env.BASE_URL}logistra-nightmode.svg`} alt="Logistra" className="hidden h-10 w-auto dark:block" />
          </div>
        </div>

        <div className="mt-8 flex items-end gap-2">
          {boxes.map((box, index) => (
            <div
              key={box}
              className="relative h-10 w-10 rounded-2xl border border-slate-200 bg-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.6)] animate-[bounce_1.5s_infinite] dark:border-slate-700 dark:bg-slate-900"
              style={{ animationDelay: `${index * 140}ms`, animationDuration: '1.7s' }}
            >
              <div className="absolute inset-x-2 top-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="absolute inset-x-2 bottom-2 h-4 rounded-xl bg-gradient-to-br from-primary/15 via-sky-100 to-orange-100 dark:from-primary/20 dark:via-slate-800 dark:to-emerald-950" />
            </div>
          ))}
        </div>

        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/88 dark:text-slate-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Inventory workspace
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
          {message}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          {caption}
        </p>

        <div className="mt-6 flex items-center gap-2">
          {dots.map((dot, index) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-primary/70 animate-[pulse_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${index * 180}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLoadingScreen;
