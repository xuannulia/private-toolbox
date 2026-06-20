import { describe, expect, it } from 'vitest';
import {
  analyzeHiddenChars,
  changeTextCase,
  convertCamelSnake,
  convertFullHalfWidth,
  diffText,
  getTextStats,
  joinText,
  removeDuplicateLines,
  replaceText,
  reverseText,
  slugifyText,
  splitText,
  textTools,
  truncateTextCore
} from './text';

describe('diffText', () => {
  it('returns structured word-level diff parts', () => {
    expect(
      diffText({
        left: 'Hello world',
        right: 'Hello brave world',
        level: 'word'
      })
    ).toMatchObject({
      level: 'word',
      equal: false,
      addedPartCount: 1,
      removedPartCount: 0,
      parts: [
        { type: 'unchanged', value: 'Hello ', count: 2 },
        { type: 'added', value: 'brave ', count: 2 },
        { type: 'unchanged', value: 'world', count: 1 }
      ]
    });
  });

  it('returns character-level additions', () => {
    expect(
      diffText({
        left: 'color',
        right: 'colour',
        level: 'char'
      }).parts
    ).toContainEqual({ type: 'added', value: 'u', count: 1 });
  });

  it('returns line-level changes', () => {
    const result = diffText({
      left: 'one\ntwo\n',
      right: 'one\nthree\n',
      level: 'line'
    });

    expect(result.parts).toEqual([
      { type: 'unchanged', value: 'one\n', count: 1 },
      { type: 'removed', value: 'two\n', count: 1 },
      { type: 'added', value: 'three\n', count: 1 }
    ]);
  });

  it('marks identical text as equal', () => {
    expect(diffText({ left: 'same', right: 'same' })).toMatchObject({
      equal: true,
      addedPartCount: 0,
      removedPartCount: 0
    });
  });

  it('rejects invalid levels', () => {
    expect(() =>
      diffText({
        left: 'a',
        right: 'b',
        level: 'sentence' as never
      })
    ).toThrow('level must be one of');
  });
});

describe('textTools', () => {
  it('registers text tools for Web, API, and MCP', () => {
    expect(
      textTools.find((tool) => tool.name === 'text.diff')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.replace')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.remove_duplicate_lines')
        ?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.hidden_chars')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.slug')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.split')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.join')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.truncate')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.reverse')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.uppercase')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.lowercase')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.title_case')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.capitalize')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.camel_snake')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.full_half_width')?.channels
    ).toEqual(['web', 'api', 'mcp']);
    expect(
      textTools.find((tool) => tool.name === 'text.stats')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});

describe('replaceText', () => {
  it('replaces literal text and reports replacement counts', () => {
    expect(
      replaceText({
        text: 'apple orange apple',
        search: 'apple',
        replacement: 'grape'
      })
    ).toEqual({
      output: 'grape orange grape',
      mode: 'literal',
      replacementCount: 2,
      matched: true
    });
  });

  it('replaces regular expression matches from slash syntax', () => {
    expect(
      replaceText({
        text: 'The price is 100 and 20.',
        search: '/\\d+/g',
        replacement: 'X',
        mode: 'regex'
      })
    ).toMatchObject({
      output: 'The price is X and X.',
      replacementCount: 2,
      matched: true
    });
  });

  it('uses global matching for raw regular expression patterns by default', () => {
    expect(
      replaceText({
        text: 'foo Foo foo',
        search: 'foo',
        replacement: 'bar',
        mode: 'regex',
        flags: 'gi'
      })
    ).toMatchObject({
      output: 'bar bar bar',
      replacementCount: 3
    });
  });

  it('rejects invalid regular expressions', () => {
    expect(() =>
      replaceText({
        text: 'abc',
        search: '/(/',
        replacement: 'x',
        mode: 'regex'
      })
    ).toThrow('Invalid regular expression');
  });
});

