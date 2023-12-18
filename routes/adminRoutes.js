const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Destination folder for uploaded files

const session = require('express-session');
router.use(session({
  secret: 'samplekey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


/* GET login page. */
router.get('/login', async function (req, res, next) {
  res.render('login', { title: 'Login' });
});

/* POST login. */
router.post('/login', async function (req, res, next) {
  const { email, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email } // Assuming email is unique
    });

    if (!admin) {
      res.status(401).render('login', { title: 'Login', errorMessage: 'Invalid username or password' });
      return;
    }

    // Directly compare the provided password with the stored password
    if (password === admin.password) {
      // Store the admin object in the session
      req.session.admin = { id: admin.id, username: admin.username };

      // Redirect to the admin homepage
      res.redirect('/admin/admindashboard');
    } else {
      res.status(401).render('login', { title: 'Login', errorMessage: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    // Handle any errors here
    res.status(500).send('Error');
  }
});

// wag mo na to galawin cha sa signup to 

router.get('/signup', (req, res) => {
  res.render('signup');
});

router.post('/signup', async function (req, res, next) {
  const { fullname, username, email, password } = req.body;
  try {
    // Create a new admin admin (in a real application, you would save it to a database)
    const admin = await prisma.admin.create({
      data: {
        fullname,
        username,
        email,
        password,
      },
    });






    // Redirect to login page after successful signup
    res.redirect('/admin/login');

    const existingAdmin = await prisma.admin.findUnique({
      where: {
        username: username,
      },
    });

    if (existingAdmin) {
      // Handle the case where the username already exists
      return res.status(400).send('Admin name already exists');
    }

  } catch (error) {
    console.error(error);
  }

});

// Define a middleware function to check if the admin is authenticated
const isAuthenticated = (req, res, next) => {
  // Check if the admin object is present in the session
  if (req.session.admin) {
    // Admin is authenticated, proceed to the next middleware or route handler
    next();
  } else {
    // Admin is not authenticated, redirect to the login page
    res.redirect('/admin/login');
  }
};

// List of routes that require authentication
const protectedRoutes = [
  '/admindashboard',
  '/add-pet',
  '/edit-pet/:id',
  '/list-pets',
  '/delete-pet/:id',
];
router.use(protectedRoutes, isAuthenticated);


router.get('/admindashboard', async function (req, res, next) {
  console.log('Reached /admindashboard route');

  try {
    const { admin } = req.session;
    console.log('Admin in session:', admin);

    if (!admin) {
      console.log('Redirecting to /admin/login');
      return res.redirect('/admin/login');
    }

    const contactFormEntries = await prisma.contactFormEntry.findMany();
    const totalPets = await prisma.pet.count();
    const totalReports = await prisma.report.count();
    const totalArchivedSurrenders = await prisma.surrender.count({
      where: {
        archived: true
      }
    });

    // Fetch data from MongoDB using Prisma
    const donations = await prisma.donation.findMany({
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Extracting dates and amounts
    const labels = donations.map((donation) => donation.date.toLocaleDateString());
    const amounts = donations.map((donation) => donation.amount);

    // Calculate total donations
    const totalDonations = amounts.reduce((acc, curr) => acc + curr, 0);

    // Fetch data for the bar chart illustrating the race of petType (dog and cat)
    const petRaceData = await prisma.pet.groupBy({
      by: ['petType'],
      _count: {
        petType: true,
      },
    });

    // Extracting race data for the bar chart
    const petRaceLabels = petRaceData.map((data) => data.petType);
    const petRaceCounts = petRaceData.map((data) => data._count.petType);

    const reports = await prisma.report.findMany({
      where: { archived: false },
    });

    console.log('Rendering admindashboard view');
    res.render('admindashboard', {
      title: 'Dashboard',
      admin,
      reports,
      contactFormEntries,
      totalPets,
      totalArchivedSurrenders,
      totalReports,
      labels: JSON.stringify(labels),
      amounts: JSON.stringify(amounts),
      totalDonations: totalDonations,
      petRaceLabels: JSON.stringify(petRaceLabels),
      petRaceCounts: JSON.stringify(petRaceCounts),
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.post('/pets', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
]), async (req, res) => {
  try {
    const { name, breed, color, gender, description, petType } = req.body;
    const age = parseInt(req.body.age); // Convert age to a number

    // Get the paths to the uploaded images
    const image = req.files['image'] ? req.files['image'][0].path : null;
    const image2 = req.files['image2'] ? req.files['image2'][0].path : null;
    const image3 = req.files['image3'] ? req.files['image3'][0].path : null;
    const image4 = req.files['image4'] ? req.files['image4'][0].path : null;

    const newPet = await prisma.pet.create({
      data: {
        name,
        breed,
        age,
        color,
        gender,
        description,
        image,
        image2,
        image3,
        image4,
        petType,
      }
    });

    // Redirect to the admin dashboard after successfully adding a pet
    res.redirect('/admin/admindashboard');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create pet' });
  }
});




// Get all pets
router.get('/pets', async (req, res) => {
  try {
    const pets = await prisma.pet.findMany();
    res.json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch pets' });
  }
});

// Get a single pet by ID
router.get('/pets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pet = await prisma.pet.findUnique({
      where: { id },
    });
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
    } else {
      res.json(pet);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch pet' });
  }
});

// Update a pet by ID using PUT
router.post('/pets/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body; // Assuming your request body contains the updated pet data

  try {
    // Log the received data for debugging
    console.log('Received data for update:', updatedData);

    // Use Prisma to update the pet based on the received data
    const updatedPet = await prisma.pet.update({
      where: { id },
      data: {
        name: updatedData.name,
        breed: updatedData.breed,
        age: parseInt(updatedData.age), // Convert age to integer
        color: updatedData.color,
        gender: updatedData.gender,
      },
    });

    // Log the updated pet for debugging
    console.log('Updated pet:', updatedPet);

    // Redirect to the "view-pet" page for the specific pet
    res.redirect(`/admin/view-pet/${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update pet' });
  }
});




// Render the "Edit Pet" form for a specific pet by ID
router.get('/edit-pet/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pet = await prisma.pet.findUnique({
      where: { id },
    });
    if (!pet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else {
      res.render('edit-pet', { title: 'Edit Pet', pet });
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

// Delete a pet by ID
router.delete('/pets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPet = await prisma.pet.delete({
      where: { id },
    });
    res.json(deletedPet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete pet' });
  }
});

// Render the "Add Pet" form
router.get('/add-pet', (req, res) => {
  res.render('add-pet', { title: 'Add Pet' });
});

// Render the "View Pet" page for a specific pet by ID
router.get('/view-pet/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pet = await prisma.pet.findUnique({
      where: { id },
    });
    if (!pet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else {
      res.render('view-pet', { title: 'View Pet', pet });
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});



// Render the "List Pets" page with a list of all pets
router.get('/list-pets', async (req, res) => {
  try {
    const pets = await prisma.pet.findMany({
      where: {adopted: false,},
    });
    const petsWithDefaultType = pets.map((pet) => ({
      ...pet,
      petType: pet.petType || 'Unknown',
    }));
    const { admin } = req.session;
    console.log('Admin in session:', admin);

    if (!admin) {
      console.log('Redirecting to /admin/login');
      return res.redirect('/admin/login');
    }
    res.render('list-pets', { title: 'List Pets', pets: petsWithDefaultType, admin });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

router.get('/list-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
  
    const { admin } = req.session;
    console.log('Admin in session:', admin);

    if (!admin) {
      console.log('Redirecting to /admin/login');
      return res.redirect('/admin/login');
    }
    res.render('list-users',{users,admin});
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

router.post('/list-users/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Update the user's accountStatus to "Verified"
    await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'Verified' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error verifying account' });
  }
});

router.post('/verify-user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPet = await prisma.user.update({
      where: { id },
      data: { accountStatus: 'Verified' },
    });
    if (!deletedPet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else {
      res.redirect('/admin/list-users'); // Redirect to the list of pets after deletion
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});


router.post('/submit-detail', async (req, res) => {
  try {
    const { name, type, breed, adopter, address, contact, date } = req.body;

    // Use Prisma client to create a new adopt in the database
    const newAdopt = await prisma.adopt.create({
      data: {
        name,
        type,
        breed,
        adopter,
        address,
        contact,
        date: new Date(date), // Ensure the date is parsed correctly
      },
    });

    console.log('Detail created:', newAdopt);

    // Send a success response
    res.status(200).json({ message: 'Pet is now adopted' });
  } catch (error) {
    console.error('Error saving detail:', error);
    res.status(500).json({ error: 'Error saving detail' });
  }
});



router.get('/adminadoptions', async (req, res) => {
  try {
    // Fetch non-archived pet requests from the database
    const petRequests = await prisma.petRequest.findMany({
      where: { archived: false }, 
    });
    const { admin } = req.session;
    console.log('Admin in session:', admin);

    if (!admin) {
      console.log('Redirecting to /admin/login');
      return res.redirect('/admin/login');
    }
    // Render the "adminadoptions" view with the non-archived pet request data
    res.render('adminadoptions', { petRequests, admin });
  } catch (error) {
    console.error('Error fetching pet requests:', error);
    res.status(500).send('Error fetching pet requests');
  }
});

router.post('/delete-user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPet = await prisma.user.delete({
      where: { id },
    });
    if (!deletedPet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else {
      res.redirect('/admin/list-users'); // Redirect to the list of pets after deletion
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

// Delete a pet by ID
router.post('/delete-pet/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPet = await prisma.pet.delete({
      where: { id },
    });
    if (!deletedPet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else {
      res.redirect('/admin/list-pets'); // Redirect to the list of pets after deletion
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

// Handle GET request to display submitted reports
router.get('/adminreport', async (req, res) => {
  try {
    // Fetch all reports from the database (adjust this query as needed)
    const reports = await prisma.report.findMany({
      where: { archived: false },
    });
    const { admin } = req.session;
    console.log('Admin in session:', admin);

    if (!admin) {
      console.log('Redirecting to /admin/login');
      return res.redirect('/admin/login');
    }
    // Render the "adminreport.ejs" template with the reports data
    res.render('adminreport', { reports,admin });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).send('Error fetching reports');
  }
});

// Handle POST request to delete a report
router.post('/adminreport/delete/:id', async (req, res) => {
  try {
    const reportId = req.params.id;

    // Delete the report from the database
    await prisma.report.delete({
      where: { id: reportId },
    });

    // Respond with a JSON success message
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);

    // Respond with a JSON error message
    res.status(500).json({ success: false, message: 'Error deleting report' });
  }
});

// Handle POST request to update reportstatus
router.post('/adminreport/check/:id', async (req, res) => {
  try {
    const reportId = req.params.id;

    // Update the reportstatus to true
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { reportstatus: true },
    });

    // Respond with a JSON success message
    res.json({ success: true, message: 'Report status updated successfully', updatedReport });
  } catch (error) {
    console.error('Error updating report status:', error);

    // Respond with a JSON error message
    res.status(500).json({ success: false, message: 'Error updating report status' });
  }
});



module.exports = router;
