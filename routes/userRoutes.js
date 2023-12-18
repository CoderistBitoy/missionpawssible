const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(session({
  secret: 'samplekey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

router.get('/donate', async (req, res) => {
  try {
    const userId = req.session.user.id; 
    const { user } = req.session;
    const donations = await prisma.donation.findMany({
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: 'asc', // You might want to order by date
      },
    });
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
    });
    const notificationCount = await prisma.notification.count({
      where: { userId: userId, NOT: { status: 'read' } },
    });
    // Extracting dates and amounts
    const labels = donations.map((donation) => donation.date.toLocaleDateString());
    const amounts = donations.map((donation) => donation.amount);

    // Calculate total donations
    const totalDonations = amounts.reduce((acc, curr) => acc + curr, 0);

    res.render('donate', {
      labels: JSON.stringify(labels),
      amounts: JSON.stringify(amounts),
      totalDonations: totalDonations,
      user, 
      notifications, 
      notificationCount,
    });
  } catch (error) {
    // Handle errors
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

router.get('/report', async (req, res) => {
  try {
    const userId = req.session.user.id; 
    const { user } = req.session;
    if (!user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
    });
    const notificationCount = await prisma.notification.count({
      where: { userId: userId, NOT: { status: 'read' } },
    });
    res.render('report', { user, notifications, notificationCount });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


// Handle POST request to save a report
router.post('/submit-report', upload.single('petImage'), async (req, res) => {
  try {
    const { completeLocation, landmark, petstatus, email, phone, message} = req.body;
    const imagePath = req.file ? req.file.path : null;
    const userId = req.session.user.id;
// Get the current date and time
    const currentDateTime = new Date();
        // Use Prisma client to create a new report in the database
    const newReport = await prisma.report.create({
      data: {
        completeLocation,
        landmark,
        petstatus,
        email,
        phone,
        petImage: imagePath,
        message,
        createdAt: currentDateTime,
        status: 'Pending',
        userId: userId,
      },
    });

    console.log('Report created:', newReport);

    res.render('submit-report'); // Render a success page or redirect as needed
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).send('Error saving report');
  }
});

router.get('/submit-report', (req, res) => {
  res.render('submit-report'); // Render the submit-report.ejs template
});


router.get('/surrender', async (req, res) => {
  try {
    const userId = req.session.user.id; 
    const { user } = req.session;
    if (!user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }
      const notifications = await prisma.notification.findMany({
      where: { userId: userId },
    });
    const notificationCount = await prisma.notification.count({
      where: { userId: userId, NOT: { status: 'read' } },
    });
    res.render('surrender', { user, notifications, notificationCount });
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.get('/adopt', async (req, res) => {
  try {
    // Check if req.session exists
    if (!req.session || !req.session.user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }

    const userId = req.session.user.id; // Corrected this line
    const { user } = req.session;

    const pets = await prisma.pet.findMany({
      where: { adopted: false },
    });

    const shuffledPets = pets.sort(() => Math.random() - 0.5);

    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
    });
    const notificationCount = await prisma.notification.count({
      where: { userId: userId, NOT: { status: 'read' } },
    });
    res.render('adopt', { user, title: 'Adopt Pets', pets: shuffledPets, notifications, notificationCount });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

/* GET login page. */
router.get('/login', async function (req, res, next) {
  res.render('userlogin', { title: 'Login' });
});

/* POST login. */
router.post('/login', async function (req, res, next) {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email: email } // Assuming email is unique
    });

    if (!user) {
      res.status(401).render('userlogin', { title: 'Login', errorMessage: 'Invalid username or password' });
      return;
    }

    // Directly compare the provided password with the stored password
    if (password === user.password) {
      // Store the user object in the session
      req.session.user = { 
        id: user.id, 
        validId: user.validId,
        selfieId: user.selfieId,
        fullname: user.fullname, 
        username: user.username, 
        email: user.email, 
        password: user.password,
        contact: user.contact,
        facebookLink: user.facebookLink,
        address: user.address,
        accountStatus: user.accountStatus
        
      };
      if (user.accountStatus =='Un-verified'){
        res.redirect('/setup');
      }else{
        res.redirect('/adopt');
      }
     
      
    } else {
      res.status(401).render('userlogin', { title: 'Login', errorMessage: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    // Handle any errors here
    res.status(500).send('Error');
  }
});

// wag mo na to galawin cha sa signup to 

router.get('/sign-up', (req, res) => {
  res.render('usersignup');
});

router.post('/sign-up', async function (req, res, next) {
  const { validId, selfieId, fullname, username, email,  password, contact,facebookLink, address } = req.body;
  try {
    // Create a new user user (in a real application, you would save it to a database)
    const user = await prisma.user.create({
      data: {
        validId:'',
        selfieId:'',
        fullname,
        username,
        email,
        password,
        contact:'',
        facebookLink:'',
        address:'',
        accountStatus:'Un-verified',
        
      },
    });

    // Redirect to login page after successful signup
    res.redirect('/login');

    const existingUser = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    if (existingUser) {
      // Handle the case where the username already exists
      return res.status(400).send('Username already exists');
    }

  } catch (error) {
    console.error(error);
  }

});


router.post('/notification/click', async (req, res) => {
  try {
    const { notificationId } = req.body;
    // Update notification status to 'read'
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'read' },
    });

    res.status(200).send('Notification marked as read');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



const isAuthenticated = (req, res, next) => {

  if (req.session.user) {

    next();
  } else {
 
    res.redirect('/login');
  }
};
const protectedRoutes = [
  '/setup',
  '/adopt',
  '/surrender',
  '/donate',
];

router.use(protectedRoutes, isAuthenticated);

router.get('/setup', async function (req, res, next) {
  try {
    const { user } = req.session;

    if (!user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }

    res.render('setup', { user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/submit-adoption', async function (req, res, next) {
  try {
    const { user } = req.session;

    if (!user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }

    res.render('submit-adoption', { user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/submit-request', async function (req, res, next) {
  try {
    const { user } = req.session;

    if (!user) {
      console.log('Redirecting to /login');
      return res.redirect('/login');
    }

    res.render('submit-request', { user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.post('/setup', upload.fields([
  { name: 'validId', maxCount: 1 },
  { name: 'selfieId', maxCount: 1 },
]), async (req, res) => {
  try {
    const {fullname, username, email,  contact, address } = req.body;
    // Get the paths to the uploaded images
    const validId = req.files['validId'] ? req.files['validId'][0].path : null;
    const selfieId = req.files['selfieId'] ? req.files['selfieId'][0].path : null;

    const userId = req.session.user.id;
    await prisma.user.update({
      where: {id: userId,},
      data: {
        validId: validId,
        selfieId: selfieId,
        fullname: fullname, 
        username: username, 
        email: email, 
        contact: contact,
        address: address,
        accountStatus:'Pending'
    
      },
    });

    // Redirect to the admin dashboard after successfully adding a pet
    res.redirect('/adopt');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create pet' });
  }
});



router.get('/petdetails/:id', async (req, res) => {
  const { id } = req.params; // Get the pet ID from the query parameter
  try {
    const userId = req.session.user.id;
    const pet = await prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      res.status(404).render('error', { message: 'Pet not found' });
    } else if (pet.adopted) {
      res.status(404).render('error', { message: 'Pet has already been adopted' });
    } else {
      const breed = pet.breed; // Get the breed of the current pet

      const breedPetsCount = await prisma.pet.count({
        where: {
          breed, // Count pets of the same breed
        },
      });
      const { user } = req.session;

      if (!user) {
        console.log('Redirecting to /login');
        return res.redirect('/login');
      }
      // Fetch a random set of pets of the same breed excluding the current pet by ID
      const randomBreedPets = await prisma.pet.findMany({
        where: {
          breed, adopted: false,
          NOT: {
            id: pet.id,
          },
           // Only fetch pets that have not been adopted
        },
        take: 4, // Fetch 4 random pets within the same breed
        skip: breedPetsCount > 4 ? Math.floor(Math.random() * (breedPetsCount - 4)) : 0, // Adjust skip value
      });
      const notifications = await prisma.notification.findMany({
        where: { userId: userId },
      });
      const notificationCount = await prisma.notification.count({
        where: { userId: userId, NOT: { status: 'read' } },
      });

      res.render('petdetails', {
        user,
        notificationCount,
        notifications,
        title: 'Pet Details',
        pet,
        similarPetsByBreed: randomBreedPets, // Pass the randomly fetched pets of the same breed to the template
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Server error' });
  }
});




router.post('/submit-adoption', upload.fields([
  { name: 'petStayingPhoto', maxCount: 1 },
]), async (req, res) => {
  try {
    const {
      email,
      fullName,
      petName,
      petType,
      existingPets,
      agreeToAdopt,
      promiseToCare,
      acceptTerms,
      address,
      contactNumber,
      facebookLink,
      petId,
    } = req.body;

   
    const petStayingPhotoImage = req.files['petStayingPhoto'][0];

    const agreeToAdoptChecked = agreeToAdopt === 'on';
    const promiseToCareChecked = promiseToCare === 'on';
    const acceptTermsChecked = acceptTerms === 'on';
    const userId = req.session.user.id;
    const adoption = await prisma.adoption.create({
      data: {
        email,
        fullName,
        petType,
        petName,
        existingPets,
        visitDate: new Date().toISOString(),
        agreeToAdopt: agreeToAdoptChecked,
        promiseToCare: promiseToCareChecked,
        acceptTerms: acceptTermsChecked,
        address,
        contactNumber,
        contractDate: new Date().toISOString(),
        facebookLink,
        petStayingPhoto: petStayingPhotoImage ? petStayingPhotoImage.path : null,
        userId:userId,
        petId:petId,
        status:'Pending',
      },
    });

    res.redirect('/submit-adoption');
  } catch (error) {
    console.error('Error creating adoption record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/submit-request', async (req, res) => {
  try {
    const { email, fullName, contactNumber, type, breed, sex, color, agePreference } = req.body;
    const userId = req.session.user.id;
    const request = await prisma.petRequest.create({
      data: {
        email,
        fullName,
        contactNumber,
        date: new Date().toISOString(),
        type,
        breed,
        sex,
        color,
        agePreference,
        archived: false,
        userId: userId,
        status: 'Pending',
      },
    });

    res.redirect('/submit-request');
  } catch (error) {
    console.error('Error creating adoption record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






router.post('/submit-surrender', upload.fields([
  { name: 'petpic', maxCount: 1 },
]), async (req, res) => {
  try {
    const { 
      email, 
      ownerName, 
      contact, 
      fullAddress, 
      petName, 
      color, 
      sex, 
      spayedNeutered, 
      vaccinated, 
      medicalConcerns, 
      currentMedicalIssues, 
      aggression, 
      biting, 
      leashCageTrained, 
      goodWithOtherPets, 
      goodWithChildren, 
      indoorOutdoor, 
      paymentMethod, 
    } = req.body;

   
    const petpicImage = req.files['petpic'][0];

    const petType = req.body.petType; // Ensure that you're not modifying petType here
    const breed = Array.isArray(req.body.breed) ? req.body.breed.join(', ') : req.body.breed;
    // Convert the agreementAccepted checkbox value to a Boolean
    const agreementAccepted = req.body.agreementAccepted === 'on';
    const userId = req.session.user.id;
    // Create a new Surrender record
    const surrender = await prisma.surrender.create({
      data: {
        email,
        date: new Date().toISOString(), // Set the current date and time in ISO-8601 format
        ownerName,
        contact,
        fullAddress,
        petType,
        petName,
        dateOfBirth: new Date().toISOString(), // Set the current date and time in ISO-8601 format
        breed,  
        color,
        sex,
        spayedNeutered,
        vaccinated,
        medicalConcerns,
        currentMedicalIssues,
        aggression,
        biting,
        leashCageTrained,
        goodWithOtherPets,
        goodWithChildren,
        indoorOutdoor,
        paymentMethod,
        agreementAccepted,
        petpic: petpicImage ? petpicImage.path : null,
        userId: userId,
  
      },
    });

    res.redirect('/submit-surrender');
  } catch (error) {
    console.error('Error creating surrender record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define the route for displaying the submission message
router.get('/submit-surrender', (req, res) => {

  
  res.render('submit-surrender'); // Renders the submit-surrender.ejs template
});

module.exports = router;
