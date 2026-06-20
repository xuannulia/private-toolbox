import { tool as codeFormat } from './code-format/meta';
import { tool as codePreview } from './code-preview/meta';
import { tool as dockerCommands } from './docker-commands/meta';
import { tool as dockerCompose } from './docker-compose/meta';
import { tool as dockerfileFormat } from './dockerfile-format/meta';
import { tool as dockerfileSnippet } from './dockerfile-snippet/meta';
import { tool as nginxFormat } from './nginx-format/meta';
import { tool as nginxLocationMatch } from './nginx-location-match/meta';
import { tool as nginxSnippet } from './nginx-snippet/meta';
import { tool as sqlFormat } from './sql-format/meta';

export const opsTools = [
  codePreview,
  codeFormat,
  sqlFormat,
  dockerCommands,
  dockerCompose,
  dockerfileFormat,
  dockerfileSnippet,
  nginxFormat,
  nginxLocationMatch,
  nginxSnippet
];
