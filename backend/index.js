const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const AuthRouter = require('./Routes/AuthRouter');
const ProductRouter = require('./Routes/ProductRouter');
const ViewerRouter = require('./Routes/ViewerRouter');

require('dotenv').config();
require('./Models/db');
const PORT = process.env.PORT || 3080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/auth', AuthRouter);
app.use('/api/viewer', ViewerRouter);
// app.use('/products', ProductRouter);

// Test route
app.get('/ping', (req, res) => {
  res.send('PONG');
});

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})