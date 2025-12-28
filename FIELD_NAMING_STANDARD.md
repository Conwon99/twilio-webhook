# 🔧 Field Naming Standardization Guide

## Problem Statement

Your form submissions are using inconsistent field names, which causes the webhook handler to miss data. We need to standardize field names across all forms.

## Current Issues

### ❌ Current Non-Standard Field Names (from your submission)
```json
{
  "Name": "Connor Dorward",           // Should be lowercase: "name"
  "Email": "dorward.connor@gmail.com", // Should be lowercase: "email"
  "Phone-No": "07792145328",          // Should be: "phone" (no hyphen)
  "Field": "Trellis",                  // Should be: "service" or "field"
  "Message": "Test3",                  // Should be lowercase: "message"
  "_website": "www.ayrshirefencinggroup.com" // Should be: "websiteUrl" (no underscore)
}
```

### ✅ Standard Field Names Expected

The webhook handler expects these **lowercase, camelCase** field names:

| Field Purpose | Standard Name | Alternatives Accepted |
|--------------|---------------|----------------------|
| Full Name | `name` | `firstName` + `lastName` |
| Email Address | `email` | - |
| Phone Number | `phone` | - |
| Service/Type | `service` | `field`, `type` |
| Message/Comment | `message` | `comment`, `details` |
| Website URL | `websiteUrl` | `website`, `siteUrl` |

## Standardization Options

### Option 1: Fix at Source (RECOMMENDED) - Update Formspree Forms

Update all your Formspree forms to use the standard field names:

1. **Go to your Formspree Dashboard**
   - Visit: https://formspree.io/forms/YOUR_FORM_ID/edit

2. **Update field names in each form:**
   - Change `Name` → `name`
   - Change `Email` → `email`
   - Change `Phone-No` → `phone`
   - Change `Field` → `service` (or keep as `field`)
   - Change `Message` → `message`
   - Change `_website` → `websiteUrl`

3. **How to rename fields in Formspree:**
   - In the form editor, click on each field
   - Update the **"name" attribute** (not the label)
   - The label can stay as "Name", "Email", etc. for display
   - But the `name="..."` attribute must use lowercase

**Example HTML Form Field:**
```html
<!-- ❌ WRONG -->
<input type="text" name="Name" placeholder="Your Name">
<input type="tel" name="Phone-No" placeholder="Phone Number">
<input type="hidden" name="_website" value="www.ayrshirefencinggroup.com">

<!-- ✅ CORRECT -->
<input type="text" name="name" placeholder="Your Name">
<input type="tel" name="phone" placeholder="Phone Number">
<input type="hidden" name="websiteUrl" value="https://www.ayrshirefencinggroup.com">
```

### Option 2: Normalize in Webhook Handler (ALTERNATIVE)

If you can't change the form field names immediately, the webhook handler can normalize them. However, **Option 1 is preferred** for long-term maintainability.

## Standard Field Name Reference

### Complete Standard Field List

```json
{
  "name": "Connor Dorward",                              // Full name (or use firstName + lastName)
  "email": "dorward.connor@gmail.com",                   // Email address
  "phone": "07792145328",                                // Phone number
  "service": "Trellis",                                  // Service type / field
  "message": "Test3",                                    // Message/comment
  "websiteUrl": "https://www.ayrshirefencinggroup.com"  // Website URL (with https://)
}
```

### Special Fields

#### Website URL
- **Standard:** `websiteUrl`
- **Format:** Must include protocol (`https://` or `http://`)
- **Example:** `https://www.ayrshirefencinggroup.com`
- **Note:** The handler normalizes URLs, but it's better to send the full URL

#### Phone Number
- **Standard:** `phone`
- **Format:** Any format is accepted (the handler formats to E.164)
- **Examples:** 
  - `07792145328` → Will be formatted to `+447792145328`
  - `+447792145328` → Already in correct format

#### Name
- **Standard:** `name` (single field)
- **Alternative:** `firstName` + `lastName` (two fields)

## Checklist for Each Website/Form

For each website using this webhook, ensure:

- [ ] All field names are lowercase or camelCase
- [ ] Phone field is named `phone` (not `Phone-No`, `Phone`, `mobile`, etc.)
- [ ] Website URL field is named `websiteUrl` (not `_website`, `website`, `siteUrl`)
- [ ] Website URL includes `https://` protocol
- [ ] Name field is `name` (or `firstName` + `lastName`)
- [ ] Email field is `email`
- [ ] Message field is `message`

## Quick Fix Script for Formspree Forms

If you're using Formspree's form builder, update the field names in the form settings:

1. **Formspree Dashboard** → Select your form
2. **Settings** → **Fields** or **Form Editor**
3. Update each field's **name attribute** to match the standard names above
4. **Save** and **test** the form

## Testing Your Standardization

After updating field names, test with:

```bash
curl -X POST https://formspree-webhook.netlify.app/.netlify/functions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "07792145328",
    "service": "Test Service",
    "message": "Test message",
    "websiteUrl": "https://www.ayrshirefencinggroup.com"
  }'
```

## Need Help?

If you need to temporarily support both old and new field names, the webhook handler can be enhanced to:
1. Check for both `phone` and `Phone-No`
2. Check for both `websiteUrl` and `_website`
3. Normalize field names automatically

However, **standardizing at the source is the best long-term solution**.



