# Playwright MCP Integration Guide

## Overview
The Playwright MCP (Model Context Protocol) is a specialized browser automation tool designed exclusively for frontend UI/UX testing and visual validation. It provides automated browser control capabilities for testing user interfaces across multiple screen sizes and capturing visual evidence of application behavior.

## Purpose & Scope

### What It Does
- **Browser Automation**: Controls a headless or headed browser instance to simulate user interactions
- **Visual Testing**: Captures screenshots at various breakpoints and interaction stages
- **Cross-Device Testing**: Tests responsive design across mobile, tablet, and desktop viewports
- **User Flow Validation**: Verifies complete user journeys through the application
- **Accessibility Testing**: Captures accessibility snapshots for WCAG compliance validation
- **Network Monitoring**: Tracks API calls and resource loading during UI interactions
- **Console Monitoring**: Captures browser console messages for error detection

### What It Does NOT Do
- ❌ Database operations or direct data manipulation
- ❌ Backend API testing without UI context
- ❌ Server-side rendering validation
- ❌ Performance load testing
- ❌ Security penetration testing
- ❌ Unit or integration testing of non-UI components

## Activation Triggers

The Playwright MCP should be activated when:

1. **Frontend Changes Detected**
   - New components added to `/src/components/`
   - Modifications to page routes in `/src/app/`
   - CSS/Tailwind styling updates
   - Client-side state management changes

2. **Explicit Testing Requests**
   - "Test the login flow"
   - "Verify the checkout process"
   - "Check responsive design"
   - "Validate form submissions"
   - "Test navigation menu"

3. **User Journey Validation**
   - End-to-end user workflows
   - Multi-step form processes
   - Authentication flows
   - Payment/subscription flows
   - Onboarding sequences

4. **Visual Regression Testing**
   - After major UI updates
   - Theme or design system changes
   - Component library updates
   - Framework version upgrades

## Required Actions & Workflow

### 1. Pre-Execution Setup
```yaml
Actions:
  - Verify browser installation status
  - Clear previous test artifacts from ./changes/
  - Initialize fresh browser context
  - Set up network intercepts if needed
```

### 2. Screen Size Testing Protocol

**RECOMMENDED**: Test relevant viewports based on testing needs

```yaml
Viewports:
  Mobile:
    - name: "iPhone_SE"
      width: 375
      height: 667
    - name: "iPhone_14_Pro"
      width: 393
      height: 852
    - name: "Samsung_Galaxy_S21"
      width: 360
      height: 800

  Tablet:
    - name: "iPad_Mini"
      width: 768
      height: 1024
    - name: "iPad_Pro_11"
      width: 834
      height: 1194

  Desktop:
    - name: "Desktop_HD"
      width: 1366
      height: 768
    - name: "Desktop_Full_HD"
      width: 1920
      height: 1080
    - name: "Desktop_4K"
      width: 2560
      height: 1440
```

### 3. Screenshot Capture Protocol

```yaml
Screenshot_Requirements:
  Naming_Convention: "{viewport}_{flow}_{step}_{timestamp}.png"

  Capture_Points:
    - Initial page load
    - Before user interaction
    - During interaction (if applicable)
    - After interaction completion
    - Error states (if encountered)
    - Success states
    - Loading/transition states

  Storage_Location: "./.claude/playwright-mcp/changes/[test_session_id]/"

  Metadata_Capture:
    - Timestamp
    - Viewport dimensions
    - Page URL
    - Interaction type
    - Element selectors used
    - Network requests made
    - Console messages
```

### 4. Testing Execution Flow

```yaml
Execution_Steps:
  1. Navigation:
     - Navigate to target URL
     - Wait for page load completion
     - Capture initial state screenshot

  2. Element_Interaction:
     - Locate elements using accessibility selectors preferred
     - Verify element visibility
     - Capture pre-interaction screenshot
     - Perform interaction (click, type, select, etc.)
     - Wait for response/transition
     - Capture post-interaction screenshot

  3. Validation:
     - Check for console errors
     - Verify expected elements present
     - Validate navigation changes
     - Confirm network requests completed

  4. Error_Handling:
     - Capture error state screenshots
     - Document console errors
     - Note failed network requests
     - Record element not found issues
```

### 5. Common Test Flows

#### Authentication Flow
```yaml
Login_Test:
  Steps:
    1. Navigate to login page
    2. Screenshot: Empty form state
    3. Fill email field
    4. Fill password field
    5. Screenshot: Filled form state
    6. Click submit button
    7. Wait for redirect/response
    8. Screenshot: Success state (dashboard/home)
    9. Verify user menu presence
    10. Screenshot: Authenticated navigation state
```

#### E-Commerce Checkout Flow
```yaml
Checkout_Test:
  Steps:
    1. Navigate to product page
    2. Screenshot: Product display
    3. Add item to cart
    4. Screenshot: Cart update confirmation
    5. Navigate to cart
    6. Screenshot: Cart contents
    7. Proceed to checkout
    8. Fill shipping information
    9. Screenshot: Shipping form
    10. Enter payment details
    11. Screenshot: Payment form (sensitive data masked)
    12. Submit order
    13. Screenshot: Order confirmation
```

## Reporting Structure

