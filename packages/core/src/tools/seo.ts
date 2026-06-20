import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type RobotsRuleInput = {
  userAgent?: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
};

export type RobotsGenerateInput = {
  userAgents?: string[];
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
  rules?: RobotsRuleInput[];
  sitemap?: string | string[];
  host?: string;
  comments?: string[];
};

export type RobotsRuleOutput = {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay: number | null;
};

export type RobotsGenerateOutput = {
  text: string;
  rules: RobotsRuleOutput[];
  sitemaps: string[];
  host: string | null;
};

export type MetaOpenGraphInput = {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
  siteName?: string;
  locale?: string;
};

export type MetaTwitterInput = {
  card?: string;
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
};

export type MetaGenerateInput = {
  title?: string;
  description?: string;
  keywords?: string[] | string;
  canonicalUrl?: string;
  robots?: string[] | string;
  author?: string;
  viewport?: boolean | string;
  charset?: string;
  themeColor?: string;
  openGraph?: MetaOpenGraphInput;
  twitter?: MetaTwitterInput;
  extra?: Record<string, string>;
};

export type MetaTagOutput = {
  type: 'title' | 'meta' | 'link';
  key: string;
  value: string;
  html: string;
};

export type MetaGenerateOutput = {
  html: string;
  tags: MetaTagOutput[];
};

const maxRobotsItems = 100;
const maxMetaItems = 100;
const maxTextLength = 5000;

const sanitizeLine = (value: string, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_SEO_INPUT',
      `${fieldName} must be a string`
    );
  }

  const normalized = value.replace(/[\r\n]+/g, ' ').trim();
  if (normalized.length > maxTextLength) {
    throw new ToolboxError(
      'SEO_INPUT_TOO_LONG',
      `${fieldName} must contain at most ${maxTextLength} characters`
    );
  }

  return normalized;
};

const normalizeOptionalLine = (
  value: unknown,
  fieldName: string
): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return sanitizeLine(String(value), fieldName);
};

const normalizeStringArray = (value: unknown, fieldName: string): string[] => {
  if (value === undefined || value === null || value === '') return [];
  const rawItems = Array.isArray(value) ? value : [value];
  if (rawItems.length > maxRobotsItems) {
    throw new ToolboxError(
      'SEO_INPUT_TOO_MANY_ITEMS',
      `${fieldName} supports at most ${maxRobotsItems} items`
    );
  }

  return rawItems
    .map((item) => sanitizeLine(String(item), fieldName))
    .filter(Boolean);
};

const normalizePathList = (value: unknown, fieldName: string): string[] =>
  normalizeStringArray(value, fieldName).map((item) =>
    item === '*' || item.startsWith('/') ? item : `/${item}`
  );

const normalizeCrawlDelay = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ToolboxError(
      'ROBOTS_INVALID_CRAWL_DELAY',
      'crawlDelay must be a non-negative number'
    );
  }

  return Math.round(numeric * 1000) / 1000;
};

const normalizeRobotsRule = (
  input: RobotsRuleInput,
  fallbackUserAgent = '*'
): RobotsRuleOutput => ({
  userAgent:
    sanitizeLine(input.userAgent ?? fallbackUserAgent, 'userAgent') || '*',
  allow: normalizePathList(input.allow, 'allow'),
  disallow: normalizePathList(input.disallow, 'disallow'),
  crawlDelay: normalizeCrawlDelay(input.crawlDelay)
});

const renderRobotsRule = (rule: RobotsRuleOutput): string[] => {
  const lines = [`User-agent: ${rule.userAgent}`];
  rule.allow.forEach((item) => lines.push(`Allow: ${item}`));
  rule.disallow.forEach((item) => lines.push(`Disallow: ${item}`));
  if (rule.crawlDelay !== null) {
    lines.push(`Crawl-delay: ${rule.crawlDelay}`);
  }

  return lines;
};

export const generateRobotsTxt = (
  input: RobotsGenerateInput = {}
): RobotsGenerateOutput => {
  const explicitRules = Array.isArray(input.rules) ? input.rules : [];
  if (explicitRules.length > maxRobotsItems) {
    throw new ToolboxError(
      'SEO_INPUT_TOO_MANY_ITEMS',
      `rules supports at most ${maxRobotsItems} items`
    );
  }

  const rules =
    explicitRules.length > 0
      ? explicitRules.map((rule) => normalizeRobotsRule(rule))
      : normalizeStringArray(input.userAgents ?? ['*'], 'userAgents').map(
          (userAgent) =>
            normalizeRobotsRule(
              {
                userAgent,
                allow: input.allow,
                disallow: input.disallow,
                crawlDelay: input.crawlDelay
              },
              userAgent
            )
        );

  if (rules.length === 0) {
    rules.push(normalizeRobotsRule({ userAgent: '*' }));
  }

  const sitemaps = normalizeStringArray(input.sitemap, 'sitemap');
  const host = normalizeOptionalLine(input.host, 'host');
  const comments = normalizeStringArray(input.comments, 'comments');
  const lines: string[] = [];

  comments.forEach((comment) => lines.push(`# ${comment}`));
  if (comments.length > 0) lines.push('');
  rules.forEach((rule, index) => {
    if (index > 0) lines.push('');
    lines.push(...renderRobotsRule(rule));
  });
  if (sitemaps.length > 0 || host) lines.push('');
  sitemaps.forEach((sitemap) => lines.push(`Sitemap: ${sitemap}`));
  if (host) lines.push(`Host: ${host}`);

  return {
    text: lines.join('\n'),
    rules,
    sitemaps,
    host
  };
};

const htmlAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const htmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const addTag = (
  tags: MetaTagOutput[],
  type: MetaTagOutput['type'],
  key: string,
  value: string,
  html: string
) => {
  if (value) {
    tags.push({
      type,
      key,
      value,
      html
    });
  }
};

const addMetaName = (
  tags: MetaTagOutput[],
  name: string,
  content: string | null
) => {
  if (!content) return;
  addTag(
    tags,
    'meta',
    name,
    content,
    `<meta name="${htmlAttribute(name)}" content="${htmlAttribute(content)}">`
  );
};

const addMetaProperty = (
  tags: MetaTagOutput[],
  property: string,
  content: string | null
) => {
  if (!content) return;
  addTag(
    tags,
    'meta',
    property,
    content,
    `<meta property="${htmlAttribute(property)}" content="${htmlAttribute(
      content
    )}">`
  );
};

const normalizeKeywords = (
  value: MetaGenerateInput['keywords']
): string | null => {
  if (value === undefined || value === null || value === '') return null;
  const keywords = Array.isArray(value) ? value : String(value).split(',');
  if (keywords.length > maxMetaItems) {
    throw new ToolboxError(
      'SEO_INPUT_TOO_MANY_ITEMS',
      `keywords supports at most ${maxMetaItems} items`
    );
  }

  const normalized = keywords
    .map((item) => sanitizeLine(String(item), 'keywords'))
    .filter(Boolean)
    .join(', ');
  return normalized || null;
};

const normalizeRobotsMeta = (
  value: MetaGenerateInput['robots']
): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return (Array.isArray(value) ? value : String(value).split(','))
    .map((item) => sanitizeLine(String(item), 'robots').toLowerCase())
    .filter(Boolean)
    .join(', ');
};

const normalizeViewport = (
  value: MetaGenerateInput['viewport']
): string | null => {
  if (value === undefined) return 'width=device-width, initial-scale=1';
  if (value === false || value === null || value === '') return null;
  if (value === true) return 'width=device-width, initial-scale=1';
  return sanitizeLine(value, 'viewport');
};

const addOpenGraphTags = (
  tags: MetaTagOutput[],
  openGraph: MetaOpenGraphInput | undefined,
  fallbackTitle: string | null,
  fallbackDescription: string | null,
  fallbackUrl: string | null
) => {
  if (!openGraph) return;
  addMetaProperty(
    tags,
    'og:title',
    normalizeOptionalLine(openGraph.title, 'og:title') ?? fallbackTitle
  );
  addMetaProperty(
    tags,
    'og:description',
    normalizeOptionalLine(openGraph.description, 'og:description') ??
      fallbackDescription
  );
  addMetaProperty(
    tags,
    'og:type',
    normalizeOptionalLine(openGraph.type, 'og:type') ?? 'website'
  );
  addMetaProperty(
    tags,
    'og:url',
    normalizeOptionalLine(openGraph.url, 'og:url') ?? fallbackUrl
  );
  addMetaProperty(
    tags,
    'og:image',
    normalizeOptionalLine(openGraph.image, 'og:image')
  );
  addMetaProperty(
    tags,
    'og:site_name',
    normalizeOptionalLine(openGraph.siteName, 'og:siteName')
  );
  addMetaProperty(
    tags,
    'og:locale',
    normalizeOptionalLine(openGraph.locale, 'og:locale')
  );
};

const addTwitterTags = (
  tags: MetaTagOutput[],
  twitter: MetaTwitterInput | undefined,
  fallbackTitle: string | null,
  fallbackDescription: string | null
) => {
  if (!twitter) return;
  addMetaName(
    tags,
    'twitter:card',
    normalizeOptionalLine(twitter.card, 'twitter:card') ?? 'summary_large_image'
  );
  addMetaName(
    tags,
    'twitter:site',
    normalizeOptionalLine(twitter.site, 'twitter:site')
  );
  addMetaName(
    tags,
    'twitter:creator',
    normalizeOptionalLine(twitter.creator, 'twitter:creator')
  );
  addMetaName(
    tags,
    'twitter:title',
    normalizeOptionalLine(twitter.title, 'twitter:title') ?? fallbackTitle
  );
  addMetaName(
    tags,
    'twitter:description',
    normalizeOptionalLine(twitter.description, 'twitter:description') ??
      fallbackDescription
  );
  addMetaName(
    tags,
    'twitter:image',
    normalizeOptionalLine(twitter.image, 'twitter:image')
  );
};

