import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createJsonExcelFile } from './service';

describe('createJsonExcelFile', () => {
  it('creates an XLSX file from JSON', async () => {
    const result = await createJsonExcelFile({
      text: JSON.stringify([{ id: 1, name: 'Ada' }]),
      sheetName: 'Users',
      fileName: 'users',
      includeHeaders: true
    });
    const zip = await JSZip.loadAsync(await result.file.arrayBuffer());
    const worksheet = await zip.file('xl/worksheets/sheet1.xml')?.async('text');

    expect(result.file.name).toBe('users.xlsx');
    expect(result.file.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(result.rowCount).toBe(1);
    expect(result.columnCount).toBe(2);
    expect(worksheet).toContain('<t>Ada</t>');
  });

  it('passes invalid JSON to core validation', async () => {
    await expect(
      createJsonExcelFile({
        text: '{missing',
        sheetName: 'Sheet1',
        fileName: 'output',
        includeHeaders: true
      })
    ).rejects.toThrow('Expected property name');
  });
});
