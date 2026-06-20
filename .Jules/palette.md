## 2026-06-09 - Added aria-busy to loading/saving buttons
**Learning:** Found that this React app has several buttons that are disabled during network or background activity, but missing `aria-busy` attributes. This means screen reader users don't get the appropriate "busy" notification when the button is acting as a loading state.
**Action:** Always check `disabled` properties on buttons. If it is tied to an `isSaving`, `isLoading`, or `isCommitting` state, accompany it with a matching `aria-busy` attribute.
