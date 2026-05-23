# Playbook: AWS Step Functions

> Status: VERIFIED — Mapped 2026-04-07

## Search Term
`Step Functions`  →  `button "Configure AWS Step Functions"`

## Parameters

| Parameter | Default | Selector | Notes |
|-----------|---------|----------|-------|
| Standard Workflows | checked | `checkbox "Step Functions - Standard Workflows"` | Default checked |
| Express Workflows | unchecked | `checkbox "Step Functions - Express Workflows"` | |
| Workflow requests | 0 | `spinbutton "Workflow requests Value"` | |
| Requests unit | per month | `button "Workflow requests Unit per month"` | Dropdown |
| State transitions | - | `textbox "State transitions per workflow..."` | Average per workflow |

## Steps

### Step 1: Search and configure
```
agent-browser fill 'searchbox "Find Service"' "Step Functions"
agent-browser wait 1500
agent-browser click 'button "Configure AWS Step Functions"'
agent-browser wait 2000
```

### Step 2: Choose workflow type
Standard is checked by default. For Express:
```
agent-browser click 'checkbox "Step Functions - Express Workflows"'
```

### Step 3: Set workflow requests
```
agent-browser fill 'spinbutton "Workflow requests Value"' "{REQUESTS}"
```

### Step 4: Set state transitions per workflow
```
agent-browser fill 'textbox "State transitions per workflow Enter average number of state transitions per workflow"' "{TRANSITIONS}"
```

### Step 5: Save
- More services: `agent-browser click 'button "Save and add service"'`
- Last service: `agent-browser click 'button "Save and view summary"'`

## Pricing Reference
- Standard: $0.025 per 1,000 state transitions
- Express: based on requests + duration
- Free tier: 4,000 state transitions/month
