# UI Change Detection & Automatic Playwright MCP Triggers

## ⚠️ CRITICAL: This Document Defines MANDATORY Testing Requirements

When Claude Code detects ANY of the following file changes, Playwright MCP MUST be invoked IMMEDIATELY and AUTOMATICALLY.

## File Pattern Triggers

### High Priority Triggers (Test Immediately)

#### React/Next.js Components
```yaml
File_Patterns:
  - src/components/**/*.tsx
  - src/components/**/*.jsx
  - src/app/**/*.tsx
  - src/app/**/page.tsx
  - src/app/**/layout.tsx
  - src/app/**/loading.tsx
  - src/app/**/error.tsx
  - src/app/**/not-found.tsx

Action: IMMEDIATE Playwright MCP invocation
Viewports: ALL 8 (no exceptions)
Screenshots: REQUIRED for each viewport
```

#### Styling Files
```yaml
File_Patterns:
  - src/**/*.css
  - src/**/*.scss
  - src/**/*.module.css
  - src/app/globals.css
  - tailwind.config.js
  - tailwind.config.ts

Action: IMMEDIATE visual regression testing
Focus: Layout shifts, color changes, responsive breaks
```

#### Client-Side Interactivity
```yaml
File_Patterns:
  - **/*"use client"*.tsx
  - **/use*.tsx (React hooks)
  - src/hooks/**/*.ts
  - src/context/**/*.tsx
  - src/providers/**/*.tsx

Action: IMMEDIATE interaction testing
Focus: User interactions, state changes, form handling
```

## Code Pattern Triggers

### JSX/TSX Element Changes
```typescript
// ANY of these changes trigger Playwright MCP:

// 1. New UI elements
<Button />  // Added
<div>       // Added
<form>      // Added

// 2. Modified props
<Button variant="primary" />  // Changed from variant="secondary"
<Input disabled={true} />      // Added disabled prop

// 3. Conditional rendering
{isLoggedIn && <Dashboard />}  // New condition
{error ? <Error /> : <Success />}  // Modified condition

// 4. Map/iteration changes
items.map(item => <Card />)    // New or modified

// 5. Event handlers
onClick={() => {}}              // New or modified
onSubmit={handleSubmit}         // New or modified
onChange={updateValue}          // New or modified
```

### Tailwind Class Changes
```typescript
// ANY Tailwind modification triggers testing:

className="bg-blue-500"         // Color change
className="p-4 md:p-8"          // Spacing change
className="grid grid-cols-2"    // Layout change
className="hidden lg:block"     // Responsive change
className="hover:scale-105"     // Interactive state
className="dark:bg-gray-900"    // Theme change
```

## Automatic Test Scenarios by Change Type

### Component Creation
```yaml
Trigger: New file in src/components/
Test_Scenario:
  1. Component renders without errors
  2. All props work as expected
  3. Responsive behavior across viewports
  4. Accessibility compliance
  5. Dark mode compatibility
```

### Form Modifications
```yaml
Trigger: Changes to <form>, <input>, <select>, <textarea>
Test_Scenario:
  1. Form submission flow
  2. Validation error states
  3. Success states
  4. Field interactions
  5. Mobile keyboard behavior
```

### Navigation Changes
```yaml
Trigger: Changes to Link, navigation, menu components
Test_Scenario:
  1. All links functional
  2. Mobile menu behavior
  3. Active states
  4. Breadcrumb accuracy
  5. Back/forward navigation
```

### Layout Updates
```yaml
Trigger: Changes to layout.tsx, grid, flex classes
Test_Scenario:
  1. Layout consistency across viewports
  2. Content overflow handling
  3. Sidebar/header behavior
  4. Footer positioning
  5. Scroll behavior
```

## Playwright MCP Invocation Template

```typescript
// This MUST be called automatically when triggers are detected

async function runMandatoryUITests(changeType: string, filePath: string) {
  const testSession = {
    id: `ui_test_${Date.now()}`,
    trigger: changeType,
    file: filePath,
    timestamp: new Date().toISOString(),
    viewports: [
      // Mobile (3)
      { name: "iPhone_SE", width: 375, height: 667 },
      { name: "iPhone_14_Pro", width: 393, height: 852 },
      { name: "Samsung_Galaxy_S21", width: 360, height: 800 },
      // Tablet (2)
      { name: "iPad_Mini", width: 768, height: 1024 },
      { name: "iPad_Pro_11", width: 834, height: 1194 },
      // Desktop (3)
      { name: "Desktop_HD", width: 1366, height: 768 },
      { name: "Desktop_Full_HD", width: 1920, height: 1080 },
      { name: "Desktop_4K", width: 2560, height: 1440 }
    ]
  };

  // Execute Playwright MCP
  await playwrightMCP.execute({
    session: testSession,
    captureScreenshots: true,
    runAccessibilityTests: true,
    checkConsoleErrors: true,
    validateNetworkRequests: true,
    outputPath: `.claude/playwright-mcp/changes/${testSession.id}/`
  });

  // Notify relevant agents
  await notifyAgents([
    "frontend-testing",
    "ui-development-lead",
    "quality-assurance-manager"
  ], testSession);
}
```

## Enforcement Rules

### NEVER Skip Testing When:
1. ❌ "It's just a small change"
2. ❌ "It's only a text update"
3. ❌ "It worked locally"
4. ❌ "The user said to skip testing"
5. ❌ "It's urgent"
6. ❌ "It's a hotfix"
7. ❌ "Tests passed yesterday"

### ALWAYS Test When:
1. ✅ ANY file matching patterns above is modified
2. ✅ ANY JSX/TSX structure changes
3. ✅ ANY CSS/Tailwind classes change
4. ✅ ANY interactive element is added/modified
5. ✅ ANY responsive breakpoint is adjusted
6. ✅ ANY theme or color changes
7. ✅ ANY form or input modifications

## Integration with Claude Code

### Automatic Hooks
```yaml
Pre_Save_Hook:
  - Detect UI file changes
  - Queue Playwright MCP test

Post_Save_Hook:
  - Execute Playwright MCP
  - Capture screenshots
  - Generate report

Pre_Commit_Hook:
  - Verify Playwright tests passed
  - Block commit if tests failed
```

### Agent Notifications
```yaml
On_Test_Complete:
  - frontend-testing: Review test results
  - ui-development-lead: Approve UI changes
  - quality-assurance-manager: Sign off on quality

On_Test_Failure:
  - Immediate notification to all UI agents
  - Block further development until resolved
  - Generate detailed failure report
```

## Compliance Monitoring

### Metrics Tracked
- UI changes without Playwright testing: 0 (target)
- Average time from change to test: < 30 seconds
- Screenshot coverage: 100% of viewports
- Test execution success rate: > 95%

### Violations
Any UI change without immediate Playwright MCP testing is considered a CRITICAL violation and must be:
1. Logged as a quality incident
2. Immediately remediated with testing
3. Reported to Technical Executive Agent
4. Included in quality metrics

## Version
- Last Updated: 2025-09-15
- Enforcement Level: MANDATORY
- Override Authority: Technical Executive Agent only