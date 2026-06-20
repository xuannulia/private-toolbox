import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { getCoreToolsByChannel } from '@private-toolbox/core';
import { getServerToolsByChannel } from '@private-toolbox/server';
import {
  filterTools,
  getToolsByCategory,
  tools as registeredTools
} from './index';
import type { DefinedTool } from './defineTool';
import type { FullI18nKey, I18nNamespaces } from '../i18n';
import { getMappedToolProcessingPaths } from './processing';

const mergePdfTool = {
  type: 'pdf',
  path: 'pdf/merge-pdf',
  name: 'pdf:mergePdf.title' as FullI18nKey,
  description: 'pdf:mergePdf.description' as FullI18nKey,
  shortDescription: 'pdf:mergePdf.shortDescription' as FullI18nKey,
  icon: 'icon',
  keywords: [
    'pdf',
    'merge',
    'extract',
    'pages',
    'combine',
    'document',
    'join',
    'append'
  ],
  component: (() => null) as unknown,
  userTypes: ['generalUsers']
} as unknown as DefinedTool;

const base64Tool = {
  type: 'string',
  path: 'string/base64',
  name: 'string:base64.title' as FullI18nKey,
  description: 'string:base64.description' as FullI18nKey,
  shortDescription: 'string:base64.shortDescription' as FullI18nKey,
  icon: 'icon',
  keywords: ['b64'],
  component: (() => null) as unknown,
  userTypes: ['generalUsers', 'developers']
} as unknown as DefinedTool;

const otherPdfTool = {
  type: 'pdf',
  path: 'pdf/other-pdf',
  name: 'pdf:otherPdf.title' as FullI18nKey,
  description: 'pdf:otherPdf.description' as FullI18nKey,
  shortDescription: 'pdf:otherPdf.shortDescription' as FullI18nKey,
  icon: 'icon',
  keywords: [],
  component: (() => null) as unknown,
  userTypes: ['generalUsers']
} as unknown as DefinedTool;

const jsonFormatterTool = {
  type: 'json',
  path: 'json/prettify',
  name: 'json:prettify.title' as FullI18nKey,
  description: 'json:prettify.description' as FullI18nKey,
  shortDescription: 'json:prettify.shortDescription' as FullI18nKey,
  icon: 'icon',
  keywords: ['json格式化', 'json 格式化', 'format', '格式化'],
  component: (() => null) as unknown,
  userTypes: ['developers']
} as unknown as DefinedTool;

type NamespacedT = TFunction<I18nNamespaces[]>;

const enTranslations: Record<string, string> = {
  'pdf:mergePdf.title': 'Merge PDF',
  'pdf:mergePdf.description': 'Merge multiple PDF files into one document',
  'pdf:mergePdf.shortDescription': 'Merge PDF files',
  'pdf:otherPdf.title': 'Document helper',
  'pdf:otherPdf.description': 'Helper for pdf tasks',
  'pdf:otherPdf.shortDescription': 'PDF helper',
  'string:base64.title': 'Base64 Encoder/Decoder',
  'string:base64.description': 'Encode or decode Base64 text',
  'string:base64.shortDescription': 'Convert text to and from Base64'
};

const esTranslations: Record<string, string> = {
  'pdf:mergePdf.title': 'Unir PDF',
  'pdf:mergePdf.description': 'Unir varios archivos PDF en un solo documento',
  'pdf:mergePdf.shortDescription': 'Unir archivos PDF'
};

const zhTranslations: Record<string, string> = {
  'json:prettify.title': 'JSON 格式化',
  'json:prettify.description': '使用适当的缩进和间距来格式化 JSON。',
  'json:prettify.shortDescription': '格式化并美化 JSON'
};

const makeT = (dict: Record<string, string>): NamespacedT =>
  ((key: string) => dict[key] ?? key) as unknown as NamespacedT;

describe('filterTools token-based search', () => {
  const tools = [mergePdfTool, base64Tool, otherPdfTool];
  const tEn = makeT(enTranslations);
  const tEs = makeT(esTranslations);
  const tZh = makeT(zhTranslations);

  it('returns all tools when query is empty or whitespace', () => {
    expect(filterTools(tools, '', [], tEn)).toEqual(tools);
    expect(filterTools(tools, '   ', [], tEn)).toEqual(tools);
  });

  it('matches tools regardless of word order and extra whitespace', () => {
    const result1 = filterTools(tools, 'pdf merge', [], tEn);
    const result2 = filterTools(tools, '   merge   pdf  ', [], tEn);

    expect(result1).toContain(mergePdfTool);
    expect(result2).toContain(mergePdfTool);
  });

  it('matches base64 tool with different queries and is case-insensitive', () => {
    expect(filterTools(tools, 'Base64', [], tEn)).toContain(base64Tool);
    expect(filterTools(tools, 'base64 encoder', [], tEn)).toContain(base64Tool);
  });

  it('matches tools using keyword-based English synonyms', () => {
    const result = filterTools(tools, 'pdf join', [], tEn);
    expect(result).toContain(mergePdfTool);
  });

  it('matches base64 tool with spaced and short-form variants', () => {
    const resultBase64Spaced = filterTools(tools, 'base 64', [], tEn);
    const resultB64 = filterTools(tools, 'b64', [], tEn);

    expect(resultBase64Spaced).toContain(base64Tool);
    expect(resultB64).toContain(base64Tool);
  });

  it('ignores trailing spaces', () => {
    const result = filterTools(tools, 'pdf merge   ', [], tEn);
    expect(result).toContain(mergePdfTool);
  });

  it('works with non-English localized strings', () => {
    const result = filterTools(tools, 'unir pdf', [], tEs);
    expect(result).toContain(mergePdfTool);
  });

  it('matches Chinese JSON formatter queries without spaces', () => {
    const result = filterTools([jsonFormatterTool], 'json格式化', [], tZh);
    expect(result).toEqual([jsonFormatterTool]);
  });

  it('tolerates single-character typos in query tokens', () => {
    const result = filterTools(tools, 'merhe pdf', [], tEn);
    expect(result[0]).toBe(mergePdfTool);
  });

  it('ranks tools with title matches above description-only matches', () => {
    const result = filterTools(tools, 'pdf', [], tEn);
    expect(result[0]).toBe(mergePdfTool);
  });
});

