import { describe, expect, it } from 'vitest';
import { convertRmbUppercase, rmbTools } from './rmb';

describe('rmb.uppercase', () => {
  it('converts zero', () => {
    expect(convertRmbUppercase({ amount: 0 }).result).toBe('零元整');
  });

  it('converts an integer amount', () => {
    expect(convertRmbUppercase({ amount: 1001 }).result).toBe('壹仟零壹元整');
  });

  it('converts yuan, jiao and fen', () => {
    expect(convertRmbUppercase({ amount: '1,234.56' })).toMatchObject({
      amount: '1234.56',
      result: '壹仟贰佰叁拾肆元伍角陆分',
      cents: 56
    });
  });

  it('converts only fen with a leading zero', () => {
    expect(convertRmbUppercase({ amount: '0.05' }).result).toBe('零元零伍分');
  });

  it('rounds to cents', () => {
    expect(convertRmbUppercase({ amount: '12.345' })).toMatchObject({
      amount: '12.35',
      result: '壹拾贰元叁角伍分'
    });
  });

  it('supports negative amounts', () => {
    expect(convertRmbUppercase({ amount: '-10.2' }).result).toBe(
      '负壹拾元贰角'
    );
  });

  it('converts section units', () => {
    expect(convertRmbUppercase({ amount: '100000001' }).result).toBe(
      '壹亿零壹元整'
    );
  });

  it('registers one local MCP-safe tool', () => {
    expect(rmbTools.map((tool) => tool.name)).toEqual(['rmb.uppercase']);
    expect(rmbTools[0].channels).toEqual(['web', 'api', 'mcp']);
    expect(rmbTools[0].risks).toEqual(['local']);
  });
});
