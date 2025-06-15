const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Candidature = require('../models/Candidature');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/send-interview-email', async (req, res) => {
  try {
    const { candidatureId, dateEntretien, meetLink } = req.body;

    // Récupérer la candidature avec les informations du candidat et de l'offre
    const candidature = await Candidature.findById(candidatureId)
      .populate('candidat')
      .populate('offre');

    if (!candidature) {
      return res.status(404).json({ message: 'Candidature non trouvée' });
    }

    // Formater la date en français
    const formattedDate = new Date(dateEntretien).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Options de l'email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidature.candidat.email,
      subject: `Invitation à un entretien pour ${candidature.offre.titre}`,
      html: `
        <h2>Félicitations !</h2>
        <p>Votre candidature pour le poste de <strong>${candidature.offre.titre}</strong> a été retenue.</p>
        <p>Nous vous invitons à un entretien qui aura lieu le :</p>
        <p><strong>${formattedDate}</strong></p>
        <p>Lien pour rejoindre l'entretien : <a href="${meetLink}">${meetLink}</a></p>
        <p>Merci de vous connecter quelques minutes avant l'heure prévue.</p>
        <p>Cordialement,</p>
        <p>L'équipe de recrutement</p>
      `
    };

    // Envoi de l'email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;