import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type PasswordGenerateInput = {
  length?: number | string;
  includeLowercase?: boolean;
  includeUppercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  avoidAmbiguous?: boolean;
};

export type PasswordGenerateOutput = {
  password: string;
  length: number;
  characterSetSize: number;
};

const lower = 'abcdefghijklmnopqrstuvwxyz';
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numbers = '0123456789';
const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
const ambiguousCharacters = new Set(['i', 'I', 'l', '0', 'O']);
const maxPasswordLength = 4096;

const filterAmbiguous = (value: string): string =>
  Array.from(value)
    .filter((character) => !ambiguousCharacters.has(character))
    .join('');

const randomIndex = (maxExclusive: number): number => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new ToolboxError(
      'PASSWORD_CRYPTO_UNAVAILABLE',
      'Secure random support is not available'
    );
  }

  const random = new Uint32Array(1);
  const range = 0x100000000;
  const maxUnbiased = Math.floor(range / maxExclusive) * maxExclusive;

  do {
    globalThis.crypto.getRandomValues(random);
  } while (random[0] >= maxUnbiased);

  return random[0] % maxExclusive;
};

const pick = (characters: string): string =>
  characters[randomIndex(characters.length)];

const shuffle = (characters: string[]): string[] => {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index]
    ];
  }

  return characters;
};

const normalizeLength = (value: PasswordGenerateInput['length']): number => {
  const length =
    typeof value === 'string' ? Number.parseInt(value, 10) : value ?? 16;

  if (!Number.isInteger(length) || length <= 0 || length > maxPasswordLength) {
    throw new ToolboxError(
      'INVALID_PASSWORD_LENGTH',
      `Password length must be between 1 and ${maxPasswordLength}`
    );
  }

  return length;
};

export const generatePassword = (
  input: PasswordGenerateInput = {}
): PasswordGenerateOutput => {
  const length = normalizeLength(input.length);
  const avoidAmbiguous = input.avoidAmbiguous ?? false;

  const groups = [
    input.includeLowercase ?? true ? lower : '',
    input.includeUppercase ?? true ? upper : '',
    input.includeNumbers ?? true ? numbers : '',
    input.includeSymbols ?? false ? symbols : ''
  ]
    .map((group) => (avoidAmbiguous ? filterAmbiguous(group) : group))
    .filter(Boolean);

  if (!groups.length) {
    throw new ToolboxError(
      'PASSWORD_CHARSET_EMPTY',
      'Select at least one character group'
    );
  }

  const charset = groups.join('');
  const passwordCharacters: string[] = [];

  if (length >= groups.length) {
    for (const group of groups) {
      passwordCharacters.push(pick(group));
    }
  }

  while (passwordCharacters.length < length) {
    passwordCharacters.push(pick(charset));
  }

  return {
    password: shuffle(passwordCharacters).join(''),
    length,
    characterSetSize: charset.length
  };
};

export const passwordTools: ToolboxTool[] = [
  {
    name: 'password.generate',
    title: 'Generate Password',
    description: 'Generate a secure random password.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        length: {
          type: 'integer',
          minimum: 1,
          maximum: maxPasswordLength,
          default: 16
        },
        includeLowercase: { type: 'boolean', default: true },
        includeUppercase: { type: 'boolean', default: true },
        includeNumbers: { type: 'boolean', default: true },
        includeSymbols: { type: 'boolean', default: false },
        avoidAmbiguous: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['password', 'length', 'characterSetSize'],
      additionalProperties: false,
      properties: {
        password: { type: 'string' },
        length: { type: 'integer' },
        characterSetSize: { type: 'integer' }
      }
    },
    execute: (input) => {
      try {
        return ok(generatePassword(input as PasswordGenerateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
