# 📋 Field Name Standardization Prompt

## For Formspree Forms - Update Field Names

**GOAL:** Standardize all form field names to lowercase/camelCase format so the webhook handler can correctly process submissions.

## Current Problem

Your forms are sending field names like:
- `Name` (should be `name`)
- `Phone-No` (should be `phone`)
- `_website` (should be `websiteUrl`)
- `Email`, `Message`, `Field` (should be lowercase)

## Required Changes

### Step 1: Update Field Names in Formspree

For each website/form that uses this webhook:

1. **Go to Formspree Dashboard:**
   - Visit: https://formspree.io/dashboard
   - Select the form you want to update

2. **Update each field's "name" attribute:**
   
   | Current Name | Change To | Notes |
   |-------------|-----------|-------|
   | `Name` | `name` | Full name field |
   | `Email` | `email` | Email address |
   | `Phone-No` | `phone` | Remove hyphen, lowercase |
   | `Phone` | `phone` | Lowercase |
   | `Message` | `message` | Lowercase |
   | `Field` | `service` | Or keep as `field` |
   | `_website` | `websiteUrl` | Remove underscore, add "Url" |

3. **For Website URL field:**
   - Change `_website` → `websiteUrl`
   - Ensure the value includes `https://` prefix
   - Example: `https://www.ayrshirefencinggroup.com`

### Step 2: Verify Your Mapping File

Ensure your `webnumber_map` file has URLs with `https://`:

```
websiteUrl, clientNumber, twilioNumber
https://scautodetailing.co.uk,07961817087,+447414130199
https://www.ayrshirefencinggroup.com,+447418335312,+447723572152
```

**Note:** URLs in the mapping file can be with or without `https://` - the handler normalizes them.

## Quick Reference: Standard Field Names

```
✅ CORRECT:
- name
- email
- phone
- message
- service (or field)
- websiteUrl

❌ WRONG:
- Name (capitalized)
- Phone-No (hyphen and capitals)
- _website (underscore prefix)
- Email, Message, Field (capitalized)
```

## Testing

After making changes, test your form and check:
1. Client receives SMS with form details
2. Customer receives confirmation SMS
3. Logs show correct data extraction

## Websites to Update

Based on your current mapping, update forms for:
- [ ] www.ayrshirefencinggroup.com
- [ ] scautodetailing.co.uk
- [ ] jimboscleaning.co.uk
- [ ] rpbuildandlandscapes.com
- [ ] remiroofingsolutions.co.uk

## Copy-Paste Prompt for AI Assistant

```
I need to standardize my Formspree form field names. Please help me:

1. Identify all field names that need to be changed in my form
2. Update them to these standard names:
   - Name → name
   - Email → email
   - Phone-No or Phone → phone
   - Message → message
   - Field → service (or field)
   - _website → websiteUrl
3. Ensure websiteUrl values include https:// prefix
4. Provide HTML code examples with corrected field names
```

---

**Remember:** Field labels (what users see) can stay as "Name", "Email", etc. Only the `name` attribute needs to be lowercase.




