# Playbook: S3 Standard Storage

> Status: VERIFIED — Tested 2026-04-07

## Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Region | US East (Ohio) | Calculator default |
| Storage class | S3 Standard | Checkbox, default checked |
| Storage amount | 0 | Spinbutton, in GB |
| Unit | GB per month | Dropdown |

## Steps

### Step 1: From Add Service page, search S3
```
agent-browser fill 'searchbox "Find Service"' "S3"
agent-browser wait 1500
agent-browser click 'button "Configure Amazon Simple Storage Service (S3)"'
agent-browser wait 2000
```

### Step 2: Set storage amount
S3 Standard is checked by default. Just fill the storage:
```
agent-browser fill 'spinbutton "S3 Standard storage Value"' "{STORAGE_GB}"
```

### Step 3: (Optional) Set PUT/GET requests
```
agent-browser fill 'textbox "PUT, COPY, POST, LIST requests to S3 Standard Enter amount of requests"' "{PUT_REQUESTS}"
agent-browser fill 'textbox "GET, SELECT, and all other requests from S3 Standard Enter amount of requests"' "{GET_REQUESTS}"
```

### Step 4: Save
- If more services: `agent-browser click 'button "Save and add service"'`
- If last service: `agent-browser click 'button "Save and view summary"'`

### Step 5: Verify
- 100 GB S3 Standard = ~$2.30/mo (first 50TB tier: $0.023/GB)

## Pricing Reference

| Tier | Range | Price/GB/mo |
|------|-------|-------------|
| First 50 TB | 0 - 50 TB | $0.023 |
| Next 450 TB | 50 - 500 TB | $0.022 |
| Over 500 TB | 500+ TB | $0.021 |
