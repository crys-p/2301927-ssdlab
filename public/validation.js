function isMaliciousInput(input) {
    // Block XSS patterns
    const xssPattern = /<script|onerror|onload|<img|<svg|javascript:|alert\s*\(|document\.|window\.|eval\s*\(|\"|\'|\`|\=|\>|\</i;
    // Block only suspicious SQLi patterns (quotes, semicolons, double dashes, comments, etc.)
    const sqliPattern = /('|"|;|--|#|\/\*|\*\/|\bOR\b|\bAND\b)/i;
    return xssPattern.test(input) || sqliPattern.test(input);
}

function validateForm(e) {
    const input = document.getElementById('searchTerm');
    if (isMaliciousInput(input.value)) {
        input.value = '';
        e.preventDefault();
        return false;
    }
}
