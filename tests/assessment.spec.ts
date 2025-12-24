import { test, expect } from '@playwright/test';

const BASE_URL = 'https://igta-skills-assessment.netlify.app';

test.describe('IGTA Skills Assessment - Comprehensive Tests', () => {

  test('1. Homepage loads correctly', async ({ page }) => {
    const response = await page.goto(BASE_URL);

    // Check HTTP status
    expect(response?.status()).toBe(200);

    // Check page title
    await expect(page).toHaveTitle(/IGTA-Tech Skills Assessment/);

    // Check header is visible
    await expect(page.locator('h1')).toContainText('IGTA-Tech Skills Assessment');

    // Check subtitle
    await expect(page.locator('text=Supabase & Full-Stack Developer Evaluation')).toBeVisible();
  });

  test('2. Registration form is displayed', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check registration form elements
    await expect(page.locator('h2:has-text("Register to Begin")')).toBeVisible();
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="john@example.com"]')).toBeVisible();
    await expect(page.locator('button:has-text("Start Assessment")')).toBeVisible();
  });

  test('3. Registration button is disabled without input', async ({ page }) => {
    await page.goto(BASE_URL);

    const button = page.locator('button:has-text("Start Assessment")');
    await expect(button).toBeDisabled();
  });

  test('4. Registration button enables with valid input', async ({ page }) => {
    await page.goto(BASE_URL);

    // Fill in the form
    await page.fill('input[placeholder="John Doe"]', 'Test User');
    await page.fill('input[placeholder="john@example.com"]', `test${Date.now()}@example.com`);

    // Button should be enabled
    const button = page.locator('button:has-text("Start Assessment")');
    await expect(button).toBeEnabled();
  });

  test('5. Can register and see challenges', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `playwright${Date.now()}@test.com`;

    // Fill registration form
    await page.fill('input[placeholder="John Doe"]', 'Playwright Test User');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);

    // Click register
    await page.click('button:has-text("Start Assessment")');

    // Wait for challenges to load (should see welcome message)
    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Playwright Test User')).toBeVisible();
  });

  test('6. Challenges are displayed after registration', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `challenges${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Challenge Viewer');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    // Wait for page to update
    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Check if challenge cards are visible
    const challengeCards = page.locator('.grid > div');
    const count = await challengeCards.count();

    console.log(`Found ${count} challenge cards`);
    expect(count).toBeGreaterThan(0);
  });

  test('7. Challenge modal opens on click', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `modal${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Modal Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    // Wait for challenges
    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Click first challenge card
    await page.locator('.grid > div').first().click();

    // Check modal opens
    await expect(page.locator('text=Your Solution')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('textarea[placeholder*="Describe how you would solve"]')).toBeVisible();
  });

  test('8. Can close challenge modal', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `closemodal${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Close Modal Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Open modal
    await page.locator('.grid > div').first().click();
    await expect(page.locator('text=Your Solution')).toBeVisible({ timeout: 5000 });

    // Close modal (click X button)
    await page.locator('button:has-text("×")').click();

    // Modal should be closed
    await expect(page.locator('text=Your Solution')).not.toBeVisible({ timeout: 3000 });
  });

  test('9. Submit button disabled without answer', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `submitdisabled${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Submit Disabled Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Open modal
    await page.locator('.grid > div').first().click();
    await expect(page.locator('text=Your Solution')).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled
    const submitBtn = page.locator('button:has-text("Submit Answer")');
    await expect(submitBtn).toBeDisabled();
  });

  test('10. Can submit an answer', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `submitanswer${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Answer Submitter');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Open first challenge
    await page.locator('.grid > div').first().click();
    await expect(page.locator('text=Your Solution')).toBeVisible({ timeout: 5000 });

    // Fill in answer
    await page.fill('textarea[placeholder*="Describe how you would solve"]', 'This is my test solution for the challenge. I would implement proper RLS policies using auth.uid().');

    // Fill in optional code snippet
    await page.fill('textarea[placeholder*="SQL or TypeScript"]', 'CREATE POLICY "test" ON table FOR SELECT USING (auth.uid() = user_id);');

    // Submit button should be enabled
    const submitBtn = page.locator('button:has-text("Submit Answer")');
    await expect(submitBtn).toBeEnabled();

    // Click submit
    await submitBtn.click();

    // Modal should close after submission
    await expect(page.locator('text=Your Solution')).not.toBeVisible({ timeout: 10000 });

    // Challenge should show as submitted
    await expect(page.locator('text=Submitted').first()).toBeVisible({ timeout: 5000 });
  });

  test('11. Progress counter updates after submission', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `progress${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Progress Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Check initial progress shows 0
    await expect(page.locator('text=/0 \\/ \\d+/')).toBeVisible();

    // Submit an answer
    await page.locator('.grid > div').first().click();
    await page.fill('textarea[placeholder*="Describe how you would solve"]', 'Test answer for progress check');
    await page.locator('button:has-text("Submit Answer")').click();

    // Wait for modal to close
    await expect(page.locator('text=Your Solution')).not.toBeVisible({ timeout: 10000 });

    // Progress should update to 1
    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible({ timeout: 5000 });
  });

  test('12. Footer is visible', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('text=IGTA-Tech Skills Assessment Platform')).toBeVisible();
    await expect(page.locator('text=Powered by Supabase + Next.js')).toBeVisible();
  });

  test('13. Page is responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Header should still be visible
    await expect(page.locator('h1')).toBeVisible();

    // Registration form should be visible
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible();
  });

  test('14. Difficulty badges are displayed', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `badges${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Badge Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Check for difficulty badges (easy, medium, hard)
    const badges = await page.locator('span:has-text("easy"), span:has-text("medium"), span:has-text("hard")').count();
    expect(badges).toBeGreaterThan(0);
  });

  test('15. Category badges are displayed', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `categories${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Category Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Check for category badges
    const categories = await page.locator('span:has-text("rls"), span:has-text("storage"), span:has-text("auth"), span:has-text("queries"), span:has-text("migrations"), span:has-text("client")').count();
    expect(categories).toBeGreaterThan(0);
  });

  test('16. Points are displayed on challenge cards', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `points${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Points Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Check for points display
    const points = await page.locator('text=/\\+\\d+ pts/').count();
    expect(points).toBeGreaterThan(0);
  });

  test('17. Hint is displayed in challenge modal', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `hint${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Hint Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Open challenge
    await page.locator('.grid > div').first().click();
    await expect(page.locator('text=Your Solution')).toBeVisible({ timeout: 5000 });

    // Check for hint
    await expect(page.locator('text=Hint:')).toBeVisible();
  });

  test('18. Supabase connection works (challenges load from DB)', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `dbtest${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'DB Connection Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // If challenges load, DB connection works
    // Check for specific challenge titles that we know exist
    const hasChallenge = await page.locator('text=/Fix RLS Policy/').count();
    expect(hasChallenge).toBeGreaterThan(0);
  });

  test('19. LocalStorage persists user session', async ({ page, context }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `persist${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'Persistence Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be logged in (localStorage persists)
    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Persistence Tester')).toBeVisible();
  });

  test('20. Cannot submit same challenge twice', async ({ page }) => {
    await page.goto(BASE_URL);

    const uniqueEmail = `nodupes${Date.now()}@test.com`;

    // Register
    await page.fill('input[placeholder="John Doe"]', 'No Dupes Tester');
    await page.fill('input[placeholder="john@example.com"]', uniqueEmail);
    await page.click('button:has-text("Start Assessment")');

    await expect(page.locator('text=Welcome back,')).toBeVisible({ timeout: 10000 });

    // Submit first challenge
    await page.locator('.grid > div').first().click();
    await page.fill('textarea[placeholder*="Describe how you would solve"]', 'First submission');
    await page.locator('button:has-text("Submit Answer")').click();

    // Wait for submission
    await expect(page.locator('text=Submitted').first()).toBeVisible({ timeout: 10000 });

    // Try to click the same challenge - it should not open modal
    await page.locator('.grid > div').first().click();

    // Modal should NOT open (challenge already submitted)
    await expect(page.locator('text=Your Solution')).not.toBeVisible({ timeout: 2000 });
  });

});
