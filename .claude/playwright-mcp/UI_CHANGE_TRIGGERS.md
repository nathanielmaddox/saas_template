# UI Change Detection & Playwright MCP Testing Guidelines

## Overview: Playwright MCP Testing is Available On-Demand

This document defines when Playwright MCP testing can be beneficial for UI changes. Testing is **optional** and should be invoked based on project needs and user requests.

## Recommended Testing Scenarios

### When to Consider Playwright Testing

#### High-Value Test Scenarios
```yaml
Recommended_For:
  - User explicitly requests UI testing
  - Critical user journey changes (checkout, auth, payments)
  - Major feature releases
  - Complex interactive components
  - Cross-browser compatibility concerns
  - Accessibility compliance validation
  - Visual regression testing needs
```

#### Component Types Worth Testing
```yaml
Components:
  - Payment forms and checkout flows
  - Authentication and registration forms
  - Complex data tables or grids
  - Interactive dashboards
  - Multi-step wizards
  - Rich text editors
  - Map integrations
  - Media players or galleries
```

## File Patterns for Consideration

### React/Next.js Components
```yaml
Consider_Testing_When_Modifying:
  - src/components/**/Payment*.tsx
  - src/components/**/Auth*.tsx
  - src/components/**/Checkout*.tsx
  - src/app/**/dashboard/*.tsx
  - src/app/**/admin/*.tsx
  - Critical business logic components
```

### Style Changes
```yaml
Consider_Testing_For:
  - Major theme overhauls
  - Design system updates
  - Responsive breakpoint changes
  - Dark mode implementations
  - Brand color updates
```

## Testing Approach by Change Type

### New Feature Development
```yaml
Testing_Consideration:
  Value: High
  When: Before deployment
  Focus:
    - End-to-end user flows
    - Mobile responsiveness
    - Edge cases
    - Error states
```

### Bug Fixes
```yaml
Testing_Consideration:
  Value: Medium
  When: If UI-related
  Focus:
    - Verify fix works
    - Check for regressions
    - Test related functionality
```

### Refactoring
```yaml
Testing_Consideration:
  Value: Low-Medium
  When: If visual changes expected
  Focus:
    - Compare before/after
    - Verify functionality unchanged
```

### Content Updates
```yaml
Testing_Consideration:
  Value: Low
  When: Usually not needed
  Focus:
    - Only if layout affected
```

## Playwright MCP Usage Guide

### How to Request Testing
```typescript
// When you want to run Playwright tests:

// Option 1: Test specific component
await runPlaywrightTests({
  target: "src/components/CheckoutForm.tsx",
  viewports: ["mobile", "desktop"],
  scenarios: ["happy-path", "error-states"]
});

// Option 2: Test entire page
await runPlaywrightTests({
  url: "/checkout",
  viewports: "all",
  includeAccessibility: true
});

// Option 3: Visual regression test
await runPlaywrightTests({
  target: "homepage",
  compareBaseline: true,
  threshold: 0.95
});
```

### Available Viewport Options
```yaml
Viewports:
  Quick: [mobile, desktop]
  Standard: [mobile, tablet, desktop]
  Comprehensive: All 8 viewports
  Custom: Specify exact dimensions
```

## Best Practices

### Efficient Testing Strategy
1. **Focus on Critical Paths**: Test what matters most to users
2. **Risk-Based Testing**: More testing for high-risk changes
3. **Progressive Testing**: Start small, expand if issues found
4. **Smart Scheduling**: Test before deployments, not every change

### When NOT to Use Playwright
```yaml
Skip_Testing_For:
  - README updates
  - Code comments
  - Backend-only changes
  - Development tooling updates
  - Non-visual refactoring
  - Minor text corrections
```

### Testing ROI Considerations
```yaml
High_ROI:
  - Payment flows
  - User registration
  - Core business features
  - Customer-facing forms

Low_ROI:
  - Admin interfaces (low traffic)
  - Static content pages
  - Footer/header tweaks
  - Development pages
```

## Integration with Development Workflow

### Development Phase
- Optional: Run tests during development for complex features
- Use quick viewport subset for faster feedback
- Focus on functionality over pixel-perfection

### Pre-Deployment Phase
- Recommended: Run comprehensive tests for major releases
- Include accessibility and performance checks
- Generate visual regression reports

### Post-Deployment Phase
- Monitor for user-reported issues
- Run targeted tests for hotfixes
- Update baseline screenshots after verified changes

## Testing Report Outputs

### Standard Report Contents
```yaml
Report_Includes:
  - Screenshots per viewport
  - Console error log
  - Network request summary
  - Performance metrics
  - Accessibility findings
  - Actionable recommendations
```

### Report Storage
```yaml
Location: .claude/playwright-mcp/changes/[session_id]/
Format: Markdown with embedded images
Retention: As needed by project
```

## Agent Coordination (When Applicable)

### Optional Agent Involvement
```yaml
Can_Notify:
  - frontend-testing: For test review
  - ui-development-lead: For design validation
  - quality-assurance-manager: For sign-off

When_To_Notify:
  - Critical issues found
  - User requests review
  - Pre-deployment validation
```

## Summary

Playwright MCP testing is a **valuable tool** available when needed, not a mandatory requirement for every change. Use it strategically to:
- Validate critical functionality
- Ensure quality for important features
- Provide confidence before deployments
- Address specific testing requests

Remember: The goal is efficient, effective testing that adds value without slowing development.

---
**Version**: 2.0.0
**Last Updated**: 2025-01-04
**Usage Model**: ON-DEMAND
**Override**: User can request testing at any time