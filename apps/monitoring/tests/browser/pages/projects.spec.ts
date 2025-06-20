import { test } from '@japa/runner'
import { loginUser } from '../../helpers/auth.js'

test.group('Projects page', (group) => {
  group.each.setup(async ({ context }) => {
    const page = await context.visit('/')
    await loginUser(page)
  })

  test('displays projects list page', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Check page title
    await page.waitForSelector('h1:has-text("Projects")')
    const title = await page.textContent('h1')
    assert.equal(title, 'Projects')
    
    // Check page description
    const description = await page.textContent('p.text-muted-foreground')
    assert.equal(description, 'Manage your monitoring projects and view error data')
  })

  test('shows projects table structure', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Wait for table to load
    await page.waitForSelector('table')
    
    // Check table headers
    await page.waitForSelector('th:has-text("Name")')
    await page.waitForSelector('th:has-text("Platform")')
    await page.waitForSelector('th:has-text("Status")')
    await page.waitForSelector('th:has-text("Created")')
    await page.waitForSelector('th:has-text("Actions")')
  })

  test('has search functionality', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Find search input
    const searchInput = page.locator('input[placeholder="Search projects..."]')
    await searchInput.waitFor()
    
    // Type in search
    await searchInput.fill('Frontend')
    
    // Search input should have the value
    const value = await searchInput.inputValue()
    assert.equal(value, 'Frontend')
  })

  test('has new project button', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Check if new project button exists
    const newProjectButton = page.locator('button:has-text("New Project")')
    await newProjectButton.waitFor()
    
    // Button should be visible
    const isVisible = await newProjectButton.isVisible()
    assert.isTrue(isVisible)
  })

  test('shows platform badges', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Wait for badges to appear
    await page.waitForSelector('.badge', { timeout: 5000 })
    
    // Check if we have platform badges
    const badges = await page.locator('.badge').count()
    assert.isAbove(badges, 0)
  })

  test('shows status badges', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Look for status badges (active/inactive)
    const activeBadge = page.locator('text=active').first()
    const hasActiveBadge = await activeBadge.isVisible().catch(() => false)
    
    // At least one status badge should exist
    assert.isTrue(hasActiveBadge)
  })

  test('has action dropdowns', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Wait for table rows
    await page.waitForSelector('tbody tr')
    
    // Find action buttons
    const actionButtons = page.locator('button[aria-label="Open menu"]')
    const count = await actionButtons.count()
    
    // Should have at least one action button
    assert.isAbove(count, 0)
  })

  test('can open action dropdown', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Wait for table and find first action button
    await page.waitForSelector('tbody tr')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    
    // Click to open dropdown
    await firstActionButton.click()
    
    // Check dropdown menu items appear
    await page.waitForSelector('text=View')
    await page.waitForSelector('text=View Errors')
    await page.waitForSelector('text=Edit')
    await page.waitForSelector('text=Delete')
  })

  test('project name links are clickable', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Wait for project links
    await page.waitForSelector('a.text-blue-600')
    
    // Get first project link
    const projectLink = page.locator('a.text-blue-600').first()
    const href = await projectLink.getAttribute('href')
    
    // Should have a valid project URL
    assert.match(href!, /\/projects\/[a-f0-9-]+/)
  })

  test('shows created time as relative', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Wait for table
    await page.waitForSelector('tbody tr')
    
    // Look for relative time text (e.g., "2 days ago")
    const timeText = await page.locator('text=ago').first().textContent()
    assert.include(timeText!, 'ago')
  })
})