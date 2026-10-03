// api/submit.js
// Vercel serverless function that emails admission applications
// straight from the academy's own Gmail account via SMTP.
//
// Required environment variables (set these in Vercel's dashboard,
// never in this file):
//   GMAIL_USER  = maknazulirfanacademy@gmail.com
//   GMAIL_APP_PASSWORD = the 16-character App Password from Google
//   TO_EMAIL    = where applications should be delivered (can be the
//                 same Gmail address, or a different inbox)

const nodemailer = require('nodemailer');

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

      'Section applied for: ' + app.section,
      '',
      'Applicant name: ' + app.fullName,
      'Date of birth: ' + (app.dob || '—'),
      'Gender: ' + (app.gender || '—'),
      'Home address: ' + (app.address || '—'),
      '',
      'Guardian name: ' + app.guardianName,
      'Relationship: ' + (app.relationship || '—'),
      'Guardian phone: ' + app.phone,
      'Guardian email: ' + app.email,
      '',
      'Previous school: ' + (app.prevSchool || '—'),
      'Last class completed: ' + (app.prevClass || '—'),
      'Additional notes: ' + (app.notes || '—'),
      '',
      'Submitted: ' + new Date().toLocaleString()
    ].join('\n');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      replyTo: app.email,
      subject: 'Admission application — ' + app.fullName + ' (' + (app.id || 'no ref') + ')',
      text: lines
    };

    if (app.photo && app.photo.base64) {
      const ext = (app.photo.type || '').split('/')[1] || 'jpg';
      mailOptions.attachments = [{
        filename: 'passport-photo-' + (app.id || 'applicant') + '.' + ext,
        content: Buffer.from(app.photo.base64, 'base64'),
        contentType: app.photo.type || 'image/jpeg'
      }];
    }

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Could not send email.' });
  }
};
