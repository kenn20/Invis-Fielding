// Configure SIGNUP_SECRET and SPREADSHEET_ID in Project Settings > Script properties.
// Create a sheet tab called Interest with the first row: email | registered_at.
function doPost(e) {
  function reply(body) {
    return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  }
  var lock = null;
  try {
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('SIGNUP_SECRET');
    var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!secret || !spreadsheetId || !e || !e.postData || e.postData.contents.length > 4096) return reply({ ok: false });
    var payload = JSON.parse(e.postData.contents);
    if (payload.secret !== secret) return reply({ ok: false });
    var email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    // Leading alphanumeric also prevents interpreting Sheet entries as formulas.
    if (email.length > 254 || !/^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) return reply({ ok: false });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return reply({ ok: false });
    var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Interest');
    if (!sheet || sheet.getRange(1, 1).getValue() !== 'email' || sheet.getRange(1, 2).getValue() !== 'registered_at') return reply({ ok: false });
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(email).matchEntireCell(true).matchCase(false).useRegularExpression(false).findNext();
      if (existing) return reply({ ok: true });
    }
    sheet.appendRow([email, new Date().toISOString()]);
    SpreadsheetApp.flush();
    return reply({ ok: true });
  } catch (error) {
    // Do not log payloads, email addresses, or spreadsheet/account information.
    return reply({ ok: false });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