describe('tool processing metadata', () => {
  const getRegisteredTool = (path: string): DefinedTool => {
    const tool = registeredTools.find((item) => item.path === path);
    expect(tool, `Expected registered tool at ${path}`).toBeDefined();
    return tool!;
  };

  it('marks every registered tool with internal processing metadata', () => {
    for (const tool of registeredTools) {
      expect(tool.processing, tool.path).toBeDefined();
      expect(tool.processing.runtimes, tool.path).toContain('web');
      expect(tool.processing.apiTools, tool.path).toBeInstanceOf(Array);
      expect(tool.processing.mcpTools, tool.path).toBeInstanceOf(Array);
    }
  });

  it('keeps web processing tool names aligned with API and MCP registries', () => {
    const registeredApiToolNames = new Set([
      ...getCoreToolsByChannel('api').map((tool) => tool.name),
      ...getServerToolsByChannel('api').map((tool) => tool.name)
    ]);
    const registeredMcpToolNames = new Set([
      ...getCoreToolsByChannel('mcp').map((tool) => tool.name),
      ...getServerToolsByChannel('mcp').map((tool) => tool.name)
    ]);

    for (const tool of registeredTools) {
      for (const name of tool.processing.apiTools) {
        expect(registeredApiToolNames.has(name), `${tool.path}: ${name}`).toBe(
          true
        );
      }

      for (const name of tool.processing.mcpTools) {
        expect(name.startsWith('http.'), `${tool.path}: ${name}`).toBe(false);
        expect(registeredMcpToolNames.has(name), `${tool.path}: ${name}`).toBe(
          true
        );
      }
    }
  });

  it('keeps explicit processing metadata mapped to registered tools', () => {
    const registeredPaths = new Set(registeredTools.map((tool) => tool.path));

    for (const path of getMappedToolProcessingPaths()) {
      expect(registeredPaths.has(path), path).toBe(true);
    }
  });

  it('marks shared core tools as local with API and MCP availability', () => {
    const tool = getRegisteredTool('json/prettify');

    expect(tool.processing).toMatchObject({
      dataFlow: 'local',
      usesBackend: false,
      usesNetwork: false,
      apiTools: ['json.format'],
      mcpTools: ['json.format']
    });
    expect(tool.processing.runtimes).toEqual(['web', 'api', 'mcp']);
  });

  it('marks guarded network lookup tools as backend network tools exposed to MCP', () => {
    const tool = getRegisteredTool('network/dns-lookup');

    expect(tool.processing).toMatchObject({
      dataFlow: 'network',
      usesBackend: true,
      usesNetwork: true,
      apiTools: ['dns.lookup'],
      mcpTools: ['dns.lookup']
    });
    expect(tool.processing.runtimes).toEqual(['web', 'api', 'mcp']);
  });

  it('keeps HTTP request tools API-only and hidden from MCP metadata', () => {
    const tool = getRegisteredTool('network/http-request');

    expect(tool.processing).toMatchObject({
      dataFlow: 'network',
      usesBackend: true,
      usesNetwork: true,
      apiTools: ['http.request'],
      mcpTools: []
    });
    expect(tool.processing.runtimes).toEqual(['web', 'api']);
  });

  it('marks local server file tools as backend-capable MCP tools', () => {
    const tool = getRegisteredTool('image-generic/image-to-base64');

    expect(tool.processing).toMatchObject({
      dataFlow: 'backend',
      usesBackend: true,
      usesNetwork: false,
      apiTools: ['image.to_base64'],
      mcpTools: ['image.to_base64']
    });
  });

  it('keeps unmigrated browser-only tools local to the Web UI', () => {
    const tool = getRegisteredTool('pdf/merge-pdf');

    expect(tool.processing).toMatchObject({
      dataFlow: 'local',
      runtimes: ['web'],
      usesBackend: false,
      usesNetwork: false,
      apiTools: [],
      mcpTools: []
    });
  });
});

describe('tool category layout', () => {
  it('keeps common developer categories before network and ops sections', () => {
    const orderedTypes = getToolsByCategory([], makeT({})).map(
      (category) => category.type
    );

    expect(orderedTypes.indexOf('json')).toBeLessThan(
      orderedTypes.indexOf('string')
    );
    expect(orderedTypes.indexOf('string')).toBeLessThan(
      orderedTypes.indexOf('time')
    );
    expect(orderedTypes.indexOf('time')).toBeLessThan(
      orderedTypes.indexOf('network')
    );
    expect(orderedTypes.indexOf('network')).toBeLessThan(
      orderedTypes.indexOf('ops')
    );
  });
});
