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
      orderBy: { createdAt: 'desc' },
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
      { header: 'Business Name', key: 'businessName', width: 32 },
      { header: 'Province', key: 'province', width: 18 },
      { header: 'City / Regency', key: 'city', width: 22 },
      { header: 'Category', key: 'businessCategory', width: 28 },
      { header: 'Website', key: 'websiteUrl', width: 30 },
      { header: 'Business Email', key: 'contactEmail', width: 28 },
      { header: 'Email Status', key: 'emailVerificationStatus', width: 16 },
      { header: 'Address', key: 'businessAddress', width: 35 },
      { header: 'Data Source', key: 'dataSource', width: 20 },
      { header: 'Source Provenance URL', key: 'emailSourceUrl', width: 35 },
      { header: 'Campaign(s)', key: 'campaigns', width: 26 },
      { header: 'Qualification Status', key: 'qualificationStatus', width: 20 },
      { header: 'Outreach Status', key: 'outreachStatus', width: 18 },
      { header: 'Last Contacted At', key: 'lastContactedAt', width: 20 },
      { header: 'Discovered Date', key: 'createdAt', width: 16 },
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Dark slate
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
      const campaignNames = lead.leadCampaigns.map((lc) => lc.campaign.name).join(', ') || '-';

      const row = sheet.addRow({
        no: index + 1,
        businessName: this.sanitizeCellValue(lead.businessName),
        province: this.sanitizeCellValue(lead.province),
        city: this.sanitizeCellValue(lead.city),
        businessCategory: this.sanitizeCellValue(lead.businessCategory),
        websiteUrl: this.sanitizeCellValue(lead.websiteUrl || '-'),
        contactEmail: this.sanitizeCellValue(lead.contactEmail || '-'),
        emailVerificationStatus: this.sanitizeCellValue(lead.emailVerificationStatus),
        businessAddress: this.sanitizeCellValue(lead.businessAddress || '-'),
        dataSource: this.sanitizeCellValue(lead.dataSource),
        emailSourceUrl: this.sanitizeCellValue(lead.emailSourceUrl || '-'),
        campaigns: this.sanitizeCellValue(campaignNames),
        qualificationStatus: this.sanitizeCellValue(lead.qualificationStatus),
        outreachStatus: this.sanitizeCellValue(lead.outreachStatus),
        lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toISOString().split('T')[0] : '-',
        createdAt: lead.createdAt.toISOString().split('T')[0],
      });

      row.height = 20;
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
