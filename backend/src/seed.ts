// Fills the database with demo data:  npm run seed
// WARNING: deletes all existing users, projects, tasks and comments.
import mongoose from 'mongoose';
import env from './config/env';
import { connectDB } from './config/db';
import { User } from './models/User';
import { Project } from './models/Project';
import { Task } from './models/Task';
import { Comment } from './models/Comment';

const PASSWORD = 'Password123!';

async function seed() {
  await connectDB(env.mongoUri);
  await Promise.all([User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}), Comment.deleteMany({})]);

  // User.create runs the pre-save hook, so passwords get hashed.
  const [admin, manager, dev1, dev2, client1, client2] = await User.create([
    { name: 'Alice Admin', email: 'admin@demo.com', password: PASSWORD, role: 'admin' },
    { name: 'Mark Manager', email: 'manager@demo.com', password: PASSWORD, role: 'manager' },
    { name: 'Dana Developer', email: 'dev@demo.com', password: PASSWORD, role: 'developer' },
    { name: 'Raj Developer', email: 'dev2@demo.com', password: PASSWORD, role: 'developer' },
    { name: 'Chloe Client', email: 'client@demo.com', password: PASSWORD, role: 'client' },
    { name: 'Omar Client', email: 'client2@demo.com', password: PASSWORD, role: 'client' },
  ]);

  const [website, app] = await Project.create([
    { name: 'Company Website Redesign', description: 'New marketing site with a CMS.', client: client1._id, manager: manager._id, members: [dev1._id, dev2._id] },
    { name: 'Mobile Ordering App', description: 'iOS/Android ordering app.', client: client2._id, manager: manager._id, members: [dev2._id], status: 'on_hold' },
  ]);

  const tasks = await Task.create([
    { title: 'Design homepage wireframes', project: website._id, assignee: dev1._id, status: 'done', priority: 'high', createdBy: manager._id },
    { title: 'Build navigation component', project: website._id, assignee: dev1._id, status: 'in_progress', priority: 'medium', createdBy: manager._id },
    { title: 'Set up CMS', project: website._id, assignee: dev2._id, status: 'review', priority: 'high', createdBy: manager._id },
    { title: 'Write SEO meta tags', project: website._id, status: 'todo', priority: 'low', createdBy: manager._id },
    { title: 'Payment gateway research', project: app._id, assignee: dev2._id, status: 'todo', priority: 'medium', createdBy: admin._id },
  ]);

  await Comment.create([
    { task: tasks[1]._id, author: client1._id, body: 'Can the menu be sticky on mobile?' },
    { task: tasks[1]._id, author: dev1._id, body: 'Yes - adding that now.' },
  ]);

  console.log(`Seeded. Every user's password is: ${PASSWORD}`);
  console.log('admin@demo.com, manager@demo.com, dev@demo.com, dev2@demo.com, client@demo.com, client2@demo.com');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
