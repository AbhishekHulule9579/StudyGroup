package com.studyGroup.backend.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final SendGrid sendGrid;
    private final String fromEmail;

    public EmailService(
            @Value("${sendgrid.api.key}") String apiKey,
            @Value("${sendgrid.from.email}") String fromEmail) {
        // Fail-fast check to ensure the API key is loaded from environment variables
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.startsWith("${")) {
            logger.error("****************************************************************");
            logger.error("SENDGRID_API_KEY is not configured. Please set the environment variable.");
            logger.error("****************************************************************");
            throw new IllegalArgumentException("SendGrid API key is missing or not configured.");
        }
        this.sendGrid = new SendGrid(apiKey);
        this.fromEmail = fromEmail;
    }

    public void sendEmail(String to, String subject, String body) {
        Email from = new Email(fromEmail);
        Email toEmail = new Email(to);
        Content content = new Content("text/plain", body);
        Mail mail = new Mail(from, subject, toEmail, content);

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sendGrid.api(request);

            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                logger.info("Email sent successfully to {} with status code: {}", to, response.getStatusCode());
            } else {
                logger.error("Failed to send email to {}. Status Code: {}, Body: {}", to, response.getStatusCode(), response.getBody());
            }
        } catch (IOException ex) {
            // This is a replacement for the MailSendException you were seeing
            logger.error("************************************************************************");
            logger.error("EMAIL ERROR DETECTED: Failed to send email to {}. IOException Reason: {}", to, ex.getMessage(), ex);
            // You might want to re-throw this as a custom exception
        }
    }
}
/*
package com.studyGroup.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException; 
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmailAddress;

    public String sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
          
            mailMessage.setFrom(fromEmailAddress);
            mailMessage.setTo(to);
            mailMessage.setSubject(subject);
            mailMessage.setText(body);
            
            javaMailSender.send(mailMessage);
            
            return "200::Mail Sent Successfully";
        } catch (MailException e) { 
           
            String errorMessage = "Failed to send email to " + to + ". MailException Reason: " + e.getMessage();
            System.err.println("************************************************************************");
            System.err.println("EMAIL ERROR DETECTED: " + errorMessage);
            e.printStackTrace(); 
            System.err.println("************************************************************************");
            
            return "500::Error sending email. Detailed Error: " + e.getMessage();
        } catch (Exception e) {
            String errorMessage = "An unexpected error occurred during email sending: " + e.getMessage();
            System.err.println("UNEXPECTED EMAIL ERROR: " + errorMessage);
            e.printStackTrace();
            return "500::Unexpected error during email sending. Detailed Error: " + e.getMessage();
        }
    }
}
*/