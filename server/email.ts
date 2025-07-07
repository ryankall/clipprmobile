import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. Email functionality will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Email sending skipped - SENDGRID_API_KEY not configured");
    return false;
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    if (params.attachments) {
      emailData.attachments = params.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.type
      }));
    }
    
    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function generateInvoiceCSV(invoices: any[], clients: any[]): string {
  const headers = ['Invoice ID', 'Client Name', 'Client Phone', 'Total', 'Status', 'Payment Method', 'Date Created'];
  const rows = [headers.join(',')];
  
  invoices.forEach(invoice => {
    const client = clients.find(c => c.id === invoice.clientId);
    const row = [
      invoice.id.toString(),
      client?.name || 'Unknown Client',
      client?.phone || 'N/A',
      invoice.total,
      invoice.status,
      invoice.paymentMethod || 'N/A',
      new Date(invoice.createdAt).toISOString().split('T')[0] // YYYY-MM-DD format
    ];
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}