<!-- Adapted from the Lumen Theme user guide. AGPL-3.0-only. -->
# Gulf ERP Theme user guide

Version 0.8.0

## What it does

Gulf ERP Theme changes how the ERPNext desk looks and how people move around it. It does not change any data, workflow or print format.

The look follows the Gulf design: a coloured top bar with a soft gradient and your own app logo, module icons as soft tinted app tiles with the module colour in the icon, today's date above the greeting on the apps screen, and small headings and numbers in a mono font so amounts and codes line up.

## For every user: Appearance

Open the user menu (your picture at the top) and choose **Appearance**. On v16 the palette button in the top bar opens the same panel.

| Option | Choices |
|---|---|
| Layout | **Top bar**: the current module's menus run across the top, like Odoo. **Side menu**: every module is listed on the side, with the current module open |
| Colour | Six presets or your own colour. If white text is hard to read on your colour, the panel warns you |
| Top bar style | Coloured or white |
| Mode | Light or dark |

Changes show straight away and apply to you only. **Reset to company default** takes you back to what your administrator set. An option with a lock next to it is fixed by your administrator.

## Getting around

- **Apps button** (the grid at the top left): opens the apps screen with a tile for every module you can use.
- **Search on the apps screen**: type in the box under the greeting and the results show right under it. It finds the same documents, reports and pages as the search in the top bar. Use the arrow keys and Enter, or click a result.
- **Language switch** (the globe next to the notifications): with Arabic and English it shows the other language, and one click switches to it. When your administrator offers more languages it opens a list. It changes your own language only. On phones it shows the globe alone.
- **Module menus**: in the top bar layout, each module's menus come from its workspace. Point at a document in a menu and press **+** to create a new one straight away. Menus that do not fit move into **More**.
- **Search in any language**: type a document, report or page name in English or in your own language. When you work in Arabic and type sales invoice, the search shows فاتورة مبيعات with the English name next to it.
- **Phones**: the menu button opens the module list as a panel from the side. On small phones the top bar keeps the apps button, the menu button, search, the language switch, notifications and your picture, and search shrinks to its icon when space is short.

## Lists

- Above every list that has a status, a row of buttons shows All and each status with its count, for example Unpaid 2 and Overdue 1. Click one to show only that status, and All to show everything again.
- The counts follow the other filters you set, such as a customer.
- Documents without a status, such as Journal Entry, show Draft, Submitted and Cancelled.
- On phones the row scrolls sideways.

## Forms

- Sections are numbered and each sits in its own card.
- **On this page** in the form sidebar jumps to any section. It stays in view while you scroll a long form and highlights the section you are reading.
- A collapsed section shows a short summary of what is inside it.

## Everyday helpers

- **Favourites:** press the star at the top of any form to keep it in your favourites. Press it again to remove it. Your favourites follow you to any device.
- **Most used:** the apps screen opens with the eight kinds of document you used most in the last 90 days, such as Sales Invoice or Customer. Press one to open its list, or press + beside it to start a new one. The list changes as your work changes. Until you have used the desk for a while you see the app tiles as before.
- **Recently opened:** under your favourites, the eight documents you opened last, with how long ago. The list follows you to any device you sign in on.
- **All apps:** the app tiles for every module now sit under **All apps**, below your most used and recent documents.
- **Summary card:** invoices, orders, quotations, delivery notes and receipts show a card at the top with the party, the dates, the total, what is still due (or how much is delivered and billed) and the status.
- **Hijri date:** when the admin turns it on, every date on a form also shows the Hijri date (Umm al-Qura) under it. The date that is saved does not change.
- **Notice bar:** a message from the admin under the top bar. Press the cross to close it. It comes back only when the admin writes a new message.
- **Empty lists:** a list with nothing in it shows a short explanation and a button to create the first one.

## Who sees a workspace

Open a public workspace and press **Who sees this** next to the Edit button. Only System Managers see this button.

- **Everyone**: every user who can open the workspace sees it, as in standard Frappe.
- **Specific people**: pick the people who see it. Under **Roles that see it** you can also add roles, and everyone with one of those roles sees it too.

Everyone else no longer finds that workspace in the sidebar, the menus, the apps screen or search, and its link is refused. Users see the change the next time they load a page.

Good to know:

- Administrators, System Managers and Workspace Managers always see every workspace. Do not give Workspace Manager to someone who should see only some workspaces.
- Hiding a workspace hides a menu. It does not change what documents a person may open. That still comes from their roles.
- On v14 to v16 Gulf gives the chosen people a role named after the workspace, such as Workspace: Sales Team. You see it in the person's roles. Do not edit it by hand, use the Who sees this button.
- On v16 a workspace is one page of a module. Hiding the workspace removes that page, while the module's other links stay. A workspace you create yourself is hidden completely. To hide a whole module from someone, use Module Access in their user record.
- A private workspace is already shown only to its owner, so the button does not show there.