export const generateMetaTags = (
  input: MetaGenerateInput = {}
): MetaGenerateOutput => {
  const tags: MetaTagOutput[] = [];
  const title = normalizeOptionalLine(input.title, 'title');
  const description = normalizeOptionalLine(input.description, 'description');
  const canonicalUrl = normalizeOptionalLine(
    input.canonicalUrl,
    'canonicalUrl'
  );

  const charset = normalizeOptionalLine(input.charset ?? 'utf-8', 'charset');
  if (charset) {
    addTag(
      tags,
      'meta',
      'charset',
      charset,
      `<meta charset="${htmlAttribute(charset)}">`
    );
  }

  const viewport = normalizeViewport(input.viewport);
  addMetaName(tags, 'viewport', viewport);

  if (title) {
    addTag(tags, 'title', 'title', title, `<title>${htmlText(title)}</title>`);
  }
  addMetaName(tags, 'description', description);
  addMetaName(tags, 'keywords', normalizeKeywords(input.keywords));
  addMetaName(tags, 'robots', normalizeRobotsMeta(input.robots));
  addMetaName(tags, 'author', normalizeOptionalLine(input.author, 'author'));
  addMetaName(
    tags,
    'theme-color',
    normalizeOptionalLine(input.themeColor, 'themeColor')
  );

  if (canonicalUrl) {
    addTag(
      tags,
      'link',
      'canonical',
      canonicalUrl,
      `<link rel="canonical" href="${htmlAttribute(canonicalUrl)}">`
    );
  }

  addOpenGraphTags(tags, input.openGraph, title, description, canonicalUrl);
  addTwitterTags(tags, input.twitter, title, description);

  if (input.extra) {
    const entries = Object.entries(input.extra);
    if (entries.length > maxMetaItems) {
      throw new ToolboxError(
        'SEO_INPUT_TOO_MANY_ITEMS',
        `extra supports at most ${maxMetaItems} items`
      );
    }
    entries.forEach(([name, content]) =>
      addMetaName(
        tags,
        sanitizeLine(name, 'extra key'),
        normalizeOptionalLine(content, 'extra value')
      )
    );
  }

  return {
    html: tags.map((tag) => tag.html).join('\n'),
    tags
  };
};

const robotsRuleSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    userAgent: { type: 'string' },
    allow: { type: 'array', items: { type: 'string' } },
    disallow: { type: 'array', items: { type: 'string' } },
    crawlDelay: { type: 'number', minimum: 0 }
  }
} as const;

export const seoTools: ToolboxTool[] = [
  {
    name: 'robots.generate',
    title: 'Generate robots.txt',
    description: 'Generate robots.txt content from structured rules.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        userAgents: { type: 'array', items: { type: 'string' } },
        allow: { type: 'array', items: { type: 'string' } },
        disallow: { type: 'array', items: { type: 'string' } },
        crawlDelay: { type: 'number', minimum: 0 },
        rules: { type: 'array', items: robotsRuleSchema },
        sitemap: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        host: { type: 'string' },
        comments: { type: 'array', items: { type: 'string' } }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text', 'rules', 'sitemaps', 'host'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        rules: { type: 'array', items: robotsRuleSchema },
        sitemaps: { type: 'array', items: { type: 'string' } },
        host: { type: ['string', 'null'] }
      }
    },
    execute: (input) => {
      try {
        return ok(generateRobotsTxt(input as RobotsGenerateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'meta.generate',
    title: 'Generate Meta Tags',
    description: 'Generate common SEO, Open Graph, and Twitter meta tags.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        keywords: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        canonicalUrl: { type: 'string' },
        robots: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        author: { type: 'string' },
        viewport: { type: ['boolean', 'string'] },
        charset: { type: 'string' },
        themeColor: { type: 'string' },
        openGraph: { type: 'object', additionalProperties: true },
        twitter: { type: 'object', additionalProperties: true },
        extra: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['html', 'tags'],
      additionalProperties: false,
      properties: {
        html: { type: 'string' },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'key', 'value', 'html'],
            additionalProperties: false,
            properties: {
              type: { type: 'string', enum: ['title', 'meta', 'link'] },
              key: { type: 'string' },
              value: { type: 'string' },
              html: { type: 'string' }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(generateMetaTags(input as MetaGenerateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
