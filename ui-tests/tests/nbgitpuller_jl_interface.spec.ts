import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });

// test('should emit an activation console message', async ({ page }) => {
//   const logs: string[] = [];

//   page.on('console', message => {
//     logs.push(message.text());
//   });

//   // await page.goto("http://localhost:8888/?token=");
//   await page.goto();
//   // const password_field = page.locator("input[name='password']");
//   // await password_field.waitFor({ state: 'visible' });
//   // await password_field.fill("botbotterson");

//   // const login_button = await page.getByRole("button", { name: "Log in" })
//   // await login_button.click()
//   // await page.locator("button")

//   expect(
//     logs.filter(
//       s => s === 'JupyterLab extension nbgitpuller-jl-interface is activated!'
//     )
//   ).toHaveLength(1);
// });
