// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REDACTED_WIREMARK_MESSAGE,
  SENTRY_DATA_COLLECTION,
  isMonitoringEnabled,
  redactWiremarkMessage,
  scrubBreadcrumb,
  scrubEvent,
  scrubSpan,
  sentryDsn,
  sentryEnvironment,
  sentryRelease,
  stripQueryAndHash,
  tracesSampleRate,
} from './monitoring.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sentryDsn / isMonitoringEnabled', () => {
  it('is disabled with no DSN (the test / Storybook default)', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    expect(sentryDsn()).toBe('');
    expect(isMonitoringEnabled()).toBe(false);
  });

  it('is enabled when VITE_SENTRY_DSN is set', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://k@o1.ingest.sentry.io/2');
    expect(sentryDsn()).toBe('https://k@o1.ingest.sentry.io/2');
    expect(isMonitoringEnabled()).toBe(true);
  });
});

describe('sentryEnvironment', () => {
  it('uses the Netlify deploy context when building on Netlify', () => {
    expect(sentryEnvironment('production', 'production')).toBe('production');
    expect(sentryEnvironment('deploy-preview', 'production')).toBe('deploy-preview');
    expect(sentryEnvironment('branch-deploy', 'production')).toBe('branch-deploy');
  });

  it('never reports a local build as production', () => {
    expect(sentryEnvironment('', 'production')).toBe('local');
    expect(sentryEnvironment('', 'development')).toBe('development');
    expect(sentryEnvironment('', '')).toBe('development');
  });
});

describe('sentryRelease / tracesSampleRate', () => {
  it('prefixes the version with the project name', () => {
    expect(sentryRelease('1.2.3')).toBe('wiremark-editor@1.2.3');
  });

  it('samples every trace locally and 10% in production', () => {
    expect(tracesSampleRate('development')).toBe(1.0);
    expect(tracesSampleRate('production')).toBe(0.1);
  });
});

describe('SENTRY_DATA_COLLECTION', () => {
  it('turns off identity, IP inference, cookies, bodies, query strings and locals', () => {
    expect(SENTRY_DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    });
    expect(SENTRY_DATA_COLLECTION.httpHeaders).toEqual({
      request: { allow: ['User-Agent'] },
      response: false,
    });
    expect(Object.isFrozen(SENTRY_DATA_COLLECTION)).toBe(true);
  });
});

describe('stripQueryAndHash', () => {
  it('removes query strings and fragments', () => {
    expect(stripQueryAndHash('https://x.dev/a?b=1#c')).toBe('https://x.dev/a');
    expect(stripQueryAndHash('/path#frag')).toBe('/path');
    expect(stripQueryAndHash('/plain')).toBe('/plain');
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console and UI breadcrumbs (they can carry content / file names)', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'Button "Secret"' })).toBeNull();
    expect(
      scrubBreadcrumb({ category: 'ui.click', message: 'div[aria-label="secret-plan.wiremark"]' }),
    ).toBeNull();
    expect(scrubBreadcrumb({ category: 'ui.input' })).toBeNull();
    expect(scrubBreadcrumb({})).toBeNull();
  });

  it('keeps navigation / network / internal breadcrumbs with URLs stripped', () => {
    expect(
      scrubBreadcrumb({ category: 'navigation', data: { from: '/?x=1', to: '/#y' } }),
    ).toEqual({ category: 'navigation', data: { from: '/', to: '/' } });
    expect(scrubBreadcrumb({ category: 'fetch', data: { url: 'https://a.io/e?k=v' } })).toEqual({
      category: 'fetch',
      data: { url: 'https://a.io/e' },
    });
    expect(scrubBreadcrumb({ category: 'xhr' })).toEqual({ category: 'xhr' });
    expect(scrubBreadcrumb({ category: 'sentry.event' })).toEqual({ category: 'sentry.event' });
  });
});

describe('redactWiremarkMessage', () => {
  it('drops the document text but keeps the line number', () => {
    expect(redactWiremarkMessage('Button: unknown property "secret=" (line 7)')).toBe(
      `${REDACTED_WIREMARK_MESSAGE} (line 7)`,
    );
  });

  it('redacts fully when there is no line number', () => {
    expect(redactWiremarkMessage('inconsistent "Secret Plan"')).toBe(REDACTED_WIREMARK_MESSAGE);
    expect(redactWiremarkMessage(undefined)).toBe(REDACTED_WIREMARK_MESSAGE);
  });
});

