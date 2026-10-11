// api/admin-list.js
// Returns every logged application from the Google Sheet, for the
// Admin tab. Protected by ADMIN_PASSCODE so the public can't browse
// applicant data. The Sheets secret itself never reaches the browser.

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
    if (!process.env.SHEETS_WEBHOOK_URL || !process.env.SHEETS_SECRET) {
      return res.status(500).json({ ok: false, error: 'Sheet not configured' });
    }

    var url = process.env.SHEETS_WEBHOOK_URL + '?secret=' + encodeURIComponent(process.env.SHEETS_SECRET);
    var sheetRes = await fetch(url);
    var data = await sheetRes.json();

    if (!data.ok) {
      return res.status(502).json({ ok: false, error: data.error || 'Sheet error' });
    }

    return res.status(200).json({ ok: true, applications: data.applications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Could not load applications.' });
  }
};