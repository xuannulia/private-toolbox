import { describe, expect, it } from 'vitest';
import { generateMetaTags, generateRobotsTxt, seoTools } from './seo';

describe('robots.generate', () => {
  it('generates robots.txt from simple options', () => {
    const result = generateRobotsTxt({
      userAgents: ['*'],
      allow: ['/'],
      disallow: ['/admin'],
      crawlDelay: 2.5,
      sitemap: 'https://example.com/sitemap.xml',
      host: 'example.com'
    });

    expect(result.text).toBe(`User-agent: *
Allow: /
Disallow: /admin
Crawl-delay: 2.5

Sitemap: https://example.com/sitemap.xml
Host: example.com`);
    expect(result.rules[0]).toMatchObject({
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin'],
      crawlDelay: 2.5
    });
  });

  it('generates multiple explicit rule groups', () => {
    const result = generateRobotsTxt({
      rules: [
        { userAgent: '*', disallow: ['/private'] },
        { userAgent: 'Googlebot', allow: ['/private/public'] }
      ]
    });

    expect(result.text).toContain('User-agent: *');
    expect(result.text).toContain('User-agent: Googlebot');
    expect(result.text).toContain('Allow: /private/public');
  });
});

describe('meta.generate', () => {
  it('generates basic SEO meta tags', () => {
    const result = generateMetaTags({
      title: 'Private Toolbox',
      description: 'Local-first developer tools',
      keywords: ['tools', 'mcp'],
      canonicalUrl: 'https://example.com',
      robots: ['index', 'follow'],
      themeColor: '#111111'
    });

    expect(result.html).toContain('<title>Private Toolbox</title>');
    expect(result.html).toContain(
      '<meta name="description" content="Local-first developer tools">'
    );
    expect(result.html).toContain(
      '<link rel="canonical" href="https://example.com">'
    );
    expect(result.tags.map((tag) => tag.key)).toEqual(
      expect.arrayContaining([
        'charset',
        'viewport',
        'title',
        'description',
        'keywords',
        'robots',
        'theme-color',
        'canonical'
      ])
    );
  });

  it('escapes HTML-sensitive values and adds social tags', () => {
    const result = generateMetaTags({
      title: 'A & B',
      description: '<fast>',
      openGraph: {
        image: 'https://example.com/cover.png'
      },
      twitter: {
        site: '@example'
      }
    });

    expect(result.html).toContain('<title>A &amp; B</title>');
    expect(result.html).toContain('content="&lt;fast&gt;"');
    expect(result.html).toContain('property="og:image"');
    expect(result.html).toContain('name="twitter:site"');
  });

  it('registers SEO tools for Web, API, and MCP', () => {
    expect(seoTools.map((tool) => tool.name)).toEqual([
      'robots.generate',
      'meta.generate'
    ]);
    expect(
      seoTools.every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
    expect(seoTools.every((tool) => tool.risks.join(',') === 'local')).toBe(
      true
    );
  });
});