describe('removeDuplicateLines', () => {
  it('removes duplicate lines while keeping first occurrences', () => {
    expect(
      removeDuplicateLines({
        text: 'line1\nline2\nline1\nline3\nline2'
      })
    ).toEqual({
      output: 'line1\nline2\nline3',
      mode: 'all',
      keyMode: 'line',
      newlines: 'filter',
      originalLineCount: 5,
      outputLineCount: 3,
      removedLineCount: 2
    });
  });

  it('can keep only absolutely unique lines', () => {
    expect(
      removeDuplicateLines({
        text: 'line1\nline2\nline1\nline3\nline4\nline4',
        mode: 'unique'
      }).output
    ).toBe('line2\nline3');
  });

  it('supports trimming and sorting lines', () => {
    expect(
      removeDuplicateLines({
        text: '  line3  \nline1\n\nline3\nline2\nline1',
        newlines: 'delete',
        sortLines: true,
        trimLines: true
      }).output
    ).toBe('line1\nline2\nline3');
  });

  it('preserves line slots when requested', () => {
    expect(
      removeDuplicateLines({
        text: 'line1\n\nline2\n\nline2\nline3',
        newlines: 'preserve'
      }).output
    ).toBe('line1\n\nline2\n\n\nline3');
  });

  it('can remove duplicate rows by word key', () => {
    expect(
      removeDuplicateLines({
        text: 'id1 alpha\nid2 beta\nid1 gamma',
        keyMode: 'word',
        keyIndex: 1
      }).output
    ).toBe('id1 alpha\nid2 beta');
  });

  it('can remove duplicate rows by delimited field key', () => {
    expect(
      removeDuplicateLines({
        text: '1,Alice\n2,Bob\n1,Alicia',
        keyMode: 'field',
        fieldDelimiter: ',',
        keyIndex: 1
      }).output
    ).toBe('1,Alice\n2,Bob');
  });

  it('can remove duplicate rows by regular expression key', () => {
    expect(
      removeDuplicateLines({
        text: 'user=alice action=login\nuser=bob action=logout\nuser=alice action=write',
        keyMode: 'regex',
        keyRegex: 'user=(\\w+)'
      }).output
    ).toBe('user=alice action=login\nuser=bob action=logout');
  });

  it('can keep only unique rows by extracted key', () => {
    expect(
      removeDuplicateLines({
        text: 'id1 alpha\nid2 beta\nid1 gamma\nid3 delta',
        mode: 'unique',
        keyMode: 'word',
        keyIndex: 1
      }).output
    ).toBe('id2 beta\nid3 delta');
  });
});

describe('analyzeHiddenChars', () => {
  it('detects RTL override characters', () => {
    const result = analyzeHiddenChars({ text: 'Hello\u202EWorld' });

    expect(result.totalHiddenChars).toBe(1);
    expect(result.hasRTLOverride).toBe(true);
    expect(result.hiddenCharacters[0]).toMatchObject({
      char: '\u202E',
      unicode: 'U+202E',
      name: 'Right-to-Left Override',
      category: 'RTL Override',
      position: 5,
      codePointIndex: 5,
      isRTL: true
    });
  });

  it('can detect only zero-width characters when other invisible chars are disabled', () => {
    const result = analyzeHiddenChars({
      text: 'A\u200BB\u00A0C',
      includeInvisible: false,
      includeZeroWidth: true
    });

    expect(result.totalHiddenChars).toBe(1);
    expect(result.hiddenCharacters[0]).toMatchObject({
      unicode: 'U+200B',
      isZeroWidth: true
    });
  });

  it('detects control characters', () => {
    const result = analyzeHiddenChars({ text: 'Hello\u0000World' });

    expect(result.totalHiddenChars).toBe(1);
    expect(result.hasControlChars).toBe(true);
    expect(result.hiddenCharacters[0]).toMatchObject({
      unicode: 'U+0000',
      category: 'Control Character',
      displayValue: 'U+0000'
    });
  });

  it('limits returned characters while preserving total count', () => {
    const result = analyzeHiddenChars({
      text: '\u200B\u200C\u200D',
      maxItems: 2
    });

    expect(result.totalHiddenChars).toBe(3);
    expect(result.hiddenCharacters).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });
});

