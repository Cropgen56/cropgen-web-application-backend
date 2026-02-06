# WhatsApp Cloud API Setup Documentation

**Project Title:** WhatsApp Business Messaging Integration via Cloud API

---

## Executive Summary

This document summarizes the current status of the WhatsApp Cloud API integration.

**Achievements:**

- Full setup of WhatsApp Business Account
- Phone number verification
- Developer permissions
- Webhook configuration
- Successful sending of custom (session-based) messages

**Blocking Issue:**

- Template messages (business-initiated) fail with error 131042  
  “Business eligibility payment issue”
- Root cause: Incomplete billing eligibility validation (payment method + tax info for India)

---

## 1. Completed Actions

| #   | Action                                      | Status | Details / Evidence                                 |
| --- | ------------------------------------------- | ------ | -------------------------------------------------- |
| 1   | Meta Business Manager account created       | Done   | Verified business email                            |
| 2   | WhatsApp Business Account (WABA) created    | Done   | WABA ID: 885080567361689                           |
| 3   | Phone number verified                       | Done   | +91 7709476236<br>Phone Number ID: 881094378430654 |
| 4   | Developer App created & permissions granted | Done   | whatsapp_business_messaging permission confirmed   |
| 5   | Webhooks configured                         | Done   | Receiving real-time message status events          |
| 6   | Custom messages tested & working            | Done   | Session replies deliver successfully               |
| 7   | Payment method (card) added                 | Done   | Verified with OTP + small charge                   |
| 8   | International & recurring payments enabled  | Done   | Bank-side settings updated                         |
| 9   | Card re-added multiple times                | Done   | Tried in different sections                        |

---

## 2. Current Blocking Issue

**Symptom:**  
All attempts to send approved **template messages** fail.

**Webhook Error (exact payload excerpt):**

```json
{
  "status": "failed",
  "errors": [
    {
      "code": 131042,
      "title": "Business eligibility payment issue",
      "message": "Business eligibility payment issue",
      "error_data": {
        "details": "Message failed to send because there were one or more errors related to your payment method."
      }
    }
  ]
}
```
