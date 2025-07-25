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
            // XSS attacks
            { name: 'XSS Script Tag', payload: '<script>alert(1)</script>' },
            { name: 'XSS IMG OnError', payload: '<img src=x onerror=alert(2)>' },
            { name: 'XSS SVG OnLoad', payload: '<svg/onload=alert(3)>' },
            { name: 'XSS Double Quote Script', payload: '"<script>alert(4)</script>' },
            { name: 'XSS Body OnLoad', payload: '<body onload=alert(5)>' },
            { name: 'XSS Iframe JS', payload: "<iframe src='javascript:alert(6)'></iframe>" },
            { name: 'XSS Anchor JS', payload: '<a href="javascript:alert(7)">XSS</a>' },
            { name: 'XSS Input OnFocus', payload: '<input onfocus=alert(8) autofocus>' },
            { name: 'XSS Math JS', payload: '<math href="javascript:alert(9)">CLICKME</math>' },
            { name: 'XSS Details OnToggle', payload: '<details open ontoggle=alert(10)>' },
            
            // SQL Injection attacks
            { name: 'SQLi OR True', payload: "' OR 1=1;--" },
            { name: 'SQLi Double Quote', payload: '" OR "" = "' },
            { name: 'SQLi admin comment', payload: "admin' --" },
            { name: 'SQLi admin hash', payload: "admin' #" },
            { name: 'SQLi admin block comment', payload: "admin'/*" },
            { name: "SQLi Paren OR True", payload: "') OR ('1'='1" },
            { name: 'SQLi Drop Table', payload: '1; DROP TABLE users' },
            { name: 'SQLi Exec Shell', payload: "1; EXEC xp_cmdshell('dir')" }
        ];

        for (const test of testCases) {
            await driver.get(serverUrl);
            let input = await driver.findElement(By.name('searchTerm'));
            await input.clear();
            await input.sendKeys(test.payload);
            await driver.findElement(By.css('button[type="submit"]')).click();

            // Wait a moment for client-side JS to act
            await driver.sleep(500);

            // Re-locate the input element after possible DOM update
            input = await driver.findElement(By.name('searchTerm'));
            const value = await input.getAttribute('value');
            if (value === '') {
                console.log(`${test.name} blocked: PASS`);
            } else {
                // If not blocked, check if we navigated to result yespage
                let url = await driver.getCurrentUrl();
                if (url.includes('/result')) {
                    console.log(`${test.name} blocked: FAIL (navigated to result)`);
                } else {
                    console.log(`${test.name} blocked: FAIL (input not cleared)`);
                }
            }
        }
    } finally {
        await driver.quit();
    }
}

runTests();
