// aws-amplify expects Node-style `global` / `process` (see Amplify UI Angular troubleshooting).
const w = window as unknown as {
  global: typeof window;
  process: { env: { DEBUG?: undefined } };
};
w.global = window;
w.process = { env: { DEBUG: undefined } };
