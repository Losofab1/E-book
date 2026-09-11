# TODO - Loan Extension Workflow Implementation

## Completed ✅
1. **notificationUtils.ts** - Added `extension_request`, `extension_approved`, `extension_rejected` notification types
2. **Loans.tsx** - Complete rewrite with:
   - `ExtensionRequest` type definition
   - `EXTENSION_REQUESTS_KEY` localStorage key
   - `MAX_EXTENSIONS = 3` constant
   - `extensions` counter on `Loan` type (default 0)
   - `requestExtension()` - Member sends extension request to staff (max 3)
   - `approveExtension()` - Staff approves extension (+14 days, increments counter)
   - `rejectExtension()` - Staff rejects extension
   - Push notifications for all extension actions
   - Staff sees "Demandes de prolongation à approuver" table
   - History table for approved/rejected extensions
   - Member sees "Prolonger" button (disabled when max reached or pending)
   - Staff sees only "Retour" button (no direct "Prolonger")
3. **NavBar.tsx** - Updated to:
   - Import `RotateCcw` icon
   - Handle extension notification types in icon/message/link routing
   - Show unread indicators for extension notifications on "Prêts" link
   - Filter extension notifications into loan section

## Remaining
- Verify build compiles with `npm run build`
- Verify no TypeScript errors
