export async function loginUser(page: any, email: string = 'juan.carracedo2@localhost.com', password: string = 'Malaga01$') {
  // Navigate to home page
  await page.goto('/')
  
  // Fill email/identifier
  await page.locator('input[name="identifier"]').fill(email)
  await page.click('button[type="submit"]')
  
  // Wait for password page
  await page.waitForURL('**/sign-in/password', { timeout: 10000 })
  
  // Fill password
  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.waitFor({ state: 'visible' })
  await passwordInput.clear()
  await passwordInput.fill(password)
  
  // Submit
  await page.click('button:has-text("Continue")')
  
  // Wait for redirect back to app
  await page.waitForURL('**/projects', { timeout: 15000 })
} 