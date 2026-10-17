import ExcelJS, { Workbook } from 'exceljs';
import { prisma } from '../../db/prisma';
import { LeadFilterParams } from '../leads/leads.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

export class ExportService {
  /**
   * Sanitizes string cell values against spreadsheet formula injection (CSV/Excel Formula Injection).
   * Prepends a single quote if the string begins with =, +, -, @, \t, or \r.
   */
  static sanitizeCellValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }

  /**
   * Generate XLSX workbook containing filtered leads
   */
  static async generateLeadsWorkbook(params: LeadFilterParams, actorId?: string): Promise<Workbook> {
    const where: Prisma.LeadWhereInput = {};

    if (params.province) {
      where.province = { equals: params.province, mode: 'insensitive' };
    }
    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }
    if (params.businessCategory) {
      where.businessCategory = { contains: params.businessCategory, mode: 'insensitive' };
    }
    if (params.outreachStatus) {
      where.outreachStatus = params.outreachStatus;
    }
    if (params.qualificationStatus) {
      where.qualificationStatus = params.qualificationStatus;
    }
    if (params.campaignId) {
      where.leadCampaigns = {
        some: { campaignId: params.campaignId },
      };
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        leadCampaigns: {
          include: {
            campaign: {
              select: { name: true },
            },
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wardell Tech Lead Engine';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Business Leads', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Define columns
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Instansi / Perusahaan', key: 'businessName', width: 34 },
      { header: '📞 Nomor Telepon', key: 'phone', width: 22 },
      { header: 'Status Cold Call', key: 'coldCallStatus', width: 20 },
      { header: 'Catatan Cold Call', key: 'coldCallNotes', width: 35 },
      { header: 'Kategori', key: 'businessCategory', width: 25 },
      { header: 'Kota / Kab', key: 'city', width: 20 },
      { header: 'Provinsi', key: 'province', width: 18 },
      { header: 'Alamat Lengkap', key: 'businessAddress', width: 40 },
      { header: 'Website', key: 'websiteUrl', width: 28 },
      { header: 'Email', key: 'contactEmail', width: 25 },
      { header: 'Rating ⭐', key: 'rating', width: 12 },
      { header: 'Total Ulasan', key: 'reviewCount', width: 14 },
      { header: 'Link Google Maps', key: 'mapsUrl', width: 35 },
      { header: 'Sumber Data', key: 'dataSource', width: 18 },
      { header: 'Tanggal Ditarik', key: 'createdAt', width: 16 },
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }, // Deep slate
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 11,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
    });

    // Populate rows with sanitized values
    leads.forEach((lead, index) => {
      const row = sheet.addRow({
        no: index + 1,
        businessName: this.sanitizeCellValue(lead.businessName),
        phone: this.sanitizeCellValue(lead.phone || '-'),
        coldCallStatus: this.sanitizeCellValue(lead.coldCallStatus || 'BELUM_DIHUBUNGI'),
        coldCallNotes: this.sanitizeCellValue(lead.coldCallNotes || '-'),
        businessCategory: this.sanitizeCellValue(lead.businessCategory),
        city: this.sanitizeCellValue(lead.city),
        province: this.sanitizeCellValue(lead.province),
        businessAddress: this.sanitizeCellValue(lead.businessAddress || '-'),
        websiteUrl: this.sanitizeCellValue(lead.websiteUrl || '-'),
        contactEmail: this.sanitizeCellValue(lead.contactEmail || '-'),
        rating: lead.rating ? lead.rating.toFixed(1) : '-',
        reviewCount: lead.reviewCount ? lead.reviewCount : '-',
        mapsUrl: this.sanitizeCellValue(lead.mapsUrl || '-'),
        dataSource: this.sanitizeCellValue(lead.dataSource),
        createdAt: lead.createdAt.toISOString().split('T')[0],
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };
    });

    // Record audit log
    await AuditService.record({
      actorId,
      action: 'EXPORT_LEADS_XLSX',
      entityType: 'EXPORT',
      metadata: {
        totalRows: leads.length,
        filters: params,
      },
    });

    return workbook;
  }
}
