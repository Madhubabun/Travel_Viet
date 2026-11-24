import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { AppStoreProvider, useStore } from './hooks/useAppStore';
import { UiProvider, useUi } from './hooks/useUi';
import { runTopBackHandler } from './hooks/useBackHandler';
import { usePhotoAutoFetch } from './hooks/usePhotoAutoFetch';
import { isNative } from './lib/native';
import { cx, Emoji } from './components/ui';
import { TAB_META, TONES, toneVars } from './data/meta';
import ItineraryView from './components/ItineraryView';
import MapBoard from './components/MapBoard';
import CurrencyCalculator from './components/CurrencyCalculator';
import ExpenseLog from './components/ExpenseLog';
import RatesView from './components/RatesView';
import StopEditor from './components/StopEditor';
import ExpenseEditor from './components/ExpenseEditor';
import type { TabId } from './types';

const TABS: TabId[] = ['itinerary', 'map', 'calc', 'wallet', 'rates'];

export default function App() {
  useEffect(() => {
    if (!isNative) return;
    void SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(() => undefined);
    void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
  }, []);

  return (
    <AppStoreProvider>
      <WithUi />
    </AppStoreProvider>
  );
}

function WithUi() {
  const { state } = useStore();
  return (
    <UiProvider initialDayId={state.trip.days[0]?.id ?? 'all'}>
      <Shell />
    </UiProvider>
  );
}

function Shell() {
  const ui = useUi();
  const { state } = useStore();
  usePhotoAutoFetch();

  // Keep the selected day valid after deletes / imports.
  useEffect(() => {
    if (ui.dayId !== 'all' && !state.trip.days.some((d) => d.id === ui.dayId)) {
      ui.setDayId(state.trip.days[0]?.id ?? 'all');
    }
  }, [state.trip.days, ui]);

  // Android back button: sheets / modes first, then tabs, then double-tap to exit.
  const tabRef = useRef(ui.tab);
  tabRef.current = ui.tab;
  const lastBack = useRef(0);
  useEffect(() => {
    if (!isNative) return;
    const handle = CapApp.addListener('backButton', () => {
      if (runTopBackHandler()) return;
      if (tabRef.current !== 'itinerary') {
        ui.setTab('itinerary');
        return;
      }
      const now = Date.now();
      if (now - lastBack.current < 2000) {
        void CapApp.exitApp();
      } else {
        lastBack.current = now;
        ui.toast('Press back again to exit');
      }
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [ui]);

  return (
    <div className="relative h-full">
      <main className="absolute inset-0">
        <Pane active={ui.tab === 'itinerary'}>
          <ItineraryView />
        </Pane>
        <Pane active={ui.tab === 'map'}>
          <MapBoard active={ui.tab === 'map'} />
        </Pane>
        <Pane active={ui.tab === 'calc'}>
          <CurrencyCalculator />
        </Pane>
        <Pane active={ui.tab === 'wallet'}>
          <ExpenseLog />
        </Pane>
        <Pane active={ui.tab === 'rates'}>
          <RatesView />
        </Pane>
      </main>

      <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] px-3 pb-[calc(8px+var(--sab))]">
        <div className="glass-clear pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-[24px] px-1 py-1.5">
          {TABS.map((id) => {
            const meta = TAB_META[id];
            const active = ui.tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-label={meta.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => ui.setTab(id)}
                className="flex w-14 flex-col items-center gap-0.5 py-0.5 transition active:scale-90"
              >
                <span
                  className={cx('flex h-[26px] items-center justify-center rounded-full transition-all duration-200', active ? 'puff w-11' : 'w-8')}
                  style={active ? toneVars(meta.tone) : undefined}
                >
                  <Emoji name={meta.emoji} size={active ? 17 : 19} />
                </span>
                <span
                  className={cx('text-[10.5px] leading-tight', active ? 'font-bold' : 'font-medium text-ink/70')}
                  style={active ? { color: TONES[meta.tone].ink } : undefined}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <StopEditor />
      <ExpenseEditor />

      {ui.toastMsg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+var(--sab))] z-[2000] flex justify-center px-6">
          <div className="animate-rise rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lift">
            {ui.toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}

function Pane({ active, children }: { active: boolean; children: React.ReactNode }) {
  // Panes stay mounted so the map, calculator input and scroll positions survive tab switches.
  return (
    <section className={cx('absolute inset-0', active ? 'z-10 animate-fade-in' : 'invisible z-0')} aria-hidden={!active}>
      {children}
    </section>
  );
}
