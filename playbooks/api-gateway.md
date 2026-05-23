# Playbook: Amazon API Gateway

> Status: VERIFIED — Mapped 2026-04-07

## Search Term
`API Gateway`  →  `button "Configure Amazon API Gateway"`

## Sections

### HTTP APIs
| Parameter | Default | Selector |
|-----------|---------|----------|
| Request units | millions | `button "HTTP API requests units millions"` |
| Requests | 0 | `spinbutton "Requests Value"` |
| Requests unit | per month | `button "Unit Requests per month"` |
| Avg request size | 34 | `spinbutton "Average size of each request Value"` |
| Size unit | KB | `button "Average size of each request Unit KB"` |

### REST APIs
| Parameter | Default | Selector |
|-----------|---------|----------|
| Request units | millions | `button "REST API request units millions"` |
| Requests | 0 | `spinbutton "Requests Value" [nth=1]` |
| Requests unit | per month | `button "Unit Requests per month" [nth=1]` |
| Cache memory | None | `button "Cache memory size (GB) None"` |

### WebSocket APIs
| Parameter | Default | Selector |
|-----------|---------|----------|
| Message units | thousands | `button "WebSocket message units thousands"` |
| Messages | 0 | `spinbutton "Messages Value"` |
| Message unit | per second | `button "Unit Messages per second"` |
| Avg message size | 32 | `spinbutton "Average message size Value"` |
| Connection duration | 0 | `spinbutton "Average connection duration Value"` |
| Connection rate | 0 | `spinbutton "Average connection rate Value"` |

## Steps

### Step 1: Search and configure
```
agent-browser fill 'searchbox "Find Service"' "API Gateway"
agent-browser wait 1500
agent-browser click 'button "Configure Amazon API Gateway"'
agent-browser wait 2000
```

### Step 2a: Configure HTTP API (most common for serverless)
```
agent-browser fill 'spinbutton "Requests Value"' "{REQUESTS_MILLIONS}"
```

### Step 2b: Configure REST API
```
# Use [nth=1] variants for REST API fields
agent-browser fill 'spinbutton "Requests Value" >> nth=1' "{REQUESTS_MILLIONS}"
```

### Step 3: Save
- More services: `agent-browser click 'button "Save and add service"'`
- Last service: `agent-browser click 'button "Save and view summary"'`

## Pricing Reference
- HTTP API: $1.00 per million requests (first 300M), $0.90 after
- REST API: $3.50 per million requests (first 333M)
- WebSocket: $1.00 per million messages + $0.25 per million connection minutes
