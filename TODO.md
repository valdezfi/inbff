# Task: Fix creator session state in Nav (shows "Sign in" even when logged in)

## Steps

### Step 1: Add `GET /api/auth/me` endpoint
- [x] Create `app/api/auth/me/route.ts` that reads the session cookie and returns the current user (name, email, role) or 401 if not logged in.

### Step 2: Make `Nav` session-aware
- [x] Update `app/components/landing/Nav.tsx` to fetch `/api/auth/me` on mount.
- [x] If logged in, show user avatar initials + a Dashboard link (role-based) + Logout button.
- [x] If logged out, keep the existing "Sign in / Get started" buttons.
