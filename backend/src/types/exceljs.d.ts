/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'exceljs' {
  export class Workbook {
    creator: string;
    created: Date;
    csv: {
      write(stream: any): Promise<void>;
      writeFile(path: string): Promise<void>;
    };
    xlsx: {
      write(stream: any): Promise<void>;
      writeFile(path: string): Promise<void>;
      writeBuffer(): Promise<Buffer>;
    };
    addWorksheet(name: string, options?: any): Worksheet;
  }

  export interface Worksheet {
    columns: Array<{ header: string; key: string; width: number }>;
    addRow(data: Record<string, any>): Row;
    getRow(index: number): Row;
  }

  export interface Row {
    height: number;
    alignment: any;
    eachCell(callback: (cell: Cell, colNumber: number) => void): void;
  }

  export interface Cell {
    fill: any;
    font: any;
    alignment: any;
    value: any;
  }

  const ExcelJS: {
    Workbook: typeof Workbook;
  };

  export default ExcelJS;
}
