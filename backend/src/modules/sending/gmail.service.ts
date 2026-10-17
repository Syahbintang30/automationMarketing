import { google } from 'googleapis';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { encryptToken, decryptToken } from './crypto.util';

export class GmailService {
  private static getOAuth2Client() {
    return new google.auth.OAuth2(
      env.GMAIL_CLIENT_ID || 'placeholder_client_id',
      env.GMAIL_CLIENT_SECRET || 'placeholder_client_secret',
      env.GMAIL_REDIRECT_URI
    );
  }

  /**
   * Generates authorization URL with minimal gmail.send scope
   */
  static getAuthUrl(): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
    });
  }

  /**
   * Handles OAuth callback and securely stores encrypted refresh token
   */
  static async handleAuthCallback(code: string) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get sender email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const accountEmail = userInfo.data.email || 'unknown@wardell.tech';

    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned from Google. Ensure prompt=consent is used.');
    }

    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;

    const connection = await prisma.oAuthConnection.upsert({
      where: { provider: 'GMAIL' },
      update: {
        accountEmail,
        encryptedRefreshToken,
        encryptedAccessToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.send',
        status: 'CONNECTED',
      },
      create: {
        provider: 'GMAIL',
        accountEmail,
        encryptedRefreshToken,
        encryptedAccessToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.send',
        status: 'CONNECTED',
      },
    });

    logger.info({ accountEmail }, 'Gmail OAuth connection established successfully');
    return connection;
  }

  /**
   * Checks current Gmail connection status
   */
  static async getConnectionStatus() {
    const connection = await prisma.oAuthConnection.findUnique({
      where: { provider: 'GMAIL' },
    });

    if (!connection) {
      return {
        connected: false,
        accountEmail: null,
        status: 'DISCONNECTED',
      };
    }

    return {
      connected: connection.status === 'CONNECTED',
      accountEmail: connection.accountEmail,
      status: connection.status,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Builds RFC 2822 standard email message encoded as base64url
   */
  static createMimeMessage(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): string {
    const lines = [
      `From: ${params.from}`,
      `To: ${params.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.body,
    ];

    const rawMessage = lines.join('\r\n');
    return Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Dispatches an approved email draft
   */
  static async sendApprovedEmail(params: {
    toEmail: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; isDryRun: boolean }> {
    // DRY RUN SAFEGUARD
    if (env.DRY_RUN) {
      const simulatedId = `dry-run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      logger.info(
        { toEmail: params.toEmail, subject: params.subject, simulatedId },
        '🛡️ DRY_RUN active: Email send simulated without hitting external provider'
      );
      return { messageId: simulatedId, isDryRun: true };
    }

    // Live sending logic
    const connection = await prisma.oAuthConnection.findUnique({
      where: { provider: 'GMAIL' },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      throw new Error('Gmail integration is not connected. Re-authenticate via OAuth.');
    }

    const refreshToken = decryptToken(connection.encryptedRefreshToken);
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = this.createMimeMessage({
      from: `Wardell Tech <${connection.accountEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      body: params.body,
    });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      messageId: res.data.id || 'gmail-sent',
      isDryRun: false,
    };
  }
}
