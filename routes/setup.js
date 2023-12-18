const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// router.get('/setup', async (req, res) => {
//   try {
//     res.render('setup');
//   } catch (error) {
//     console.error(error);
//     res.status(500).render('error', { message: 'Server error' });
//   }
// });

module.exports = router;