# Memos Notes - Privacy Policy

**Last Updated:** January 8, 2026

## Overview

Memos Notes Chrome Extension ("the Extension") respects your privacy and does not collect, store, or transmit any personal data to external servers except as described in this policy.

## Data Collection

**The Extension does NOT collect:**
- Personal identification information
- Usage statistics or analytics
- Browsing history
- Any form of user tracking

## Data Storage

All data is stored locally on your device using Chrome's `storage.local` API:

- **API URL**: Your Memos server address (e.g., https://your-server.com)
- **API Token**: Your Memos access token for authentication

This data is stored locally in your browser and is never transmitted to any server other than your configured Memos server.

## Network Communications

The Extension only communicates with:

1. **Your configured Memos server** - To fetch and create memos. All network requests are sent directly to the server you configure.

The Extension does NOT communicate with any third-party servers or services.

## Permissions

The Extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | To save your API configuration locally |
| `host_permissions` | To connect to your configured Memos server |

## Data Sharing

**The Extension does NOT share any data with third parties.**

All memos are stored on your own Memos server. We have no access to your memos or your server.

## Cookies

The Extension uses your Memos session cookie (`memos.access-token`) to authenticate requests to your Memos server. This cookie is obtained from your browser after you log into your Memos website and is used exclusively for communicating with your server.

## User Control

You have full control over your data:
- **View/Edit**: Go to Extension Settings
- **Delete**: Clear browser data or remove the Extension
- **Export**: Your memos are stored on your Memos server

## Children's Privacy

The Extension is not directed to children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this policy from time to time. Any changes will be posted on this page.

## Contact

If you have questions about this policy, please:
- Open an issue on [GitHub](https://github.com/shaobohan917/memos-chrome-extension/issues)

---

**This Extension is open source software.** You can review the source code at:
https://github.com/shaobohan917/memos-chrome-extension
