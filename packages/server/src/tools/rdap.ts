import {
  type JsonValue,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import {
  assertNetworkDataSourceEnabled,
  mergeNetworkToolConfig,
  type NetworkToolConfig
} from '../config.js';
import { networkConfigFromContext } from '../context.js';
import { fetchJsonLimited } from '../http.js';
import {
  assertPublicIpForLookup,
  inferRdapKind,
  normalizeHostname
} from '../security.js';

export type RdapLookupInput = {
  query: string;
  kind?: 'ip' | 'domain';
};

export type RdapLookupOutput = {
  query: string;
  kind: 'ip' | 'domain';
  source: string;
  data: JsonValue;
};

export const lookupRdap = async (
  input: RdapLookupInput,
  override?: Partial<NetworkToolConfig>
): Promise<RdapLookupOutput> => {
  const config = mergeNetworkToolConfig(override);
  assertNetworkDataSourceEnabled('rdap', config);
  const rawQuery = input.query.trim();
  const kind = input.kind ?? inferRdapKind(rawQuery);
  const query =
    kind === 'ip'
      ? assertPublicIpForLookup(rawQuery)
      : normalizeHostname(rawQuery);
  const source = `${config.rdapBaseUrl.replace(
    /\/$/,
    ''
  )}/${kind}/${encodeURIComponent(query)}`;
  const response = await fetchJsonLimited(source, config);

  return {
    query,
    kind,
    source: response.url,
    data: response.data
  };
};

export const rdapTools: ToolboxTool[] = [
  {
    name: 'rdap.lookup',
    title: 'RDAP Lookup',
    description:
      'Lookup RDAP registration data for a public IP address or domain.',
    channels: ['api', 'mcp'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['query'],
      additionalProperties: false,
      properties: {
        query: { type: 'string' },
        kind: { type: 'string', enum: ['ip', 'domain'] }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['query', 'kind', 'source', 'data'],
      properties: {
        query: { type: 'string' },
        kind: { type: 'string' },
        source: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await lookupRdap(
            input as RdapLookupInput,
            networkConfigFromContext(context)
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
