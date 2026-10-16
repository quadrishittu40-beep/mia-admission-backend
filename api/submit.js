// api/submit.js
// Vercel serverless function that emails admission applications
// straight from the academy's own Gmail account via SMTP, and
// generates a PDF payment receipt (with QR code and Bursar
// signature) attached to that email and returned to the applicant.
//
// Required environment variables (set these in Vercel's dashboard,
// never in this file):
//   GMAIL_USER  = maknazulirfanacademy@gmail.com
//   GMAIL_APP_PASSWORD = the 16-character App Password from Google
//   TO_EMAIL    = where applications should be delivered (can be the
//                 same Gmail address, or a different inbox)
//   PAYSTACK_SECRET_KEY = your Paystack secret key
//   SHEETS_WEBHOOK_URL / SHEETS_SECRET = Google Sheet logging (optional)

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Compact (160x160) JPEG of the academy crest, embedded directly so
// the receipt never depends on fetching an external image at request
// time.
const LOGO_BASE64 = "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";

function buildReceiptPdf(app) {
  return new Promise(async (resolve, reject) => {
    try {
      const qrText = [
        "Maknazul 'Irfan Academy - Admission Payment Receipt",
        'Reference: ' + (app.id || '-'),
        'Applicant: ' + app.fullName,
        'Section: ' + app.section,
        'Date of birth: ' + (app.dob || '-'),
        'Gender: ' + (app.gender || '-'),
        'Home address: ' + (app.address || '-'),
        'Guardian: ' + app.guardianName,
        'Relationship: ' + (app.relationship || '-'),
        'Guardian phone: ' + app.phone,
        'Guardian email: ' + app.email,
        'Previous school: ' + (app.prevSchool || '-'),
        'Last class completed: ' + (app.prevClass || '-'),
        'Amount paid: NGN 10,000.00',
        'Payment reference: ' + app.paymentReference,
        'Date issued: ' + new Date().toLocaleString()
      ].join('\n');

      const qrBuffer = await QRCode.toBuffer(qrText, { width: 300, margin: 1 });
      const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const green = '#0e3a2c';
      const gold = '#c39a3c';
      const ink = '#17241d';
      const inkSoft = '#4c594f';

      // ---------- Header ----------
      doc.image(logoBuffer, 50, 45, { width: 56 });
      doc.font('Helvetica-Bold').fontSize(18).fillColor(green)
        .text("Maknazul 'Irfan Academy", 118, 48);
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(inkSoft)
        .text('Knowledge . Faith . Excellence', 118, 70);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(gold)
        .text('OFFICIAL PAYMENT RECEIPT', 0, 52, { align: 'right' });

      doc.strokeColor(gold).lineWidth(1.2).moveTo(50, 112).lineTo(545, 112).stroke();

      // ---------- Details ----------
      let y = 134;
      const row = (label, value) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink)
          .text(label, 50, y, { width: 170 });
        doc.font('Helvetica').fontSize(10).fillColor(ink)
          .text(value || '-', 220, y, { width: 220 });
        y += 23;
      };

      row('Receipt / Reference No:', app.id);
      row('Date issued:', new Date().toLocaleString());
      row('Applicant name:', app.fullName);
      row('Section applied for:', app.section);
      row('Guardian name:', app.guardianName);
      row('Guardian phone:', app.phone);
      row('Guardian email:', app.email);
      row('Payment reference:', app.paymentReference);
      row('Amount paid:', 'NGN 10,000.00');
      row('Payment status:', 'Successful');

      // ---------- QR code ----------
      doc.image(qrBuffer, 400, 134, { width: 120 });
      doc.font('Helvetica').fontSize(8).fillColor(inkSoft)
        .text('Scan to verify details', 400, 258, { width: 120, align: 'center' });

      // ---------- Signature ----------
      const sigY = y + 55;
      doc.strokeColor(inkSoft).lineWidth(0.6).moveTo(50, sigY).lineTo(230, sigY).stroke();
      doc.font('Helvetica-Oblique').fontSize(18).fillColor(green)
        .text('OlaAllah', 50, sigY - 26);
      doc.font('Helvetica').fontSize(9).fillColor(inkSoft)
        .text("Bursar, Maknazul 'Irfan Academy", 50, sigY + 6);

      // ---------- Footer ----------
      doc.font('Helvetica').fontSize(8).fillColor('#9aa39c')
        .text('This is a system-generated receipt and does not require a physical stamp or signature to be valid.',
          50, 760, { width: 495, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  // Allow the public admissions page to call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const app = req.body || {};

    // Basic honeypot spam check: a hidden field real applicants never fill.
    if (app._hp) {
      return res.status(200).json({ ok: true }); // silently accept, do nothing
    }

    const required = ['fullName', 'section', 'guardianName', 'phone', 'email'];
    for (const field of required) {
      if (!app[field] || !String(app[field]).trim()) {
        return res.status(400).json({ ok: false, error: 'Missing field: ' + field });
      }
    }

    // Require and verify payment before doing anything else. This calls
    // Paystack's own API using the secret key (never exposed to the
    // browser) to confirm the transaction actually succeeded and was for
    // the correct amount, rather than trusting whatever the client sends.
    const FORM_FEE_KOBO = 1000000; // NGN 10,000.00, in kobo

    if (!app.paymentReference) {
      return res.status(402).json({ ok: false, error: 'Payment reference missing.' });
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: 'Payment is not configured on the server.' });
    }

    try {
      const verifyRes = await fetch(
        'https://api.paystack.co/transaction/verify/' + encodeURIComponent(app.paymentReference),
        { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
      );
      const verifyData = await verifyRes.json();

      const paid = verifyData && verifyData.status && verifyData.data &&
        verifyData.data.status === 'success' &&
        verifyData.data.amount === FORM_FEE_KOBO &&
        verifyData.data.currency === 'NGN';

      if (!paid) {
        return res.status(402).json({ ok: false, error: 'Payment could not be verified.' });
      }
    } catch (payErr) {
      console.error('Payment verification failed:', payErr);
      return res.status(502).json({ ok: false, error: 'Could not verify payment. Please try again.' });
    }

    // Build the PDF receipt now that payment is confirmed.
    let receiptPdfBuffer;
    try {
      receiptPdfBuffer = await buildReceiptPdf(app);
    } catch (pdfErr) {
      console.error('Receipt PDF generation failed:', pdfErr);
      // Don't block the whole application over a receipt failure.
      receiptPdfBuffer = null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const lines = [
      "New admission application - Maknazul 'Irfan Academy",
      '',
      'Reference: ' + (app.id || '-'),
      'Section applied for: ' + app.section,
      '',
      'Applicant name: ' + app.fullName,
      'Date of birth: ' + (app.dob || '-'),
      'Gender: ' + (app.gender || '-'),
      'Home address: ' + (app.address || '-'),
      '',
      'Guardian name: ' + app.guardianName,
      'Relationship: ' + (app.relationship || '-'),
      'Guardian phone: ' + app.phone,
      'Guardian email: ' + app.email,
      '',
      'Previous school: ' + (app.prevSchool || '-'),
      'Last class completed: ' + (app.prevClass || '-'),
      'Additional notes: ' + (app.notes || '-'),
      '',
      'Form fee: NGN 10,000 (paid)',
      'Payment reference: ' + app.paymentReference,
      '',
      'Submitted: ' + new Date().toLocaleString()
    ].join('\n');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      replyTo: app.email,
      subject: 'Admission application - ' + app.fullName + ' (' + (app.id || 'no ref') + ')',
      text: lines
    };

    const attachments = [];
    if (app.photo && app.photo.base64) {
      const ext = (app.photo.type || '').split('/')[1] || 'jpg';
      attachments.push({
        filename: 'passport-photo-' + (app.id || 'applicant') + '.' + ext,
        content: Buffer.from(app.photo.base64, 'base64'),
        contentType: app.photo.type || 'image/jpeg'
      });
    }
    if (receiptPdfBuffer) {
      attachments.push({
        filename: 'receipt-' + (app.id || 'applicant') + '.pdf',
        content: receiptPdfBuffer,
        contentType: 'application/pdf'
      });
    }
    if (attachments.length) {
      mailOptions.attachments = attachments;
    }

    await transporter.sendMail(mailOptions);

    // Also log this application into the Google Sheet, if configured.
    // This never blocks or fails the response - the email already sent,
    // which is the part that matters most. If the sheet logging fails,
    // we just note it in the function logs.
    if (process.env.SHEETS_WEBHOOK_URL) {
      try {
        await fetch(process.env.SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: process.env.SHEETS_SECRET || '',
            id: app.id,
            section: app.section,
            fullName: app.fullName,
            dob: app.dob,
            gender: app.gender,
            address: app.address,
            guardianName: app.guardianName,
            relationship: app.relationship,
            phone: app.phone,
            email: app.email,
            prevSchool: app.prevSchool,
            prevClass: app.prevClass,
            notes: app.notes,
            paymentReference: app.paymentReference
          })
        });
      } catch (sheetErr) {
        console.error('Sheet logging failed:', sheetErr);
      }
    }

    return res.status(200).json({
      ok: true,
      receiptPdfBase64: receiptPdfBuffer ? receiptPdfBuffer.toString('base64') : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Could not send email.' });
  }
};
