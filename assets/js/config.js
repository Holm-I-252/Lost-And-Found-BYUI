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
    // The Report page shows its own forms and sends each answer to the Google Form above
    // as "entry.<number>". If a question is added or rebuilt in Google Forms, its number
    // changes: open the form, right-click the question → Inspect, and look for name="entry.…".
    lostFormEntries: {
        item: 1623082233,
        description: 167345309,
        location: 1594997359,
        date: 2033908334,
        image: 1350759681
    },
    foundFormEntries: {
        item: 2731759,
        description: 796793830,
        location: 1488826709,
        date: 1494757097,
        image: 414830740,
        whereNow: 992496466,
        turnedInAt: 908848669,
        name: 522471947,
        email: 1745793622
    },

    // Cort's form on found_items.html: owners confirm they got their item back.
    confirmFoundForm: "https://docs.google.com/forms/d/e/1FAIpQLSctBiolwzxbq8dMeYOIkTava7uXnKfhPuCvb_MBu1O411s8Pw/viewform",

    // While the board has fewer real reports than this, Browse also shows
    // clearly marked sample items (visitors can switch them off). Set to 0 to never do it.
    showSamplesWhenFewerThan: 4
};
