import { describe, expect, it } from 'vitest';
import { sortJson } from './service';

describe('sortJson service', () => {
  it('sorts object keys', () => {
    expect(
      sortJson('{"zebra":1,"apple":2,"mango":3}', {
        mode: 'key',
        key: '',
        order: 'asc'
      })
    ).toBe(`{
  "apple": 2,
  "mango": 3,
  "zebra": 1
}`);
  });

  it('sorts array objects by selected key', () => {
    expect(
      JSON.parse(
        sortJson('[{"name":"Charlie"},{"name":"Alice"},{"name":"Bob"}]', {
          mode: 'value',
          key: 'name',
          order: 'asc'
        })
      )
    ).toEqual([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);
  });

  it('throws when value sort has no key', () => {
    expect(() =>
      sortJson('[{"name":"Alice"}]', {
        mode: 'value',
        key: '',
        order: 'asc'
      })
    ).toThrow('key is required');
  });
});
