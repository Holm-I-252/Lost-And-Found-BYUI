// Every outside link the site uses lives here, so the team only edits one file.
window.FOUNDIT_CONFIG = {
    // Lost-item responses, published from Google Sheets as CSV
    // (File → Share → Publish to web → the responses tab → CSV).
    lostItemsCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk_olPna8hpfvpOYkJm2DpirhrvF13S6AmL_1rGkoXNbBXeWkIwPttmy97hxM4DzaLGP-vbDxaRa8u/pub?gid=1959645353&single=true&output=csv",

    // Found-item responses. Leave empty until the found-item sheet is published.
    // Publish only a tab without names, emails or phone numbers: every column shows up on the site.
    foundItemsCsv: "",

    // Google Forms (the normal "viewform" link; the site adds ?embedded=true itself).
    lostForm: "https://docs.google.com/forms/d/e/1FAIpQLSdOzsuYYiMLNiCOf4UyBUGb0YPZ806VGeE293D4tvGm1zmT3Q/viewform",
    foundForm: "https://docs.google.com/forms/d/e/1FAIpQLSdaWimxdVLtIacjnVuitWYd9axru9ixM7e1VlTis9vG_GnxoA/viewform",
    // Cort's form on found_items.html: owners confirm they got their item back.
    confirmFoundForm: "https://docs.google.com/forms/d/e/1FAIpQLSctBiolwzxbq8dMeYOIkTava7uXnKfhPuCvb_MBu1O411s8Pw/viewform",

    // While the board has fewer real reports than this, Browse also shows
    // clearly marked sample items (visitors can switch them off). Set to 0 to never do it.
    showSamplesWhenFewerThan: 4
};
