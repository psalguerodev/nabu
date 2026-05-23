# Playbook: Amazon DynamoDB

> Status: VERIFIED — Mapped 2026-04-07

## Search Term
`DynamoDB`  →  `button "Configure Amazon DynamoDB"`

## Feature Checkboxes

| Feature | Default | Selector |
|---------|---------|----------|
| On-demand capacity | unchecked | `checkbox "DynamoDB on-demand capacity"` |
| Provisioned capacity | checked | `checkbox "DynamoDB provisioned capacity"` |
| DAX clusters | unchecked | `checkbox "DynamoDB Accelerator (DAX) clusters"` |
| Streams | unchecked | `checkbox "DynamoDB Streams"` |
| Backup and restore | unchecked | `checkbox "DynamoDB Backup and restore"` |
| Change data capture | unchecked | `checkbox "DynamoDB change data capture"` |
| Data export to S3 | unchecked | `checkbox "DynamoDB Data export to Amazon S3"` |
| Data import from S3 | unchecked | `checkbox "DynamoDB Data Import from Amazon S3"` |

## Provisioned Capacity Parameters (default mode)

### Table Class
| Parameter | Default | Selector |
|-----------|---------|----------|
| Table class | Standard | `button "Table class Standard"` |

### Data Storage
| Parameter | Default | Selector |
|-----------|---------|----------|
| Storage size | 0 | `spinbutton "Data storage size Value"` |
| Storage unit | GB | `button "Unit Data storage size GB"` |
| Avg item size | 1 | `spinbutton "Average item size (all attributes) Value"` |
| Item size unit | KB | `button "Unit Average item size (all attributes) KB"` |

### Write Settings
| Parameter | Default | Selector |
|-----------|---------|----------|
| Non-transactional % | 100 | `spinbutton "Percentage of Non-transactional writes..."` |
| Transactional % | 0 | `spinbutton "Percentage of Transactional writes..."` |
| Baseline write rate | 100 | `spinbutton "Baseline write rate Value"` |
| Baseline unit | per second | `button "Baseline write rate Unit per second"` |
| Peak write rate | 400 | `spinbutton "Peak write rate Value"` |
| Peak duration | 72 | `spinbutton "Duration of peak write activity Value"` |
| Reserved capacity % | 100 | `spinbutton "Percentage of baseline writes covered..."` |
| Reserved term | 1 year | `button "Write reserved capacity term 1 year"` |

### Read Settings
| Parameter | Default | Selector |
|-----------|---------|----------|
| Eventually consistent % | 100 | `spinbutton "Eventually consistent percentage..."` |
| Strongly consistent % | 0 | `spinbutton "Strongly consistent percentage..."` |
| Transactional % | 0 | `spinbutton "Transactional percentage..."` |
| Baseline read rate | 100 | `spinbutton "Baseline read rate Value"` |
| Peak read rate | 400 | `spinbutton "Peak read rate Value"` |
| Peak duration | 72 | `spinbutton "Duration of peak read activity Value"` |
| Reserved capacity % | 100 | `spinbutton "Percentage of baseline reads covered..."` |
| Reserved term | 1 year | `button "Read reserved capacity term 1 year"` |

## Steps

### Step 1: Search and configure
```
agent-browser fill 'searchbox "Find Service"' "DynamoDB"
agent-browser wait 1500
agent-browser click 'button "Configure Amazon DynamoDB"'
agent-browser wait 2000
```

### Step 2: Choose capacity mode
For on-demand (simpler):
```
agent-browser click 'checkbox "DynamoDB provisioned capacity"'   # uncheck
agent-browser click 'checkbox "DynamoDB on-demand capacity"'     # check
```

### Step 3: Set storage
```
agent-browser fill 'spinbutton "Data storage size Value"' "{STORAGE_GB}"
```

### Step 4: Set read/write (provisioned mode)
```
agent-browser fill 'spinbutton "Baseline write rate Value"' "{WRITE_RATE}"
agent-browser fill 'spinbutton "Peak write rate Value"' "{PEAK_WRITE}"
agent-browser fill 'spinbutton "Baseline read rate Value"' "{READ_RATE}"
agent-browser fill 'spinbutton "Peak read rate Value"' "{PEAK_READ}"
```

### Step 5: Save
- More services: `agent-browser click 'button "Save and add service"'`
- Last service: `agent-browser click 'button "Save and view summary"'`
