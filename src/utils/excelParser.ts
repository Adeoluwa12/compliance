import ExcelJS from 'exceljs';
import path from 'path';

export interface ParsedData {
  names: string[];
  month: number;
  year: number;
}

/**
 * Validate Excel file extension
 */
export const validateExcelFile = (filename: string): boolean => {
  const validExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(filename).toLowerCase();
  return validExtensions.includes(fileExtension);
};

/**
 * Parse Excel file and extract FULL NAMES
 * Expected structure:
 * Column 1 → First Name
 * Column 2 → Last Name
 * Row 1    → Header (ignored)
 */
export const parseExcelFile = async (
  filePath: string,
  month: number,
  year: number
): Promise<ParsedData> => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const names: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // ✅ Always skip header row
      if (rowNumber === 1) return;

      const firstNameCell = row.getCell(1).value;
      const lastNameCell = row.getCell(2).value;

      const firstName =
        typeof firstNameCell === 'string'
          ? firstNameCell.trim()
          : firstNameCell?.toString().trim();

      const lastName =
        typeof lastNameCell === 'string'
          ? lastNameCell.trim()
          : lastNameCell?.toString().trim();

      // Skip rows with no usable data
      if (!firstName && !lastName) return;

      const fullName = [firstName, lastName]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (fullName.length > 0) {
        names.push(fullName);
      }
    });

    if (names.length === 0) {
      throw new Error('No valid names found in Excel file');
    }

    return {
      names,
      month,
      year,
    };
  } catch (error) {
    console.error('[ExcelParser] Error parsing Excel file:', error);
    throw error;
  }
};
