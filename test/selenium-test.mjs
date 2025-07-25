import { Builder, By } from 'selenium-webdriver';

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || 'local';

// URLs based on environment
// Obtain dev selenium server IP using: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' selenium-server
const seleniumUrl = environment === 'github' 
  ? 'http://selenium:4444/wd/hub' // NOSONAR: local testing
  : 'http://localhost:4444/wd/hub'; // NOSONAR: local dev use

// Note: Start the nodejs server before running the test locally
const serverUrl = environment === 'github' 
  ? 'http://testserver:3000/' // NOSONAR: local testing
  : 'http://host.docker.internal/'; // NOSONAR: local dev use
  

async function runTests() {
    let driver = await new Builder().usingServer(seleniumUrl).forBrowser('chrome').build();
    try {
        // Test cases
        const testCases = [
            // Normal input
            { name: 'Normal SQL Word', payload: 'select', expectBlocked: false },
            { name: 'Normal Alphanumeric', payload: 'user123', expectBlocked: false },
            { name: 'Normal Sentence', payload: 'This is a test search.', expectBlocked: false },
            // XSS attacks
            { name: 'XSS Script Tag', payload: '<script>alert(1)</script>', expectBlocked: true },
            { name: 'XSS IMG OnError', payload: '<img src=x onerror=alert(2)>', expectBlocked: true },
            { name: 'XSS SVG OnLoad', payload: '<svg/onload=alert(3)>', expectBlocked: true },
            { name: 'XSS Double Quote Script', payload: '"<script>alert(4)</script>', expectBlocked: true },
            // SQL Injection attacks
            { name: 'SQLi OR True', payload: "' OR 1=1;--", expectBlocked: true },
            { name: 'SQLi Double Quote', payload: '" OR "" = "', expectBlocked: true },
            { name: 'SQLi admin comment', payload: "admin' --", expectBlocked: true },
            { name: 'SQLi admin hash', payload: "admin' #", expectBlocked: true },
        ];

        for (const test of testCases) {
            await driver.get(serverUrl);
            let input = await driver.findElement(By.name('searchTerm'));
            await input.clear();
            await input.sendKeys(test.payload);
            await driver.findElement(By.css('button[type="submit"]')).click();

            // Wait a moment for client-side JS to act
            await driver.sleep(500);

            let url = await driver.getCurrentUrl();
            if (test.expectBlocked) {
                // Blocked: should stay on home and input should be cleared
                if (!url.includes('/result')) {
                    input = await driver.findElement(By.name('searchTerm'));
                    const value = await input.getAttribute('value');
                    if (value === '') {
                        console.log(`${test.name} blocked: PASS`);
                    } else {
                        console.log(`${test.name} blocked: FAIL (input not cleared)`);
                    }
                } else {
                    console.log(`${test.name} blocked: FAIL (navigated to result)`);
                }
            } else {
                // Allowed: should navigate to /result
                if (url.includes('/result')) {
                    console.log(`${test.name} allowed: PASS`);
                } else {
                    console.log(`${test.name} allowed: FAIL (did not reach result page)`);
                }
            }
            // Always return to home page for next test
            await driver.get(serverUrl);
        }
    } finally {
        await driver.quit();
    }
}

runTests();
