// A dependency outage must not take down the sign-in page. These checks are
// deliberately finite: normal editing requests still validate the current data.
export function createStartupCheck({ check, onChange, retryDelays = [5000, 15000, 60000] }) {
  const state = { status: 'pending', attempts: 0, checkedAt: null, nextRetryAt: null };
  let timer = null;
  let stopped = false;

  async function run() {
    if (stopped) return;
    state.attempts += 1;
    state.nextRetryAt = null;
    try {
      const value = await check();
      if (stopped) return;
      state.status = 'ready';
      state.checkedAt = new Date().toISOString();
      onChange({ ...state }, null, value);
    } catch (error) {
      if (stopped) return;
      state.status = 'unavailable';
      state.checkedAt = new Date().toISOString();
      const delay = retryDelays[state.attempts - 1];
      if (delay !== undefined) {
        state.nextRetryAt = new Date(Date.now() + delay).toISOString();
        timer = setTimeout(run, delay);
        timer.unref();
      }
      onChange({ ...state }, error);
    }
  }

  return {
    start: run,
    snapshot: () => ({ ...state }),
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
