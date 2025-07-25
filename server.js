const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Input validation function (OWASP C5)
function isMaliciousInput(input) {
    // Basic check for XSS and SQLi patterns
    const xssPattern = /<script|onerror|onload|<img|<svg|javascript:|alert\s*\(|document\.|window\.|eval\s*\(|\"|\'|\`|\=|\>|\</i;
    const sqliPattern = /('|"|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)/i;
    return xssPattern.test(input) || sqliPattern.test(input);
}

app.get('/', (req, res) => {
    const error = req.session.error || false;
    const value = req.session.value || '';
    req.session.error = false;
    req.session.value = '';
    res.render('index', { error, value });
});

app.post('/search', (req, res) => {
    const searchTerm = req.body.searchTerm || '';
    if (isMaliciousInput(searchTerm)) {
        req.session.error = true;
        req.session.value = '';
        return res.redirect('/');
    }
    // Safe input, show result
    res.render('result', { searchTerm });
});

app.post('/back', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
