import { describe, expect, it } from 'vitest';
import {
  chunkListItems,
  getMostCommonItems,
  listTools,
  reverseListItems,
  rotateListItems,
  shuffleListItems,
  sortList,
  truncateListItems,
  uniqueListItems
} from './list';

describe('list tools', () => {
  it('sorts numbers before text and supports descending numeric order', () => {
    const result = sortList({
      text: 'd,2,10,a,1',
      splitMode: 'separator',
      separator: ',',
      joinSeparator: ' ',
      method: 'numeric',
      order: 'desc'
    });

    expect(result.items).toEqual(['10', '2', '1', 'a', 'd']);
    expect(result.result).toBe('10 2 1 a d');
  });

  it('reverses regex-split items', () => {
    const result = reverseListItems({
      text: 'apple banana orange',
      splitMode: 'regex',
      separator: '\\s+',
      joinSeparator: ', '
    });

    expect(result.items).toEqual(['orange', 'banana', 'apple']);
    expect(result.result).toBe('orange, banana, apple');
  });

  it('shuffles deterministically when a seed is provided', () => {
    const input = {
      items: ['a', 'b', 'c', 'd'],
      seed: 'private-toolbox',
      joinSeparator: ''
    };

    expect(shuffleListItems(input)).toEqual(shuffleListItems(input));
    expect(shuffleListItems(input).items.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps unique items while preserving first-seen order', () => {
    const result = uniqueListItems({
      text: 'Apple,banana,apple,orange,Banana',
      splitMode: 'separator',
      separator: ',',
      caseSensitive: false,
      joinSeparator: '|'
    });

    expect(result.items).toEqual(['Apple', 'banana', 'orange']);
    expect(result.result).toBe('Apple|banana|orange');
  });

  it('can return only absolutely unique items', () => {
    const result = uniqueListItems({
      text: 'apple,banana,apple,orange',
      splitMode: 'separator',
      separator: ',',
      onlyUnique: true
    });

    expect(result.items).toEqual(['banana', 'orange']);
  });

  it('counts and ranks common items', () => {
    const result = getMostCommonItems({
      text: 'Apple,banana,apple,orange,Banana,apple',
      splitMode: 'separator',
      separator: ',',
      ignoreCase: true
    });

    expect(result.total).toBe(6);
    expect(result.entries.map(({ item, count }) => ({ item, count }))).toEqual([
      { item: 'apple', count: 3 },
      { item: 'banana', count: 2 },
      { item: 'orange', count: 1 }
    ]);
    expect(result.entries[0].percentage).toBeCloseTo(50);
    expect(result.entries[1].percentage).toBeCloseTo(100 / 3);
    expect(result.entries[2].percentage).toBeCloseTo(100 / 6);
    expect(result.result).toContain('apple: 3 (50.00%)');
  });

  it('chunks, pads, and formats list items', () => {
    const result = chunkListItems({
      text: 'a,b,c,d,e',
      splitMode: 'separator',
      separator: ',',
      chunkSize: 2,
      pad: true,
      paddingItem: 'x',
      itemSeparator: '-',
      chunkSeparator: ' | ',
      leftWrap: '[',
      rightWrap: ']'
    });

    expect(result.chunks).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'x']
    ]);
    expect(result.result).toBe('[a-b] | [c-d] | [e-x]');
  });

  it('rotates items left or right', () => {
    expect(
      rotateListItems({
        items: ['a', 'b', 'c', 'd'],
        step: 1,
        direction: 'right',
        joinSeparator: ''
      }).result
    ).toBe('dabc');
    expect(
      rotateListItems({
        items: ['a', 'b', 'c', 'd'],
        step: 2,
        direction: 'left',
        joinSeparator: ''
      }).result
    ).toBe('cdab');
  });

  it('truncates from the start or end', () => {
    expect(
      truncateListItems({
        items: ['a', 'b', 'c', 'd'],
        length: 2,
        from: 'start',
        joinSeparator: ''
      }).result
    ).toBe('ab');
    expect(
      truncateListItems({
        items: ['a', 'b', 'c', 'd'],
        length: 2,
        from: 'end',
        joinSeparator: ''
      }).result
    ).toBe('cd');
  });

  it('exposes planned list tools to web, API, and MCP', () => {
    expect(listTools.map((tool) => tool.name)).toEqual([
      'list.sort',
      'list.reverse',
      'list.shuffle',
      'list.unique',
      'list.most_common',
      'list.chunk',
      'list.rotate',
      'list.truncate'
    ]);
    expect(
      listTools.every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
  });
});
