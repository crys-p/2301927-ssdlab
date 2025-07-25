import { Builder, By } from 'selenium-webdriver';

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || 'local';

// URLs based on environment
// Obtain dev selenium server IP using: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' selenium-server
const seleniumUrl = environment === 'github' 
  ? 'http://selenium:4444/wd/hub' 
  : 'http://localhost:4444/wd/hub';

// Note: Start the nodejs server before running the test locally
const serverUrl = environment === 'github' 
  ? 'http://testserver:3000/' 
  : 'http://host.docker.internal/';
  

async function runTests() {
    let driver = await new Builder().usingServer(seleniumUrl).forBrowser('chrome').build();
    try {
        // Test cases
        const testCases = [
            // Normal input
            { name: 'Normal Input', payload: 'hello world', expectBlocked: false },
            { name: 'Normal SQL Word', payload: 'select', expectBlocked: false },
            { name: 'Normal Alphanumeric', payload: 'user123', expectBlocked: false },
            { name: 'Normal Sentence', payload: 'This is a test search.', expectBlocked: false },
            // XSS attacks
            { name: 'XSS Script Tag', payload: '<script>alert(1)</script>', expectBlocked: true },
            { name: 'XSS IMG OnError', payload: '<img src=x onerror=alert(2)>', expectBlocked: true },
            { name: 'XSS SVG OnLoad', payload: '<svg/onload=alert(3)>', expectBlocked: true },
            { name: 'XSS Double Quote Script', payload: '"<script>alert(4)</script>', expectBlocked: true },
            { name: 'XSS Body OnLoad', payload: '<body onload=alert(5)>', expectBlocked: true },
            { name: 'XSS Iframe JS', payload: "<iframe src='javascript:alert(6)'></iframe>", expectBlocked: true },
            { name: 'XSS Anchor JS', payload: '<a href="javascript:alert(7)">XSS</a>', expectBlocked: true },
            { name: 'XSS Input OnFocus', payload: '<input onfocus=alert(8) autofocus>', expectBlocked: true },
            { name: 'XSS Math JS', payload: '<math href="javascript:alert(9)">CLICKME</math>', expectBlocked: true },
            { name: 'XSS Details OnToggle', payload: '<details open ontoggle=alert(10)>', expectBlocked: true },
            // SQL Injection attacks
            { name: 'SQLi OR True', payload: "' OR 1=1;--", expectBlocked: true },
            { name: 'SQLi Double Quote', payload: '" OR "" = "', expectBlocked: true },
            { name: 'SQLi admin comment', payload: "admin' --", expectBlocked: true },
            { name: 'SQLi admin hash', payload: "admin' #", expectBlocked: true },
            { name: 'SQLi admin block comment', payload: "admin'/*", expectBlocked: true },
            { name: "SQLi Paren OR True", payload: "') OR ('1'='1", expectBlocked: true },
            { name: 'SQLi Drop Table', payload: '1; DROP TABLE users', expectBlocked: true },
            { name: 'SQLi Exec Shell', payload: "1; EXEC xp_cmdshell('dir')", expectBlocked: true }
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
