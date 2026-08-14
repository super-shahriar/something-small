/**
 * Paste this into script.google.com (Extensions ▸ Apps Script from a new Google Sheet).
 * Then: Deploy ▸ New deployment ▸ Web app ▸ Execute as "Me", Access "Anyone".
 * Copy the /exec URL into CONFIG.scriptUrl in app.js.
 *
 * This file is NOT served by the website. It lives here so the code isn't lost.
 */

const SECRET = "change-me-to-something-random";   // must match CONFIG.secret in app.js
const NOTIFY = "";   // your email. leave "" to send to the account that owns this script.

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);

    // Drops drive-by bots that find the public /exec URL. Not real security — the
    // secret is visible in the page source — but it's the right amount for this.
    if (p.secret !== SECRET) {
      return ContentService.createTextOutput("no");
    }

    SpreadsheetApp.getActiveSpreadsheet()
      .getSheets()[0]
      .appendRow([new Date(), p.day || "", p.food || "", p.place || ""]);

    MailApp.sendEmail(
      NOTIFY || Session.getEffectiveUser().getEmail(),
      "SHE ANSWERED 💌",
      [
        "when:  " + (p.day   || "—"),
        "food:  " + (p.food  || "—"),
        "where: " + (p.place || "—"),
      ].join("\n")
    );

    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("err: " + err);
  }
}

/**
 * Run this once from the editor (Run ▸ setup) to trigger the authorization prompt
 * and confirm the sheet + email both work before you send her the link.
 */
function setup() {
  doPost({ postData: { contents: JSON.stringify({
    secret: SECRET, day: "TEST", food: "TEST", place: "TEST",
  })}});
}
