// api/admin-update.js
// Updates one application's status in the Google Sheet. Protected by
// ADMIN_PASSCODE; the Sheets secret stays server-side only.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    var body = req.body || {};
    if (!process.env.ADMIN_PASSCODE || body.passcode !== process.env.ADMIN_PASSCODE) {
      return res.status(401).json({ ok: false, error: 'Incorrect passcode' });
    }
    if (!body.reference || !body.status) {
      return res.status(400).json({ ok: false, error: 'Missing reference or status' });
    }
    if (!process.env.SHEETS_WEBHOOK_URL || !process.env.SHEETS_SECRET) {
      return res.status(500).json({ ok: false, error: 'Sheet not configured' });
    }

    var sheetRes = await fetch(process.env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.SHEETS_SECRET,
        action: 'updateStatus',
        reference: body.reference,
        status: body.status
      })
    });
    var data = await sheetRes.json();

    if (!data.ok) {
      return res.status(502).json({ ok: false, error: data.error || 'Sheet error' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Could not update status.' });
  }
};