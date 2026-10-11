// Global activity counter behind the top loading bar.
// Every API request and every page/tab change reports here.
let pending = 0;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener(pending > 0));

export const loader = {
  start() {
    pending += 1;
    emit();
  },
  done() {
    pending = Math.max(0, pending - 1);
    emit();
  },
  pulse(ms = 280) {
    loader.start();
    setTimeout(loader.done, ms);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