describe('slugifyText', () => {
  it('generates lowercase URL slugs', () => {
    expect(slugifyText({ text: 'Hello World @2023!' })).toMatchObject({
      output: 'hello-world-2023',
      separator: '-',
      preserveCase: false,
      lineCount: 1,
      changedLineCount: 1
    });
  });

  it('can preserve case', () => {
    expect(
      slugifyText({
        text: 'Héllo Wörld',
        preserveCase: true
      }).output
    ).toBe('Hello-World');
  });

  it('preserves empty lines', () => {
    expect(slugifyText({ text: 'Hello World\n\nFoo Bar' }).output).toBe(
      'hello-world\n\nfoo-bar'
    );
  });

  it('supports custom separators', () => {
    expect(
      slugifyText({
        text: 'Hello World',
        separator: '_'
      }).output
    ).toBe('hello_world');
  });
});

describe('splitText', () => {
  it('splits by literal symbol', () => {
    expect(
      splitText({
        text: 'hello world',
        symbol: ' ',
        outputSeparator: ','
      })
    ).toMatchObject({
      output: 'hello,world',
      parts: ['hello', 'world'],
      partCount: 2,
      mode: 'symbol'
    });
  });

  it('splits by regular expression', () => {
    expect(
      splitText({
        text: 'hello1world2again',
        mode: 'regex',
        regex: '\\d',
        outputSeparator: ','
      }).output
    ).toBe('hello,world,again');
  });

  it('splits by fixed length', () => {
    expect(
      splitText({
        text: 'helloworld',
        mode: 'length',
        length: 3,
        outputSeparator: ','
      }).output
    ).toBe('hel,low,orl,d');
  });

  it('splits into decorated chunks', () => {
    expect(
      splitText({
        text: 'helloworldagain',
        mode: 'chunks',
        chunks: 3,
        prefix: '[',
        suffix: ']',
        outputSeparator: ','
      }).output
    ).toBe('[hello],[world],[again]');
  });
});

describe('joinText', () => {
  it('joins non-blank trimmed lines by default', () => {
    expect(
      joinText({
        text: 'line1  \n  \nline2\nline3  \n\nline4'
      })
    ).toMatchObject({
      output: 'line1line2line3line4',
      originalLineCount: 6,
      joinedLineCount: 4,
      removedBlankLineCount: 2
    });
  });

  it('joins lines with a custom separator', () => {
    expect(
      joinText({
        text: 'line1\nline2\nline3',
        joiner: ' '
      }).output
    ).toBe('line1 line2 line3');
  });
});

describe('truncateTextCore', () => {
  it('truncates from the right', () => {
    expect(
      truncateTextCore({
        text: 'Lorem ipsum dolor sit amet',
        maxLength: 11
      })
    ).toMatchObject({
      output: 'Lorem ipsum',
      maxLength: 11,
      side: 'right',
      lineByLine: false,
      truncated: true
    });
  });

  it('truncates from the left with an indicator', () => {
    expect(
      truncateTextCore({
        text: 'Lorem ipsum dolor sit amet',
        maxLength: 12,
        side: 'left',
        addIndicator: true,
        indicator: '...'
      }).output
    ).toBe('... sit amet');
  });

  it('truncates line by line', () => {
    expect(
      truncateTextCore({
        text: 'abcdef\nghijkl',
        maxLength: 3,
        lineByLine: true
      }).output
    ).toBe('abc\nghi');
  });
});

describe('reverseText', () => {
  it('reverses a whole input by default', () => {
    expect(reverseText({ text: 'hello world' })).toMatchObject({
      output: 'dlrow olleh',
      itemCount: 1,
      multiLine: false
    });
  });

  it('can reverse trimmed non-empty lines', () => {
    expect(
      reverseText({
        text: '  hello\n\nworld  ',
        multiLine: true,
        removeEmptyItems: true,
        trimItems: true
      }).output
    ).toBe('olleh\ndlrow');
  });
});

