const express = require('express');

const router = express.Router();

// GET /api/user/me（requireAuth 在 app.js 挂载时统一应用）
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
