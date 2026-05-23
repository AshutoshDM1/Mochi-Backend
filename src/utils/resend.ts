import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type UrlStatus = 'UP' | 'DOWN' | 'ERROR' | 'PENDING' | string;

interface WebsiteDownEmailParams {
  to: string;
  subject: string;

  userName: string;
  userEmail: string;

  // url model
  websiteUrl: string;
  currentStatus: UrlStatus;
  lastCheckedAt?: string; // ISO or already-formatted
  lastStatus?: UrlStatus | null;
  totalChecks?: number;
  averageResponseTimeMs?: number;
  totalUpTimeSeconds?: number;
  totalDownTimeSeconds?: number;

  // cron model
  cronInterval?: string;

  // log model (latest check)
  statusCode?: number | null;
  responseTimeMs?: number | null;
  errorType?: string | null;
  errorMessage?: string | null;
}

export const sendEmail = async (params: WebsiteDownEmailParams) => {
  const { data, error } = await resend.emails.send({
    from: 'Mochi <alerts@support.elitedev.space>',
    to: [params.to],
    subject: params.subject,
    html: htmlTemplate(params),
    text: textTemplate(params),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

function formatSeconds(totalSeconds?: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function safe(v: unknown): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

const htmlTemplate = (params: WebsiteDownEmailParams) => {
  const isDown = params.currentStatus === 'DOWN' || params.currentStatus === 'ERROR';

  const statusBg   = isDown ? '#fef2f2' : '#f0fdf4';
  const statusText = isDown ? '#dc2626'  : '#16a34a';
  const statusDot  = isDown ? '#dc2626'  : '#16a34a';

  const avgResp =
    params.averageResponseTimeMs === undefined || params.averageResponseTimeMs === null
      ? '—'
      : `${params.averageResponseTimeMs.toFixed(0)} ms`;

  const respTime =
    params.responseTimeMs === null || params.responseTimeMs === undefined
      ? '—'
      : `${params.responseTimeMs} ms`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mochi Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f5fb;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">

  <!-- outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:32px 0;">
    <tr><td align="center">

      <!-- card -->
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(76,83,211,0.10);">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:#4C53D3;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.70);margin-bottom:6px;">
                    Mochi Monitor
                  </div>
                  <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">
                    ${isDown ? 'Website Down Alert' : 'Website Status Alert'}
                  </div>
                </td>
                <td align="right" valign="top">
                  <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;color:#fff;white-space:nowrap;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusDot};margin-right:6px;vertical-align:middle;"></span>${safe(params.currentStatus)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── GREETING ── -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
              Hello <b style="color:#111827;">${safe(params.userName)}</b>,
            </p>
            <p style="margin:8px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              ${isDown
                ? 'We detected that your monitored website is <b style="color:#dc2626;">currently down</b>. Here is a full summary of the incident.'
                : 'Here is a status update for your monitored website.'}
            </p>
          </td>
        </tr>

        <!-- ── STATUS BANNER ── -->
        <tr>
          <td style="padding:20px 32px 0;">
            <div style="background:${statusBg};border-left:4px solid ${statusText};border-radius:8px;padding:14px 16px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Website</div>
              <div style="font-size:15px;font-weight:600;color:#111827;word-break:break-all;">${safe(params.websiteUrl)}</div>
              <div style="margin-top:8px;font-size:12px;color:#6b7280;">
                Last checked: <b style="color:#111827;">${safe(params.lastCheckedAt)}</b>
                ${params.lastStatus     ? `&nbsp;&nbsp;·&nbsp;&nbsp;Previous: <b style="color:#111827;">${safe(params.lastStatus)}</b>`    : ''}
                ${params.cronInterval   ? `&nbsp;&nbsp;·&nbsp;&nbsp;Interval: <b style="color:#111827;">${safe(params.cronInterval)}</b>`   : ''}
              </div>
            </div>
          </td>
        </tr>

        <!-- ── METRICS ROW ── -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- HTTP status -->
                <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">HTTP Status</div>
                  <div style="margin-top:6px;font-size:22px;font-weight:700;color:#4C53D3;">${safe(params.statusCode)}</div>
                </td>
                <td width="4%"></td>
                <!-- Response time -->
                <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
                  <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Response Time</div>
                  <div style="margin-top:6px;font-size:22px;font-weight:700;color:#4C53D3;">${respTime}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── ERROR DETAILS (only if present) ── -->
        ${isDown ? `
        <tr>
          <td style="padding:16px 32px 0;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Error Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#6b7280;width:100px;">Type</td>
                  <td style="font-size:13px;color:#111827;font-weight:600;">${safe(params.errorType)}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-top:6px;">Message</td>
                  <td style="font-size:13px;color:#111827;font-weight:600;padding-top:6px;">${safe(params.errorMessage)}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>` : ''}

        <!-- ── HEALTH SUMMARY ── -->
        <tr>
          <td style="padding:16px 32px 0;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Health Summary</div>
              <table width="100%" cellpadding="0" cellspacing="4">
                <tr>
                  <td style="font-size:13px;color:#6b7280;width:50%;padding-bottom:8px;">Total Checks</td>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Avg Response</td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#111827;padding-bottom:12px;">${safe(params.totalChecks)}</td>
                  <td style="font-size:15px;font-weight:700;color:#111827;padding-bottom:12px;">${avgResp}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Total Uptime</td>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Total Downtime</td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#16a34a;">${formatSeconds(params.totalUpTimeSeconds)}</td>
                  <td style="font-size:15px;font-weight:700;color:#dc2626;">${formatSeconds(params.totalDownTimeSeconds)}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- ── CTA ── -->
        <tr>
          <td style="padding:24px 32px 0;" align="center">
            <a href="https://mochi.elitedev.space" style="display:inline-block;background:#4C53D3;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 28px;">
              View Dashboard →
            </a>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="padding:24px 32px 28px;border-top:1px solid #f3f4f6;margin-top:24px;">
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;text-align:center;">
              This alert was sent to <b style="color:#6b7280;">${safe(params.userEmail)}</b> because you have an active monitor on Mochi.<br/>
              <a href="https://mochi.elitedev.space" style="color:#4C53D3;text-decoration:none;">Manage your monitors</a>
            </p>
          </td>
        </tr>

      </table>
      <!-- end card -->

    </td></tr>
  </table>

</body>
</html>`.trim();
};

const textTemplate = (params: WebsiteDownEmailParams) => {
  const lines = [
    `Hello ${params.userName},`,
    '',
    `Website alert: ${params.websiteUrl}`,
    `Status: ${params.currentStatus}`,
    `Last checked: ${safe(params.lastCheckedAt)}`,
    params.cronInterval ? `Interval: ${params.cronInterval}` : '',
    '',
    `HTTP status: ${safe(params.statusCode)}`,
    `Response time: ${params.responseTimeMs === null || params.responseTimeMs === undefined ? '—' : `${params.responseTimeMs}ms`}`,
    `Error type: ${safe(params.errorType)}`,
    `Error message: ${safe(params.errorMessage)}`,
    '',
    `Total checks: ${safe(params.totalChecks)}`,
    `Avg response: ${params.averageResponseTimeMs === undefined || params.averageResponseTimeMs === null ? '—' : `${params.averageResponseTimeMs.toFixed(0)}ms`}`,
    `Total uptime: ${formatSeconds(params.totalUpTimeSeconds)}`,
    `Total downtime: ${formatSeconds(params.totalDownTimeSeconds)}`,
  ].filter(Boolean);

  return lines.join('\n');
};