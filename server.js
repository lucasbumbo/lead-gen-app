require('dotenv').config();
const express = require('express');
const leadsRouter = require('./routes/leads');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.use('/api/leads', leadsRouter);

app.listen(PORT, () => {
  console.log(`Lead Gen App running at http://localhost:${PORT}`);
});
