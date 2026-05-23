# AWS Calculator UI — Selector Catalog

> Auto-maintained as we map the calculator UI.
> Last updated: 2026-04-07 — Initial reconnaissance complete

## Navigation

| Action | Method | Notes |
|--------|--------|-------|
| Go to empty estimate | `open https://calculator.aws/#/createCalculator` | Skips landing page |
| Go to add service | Click "Add service" button | Labeled `Add service` in estimate table |

## Estimate Page (My Estimate)

| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Edit name | `link "Edit My Estimate"` | Pencil icon |
| Export | `button "Export"` | |
| Share | `button "Share"` | Opens consent modal first time |
| Add service | `button "Add service"` | In table or top actions |
| Create group | `button "Create group"` | |
| Services table | `table "Estimate Services Table"` | |

## Add Service Page (Step 1)

| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Search field | `searchbox "Find Service"` | Type service name here |
| Search mode: by location | `radio "Search by location type"` | Default, shows region filter |
| Search mode: all services | `radio "Search all services"` | Shows all 158 services |
| Region selector | `button "Choose a Region..."` | Dropdown |
| Configure button | `button "Configure <ServiceName>"` | Dynamic per service |

## EC2 Configuration (Step 2)

| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Description | `textbox "Description - optional"` | Free text |
| Region | `button "Choose a Region..."` | Dropdown, default US East (Ohio) |
| Tenancy | `button "Tenancy..."` | Default: Shared Instances |
| Operating System | `button "Operating system..."` | Default: Linux |
| Workload: Constant | `radio "Constant usage"` | Default selected |
| Workload: Daily spike | `radio "Daily spike traffic"` | |
| Workload: Weekly spike | `radio "Weekly spike traffic"` | |
| Workload: Monthly spike | `radio "Monthly spike traffic"` | |
| Number of instances | `spinbutton "Number of instances..."` | Default: 1 |
| Instance search | `searchbox "Search instance types..."` | Type e.g. "t3.medium" |
| Instance radio select | `table[aria-label='EC2 selection'] tbody input[type='radio']` | CSS selector (refs conflict) |
| Payment: Compute Savings | `radio "Compute Savings Plans"` | Default selected |
| Payment: EC2 Savings | `radio "EC2 Instance Savings Plans"` | |
| Payment: On-Demand | `radio "On-Demand"` | **Use this for on-demand** |
| Payment: Spot | `radio "Spot Instances"` | |
| EBS Storage section | `button "Amazon Elastic Block Store (EBS)..."` | Expandable, optional |
| Save and view summary | `button "Save and view summary"` | Last service |
| Save and add service | `button "Save and add service"` | More services to add |
| Cancel | `button "Cancel"` | |

## S3 Configuration (Step 2)

| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| S3 Standard checkbox | `checkbox "S3 Standard"` | Default checked |
| S3 storage amount | `spinbutton "S3 Standard storage Value"` | Enter GB number |
| S3 storage unit | `button "Unit S3 Standard storage..."` | Default: GB per month |
| Move method | `button "How will data be moved..."` | Default: already stored |
| PUT requests | `textbox "PUT, COPY, POST, LIST requests..."` | Optional |
| GET requests | `textbox "GET, SELECT, and all other requests..."` | Optional |
| Data Transfer section | Separate section with checkboxes | Default checked |
| Save and view summary | `button "Save and view summary"` | |
| Save and add service | `button "Save and add service"` | |

## Share Modal

| Element | Selector Strategy | Notes |
|---------|------------------|-------|
| Agree and continue | `button "Agree and continue"` | First time only |
| Don't show again | `checkbox "Don't show me this again."` | Optional |
| Public link | `textbox "Copy public link"` | Contains the URL |
| Copy button | `button "Copy public link"` | |
| Close modal | `button "Close modal"` | |
