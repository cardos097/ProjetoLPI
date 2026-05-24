# Plan: Export rooms occupancy to Excel

## Overview

Add a "Download Excel" feature to the rooms page that exports an Excel file with room occupancy for a selected date range.

## Technical approach

**Backend (Go):** New endpoint that generates an .xlsx file using the `excelize` library:
- Endpoint: `GET /exports/rooms?from=YYYY-MM-DD&to=YYYY-MM-DD`
- One sheet per room
- Each sheet: rows = time slots (hourly), columns = days
- Cell content: appointment details

**Frontend (React):** Small UI change:
- Date pickers + "Download" button
- Shortcut buttons: "This week", "This month"

## Implementation

...
</content>