**Manage Workspace Access** in Gulf ERP Theme Settings opens the list of workspaces and who sees each one. Deleting a row there shows the workspace to everyone again.

## Create a workspace

On the apps screen, under **Your workspaces**, press **New workspace**. One window asks for everything:

1. **Name and look**: the workspace name, an icon and a colour. Until you pick an icon and a colour yourself, Gulf suggests them from the name.
2. **What it shows**: search for the documents (such as Sales Invoice or Customer) and the reports it should list. You can search in Arabic or English. Press Enter to pick the first match. They appear in the order you pick them.
3. **Who sees it**: Everyone, or specific people and roles, the same choice as the Who sees this button.

Press **Create workspace**. You land on the new workspace, and it has its own tile on the apps screen and its own menus in the top bar: Documents and Reports.

To change it later, open the workspace and press **Edit workspace**. You can change the icon, colour, documents, reports and who sees it. The name stays, so to use another name create a new workspace. **Delete workspace** in the same window removes the workspace only. The documents and reports it listed are not affected.

Good to know:

- Creating a workspace others can see is the Workspace Manager's job in Frappe, so the button shows to Workspace Managers (on v13 also to System Managers).
- The name cannot be one that a module, a document type, a report or a page already uses. ERPNext has a document type called Sales Team, for example.
- Edit workspace shows only on workspaces created this way. If you later change one with Frappe's own Edit button, the next save from Edit workspace replaces the documents and reports on the page with the ones in the window.
- On v16 each new workspace becomes a module of its own, with its documents and reports in that module's menu.

## For administrators: where people land, simpler forms, the login page

**After Login.** Under **Landing Pages** add a row per role: the role, and the workspace it opens, or a page of the desk such as point-of-sale or sales-invoice/new. After login each person opens the first row whose role they have. Everyone else opens the apps screen as before. Rows are read from the top, so put the rows for managers first (a manager usually also has the staff roles). The landing page only applies right after login, never when someone opens a link to a document.

**Simpler Forms.** Under **Form Rules** add a row per form, then press **Choose Fields and Roles**. Tick the fields and sections to hide, and pick the roles that keep seeing them (for example Accounts Manager). Everyone else no longer sees those fields. System Managers always see everything. This only changes what the form shows. It does not change what anyone may read or change. A required field that is still empty always shows, so it never blocks a save.

**Login Page.** With **Branded Login Page** on, the login page shows your brand colour, your company name and a welcome line. The logo is the one in Navbar Settings or Website Settings. Leave the name empty to use the default company.

**Login Page Style** picks one of five looks:

| Style | What it looks like |
|---|---|
| Side panel | The brand colour fills the side of the page, with the name and welcome line on it, and the sign in box beside it. This is the default and the look from earlier versions. |
| Centred | The sign in box in the middle of a light page, under a soft wash of the brand colour and a faint grid. The logo, the name and the welcome line are at the top of the box. |
| Full colour | The whole page in the brand colour, with a white sign in box in the middle. |
| Your own image | Like Side panel, but the side shows a photo you upload in **Login Page Image** (your office, your shop, your products) under a light brand tint, so the white text stays readable. Upload it as a public file, because visitors see it before they sign in. Without an image the page uses Side panel. |
| Minimal | A plain white page with no colour block. Only the button and links use the brand colour. |

On a phone every style keeps the sign in box full width. Side panel and Your own image turn the side into a band at the top.

**Notice Bar.** Tick **Show a Notice to Everyone**, write the text, pick Information, Warning or Urgent, and optionally a date until which it shows.

## For administrators: Gulf ERP Theme Settings

Type **Gulf ERP Theme Settings** in the search bar. Only System Managers can open it.

A setting added by an update starts on its default, and the update stores that default, so the form always shows what is in effect. Saving the form never switches a feature off unless you untick it.