describe('changeTextCase', () => {
  it('converts text to uppercase', () => {
    expect(changeTextCase('Hello world', 'uppercase')).toEqual({
      output: 'HELLO WORLD',
      changed: true
    });
  });

  it('converts text to lowercase', () => {
    expect(changeTextCase('Hello WORLD', 'lowercase')).toEqual({
      output: 'hello world',
      changed: true
    });
  });

  it('converts words to title case', () => {
    expect(
      changeTextCase("hello WORLD from codex's toolbox", 'title_case')
    ).toEqual({
      output: "Hello World From Codex's Toolbox",
      changed: true
    });
  });

  it('capitalizes the first letter of each line without changing the rest', () => {
    expect(changeTextCase('hello WORLD\n  next line', 'capitalize')).toEqual({
      output: 'Hello WORLD\n  Next line',
      changed: true
    });
  });
});

describe('convertCamelSnake', () => {
  it('converts camelCase and PascalCase identifiers to snake_case', () => {
    expect(
      convertCamelSnake({
        text: 'userId\nHTTPResponseCode\nproject-name'
      })
    ).toEqual({
      output: 'user_id\nhttp_response_code\nproject_name',
      mode: 'camel_to_snake',
      changed: true,
      lineCount: 3
    });
  });

  it('converts snake_case identifiers to camelCase', () => {
    expect(
      convertCamelSnake({
        text: 'user_id\nproject_name',
        mode: 'snake_to_camel'
      }).output
    ).toBe('userId\nprojectName');
  });

  it('can produce PascalCase from snake_case identifiers', () => {
    expect(
      convertCamelSnake({
        text: 'user_id',
        mode: 'snake_to_camel',
        pascalCase: true
      }).output
    ).toBe('UserId');
  });
});

describe('convertFullHalfWidth', () => {
  it('converts fullwidth ASCII-compatible characters to halfwidth', () => {
    expect(
      convertFullHalfWidth({
        text: 'ＡＢＣ１２３！　OK'
      })
    ).toEqual({
      output: 'ABC123! OK',
      mode: 'full_to_half',
      changed: true
    });
  });

  it('converts halfwidth ASCII-compatible characters to fullwidth', () => {
    expect(
      convertFullHalfWidth({
        text: 'ABC 123!',
        mode: 'half_to_full'
      }).output
    ).toBe('ＡＢＣ　１２３！');
  });

  it('can preserve spaces when converting width', () => {
    expect(
      convertFullHalfWidth({
        text: 'ABC 123',
        mode: 'half_to_full',
        convertSpaces: false
      }).output
    ).toBe('ＡＢＣ １２３');
  });
});

describe('getTextStats', () => {
  it('counts text basics', () => {
    expect(
      getTextStats({
        text: 'Hello world!\n\nAgain.'
      })
    ).toMatchObject({
      characters: 20,
      codePoints: 20,
      words: 3,
      lines: 2,
      sentences: 2,
      paragraphs: 2,
      bytesUtf8: 20,
      characterFrequency: [],
      wordFrequency: []
    });
  });

  it('can include empty lines', () => {
    expect(
      getTextStats({
        text: 'a\n\nb',
        includeEmptyLines: true
      }).lines
    ).toBe(3);
  });

  it('returns word and character frequency tables', () => {
    const result = getTextStats({
      text: 'Apple apple banana',
      includeWordFrequency: true,
      includeCharacterFrequency: true,
      maxFrequencyItems: 3
    });

    expect(result.wordFrequency).toEqual([
      {
        value: 'apple',
        displayValue: 'apple',
        count: 2,
        percentage: 2 / 3
      },
      {
        value: 'banana',
        displayValue: 'banana',
        count: 1,
        percentage: 1 / 3
      }
    ]);
    expect(
      result.characterFrequency.find((item) => item.value === 'p')
    ).toMatchObject({
      value: 'p',
      displayValue: 'p',
      count: 4
    });
  });

  it('supports custom sentence delimiters', () => {
    expect(
      getTextStats({
        text: 'One; Two; Three',
        sentenceDelimiters: [';']
      }).sentences
    ).toBe(3);
  });
});
