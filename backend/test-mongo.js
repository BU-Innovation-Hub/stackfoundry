const mongoose = require('mongoose');

// Replace with your connection string
const MONGO_URI = 'mongodb+srv://lebelorethabile21_db_user:ghbzXO7u6GpiHvrL@cluster1.ongt1as.mongodb.net/';
                  //  mongodb+srv://lebelorethabile21_db_user:ghbzXO7u6GpiHvrL@cluster1.ongt1as.mongodb.net/
console.log('🔄 Testing MongoDB connection...');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ MongoDB connection failed!');
    console.log('Error:', err.message);
    process.exit(1);
  });