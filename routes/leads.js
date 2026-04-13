const express = require('express');
const router = express.Router();
const { getLeads, getHistory, downloadExport } = require('../controllers/leadsController');

router.post('/', getLeads);
router.get('/history', getHistory);
router.get('/export/:filename', downloadExport);

module.exports = router;
