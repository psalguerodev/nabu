# Playbook: Share Estimate (Get Public Link)

> Status: VERIFIED — Tested 2026-04-07

## Steps

### From the My Estimate summary page:

### Step 1: Click Share
```
agent-browser click 'button "Share"'
agent-browser wait 2000
```

### Step 2: Accept consent modal (first time only)
The modal shows "Public server acknowledgement". 
```
agent-browser click 'button "Agree and continue"'
agent-browser wait 3000
```
> If "Agree and continue" not found, the modal may have been previously dismissed.

### Step 3: Extract the link
```
agent-browser snapshot
# Look for: textbox "Copy public link" → contains the URL
```
The URL format is: `https://calculator.aws/#/estimate?id={HASH}`

### Step 4: Close modal
```
agent-browser click 'button "Close modal"'
```

## Notes
- The link is **fully editable** — no read-only warnings
- Link persists indefinitely (no expiration observed)
- Each "Share" generates a new URL with a new ID
