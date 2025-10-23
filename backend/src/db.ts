import * as mysql from 'mysql2';

export const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // change if you use another MySQL user
  password: '',       // put your MySQL password here
  database: 'agricooldb', // your database name in phpMyAdmin
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database');
  }
});
