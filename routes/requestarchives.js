const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/requestarchives', async (req, res) => {
    try {
        // Fetch archived adoption records from the database
        const archivedAdoptions = await prisma.adoption.findMany({
            where: { archived: true },
        });

        // Render the "requestarchives" view with the archived adoption data
        res.render('requestarchives', { archivedAdoptions });
    } catch (error) {
        console.error('Error fetching archived adoptions:', error);
        res.status(500).send('Error fetching archived adoptions');
    }
});

router.post('/archive', async (req, res) => {
    const id = req.body.id; // Assuming that your adoption record has an 'id' field
    const  status  = req.body.status;
    try {
        // Update the adoption request record with the specific 'id' to mark it as archived
        await prisma.adoption.update({
            where: { id: id },
            data: { archived: true, status: status },
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Error archiving adoption request:', error);
        res.status(500).send('Error archiving adoption request');
    }
});

router.post('/update', async (req, res) => {
    const petId = req.body.petId; // Assuming that your adoption record has an 'id' field
    const owner = req.body.owner;
    try {
        // Update the adoption request record with the specific 'id' to mark it as archived
        await prisma.pet.update({
            where: { id: petId },
            data: { adopter: owner, adopted: true,},
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Error archiving adoption request:', error);
        res.status(500).send('Error archiving adoption request');
    }
});


router.post('/notify', async (req, res) => {
    const { status, userId, content } = req.body;

    try {
        await prisma.notification.create({
            data: {
                userId: userId,
                type: 'Adoption request',
                content: content,
                sender: 'admin',
                recipient: '',
                timestamp: new Date().toISOString(),
                status: status,
                link: '',
                metadata: '',
            },
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).send('Error creating notification');
    }
});



// This route handles unarchiving
router.post('/unarchive', async (req, res) => {
    const id = req.body.id; // Assuming that your Adoption model has an 'id' field

    try {
        // Update the adoption request record to mark it as unarchived
        await prisma.adoption.update({
            where: { id: id },
            data: { archived: false },
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Error unarchiving adoption request:', error);
        res.status(500).send('Error unarchiving adoption request');
    }
});



module.exports = router;