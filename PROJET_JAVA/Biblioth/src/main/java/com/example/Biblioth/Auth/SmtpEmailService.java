package com.example.Biblioth.Auth;

import com.example.Biblioth.User.UserEntity;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Profile("prod")
public class SmtpEmailService implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.mail.from:no-reply@biblioth.local}")
    private String fromAddress;

    public SmtpEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendPasswordResetEmail(UserEntity user, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");
            String subject = "Réinitialisation de votre mot de passe";
            String html = "<p>Bonjour " + escapeHtml(user.getNom()) + ",</p>"
                    + "<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>"
                    + "<p><a href=\"" + link + "\">Réinitialiser mon mot de passe</a></p>"
                    + "<p>Si vous n'avez pas demandé cette opération, ignorez ce message.</p>";

            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Password reset email sent to {}", user.getEmail());
        } catch (MessagingException ex) {
            log.error("Failed to build password reset email for {}", user.getEmail(), ex);
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation.", ex);
        } catch (Exception ex) {
            log.error("Failed to send password reset email to {}", user.getEmail(), ex);
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation.", ex);
        }
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
