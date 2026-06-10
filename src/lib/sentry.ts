import * as Sentry from '@sentry/react';

const DSN = "";
const ENVIRONMENT = "dashboard-6a293e056addd834b32c0308";
const RELEASE = "0.0.148";
const APPGROUP_ID = "6a293e056addd834b32c0308";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT || undefined,
    release: RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  if (APPGROUP_ID) {
    Sentry.setTag('appgroup_id', APPGROUP_ID);
  }
}

export { Sentry };
