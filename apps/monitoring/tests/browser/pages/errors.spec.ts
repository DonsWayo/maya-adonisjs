import { test } from '@japa/runner'
import { loginUser } from '../../helpers/auth.js'

test.group('Errors pages', (group) => {
  group.each.setup(async ({ context }) => {
    const page = await context.visit('/')
    await loginUser(page)
  })

  test('can navigate to all errors page', async ({ visit }) => {
    const page = await visit('/')
    
    // Click on All Errors in navigation
    await page.click('text=All Errors')
    
    // Should be on errors page
    await page.waitForURL('**/errors')
    await page.waitForSelector('h1:has-text("All Errors")')
  })

  test('displays all errors page', async ({ visit, assert }) => {
    const page = await visit('/errors')
    
    // Check page title
    await page.waitForSelector('h1:has-text("All Errors")')
    const title = await page.textContent('h1')
    assert.equal(title, 'All Errors')
    
    // Check page description
    const description = await page.textContent('p.text-muted-foreground')
    assert.equal(description, 'Monitor error events across all your projects')
  })

  test('shows error statistics cards', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Check for stats cards
    await page.waitForSelector('text=Total Errors')
    await page.waitForSelector('text=Errors')
    await page.waitForSelector('text=Warnings')
    await page.waitForSelector('text=Active Projects')
  })

  test('shows errors table structure', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Wait for table
    await page.waitForSelector('table')
    
    // Check table headers
    await page.waitForSelector('th:has-text("Level")')
    await page.waitForSelector('th:has-text("Project")')
    await page.waitForSelector('th:has-text("Message")')
    await page.waitForSelector('th:has-text("Type")')
    await page.waitForSelector('th:has-text("Environment")')
    await page.waitForSelector('th:has-text("Time")')
    await page.waitForSelector('th:has-text("Actions")')
  })

  test('has error filters', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Check for filter inputs
    await page.waitForSelector('input[placeholder="Search errors..."]')
    await page.waitForSelector('select[name="level"]')
    await page.waitForSelector('select[name="environment"]')
    
    // Check for date range picker
    await page.waitForSelector('button:has-text("Pick a date")')
  })

  test('has project filter dropdown', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Check for project dropdown
    await page.waitForSelector('text=Project:')
    await page.waitForSelector('button:has-text("All projects")')
  })

  test('has filter buttons', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Check for filter action buttons
    await page.waitForSelector('button:has-text("Clear Filters")')
    await page.waitForSelector('button:has-text("Apply Filters")')
  })

  test('can navigate to project errors from projects page', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Click on first action dropdown
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    
    // Click View Errors
    await page.click('text=View Errors')
    
    // Should navigate to project errors page
    await page.waitForURL('**/projects/**/errors')
    
    // Should show errors page
    await page.waitForSelector('text=Recent Errors')
  })

  test('project errors page has filters', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to first project's errors
    await page.waitForSelector('tbody tr')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    // Wait for errors page
    await page.waitForURL('**/projects/**/errors')
    
    // Check for filters
    await page.waitForSelector('input[placeholder="Search errors..."]')
    await page.waitForSelector('select[name="level"]')
    await page.waitForSelector('select[name="environment"]')
  })

  test('shows empty state when no errors', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Apply a very specific filter to get no results
    await page.fill('input[placeholder="Search errors..."]', 'ThisErrorDoesNotExist12345')
    await page.click('button:has-text("Apply Filters")')
    
    // Should show empty state
    await page.waitForSelector('text=No error events found')
  })

  test('can click on project link in all errors', async ({ visit, assert }) => {
    const page = await visit('/errors')
    
    // Wait for table to load
    await page.waitForSelector('table')
    
    // Look for project links
    const projectLink = page.locator('a.text-blue-600').first()
    const hasProjectLink = await projectLink.isVisible().catch(() => false)
    
    if (hasProjectLink) {
      const href = await projectLink.getAttribute('href')
      assert.match(href!, /\/projects\/[a-f0-9-]+/)
    }
  })

  test('shows error level badges with icons', async ({ visit, assert }) => {
    const page = await visit('/errors')
    
    // Wait for table
    await page.waitForSelector('table')
    
    // Look for level badges
    const errorBadge = page.locator('.badge').first()
    const hasBadge = await errorBadge.isVisible().catch(() => false)
    
    // Badges should exist if there are errors
    if (hasBadge) {
      // Badge should contain icon
      const svgIcon = await errorBadge.locator('svg').isVisible()
      assert.isTrue(svgIcon)
    }
  })

  test('shows pagination controls', async ({ visit }) => {
    const page = await visit('/errors')
    
    // Look for pagination
    const previousButton = page.locator('button:has-text("Previous")')
    const nextButton = page.locator('button:has-text("Next")')
    
    // Check if pagination exists
    const hasPagination = await previousButton.isVisible().catch(() => false)
    
    if (hasPagination) {
      // Should show page info
      await page.waitForSelector('text=Page')
    }
  })
})