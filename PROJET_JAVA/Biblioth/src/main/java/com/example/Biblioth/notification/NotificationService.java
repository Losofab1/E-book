package com.example.Biblioth.notification;
import java.time.LocalDateTime; import org.springframework.stereotype.Service;
@Service public class NotificationService {
 private final NotificationRepository repository; public NotificationService(NotificationRepository repository){this.repository=repository;}
 public void create(String recipient, String type, String message){ Notification n=new Notification(); n.setRecipientEmail(recipient);n.setType(type);n.setMessage(message);n.setCreatedAt(LocalDateTime.now());repository.save(n); }
}
