# Playbook: EC2 On-Demand Instance

> Status: VERIFIED — Tested 2026-04-07
> Result: https://calculator.aws/#/estimate?id=91812ff77dbb98db8d47d53e1031d086defbb2e2

## Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Region | US East (Ohio) | Calculator default |
| OS | Linux | Dropdown |
| Instance Type | t3.medium | Search + radio select |
| Quantity | 1 | Spinbutton |
| Pricing | On-Demand | Radio button |
| Workload | Constant usage | Radio button |

## Steps

### Step 1: Navigate to empty estimate
```
agent-browser open "https://calculator.aws/#/createCalculator"
```

### Step 2: Click "Add service"
```
agent-browser click 'button "Add service"'
agent-browser wait 2000
```

### Step 3: Search for EC2
```
agent-browser fill 'searchbox "Find Service"' "EC2"
agent-browser wait 1500
agent-browser click 'button "Configure Amazon EC2"'
agent-browser wait 2000
```

### Step 4: Set number of instances
```
agent-browser fill 'spinbutton "Number of instances Enter amount"' "{QUANTITY}"
```

### Step 5: Search and select instance type
```
agent-browser fill 'searchbox "Search instance types Search by instance name or filter by keyword"' "{INSTANCE_TYPE}"
agent-browser wait 1500
agent-browser click "table[aria-label='EC2 selection'] tbody input[type='radio']"
```
> Note: CSS selector needed because accessibility refs conflict when table has single row.
> After click, verify heading shows "Chosen instance: {INSTANCE_TYPE}"

### Step 6: Select On-Demand pricing
```
agent-browser scroll down 500
agent-browser click 'radio "On-Demand"'
```

### Step 7: Save
- If more services to add:
  ```
  agent-browser click 'button "Save and add service"'
  ```
- If last service:
  ```
  agent-browser click 'button "Save and view summary"'
  ```

### Step 8: Verify
Check footer bar shows expected monthly cost:
- 1x t3.medium On-Demand Linux = ~$30.37/mo
- 2x t3.medium On-Demand Linux = ~$60.74/mo

## Variations

### Change OS
At Step 3 (before instance search):
```
agent-browser click 'button "Operating system Linux"'
# Then select from dropdown: Windows, RHEL, SUSE, etc.
```

### Change Region
At Step 3:
```
agent-browser click 'button "Choose a Region..."'
# Then select from dropdown
```
