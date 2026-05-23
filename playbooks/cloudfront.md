# Playbook: Amazon CloudFront

> Status: VERIFIED — Mapped 2026-04-07

## Search Term
`CloudFront`  →  `button "Configure Amazon CloudFront"`

## Pricing Models

| Model | Selector | Notes |
|-------|----------|-------|
| Flat Rate | `radio "Flat Rate"` | Default. Fixed monthly plans |
| Pay as you go | `radio "Pay as you go"` | Per-usage pricing |

## Flat Rate Plans
| Plan | Selector |
|------|----------|
| Free Plan | `textbox "Free Plan Enter quantity"` |
| Pro Plan | `textbox "Pro Plan Enter quantity"` |
| Business Plan | `textbox "Business Plan Enter quantity"` |
| Premium Plan | `textbox "Premium Plan Enter quantity"` |

## Pay as you go — Edge Locations

Each geography is a collapsible section with these fields:

### United States (expanded by default)
| Parameter | Selector |
|-----------|----------|
| Data out to internet | `spinbutton "Data transfer out to internet Value"` |
| Data out unit | `button "Data transfer out to internet Unit GB per month"` |
| Data out to origin | `spinbutton "Data transfer out to origin Value"` |
| HTTPS requests | `spinbutton "Number of requests (HTTPS) Value"` |
| Requests unit | `button "Number of requests (HTTPS) Unit per month"` |

### Other Geographies (collapsed, click to expand)
| Geography | Expand Button |
|-----------|--------------|
| Canada | `button "Canada Canada Info"` |
| Asia Pacific | `button "Asia Pacific Asia Pacific Info"` |
| Australia | `button "Australia Australia Info"` |
| Europe | `button "Europe Europe Info"` |
| India | `button "India India Info"` |
| Japan | `button "Japan Japan Info"` |

## Steps

### Step 1: Search and configure
```
agent-browser fill 'searchbox "Find Service"' "CloudFront"
agent-browser wait 1500
agent-browser click 'button "Configure Amazon CloudFront"'
agent-browser wait 2000
```

### Step 2: Select pricing model
For pay-as-you-go (typical):
```
agent-browser click 'radio "Pay as you go"'
agent-browser wait 1000
```

### Step 3: Set US traffic (most common)
```
agent-browser fill 'spinbutton "Data transfer out to internet Value"' "{DATA_OUT_GB}"
agent-browser fill 'spinbutton "Number of requests (HTTPS) Value"' "{HTTPS_REQUESTS}"
```

### Step 4: (Optional) Expand other regions
```
agent-browser click 'button "Europe Europe Info"'
agent-browser wait 500
# Then fill the Europe fields similarly
```

### Step 5: Save
- More services: `agent-browser click 'button "Save and add service"'`
- Last service: `agent-browser click 'button "Save and view summary"'`

## Pricing Reference (US)
- First 10 TB/mo: $0.085/GB
- Next 40 TB: $0.080/GB
- Next 100 TB: $0.060/GB
- Free tier: 1 TB out + 10M requests/mo