### Report Format
```markdown
# Playwright MCP Test Report
## Test Session: [session_id]
## Date: [timestamp]
## Environment: [development/staging/production]

### Test Summary
- Total Flows Tested: X
- Viewports Tested: 8 (3 mobile, 2 tablet, 3 desktop)
- Screenshots Captured: XX
- Errors Detected: X
- Warnings: X

### Flow Results

#### [Flow Name]
- **Status**: ✅ Passed / ❌ Failed / ⚠️ Partial
- **Duration**: Xs
- **Screenshots**: X captured

##### Mobile Results
- iPhone SE: ✅ Passed
  - Screenshots: [List of files]
  - Issues: None

- iPhone 14 Pro: ✅ Passed
  - Screenshots: [List of files]
  - Issues: None

[Continue for all viewports...]

#### Issues Detected
1. **[Issue Type]**: [Description]
   - Viewport: [Affected viewport]
   - Screenshot: [Reference file]
   - Severity: High/Medium/Low
   - Suggested Fix: [Recommendation]

### Network Analysis
- API Calls: X
- Failed Requests: X
- Slow Requests (>3s): X
- Details: [List of notable network events]

### Console Messages
- Errors: X
- Warnings: X
- Info: X
- Details: [List of significant console outputs]

### Accessibility Findings
- WCAG Violations: X
- Warnings: X
- Best Practice Issues: X

### Recommendations
1. [Priority fixes based on findings]
2. [Performance improvements]
3. [Accessibility enhancements]
4. [Cross-browser considerations]
```

## Integration with Other Agents

### Reporting Hierarchy
```yaml
Primary_Recipients:
  - Frontend Development Manager Agent
  - UI Development Lead Agent
  - Quality Assurance Manager Agent

Secondary_Recipients:
  - UX Design Lead Agent (for design inconsistencies)
  - Performance Optimizer Agent (for performance issues)
  - Security Audit Agent (for security warnings)

Escalation_Path:
  Critical_Issues:
    - Technical Executive Agent
    - Project Executive Agent
```

### Data Sharing Protocol
```yaml
Screenshot_Access:
  - All screenshots stored in: ./.claude/playwright-mcp/changes/
  - Indexed by: test_session_id
  - Accessible to: All agents with Read permissions

Metadata_Sharing:
  - Test results JSON file per session
  - Accessibility snapshots for compliance agents
  - Performance metrics for optimization agents
  - Error logs for debugging agents
```

## Best Practices

### 1. Element Selection Priority
```yaml
Selector_Hierarchy:
  1. Accessibility attributes (aria-label, role)
  2. Data-testid attributes
  3. Semantic HTML elements
  4. Text content
  5. CSS classes (last resort)
```

### 2. Wait Strategies
```yaml
Wait_Conditions:
  - Wait for network idle
  - Wait for specific elements
  - Wait for animations to complete
  - Use explicit waits over fixed timeouts
```

### 3. Error Recovery
```yaml
Retry_Logic:
  - Retry failed interactions up to 3 times
  - Increase wait time between retries
  - Capture screenshots of each retry attempt
  - Document retry reasons in report
```

### 4. Performance Considerations
```yaml
Optimization:
  - Run tests in parallel where possible
  - Reuse browser contexts for similar flows
  - Clear cache between different user scenarios
  - Minimize unnecessary navigation
```

## Maintenance & Updates

### Weekly Tasks
- Clear old screenshots (>7 days)
- Update viewport definitions for new devices
- Review and update selector strategies
- Validate test flow accuracy

### Monthly Tasks
- Audit accessibility testing coverage
- Update WCAG compliance rules
- Review browser version compatibility
- Optimize test execution time

### Per Release
- Update critical user flows
- Add tests for new features
- Remove tests for deprecated features
- Update screenshot baselines

## Troubleshooting Guide

### Common Issues & Solutions

#### Browser Not Launching
```yaml
Issue: Browser fails to start
Solutions:
  1. Run browser install command
  2. Check system resources
  3. Verify browser permissions
  4. Clear browser cache/profile
```

#### Element Not Found
```yaml
Issue: Cannot locate page element
Solutions:
  1. Increase wait timeout
  2. Check element visibility
  3. Verify selector accuracy
  4. Check for dynamic loading
  5. Use alternative selector strategy
```

#### Screenshot Failures
```yaml
Issue: Screenshots not capturing correctly
Solutions:
  1. Wait for page stability
  2. Check viewport settings
  3. Verify page scroll position
  4. Handle lazy-loaded images
```

## Configuration File

Create `.claude/playwright-mcp/config.json`:
```json
{
  "browser": "chromium",
  "headless": true,
  "defaultTimeout": 30000,
  "navigationTimeout": 30000,
  "actionTimeout": 10000,
  "screenshotQuality": 90,
  "videoRecording": false,
  "traceRecording": true,
  "networkMonitoring": true,
  "consoleMonitoring": true,
  "accessibilityTesting": true,
  "viewportPresets": "responsive",
  "retryAttempts": 3,
  "parallelExecution": true,
  "maxParallelTests": 4,
  "cleanupOldScreenshots": true,
  "screenshotRetentionDays": 7
}
```

## Success Metrics

### Key Performance Indicators
- Test execution time < 5 minutes per flow
- Screenshot capture rate: 100%
- False positive rate < 5%
- Cross-browser consistency > 95%
- Accessibility compliance > 90%

### Quality Gates
- No critical accessibility violations
- No JavaScript errors in console
- All user flows completable
- Response time < 3 seconds per interaction
- Mobile viewport usability score > 90%

## Version History
- v1.0.0 - Initial Playwright MCP implementation
- Last Updated: 2025-09-15
- Maintained By: Frontend Development Manager Agent