describe('scrubEvent', () => {
  it('removes identity, IP, cookies, query strings and non-UA headers', () => {
    const event = scrubEvent({
      user: { id: 'u', ip_address: '1.2.3.4', email: 'a@b.c' },
      server_name: 'host',
      request: {
        url: 'https://editor.wiremark.dev/?file=secret#x',
        cookies: { a: 'b' },
        query_string: 'file=secret',
        data: 'body',
        headers: { 'User-Agent': 'UA/1', Referer: 'https://search.example/?q=secret' },
      },
    });
    expect(event.user).toBeUndefined();
    expect(event.server_name).toBeUndefined();
    expect(event.request).toEqual({
      url: 'https://editor.wiremark.dev/',
      headers: { 'User-Agent': 'UA/1' },
    });
  });

  it('removes the culture context (timezone / locale)', () => {
    const event = scrubEvent({
      contexts: { culture: { timezone: 'America/New_York', locale: 'en-US' }, react: { version: '19' } },
    });
    expect(event.contexts).toEqual({ react: { version: '19' } });
  });

  it('removes the headers object entirely when there is no User-Agent', () => {
    const event = scrubEvent({ request: { url: '/', headers: { Referer: 'x' } } });
    expect(event.request).toEqual({ url: '/' });
  });

  it('redacts WiremarkError messages but leaves other errors untouched', () => {
    const event = scrubEvent({
      exception: {
        values: [
          { type: 'WiremarkError', value: 'Card: "Top Secret" is not valid (line 3)' },
          { type: 'TypeError', value: "Cannot read properties of undefined (reading 'props')" },
        ],
      },
    });
    expect(event.exception.values[0].value).toBe(`${REDACTED_WIREMARK_MESSAGE} (line 3)`);
    expect(event.exception.values[1].value).toBe(
      "Cannot read properties of undefined (reading 'props')",
    );
  });

  it('re-filters attached breadcrumbs and strips selector data from the trace context', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { category: 'ui.click', message: '[title="secret.wiremark"]' },
        { category: 'navigation', data: { to: '/' } },
      ],
      contexts: { trace: { data: { 'lcp.element': 'div[title="secret"]', 'sentry.op': 'pageload' } } },
    });
    expect(event.breadcrumbs).toEqual([{ category: 'navigation', data: { to: '/' } }]);
    expect(event.contexts.trace.data).toEqual({ 'sentry.op': 'pageload' });
  });

  it('tolerates a minimal event', () => {
    expect(scrubEvent({})).toEqual({});
  });
});

describe('scrubSpan', () => {
  it('strips selector and identity attributes from a streamed span', () => {
    const span = scrubSpan({
      name: 'pageload /',
      attributes: {
        'sentry.op': 'pageload',
        'lcp.element': 'div[aria-label="secret.wiremark"]',
        'cls.source.1': 'span[title="secret"]',
        'browser.web_vital.cls.source.2': 'p',
        'user.ip_address': '1.2.3.4',
        'user.id': 'u',
        'http.request.header.referer': ['https://x/?q=secret'],
        'user_agent.original': 'UA/1',
        'url.full': 'https://editor/',
      },
    });
    expect(span.name).toBe('pageload /');
    expect(span.attributes).toEqual({
      'sentry.op': 'pageload',
      'user_agent.original': 'UA/1',
      'url.full': 'https://editor/',
    });
  });

  it('renames UI interaction spans (named by selector) to their op', () => {
    const streamed = scrubSpan({
      name: 'body > div[aria-label="secret.wiremark"]',
      attributes: { 'sentry.op': { value: 'ui.interaction.click', type: 'string' } },
    });
    expect(streamed.name).toBe('ui.interaction.click');

    const staticSpan = scrubSpan({
      op: 'ui.interaction.click',
      description: 'button[title="secret"]',
      data: { 'sentry.op': 'ui.interaction.click' },
    });
    expect(staticSpan.description).toBe('ui.interaction.click');
  });

  it('tolerates a span with no attributes', () => {
    expect(scrubSpan({ name: 'x' })).toEqual({ name: 'x' });
  });
});
