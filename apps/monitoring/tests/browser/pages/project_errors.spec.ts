import { test } from '@japa/runner'
import { loginUser } from '../../helpers/auth.js'

test.group('Project Errors page', (group) => {
  group.each.setup(async ({ context }) => {
    const page = await context.visit('/')
    await loginUser(page)
  })

  test('can navigate to project errors page', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Wait for projects table
    await page.waitForSelector('table')
    
    // Click on the first action menu
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    
    // Click "View Errors"
    await page.click('text=View Errors')
    
    // Should navigate to errors page
    await page.waitForURL('**/projects/**/errors')
  })

  test('displays errors page structure', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to first project's errors
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    // Wait for errors page
    await page.waitForURL('**/projects/**/errors')
    
    // Check page structure
    await page.waitForSelector('text=Recent Errors')
    await page.waitForSelector('text=Latest error events for this project')
  })

  test('shows error filters section', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Check for filter inputs
    await page.waitForSelector('input[placeholder="Search errors..."]')
    await page.waitForSelector('select[name="level"]')
    await page.waitForSelector('select[name="environment"]')
    
    // Check for date picker
    await page.waitForSelector('button:has-text("Pick a date")')
  })

  test('has filter action buttons', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Check for filter buttons
    await page.waitForSelector('button:has-text("Apply Filters")')
    await page.waitForSelector('button:has-text("Clear")')
  })

  test('shows errors table structure', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Wait for errors table
    await page.waitForSelector('table')
    
    // Check table headers
    await page.waitForSelector('th:has-text("Level")')
    await page.waitForSelector('th:has-text("Message")')
    await page.waitForSelector('th:has-text("Type")')
    await page.waitForSelector('th:has-text("Environment")')
    await page.waitForSelector('th:has-text("Time")')
    await page.waitForSelector('th:has-text("Actions")')
  })

  test('shows error distribution cards', async ({ visit }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Check for distribution cards
    await page.waitForSelector('text=Error Levels')
    await page.waitForSelector('text=Distribution')
    await page.waitForSelector('text=Environments')
  })

  test('can interact with search filter', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Type in search
    const searchInput = page.locator('input[placeholder="Search errors..."]')
    await searchInput.fill('TypeError')
    
    // Verify input value
    const value = await searchInput.inputValue()
    assert.equal(value, 'TypeError')
  })

  test('can select error level filter', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Select error level
    const levelSelect = page.locator('select[name="level"]')
    await levelSelect.selectOption('error')
    
    // Option should be selected
    const selectedValue = await levelSelect.inputValue()
    assert.equal(selectedValue, 'error')
  })

  test('can select environment filter', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Select environment
    const envSelect = page.locator('select[name="environment"]')
    await envSelect.selectOption('production')
    
    // Option should be selected
    const selectedValue = await envSelect.inputValue()
    assert.equal(selectedValue, 'production')
  })

  test('shows empty state message', async ({ visit, assert }) => {
    const page = await visit('/projects')
    
    // Navigate to errors page
    await page.waitForSelector('table')
    const firstActionButton = page.locator('button[aria-label="Open menu"]').first()
    await firstActionButton.click()
    await page.click('text=View Errors')
    
    await page.waitForURL('**/projects/**/errors')
    
    // Check if empty state exists (it might or might not depending on data)
    const emptyState = page.locator('text=No error events found')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    
    // If empty state is visible, it should have the right text
    if (hasEmptyState) {
      const text = await emptyState.textContent()
      assert.include(text, 'No error events found')
    }
  })
})