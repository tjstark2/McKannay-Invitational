# McKannay Invitational Golf Trip App — V6

Mobile-first tournament app for the **2nd Annual McKannay Invitational** in Hilton Head, SC.

## V6 Scope

This version keeps the working V5 local-state app and adds clearer clickable UI patterns using chevrons.

## Features

- Shared app state
- Admin edits update the whole app
- Trip setup editing
- Team name editing
- Player / handicap / team editing
- Round arrival and tee-time editing
- Match pairing editing
- Add score workflow
- Match center
- Match detail
- Team pages
- Player profiles
- Course details
- Tournament progress
- MVP / Clutch / Coldest awards
- Real course-handicap-based net scoring
- Chevron indicators on clickable cards and rows

## Run Locally

```bash
npm install
npm run build
npm run dev
```

## Notes

This is still **Option A: Local State Only**. Supabase is intentionally not wired into the UI yet.