| Setting | Default | What it does |
|---|---|---|
| Enable Gulf ERP Theme | On | Turns the whole theme on or off for everyone. Off restores the standard Frappe look. |
| Arabic Font | On | Arabic text uses IBM Plex Sans Arabic. |
| Gulf Fonts | On | English text uses Plus Jakarta Sans, and numbers, codes and small headings use IBM Plex Mono. Off keeps the standard Frappe font. |
| Apps Home Screen | On | The apps screen opens after login and from the apps button. |
| Language Switch | On | A button in the top bar that switches the user's own language in one click. On v16 it shows with the Top bar and Side menu layouts. |
| Languages in the Switch | ar, en | Language codes separated by commas. Only enabled languages are shown. With two languages the button switches between them, with more it opens a list. |
| Search in Every Language | On | Search finds names in the user's language and in English. |
| Layout | Top bar | Default layout for users who have not chosen their own. Standard Frappe menu keeps the stock navigation and only restyles it. |
| Brand Colour | #1463FF | Default colour for the top bar, buttons, links and active tabs. |
| Top Bar Style | Coloured | Coloured or white. |
| Light or Dark Mode | Let each user choose | Or fix it to always light or always dark. |
| Lock All Appearance Options | Off | Everyone sees exactly the defaults. |
| Users Can Change the Layout, Colour, Top Bar Style | On | Untick one to lock it to the default. |
| Reset All Users to Default | | Clears every user's own choices so the defaults apply to everyone. |
| Form Sections as Cards | On | Each form section in its own card. |
| Section Guide | On | Numbered sections, On this page, summaries on collapsed sections. |
| Status Quick Filters | On | Status buttons with counts above each list. |
| Clearer List Rows | On | Row lines, a highlight on hover, bold titles. |
| Clearer Status Badges | On | Larger badges with a clear colour for each status. |
| Compact Density | Off | Tighter spacing to fit more on screen. |
| Module Colours | | Change the colour or icon of a module. Use the module name exactly as it shows in the menu. Workspaces created with New workspace keep their colour and icon here. |
| Workspace Access | On | The Who sees this button on each workspace. Off shows every workspace as it was before. |
| Workspace Builder | On | The New workspace button on the apps screen and Edit workspace on workspaces created with it. Off hides the buttons. Workspaces already created stay. **Create a Workspace** opens the same window from the settings. |
| Landing Page by Role | On | People open the page set for their role after login. Has no effect until you add rows. |
| Branded Login Page | On | The login page in your brand colour with the company name and a welcome line. |
| Login Page Style | Side panel | Side panel, Centred, Full colour, Your own image or Minimal. |
| Login Page Image | Empty | The photo for the Your own image style. Must be a public file. |
| Simpler Forms by Role | On | Hides the fields in Form Rules from everyone except the roles you list. Has no effect until you add rows. |
| Most Used on the Apps Screen | On | The eight document types each person used most in the last 90 days, at the top of the apps screen. |
| Recent and Favourites | On | The star on forms and the favourites and recent documents on the apps screen. |
| Summary Card on Invoices and Orders | On | The card at the top of invoices, orders and quotations. |
| Hijri Date Beside Dates | Off | The Hijri date under every date on forms. |
| Clearer Empty Lists | On | A clearer box with a create button on empty lists. |
| Show a Notice to Everyone | Off | The notice bar under the top bar. |
| Improved Arabic Translation | On | Replaces weak, wrong or missing Arabic across Frappe and ERPNext with reviewed, consistent terms. |

Other users see a change the next time they load a page.

## Improved Arabic Translation

It is on by default. A new install adds the corrections straight away, and a site that already had the app has it switched on once by the update to 0.9.1. You can switch it off at any time, and it stays off after later updates.

When it is on, Gulf adds its corrections as Translation records, the same place Frappe keeps translations you make by hand. Any correction you already made yourself is kept as it is. When you switch it off, Gulf removes only the corrections it added and that nobody has edited since. Users need to reload the page to see the new wording.

The terms follow one glossary everywhere, for example اعتماد for Submit, سند دفع for Payment Entry, حركة مخزون for Stock Entry and الإهلاك for Depreciation. When an app update changes a term, Gulf updates its own corrections on the next migrate. A correction you edited yourself is kept as you wrote it.

Since version 0.8.0 the corrections cover the whole desk of Frappe and ERPNext, about 19,300 strings: field labels, options, buttons, messages and errors, workspaces and reports, and the getting started steps, number cards, charts and counters on workspace pages. Strings that had no Arabic now have it, and the same English word is translated by its meaning on each screen (for example Return is مرتجع on an invoice). On v15 and v16 a few labels also carry a translation for one document type only, where the general one would mislead.

Section headers on workspace pages (such as Reports & Masters) now show in Arabic on v14 to v16. Saving a workspace while working in Arabic keeps its stored English headers, so other languages are not affected.

## Light and dark mode

Each user picks light or dark from Appearance, unless the administrator fixed the mode for everyone.

Dark mode uses soft greys rather than near black, and text that is not pure white, so it is easier on the eyes over a long day. In dark mode the coloured top bar is a quiet tinted surface instead of a bright gradient, and the primary buttons have no glow.

## Arabic

When a user's language is Arabic, the desk switches to right to left and the theme follows it, including the top bar, menus and side menu.

## Undo

Every change to the settings is kept in the document history. To remove the theme completely, untick **Enable Gulf ERP Theme** and save.

## Supported versions

Frappe and ERPNext v13, v14, v15 and v16.
