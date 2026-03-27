// MongoDB Script to Create Admin User
// Run this in MongoDB Shell or Compass

// 1. Connect to your database
use event-management

// 2. Find your user by email
db.users.findOne({ email: "your-email@example.com" })

// 3. Update user role to admin
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)

// 4. Verify the update
db.users.findOne({ email: "your-email@example.com" })

// The output should show: role: "admin"

// Alternative: Create a new admin user directly
db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$hashedPasswordHere", // Register first, then update role
  role: "admin",
  createdAt: new Date()
})
