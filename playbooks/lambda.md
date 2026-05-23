# Playbook: AWS Lambda

> Status: VERIFIED — Mapped 2026-04-07

## Search Term
`Lambda`  →  `button "Configure AWS Lambda"`

## Parameters

| Parameter | Default | Selector | Notes |
|-----------|---------|----------|-------|
| Free Tier | Include | `radio "Lambda Function - Include Free Tier"` | Default checked |
| No Free Tier | - | `radio "Lambda Function - Without Free Tier"` | |
| Architecture | x86 | `button "Architecture x86"` | Dropdown: x86, arm64 |
| Number of requests | 0 | `spinbutton "Number of requests Value"` | |
| Requests unit | per month | `button "Unit Number of requests per month"` | Dropdown |
| Duration (ms) | - | `textbox "Duration of each request (in ms) Enter duration in ms"` | |
| Memory | - | `spinbutton "Amount of memory allocated Value"` | |
| Memory unit | MB | `button "Amount of memory allocated Unit MB"` | Dropdown: MB/GB |
| Ephemeral storage | 512 | `spinbutton "Amount of ephemeral storage allocated Value"` | 512-10240 MB |

## Steps

### Step 1: Search and configure
```
agent-browser fill 'searchbox "Find Service"' "Lambda"
agent-browser wait 1500
agent-browser click 'button "Configure AWS Lambda"'
agent-browser wait 2000
```

### Step 2: Set requests
```
agent-browser fill 'spinbutton "Number of requests Value"' "{REQUESTS}"
```

### Step 3: Set duration
```
agent-browser fill 'textbox "Duration of each request (in ms) Enter duration in ms"' "{DURATION_MS}"
```

### Step 4: Set memory
```
agent-browser fill 'spinbutton "Amount of memory allocated Value"' "{MEMORY_MB}"
```

### Step 5: Save
- More services: `agent-browser click 'button "Save and add service"'`
- Last service: `agent-browser click 'button "Save and view summary"'`

## Advanced Sections (optional, collapsed by default)
- **Provisioned Concurrency**: Concurrency count, duration, requests
- **SnapStart**: Cold-start count, memory
- **Lambda@Edge**: Separate request/duration/memory
- **HTTP Response Streaming**: Invoke mode (Buffered default)
