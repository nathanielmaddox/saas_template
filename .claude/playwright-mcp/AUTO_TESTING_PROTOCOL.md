# Playwright MCP Testing Protocol (On-Demand)

## Overview
This document defines the testing protocol for using Playwright MCP when UI testing is requested or deemed necessary for the codebase.

## When to Use Playwright MCP Testing

### Recommended Scenarios
- User explicitly requests UI testing
- Before major releases or deployments
- Testing complex UI interactions or animations
- Validating responsive design across multiple devices
- Visual regression testing is needed
- Cross-browser compatibility verification required
- Accessibility compliance validation needed

### Optional Testing Triggers
```yaml
Optional_Triggers:
  - New component creation (when visual testing adds value)
  - Significant styling changes
  - Complex form implementations
  - Critical user journey modifications
  - Payment or checkout flow changes
  - Authentication flow updates
```

## Testing Protocol When Invoked

### Phase 1: Pre-Test Setup
```yaml
Environment_Check:
  - Verify development server running (localhost:3000)
  - Ensure browser installation complete
  - Clear previous test artifacts if needed
  - Create new test session ID

Test_Preparation:
  - Generate timestamp for session
  - Create folder: .claude/playwright-mcp/changes/[session_id]/
  - Initialize test report template
  - Set viewport configurations
```

### Phase 2: Playwright MCP Execution
```yaml
Test_Execution_Order:
  1. Mobile Viewports (iPhone SE, iPhone 14 Pro, Samsung Galaxy S21)
  2. Tablet Viewports (iPad Mini, iPad Pro 11)
  3. Desktop Viewports (HD, Full HD, 4K)

For_Each_Viewport:
  1. Navigate to target page/component
  2. Wait for page load completion
  3. Capture initial state screenshot
  4. Execute user interactions (if specified)
  5. Capture interaction results
  6. Check for console errors
  7. Validate accessibility compliance (if requested)
  8. Record network requests
  9. Save all artifacts
```

### Phase 3: Results Analysis
```yaml
Quality_Checks:
  - Screenshot comparison with baseline (if available)
  - Console error detection and reporting
  - Accessibility violation identification
  - Network request failure detection
  - Performance metric collection

Pass_Criteria:
  - No critical console errors
  - No blocking accessibility violations
  - All screenshots captured successfully
  - Core functionality working
  - UI renders correctly on tested viewports
```

### Phase 4: Reporting
```yaml
Report_Generation:
  - Create markdown test report
  - Include all screenshots
  - Document any issues found
  - Generate summary statistics
  - Create recommendations for improvements

Stakeholder_Communication:
  - Share results with requesting party
  - Highlight critical issues if found
  - Provide actionable feedback
```

## Test Scenarios by Component Type

### Component Testing
```yaml
Standard_Tests:
  1. Component Rendering:
     - Verify component loads
     - Check props render correctly
     - Validate default state

  2. Responsive Behavior:
     - Test key breakpoints
     - Verify layout stability
     - Check content overflow

  3. Interactive Elements (if applicable):
     - Test user interactions
     - Verify state changes
     - Check feedback mechanisms
```

### Form Testing
```yaml
Standard_Tests:
  1. Form Functionality:
     - Test form submission
     - Verify validation
     - Check error handling

  2. User Experience:
     - Test field interactions
     - Verify mobile usability
     - Check accessibility features
```

### Navigation Testing
```yaml
Standard_Tests:
  1. Navigation Flow:
     - Test navigation links
     - Verify routing behavior
     - Check mobile menu

  2. User Experience:
     - Test responsive behavior
     - Verify state persistence
     - Check deep linking
```

## Quality Gates

### Recommended Pass Criteria
```yaml
Should_Pass:
  ✅ Core functionality working
  ✅ No blocking errors
  ✅ Acceptable visual presentation
  ✅ Basic accessibility compliance
  ✅ Mobile usability functional
```

### Critical Issues (Should Fix)
```yaml
High_Priority:
  - Component fails to render
  - JavaScript errors blocking functionality
  - Critical accessibility violations
  - Complete layout breakdown
  - Form submission failures
  - Navigation completely broken
```

## Integration Commands

### Claude Code Integration
```typescript
// Execute when testing is requested or beneficial

async function executeUITestProtocol(testConfig: TestConfig) {
  // 1. Confirm testing is needed
  const shouldTest = confirmTestingRequired(testConfig);
  if (!shouldTest) return;

  // 2. Generate test session
  const sessionId = generateSessionId();

  // 3. Execute Playwright MCP
  const results = await playwrightMCP.executeTest({
    sessionId,
    scope: testConfig.scope,
    viewports: testConfig.viewports || getDefaultViewports(),
    captureScreenshots: true,
    runAccessibilityTests: testConfig.includeAccessibility || false,
    outputPath: `.claude/playwright-mcp/changes/${sessionId}/`
  });

  // 4. Analyze results
  const analysis = await analyzeTestResults(results);

  // 5. Generate report
  await generateTestReport(sessionId, results, analysis);

  // 6. Return results
  return { sessionId, results, analysis };
}
```

## Best Practices

### Efficient Testing
- Focus on critical user paths
- Test representative viewports
- Use baseline comparisons when available
- Balance thoroughness with efficiency

### When to Skip Playwright Testing
- Minor text changes
- Backend-only modifications
- Configuration updates
- Documentation changes
- Non-visual code refactoring

### Testing Frequency Recommendations
- Major features: Always test
- UI components: Test when visual validation needed
- Bug fixes: Test if UI-related
- Refactoring: Test if UI affected
- Performance updates: Test if visible changes

## Monitoring and Improvement

### Metrics to Track
- Tests executed per week
- Average test execution time
- Issues found vs. development time
- False positive rate
- Test coverage of critical paths

### Process Improvement
- Regularly review test effectiveness
- Update test scenarios based on findings
- Optimize viewport selection
- Improve baseline management
- Enhance reporting clarity

---
**Version**: 2.0.0
**Last Updated**: 2025-01-04
**Usage**: ON-DEMAND
**Review Frequency**: Monthly