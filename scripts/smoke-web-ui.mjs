import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const pages = [
  { path: '/', viewport: 'desktop' },
  { path: '/categories/network', viewport: 'desktop' },
  { path: '/categories/ops', viewport: 'mobile' },
  { path: '/network/http-request', viewport: 'desktop' },
  { path: '/time/crontab-guru', viewport: 'mobile' },
  { path: '/string/regex-toolkit', viewport: 'desktop' },
  { path: '/string/rsa-keypair', viewport: 'mobile' },
  { path: '/string/pem-inspector', viewport: 'desktop' },
  { path: '/ops/code-format', viewport: 'desktop' },
  { path: '/json/json-schema-validator', viewport: 'desktop' },
  { path: '/image-generic/qr-code', viewport: 'mobile' },
  {
    path: '/image-generic/image-to-icon',
    viewport: 'mobile',
    interactions: ['upload-sample-image']
  }
];

const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 }
};

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

const samplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAD0lEQVR4nGNgoBpgYGAAAAASAAGjQWcVAAAAAElFTkSuQmCC',
  'base64'
);

const getFreePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to allocate local port'));
          return;
        }
        resolvePort(address.port);
      });
    });
  });

const waitForServer = async (baseUrl, processRef) => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (processRef.exitCode !== null) {
      throw new Error(`Vite exited early with code ${processRef.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }

    await wait(250);
  }

  throw new Error('Timed out waiting for Vite');
};

const startVite = async () => {
  const viteBin = resolve(rootDir, 'node_modules/vite/bin/vite.js');
  if (!existsSync(viteBin)) {
    throw new Error('Missing Vite binary. Run npm install first.');
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const processRef = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        BROWSER: 'none'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  let output = '';
  processRef.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  processRef.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, processRef);
  } catch (error) {
    processRef.kill('SIGTERM');
    throw new Error(`${error instanceof Error ? error.message : error}\n${output}`);
  }

  return {
    baseUrl,
    stop: async () => {
      if (processRef.exitCode !== null) return;
      processRef.kill('SIGTERM');
      await wait(500);
      if (processRef.exitCode === null) processRef.kill('SIGKILL');
    }
  };
};

const launchBrowser = async () => {
  const requestedChannel = process.env.PRIVATE_TOOLBOX_PLAYWRIGHT_CHANNEL;
  const attempts = requestedChannel
    ? [{ label: requestedChannel, options: { channel: requestedChannel } }]
    : [
        { label: 'bundled-chromium', options: {} },
        { label: 'chrome', options: { channel: 'chrome' } },
        { label: 'msedge', options: { channel: 'msedge' } }
      ];
  const errors = [];

  for (const attempt of attempts) {
    try {
      return {
        browser: await chromium.launch({
          headless: true,
          ...attempt.options
        }),
        channel: attempt.label
      };
    } catch (error) {
      errors.push(
        `${attempt.label}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  throw new Error(
    [
      'Unable to launch a browser for Web UI smoke.',
      'Install Playwright browsers with `npx playwright install chromium`,',
      'or set PRIVATE_TOOLBOX_PLAYWRIGHT_CHANNEL=chrome if system Chrome is available.',
      ...errors
    ].join('\n')
  );
};

const runInteraction = async (page, interaction) => {
  if (interaction === 'upload-sample-image') {
    await page.setInputFiles('input[type="file"]', {
      name: 'private-toolbox-smoke.png',
      mimeType: 'image/png',
      buffer: samplePng
    });
    await page.waitForTimeout(1_500);
    return;
  }

  throw new Error(`Unknown Web UI smoke interaction: ${interaction}`);
};

const inspectPage = async (page, url, viewportName, interactions = []) => {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.setViewportSize(viewports[viewportName]);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  for (const interaction of interactions) {
    await runInteraction(page, interaction);
  }

  const state = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const visibleText = bodyText.replace(/\s+/g, ' ').trim();
    const pageTitle = document.querySelector('h1')?.textContent?.trim() ?? '';
    const missingTranslation = /(?:^|\s)(?:network|ops|string|json|image|time):[A-Za-z0-9_.-]+/.test(
      bodyText
    );
    const nakedTranslationKey =
      /(?:^|\s)[A-Za-z0-9]+(?:\.[A-Za-z0-9_-]+){2,}(?:\s|$)/.test(bodyText);

    return {
      bodyLength: visibleText.length,
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
      missingTranslation: missingTranslation || nakedTranslationKey,
      pageTitle
    };
  });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);

  return {
    url,
    viewport: viewportName,
    ...state,
    consoleErrors,
    pageErrors
  };
};

const assertPage = (result) => {
  const failures = [];
  if (result.bodyLength < 20) failures.push('page rendered too little text');
  if (new URL(result.url).pathname !== '/' && !result.pageTitle) {
    failures.push('missing page h1 title');
  }
  if (result.horizontalOverflow) failures.push('page has horizontal overflow');
  if (result.missingTranslation) failures.push('page shows missing translation key');
  if (result.consoleErrors.length > 0) failures.push('console errors');
  if (result.pageErrors.length > 0) failures.push('page errors');

  return failures;
};

const main = async () => {
  let server = null;
  let browser = null;
  let browserChannel = '';
  const results = [];
  const issues = [];

  try {
    server = await startVite();
    const launched = await launchBrowser();
    browser = launched.browser;
    browserChannel = launched.channel;

    for (const item of pages) {
      const page = await browser.newPage();
      const result = await inspectPage(
        page,
        `${server.baseUrl}${item.path}`,
        item.viewport,
        item.interactions
      );
      await page.close();

      const failures = assertPage(result);
      results.push({
        path: item.path,
        viewport: item.viewport,
        pageTitle: result.pageTitle,
        bodyLength: result.bodyLength,
        interactions: item.interactions ?? [],
        consoleErrors: result.consoleErrors.length,
        pageErrors: result.pageErrors.length,
        horizontalOverflow: result.horizontalOverflow,
        missingTranslation: result.missingTranslation
      });

      if (failures.length > 0) {
        issues.push({
          path: item.path,
          viewport: item.viewport,
          failures,
          consoleErrors: result.consoleErrors,
          pageErrors: result.pageErrors
        });
      }
    }
  } finally {
    if (browser) await browser.close();
    if (server) await server.stop();
  }

  if (issues.length > 0) {
    console.error(JSON.stringify({ ok: false, results, issues }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        browser: browserChannel,
        pages: results
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
